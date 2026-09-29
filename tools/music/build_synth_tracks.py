from __future__ import annotations

import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / "tmp" / "synth"
OUTPUT = ROOT / "public" / "assets" / "audio" / "v5" / "synth"
CHART_PATH = ROOT / "src" / "content" / "synthCharts.generated.ts"
SAMPLE_RATE = 48_000
BPM = 150
BEAT_SECONDS = 60 / BPM
LEAD_BEATS = 4
BARS = 48
TOTAL_BEATS = LEAD_BEATS + BARS * 4
TAIL_SECONDS = 1.6
TOTAL_SECONDS = TOTAL_BEATS * BEAT_SECONDS + TAIL_SECONDS
RNG = np.random.default_rng(7177)


def midi_frequency(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def envelope(length: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    attack_n = min(length, max(1, int(attack * SAMPLE_RATE)))
    decay_n = min(length - attack_n, max(1, int(decay * SAMPLE_RATE)))
    release_n = min(length - attack_n - decay_n, max(1, int(release * SAMPLE_RATE)))
    sustain_n = max(0, length - attack_n - decay_n - release_n)
    parts = [
        np.linspace(0, 1, attack_n, endpoint=False, dtype=np.float32),
        np.linspace(1, sustain, decay_n, endpoint=False, dtype=np.float32),
        np.full(sustain_n, sustain, dtype=np.float32),
        np.linspace(sustain, 0, release_n, endpoint=True, dtype=np.float32),
    ]
    return np.concatenate(parts)[:length]


def pan_stereo(mono: np.ndarray, pan: float) -> np.ndarray:
    angle = (np.clip(pan, -1, 1) + 1) * math.pi / 4
    return np.column_stack((mono * math.cos(angle), mono * math.sin(angle))).astype(np.float32)


def place(track: np.ndarray, sound: np.ndarray, start_seconds: float) -> None:
    start = max(0, int(start_seconds * SAMPLE_RATE))
    end = min(len(track), start + len(sound))
    if end > start:
        track[start:end] += sound[: end - start]


def synth_note(midi: float, duration: float, amplitude: float, voice: str, pan: float = 0) -> np.ndarray:
    length = max(2, int(duration * SAMPLE_RATE))
    time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    frequency = midi_frequency(midi)
    phase = 2 * np.pi * frequency * time
    if voice == "bass":
        mono = 0.72 * np.sin(phase) + 0.2 * np.sin(phase * 2) + 0.08 * np.sin(phase * 3)
        env = envelope(length, 0.008, 0.09, 0.62, min(0.16, duration * 0.35))
    elif voice == "pad":
        mono = sum(np.sin(phase * harmonic) / (harmonic ** 1.45) for harmonic in range(1, 8))
        mono += 0.26 * np.sin(2 * np.pi * frequency * 1.006 * time)
        env = envelope(length, 0.16, 0.28, 0.72, min(0.65, duration * 0.3))
    elif voice == "lead":
        mono = 0.58 * np.sin(phase) + 0.23 * np.sin(phase * 2) + 0.11 * np.sin(phase * 3)
        mono += 0.08 * np.sin(phase * 0.5)
        env = envelope(length, 0.006, 0.11, 0.5, min(0.18, duration * 0.32))
    else:
        mono = sum(np.sin(phase * harmonic) / harmonic for harmonic in range(1, 6))
        env = envelope(length, 0.002, 0.12, 0.18, min(0.13, duration * 0.4))
    mono = np.tanh(mono * 0.92) * env * amplitude
    return pan_stereo(mono.astype(np.float32), pan)


def kick() -> np.ndarray:
    duration = 0.42
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    phase = 2 * np.pi * (48 * time + 74 * (1 - np.exp(-time * 28)) / 28)
    body = np.sin(phase) * np.exp(-time * 10.5)
    click = RNG.normal(0, 1, length).astype(np.float32) * np.exp(-time * 90) * 0.12
    return pan_stereo(np.tanh((body + click) * 1.35) * 0.72, 0)


def snare() -> np.ndarray:
    duration = 0.34
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.normal(0, 1, length).astype(np.float32)
    tone = np.sin(2 * np.pi * 185 * time) * np.exp(-time * 16)
    mono = (noise * np.exp(-time * 13) * 0.38 + tone * 0.28) * 0.72
    return pan_stereo(np.tanh(mono), 0.08)


def hat(open_hat: bool = False, pan: float = 0) -> np.ndarray:
    duration = 0.24 if open_hat else 0.075
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.normal(0, 1, length).astype(np.float32)
    bright = noise - np.concatenate(([0], noise[:-1]))
    mono = bright * np.exp(-time * (18 if open_hat else 62)) * (0.11 if open_hat else 0.075)
    return pan_stereo(mono, pan)


def beat_time(beat: float) -> float:
    return beat * BEAT_SECONDS


def build_audio() -> np.ndarray:
    track = np.zeros((int(TOTAL_SECONDS * SAMPLE_RATE), 2), dtype=np.float32)
    kick_sample = kick()
    snare_sample = snare()
    progression = [45, 41, 48, 43]  # A, F, C, G
    chord_intervals = [0, 3, 7, 10]
    arp_patterns = [[0, 2, 1, 3, 2, 1, 0, 2], [0, 1, 3, 2, 1, 3, 2, 1]]

    for bar in range(BARS):
        section_beat = LEAD_BEATS + bar * 4
        root = progression[bar % len(progression)]
        intensity = 0.58 if bar < 4 else 0.78 if bar < 20 else 0.9
        if 16 <= bar < 20:
            intensity = 0.38

        for chord_midi in [root + 12 + interval for interval in chord_intervals[:3]]:
            place(track, synth_note(chord_midi, 4.15 * BEAT_SECONDS, 0.075 * intensity, "pad", (chord_midi % 3 - 1) * 0.35), beat_time(section_beat))

        for beat in range(4):
            absolute = section_beat + beat
            if not (16 <= bar < 20) or beat in (0, 2):
                if beat in (0, 2) or (bar >= 36 and beat == 3):
                    place(track, kick_sample * intensity, beat_time(absolute))
                if beat in (1, 3):
                    place(track, snare_sample * intensity, beat_time(absolute))
            bass_midi = root + 12 + ([0, 0, 7, 10][beat] if bar >= 4 else 0)
            place(track, synth_note(bass_midi, 0.82 * BEAT_SECONDS, 0.22 * intensity, "bass", -0.05), beat_time(absolute))

        for step in range(8):
            absolute = section_beat + step * 0.5
            place(track, hat(step % 4 == 3, -0.24 if step % 2 == 0 else 0.24) * intensity, beat_time(absolute))
            if bar >= 4 and not (16 <= bar < 20):
                chord = [root + 24 + interval for interval in chord_intervals]
                arp_midi = chord[arp_patterns[bar % 2][step]]
                place(track, synth_note(arp_midi, 0.38 * BEAT_SECONDS, 0.092 * intensity, "pluck", (step % 5 - 2) * 0.18), beat_time(absolute))

        motif = [0, 3, 7, 10, 7, 12, 10, 7] if bar < 24 else [0, 7, 10, 12, 15, 12, 10, 7]
        if bar >= 8 and not (16 <= bar < 20):
            for step, interval in enumerate(motif):
                if bar < 36 and step % 2 == 1:
                    continue
                place(track, synth_note(root + 24 + interval, 0.42 * BEAT_SECONDS, 0.105 * intensity, "lead", (step % 5 - 2) * 0.14), beat_time(section_beat + step * 0.5))

    # Stereo tempo delay and gentle sidechain pumping.
    delay = int(0.3 * SAMPLE_RATE)
    track[delay:, 1] += track[:-delay, 0] * 0.12
    track[delay // 2:, 0] += track[: -delay // 2, 1] * 0.06
    time = np.arange(len(track), dtype=np.float32) / SAMPLE_RATE
    beat_phase = np.mod(time / BEAT_SECONDS, 1)
    pump = 0.72 + 0.28 * np.minimum(1, beat_phase * 5.5)
    track *= pump[:, None]
    track = np.tanh(track * 1.18)
    peak = float(np.max(np.abs(track)))
    return (track / max(1, peak) * 0.92).astype(np.float32)


def build_chart() -> dict[str, object]:
    notes: list[dict[str, object]] = []
    lane_midi = [48, 55, 60, 67, 72]
    patterns = [
        [0, 1, 2, 3, 4, 3, 2, 1],
        [4, 2, 3, 1, 2, 0, 1, 3],
        [0, 2, 4, 3, 1, 2, 4, 1],
        [2, 3, 4, 2, 0, 1, 3, 1],
    ]
    for bar in range(BARS):
        start = LEAD_BEATS + bar * 4
        if 16 <= bar < 20:
            lane = [1, 3, 2, 4][bar - 16]
            notes.append({"beat": start, "duration": 2.5, "midi": lane_midi[lane], "lane": lane, "accent": True})
            notes.append({"beat": start + 3, "duration": 0.65, "midi": lane_midi[2], "lane": 2, "accent": False})
            continue
        pattern = patterns[bar % len(patterns)]
        steps = range(0, 8, 2) if bar < 4 else range(8)
        for step in steps:
            lane = pattern[step]
            duration = 0.42
            if bar % 8 == 7 and step == 6:
                duration = 1.8
            notes.append({
                "beat": round(start + step * 0.5, 3),
                "duration": duration,
                "midi": lane_midi[lane],
                "lane": lane,
                "accent": step in (0, 4),
            })

    sections = [
        {"id": "count-in", "label": "빛의 문이 열려요", "startBeat": 0, "endBeat": 4, "mode": "listen"},
        {"id": "launch", "label": "첫 번째 네온 주제", "startBeat": 4, "endBeat": 68, "mode": "play"},
        {"id": "break", "label": "신스의 층을 들어요", "startBeat": 68, "endBeat": 84, "mode": "listen"},
        {"id": "drive", "label": "더 빨라진 변주", "startBeat": 84, "endBeat": 148, "mode": "play"},
        {"id": "finale", "label": "별빛 피날레", "startBeat": 148, "endBeat": TOTAL_BEATS, "mode": "play"},
    ]
    return {"bpm": BPM, "totalBeats": TOTAL_BEATS, "notes": notes, "sections": sections}


def write_wav(track: np.ndarray, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(track, -1, 1) * 32767).astype("<i2")
    with wave.open(str(destination), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def encode(wav_path: Path) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    analysis = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-i", str(wav_path),
            "-af", "loudnorm=I=-14.5:TP=-1.0:LRA=9:print_format=json",
            "-f", "null", "-",
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    match = re.search(r"\{\s*\"input_i\".*?\}", analysis.stderr, re.DOTALL)
    if not match:
        raise RuntimeError("FFmpeg loudness analysis did not return JSON.")
    measured = json.loads(match.group(0))
    filters = (
        "loudnorm=I=-14.5:TP=-1.0:LRA=9:linear=true"
        f":measured_I={measured['input_i']}"
        f":measured_LRA={measured['input_lra']}"
        f":measured_TP={measured['input_tp']}"
        f":measured_thresh={measured['input_thresh']}"
        f":offset={measured['target_offset']},"
        "alimiter=limit=0.96"
    )
    common = ["ffmpeg", "-y", "-loglevel", "error", "-fflags", "+bitexact", "-i", str(wav_path), "-map_metadata", "-1", "-af", filters]
    commands = [
        [*common, "-flags:a", "+bitexact", "-c:a", "libopus", "-b:a", "128k", str(OUTPUT / "neon-run.ogg")],
        [*common, "-flags:a", "+bitexact", "-c:a", "aac", "-b:a", "160k", str(OUTPUT / "neon-run.m4a")],
    ]
    for command in commands:
        subprocess.run(command, cwd=ROOT, check=True)


def write_chart(chart: dict[str, object]) -> None:
    payload = json.dumps({"neon-run": chart}, ensure_ascii=False, indent=2)
    CHART_PATH.write_text(
        "// Generated by tools/music/build_synth_tracks.py. Do not edit by hand.\n"
        'import type { GeneratedTrack } from "./fastCharts.generated";\n'
        f"export const synthTracks: Record<string, GeneratedTrack> = {payload};\n",
        encoding="utf-8",
    )


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    print(f"Rendering Neon Run: {BPM} BPM, {TOTAL_SECONDS:.1f}s")
    track = build_audio()
    wav_path = TMP / "neon-run.wav"
    write_wav(track, wav_path)
    encode(wav_path)
    chart = build_chart()
    write_chart(chart)
    print(f"Created {len(chart['notes'])} gameplay notes")


if __name__ == "__main__":
    main()
