"""Export onset, meter and pitch estimates from the exact shipped OGGs, offline."""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import subprocess

import numpy as np
from scipy import fft, ndimage, signal


ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "src/content/recordedScores.generated.ts"
SR, HOP = 22050, 220
STEP = HOP / SR
MIDI = np.arange(28, 96)
ROLES = ("pulse", "bass", "lead", "rhythm")
# Group size, plausible seconds per tactus, and phase rotation from the
# strongest estimated accent class. These are recording-specific, not Song BPM.
TRACKS = {
    "can-can": (2, (0.28, 0.44), 0),
    "turkish-march": (2, (0.37, 0.62), 0),
    "william-tell": (2, (0.29, 0.50), 0),
    "bach-prelude": (4, (0.42, 0.73), 0),
    "beethoven-fifth": (2, (0.37, 0.62), 0),
    "morning-mood": (2, (0.47, 0.85), 0),
    "mountain-king": (4, (0.30, 0.55), 0),
    "borodin-scherzo": (2, (0.31, 0.58), 0),
    "brahms-tragic": (2, (0.36, 0.72), 0),
    "tchaikovsky-march": (4, (0.30, 0.56), 0),
    "bach-fugue": (4, (0.41, 0.71), 0),
}


def read_charts(filename):
    # Both upstream generators emit a JSON object followed by a TS semicolon.
    source = (ROOT / "src/content" / filename).read_text(encoding="utf-8")
    return json.loads(source.split(" = ", 1)[1].strip().removesuffix(";"))


def spectrum(audio, size, n_fft):
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(audio, size // 2), size)[::HOP]
    return np.abs(fft.rfft(frames * signal.windows.hann(size).astype(np.float32), n=n_fft))


def scale(values, floor):
    return np.clip(values / max(float(np.quantile(values, 0.93)), floor), 0, 3)


def attack_peaks(curve, gap, prominence):
    local = ndimage.maximum_filter1d(curve, size=151)
    peaks, _ = signal.find_peaks(curve, distance=gap, prominence=prominence,
                                 height=np.maximum(0.10, 0.105 * local))
    return peaks


def attack_frame(curve, peak):
    # Rewind the rise by at most one centered analysis hop.
    start = peak
    if start > 0 and curve[start - 1] > 0.55 * curve[peak]:
        start -= 1
    return start


def attacks(audio):
    spec = spectrum(audio, 1024, 1024)
    # Compression prevents a few loud tutti chords from setting the sensitivity.
    magnitude = np.log1p(9 * spec)
    reference = ndimage.maximum_filter1d(magnitude, size=3, axis=1)
    reference = np.concatenate((reference[:1], reference[:-1]), axis=0)
    flux = np.maximum(0, magnitude - reference)
    freqs = fft.rfftfreq(1024, 1 / SR)
    def rise(lower, upper, floor):
        band = (freqs >= lower) & (freqs < upper)
        energy = np.sqrt(np.sum(spec[:, band] ** 2, axis=1))
        # Offset transients can raise flux too; require sound after the edge.
        after = np.r_[energy[4:], np.zeros(4)]
        before = np.r_[np.zeros(3), energy[:-3]]
        ratio = after / np.maximum(before, 1e-6)
        live = np.clip((ratio - 0.35) / 0.45, 0, 1)
        return scale(np.mean(flux[:, band], axis=1) * live, floor)

    broad = rise(115, 6800, 0.006)
    low = rise(42, 240, 0.025)
    return broad, low


def pitch_spectra(audio):
    # Long window resolves the bass; shorter window limits lead smearing.
    bass = spectrum(audio, 3072, 8192)
    lead = spectrum(audio, 1536, 4096)
    return salience(bass, 8192), salience(lead, 4096)


def salience(spec, n_fft):
    hz = 440 * 2.0 ** ((MIDI - 69) / 12)
    bins = hz * n_fft / SR

    def sample(locations):
        left = locations.astype(int)
        frac = locations - left
        return spec[:, left] * (1 - frac) + spec[:, left + 1] * frac

    fundamental = sample(bins)
    shoulder = np.maximum(sample(bins * 2 ** (-0.85 / 12)), sample(bins * 2 ** (0.85 / 12)))
    # A candidate needs its own peak, not just harmonics of a missing fundamental.
    contrast = np.maximum(fundamental - 0.73 * shoulder, 0)
    harmonic = sample(2 * bins) + 0.55 * sample(3 * bins) + 0.32 * sample(4 * bins)
    score = np.sqrt(fundamental * contrast) * (1 + 0.32 * np.minimum(
        harmonic / np.maximum(fundamental, 1e-7), 3))
    # Favor a supported lower fundamental over its strong second harmonic.
    score[:, 12:] = np.maximum(score[:, 12:] - 0.50 * score[:, :-12], 0)
    return score, contrast / np.maximum(fundamental, 1e-7)


def pitch_at(features, peak, lower, upper, following, previous=None):
    score, contrast = features
    band = (MIDI >= lower) & (MIDI <= upper)
    stop = min(peak + 11, max(peak + 5, following - 1), len(score))
    segment = score[peak + 2:stop, band]
    before = score[max(0, peak - 7):max(1, peak - 3), band]
    if len(segment) < 3 or not len(before):
        return None
    prior = np.median(before, axis=0)
    steady = np.median(segment, axis=0)
    growth = np.maximum(steady - 0.83 * prior, 0)
    evidence = np.sqrt(growth * steady)
    if previous is not None:
        # Small continuity preference, never a substitute for spectral evidence.
        evidence *= 1 + 0.16 * np.exp(-np.abs(MIDI[band] - previous) / 5)
    best = int(np.argmax(evidence))
    runner_up = float(np.partition(evidence, -2)[-2])
    if (evidence[best] < 0.011 or evidence[best] < runner_up * 1.19
            or growth[best] < 0.40 * steady[best]
            or np.median(contrast[peak + 2:stop, band][:, best]) < 0.24
            or np.count_nonzero(segment[:, best] >= steady[best] * 0.66) < 3):
        return None
    return int(MIDI[band][best])


def track_pulse(broad, low, peaks, meter, period_range, rotation):
    impulse = np.zeros_like(broad)
    impulse[peaks] = np.sqrt(broad[peaks]) + 0.72 * np.sqrt(low[peaks])
    smooth = ndimage.gaussian_filter1d(impulse, 2.4)
    autocorr = signal.correlate(smooth, smooth, mode="full", method="fft")[len(smooth) - 1:]
    lags = np.arange(round(period_range[0] / STEP), round(period_range[1] / STEP) + 1)
    # Reward periodicity beyond just the next beat to distinguish common subdivisions.
    weights = autocorr[lags] + 0.40 * autocorr[2 * lags] + 0.30 * autocorr[meter * lags]
    period = int(lags[np.argmax(weights)])
    score = np.zeros(len(peaks))
    parents = np.full(len(peaks), -1)
    steps = np.ones(len(peaks), dtype=int)
    for i, peak in enumerate(peaks):
        score[i] = impulse[peak]
        left = np.searchsorted(peaks, peak - 10.5 * period)
        indices = np.arange(left, i)
        gaps = (peak - peaks[indices]) / period
        for step in range(1, 11):
            # A one-beat transition follows tempo drift. Larger transitions
            # preserve meter through missing attacks and rests without adding notes.
            tolerance = min(0.49, 0.23 + 0.04 * step)
            keep = np.abs(gaps - step) <= tolerance
            if not np.any(keep):
                continue
            candidates = indices[keep]
            values = score[candidates] - 14 * (gaps[keep] - step) ** 2 - 0.52 * (step - 1)
            j = int(np.argmax(values))
            value = values[j] + impulse[peak]
            if value > score[i]:
                score[i], parents[i], steps[i] = value, candidates[j], step
    indices = []
    cursor = int(np.argmax(score))
    while cursor >= 0:
        indices.append(cursor)
        cursor = parents[cursor]
    indices.reverse()
    beats = np.cumsum(steps[indices]) - steps[indices[0]]
    frames = peaks[indices]
    accents = 0.45 * broad[frames] + low[frames]
    phase_scores = [float(np.mean(accents[beats % meter == offset]))
                    if np.any(beats % meter == offset) else 0.0 for offset in range(meter)]
    phase = (int(np.argmax(phase_scores)) + rotation) % meter
    downbeats = frames[beats % meter == phase]
    return downbeats, period * STEP, phase, phase_scores, frames


def analyze(path, chart, profile):
    pcm = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(path),
                                   "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    audio = np.frombuffer(pcm, dtype="<f4")
    broad, low = attacks(audio)
    bass_pitch, lead_pitch = pitch_spectra(audio)
    broad_peaks = attack_peaks(broad, 8, 0.20)
    bass_peaks = attack_peaks(low, 13, 0.32)
    pulse_curve = broad + 0.72 * low
    pulse_peaks = attack_peaks(pulse_curve, 8, 0.20)
    pulses, period, phase, phase_scores, tracked = track_pulse(broad, low, pulse_peaks, *profile)
    windows = [(s["startBeat"], s["endBeat"]) for s in chart["sections"] if s["mode"] == "play"]
    factor = chart["bpm"] / 60
    events = []

    def add(curve, peak, midi, role):
        frame = attack_frame(curve, peak)
        beat = round(frame * STEP * factor, 5)
        # Tap support only, not a measured sustain. Never cross a play boundary.
        duration = round(0.10 * factor, 5)
        if any(start <= beat and beat + duration <= end for start, end in windows):
            events.append((beat, duration, midi, role))

    for peak in pulses:
        add(pulse_curve, peak, None, "pulse")
    for i, peak in enumerate(bass_peaks):
        following = bass_peaks[i + 1] if i + 1 < len(bass_peaks) else len(low)
        midi = pitch_at(bass_pitch, peak, 28, 55, following)
        if midi is not None or low[peak] >= 0.70:
            add(low, peak, midi, "bass")
    previous, previous_frame = None, -100
    for i, peak in enumerate(broad_peaks):
        following = broad_peaks[i + 1] if i + 1 < len(broad_peaks) else len(broad)
        midi = pitch_at(lead_pitch, peak, 56, 95, following,
                        previous if peak - previous_frame < 55 else None)
        if midi is not None:
            add(broad, peak, midi, "lead")
            previous, previous_frame = midi, peak
        else:
            add(broad, peak, None, "rhythm")

    events.sort(key=lambda e: (e[0], ROLES.index(e[3])))
    for start, end in windows:
        section = [event for event in events if start <= event[0] and event[0] + event[1] <= end]
        counts = Counter(event[3] for event in section)
        if any(counts[role] < minimum for role, minimum in (("pulse", 4), ("bass", 5), ("lead", 8))):
            raise ValueError(f"{path.stem} {start:g}-{end:g}: insufficient play coverage: {counts}")
        for role, seconds in (("pulse", 2.5), ("bass", 1.0), ("lead", 1.0)):
            last = max(beat for beat, _, _, kind in section if kind == role)
            if (end - last) / factor > seconds:
                raise ValueError(f"{path.stem} {start:g}-{end:g}: missing late {role} coverage")
    counts = Counter(event[3] for event in events)
    bass_pitched = sum(event[2] is not None and event[3] == "bass" for event in events)
    contour = [event[2] for event in events if event[3] == "lead"]
    rising = sum(a < b for a, b in zip(contour, contour[1:]))
    falling = sum(a > b for a, b in zip(contour, contour[1:]))
    if not (counts["pulse"] >= 8 and bass_pitched > 4 and len(set(contour)) > 10 and rising and falling):
        raise ValueError(f"{path.stem}: insufficient pulse, pitched bass, or lead contour")
    tracked_gap = np.diff(tracked) * STEP
    diagnostic = (f"{path.stem}: {counts['pulse']}/{counts['bass']}/{counts['lead']}/{counts['rhythm']}"
                  f"  bass pitched={bass_pitched} lead up/down={rising}/{falling}"
                  f"  period={period:.3f}s phase={phase} "
                  f"accent={[round(s, 2) for s in phase_scores]} tracked median gap={np.median(tracked_gap):.3f}s"
                  f"  first pulses={[round(float(p * STEP), 2) for p in pulses[:5]]}")
    return events, diagnostic


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if the checked-in export differs")
    args = parser.parse_args()
    fast = read_charts("fastCharts.generated.ts")
    extra = read_charts("extraCharts.generated.ts")
    lines = [
        "// Generated by tools/music/export_recorded_scores.py; do not edit.",
        "// Inferred attacks from shipped recordings, not a verified transcription.",
        "export const recordedScores: Record<string, readonly (readonly [",
        "  beat: number, duration: number, midi: number | null, role: 'pulse' | 'bass' | 'lead' | 'rhythm',",
        "])[]> = {",
    ]
    for song, profile in TRACKS.items():
        folder, chart = ("expansion-v3", extra[song]) if song in extra else ("v4/backing", fast[song])
        path = ROOT / "public/assets/audio" / folder / f"{song}.ogg"
        events, diagnostic = analyze(path, chart, profile)
        print(diagnostic, flush=True)
        lines.append(f"  // {folder}/{path.name} sha256 {sha256(path.read_bytes()).hexdigest()}")
        lines.append(f'  "{song}": [')
        lines.extend(f"    {json.dumps(event)}," for event in events)
        lines.append("  ],")
    data = "\n".join([*lines, "};", ""])
    if args.check:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != data:
            raise SystemExit("Recorded score export is stale; rerun without --check")
    else:
        TARGET.write_text(data, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
