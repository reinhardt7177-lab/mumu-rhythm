"""Render the four speed-classic charts and backing tracks from one score timeline.

Run from the repository root after placing the source scores in ``tmp/midi``.
Requires numpy, music21, and ffmpeg.
"""

from __future__ import annotations

import json
import math
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from music21 import converter


ROOT = Path(__file__).resolve().parents[1]
SCORE_ROOT = ROOT / "tmp" / "midi"
INSTRUMENT_ROOT = ROOT / "public" / "assets" / "audio" / "instruments"
BACKING_ROOT = ROOT / "public" / "assets" / "audio" / "backing"
CHART_OUTPUT = ROOT / "src" / "content" / "fastCharts.generated.ts"
SAMPLE_RATE = 44_100


@dataclass(frozen=True)
class PieceSpec:
    id: str
    score: str
    bpm: int
    beats_per_bar: int
    excerpt_beats: float
    expand_repeats: bool
    lead_in_beats: int
    listen_ranges: tuple[tuple[float, float], ...]
    lead_instrument: str
    secondary_instrument: str
    harmony: tuple[tuple[int, ...], ...]
    density: float = 1.0


PIECES = (
    PieceSpec(
        id="turkish-march",
        score="turkish-march.mxl",
        bpm=144,
        beats_per_bar=2,
        excerpt_beats=120,
        expand_repeats=False,
        lead_in_beats=4,
        listen_ranges=((52, 60),),
        lead_instrument="piano",
        secondary_instrument="trumpet",
        harmony=((45, 52, 57), (45, 52, 57), (40, 47, 52), (40, 47, 52), (41, 48, 53), (40, 47, 52)),
    ),
    PieceSpec(
        id="can-can",
        score="can-can.musicxml",
        bpm=176,
        beats_per_bar=2,
        excerpt_beats=144,
        expand_repeats=False,
        lead_in_beats=4,
        listen_ranges=((60, 68),),
        lead_instrument="violin",
        secondary_instrument="flute",
        harmony=((45, 49, 52), (40, 44, 47), (45, 49, 52), (40, 44, 47), (38, 42, 45), (40, 44, 47)),
    ),
    PieceSpec(
        id="william-tell",
        score="william-tell.musicxml",
        bpm=165,
        beats_per_bar=2,
        excerpt_beats=129,
        expand_repeats=False,
        lead_in_beats=4,
        listen_ranges=((56, 64),),
        lead_instrument="trumpet",
        secondary_instrument="violin",
        harmony=((38, 45, 50), (43, 47, 50), (45, 49, 52), (38, 45, 50), (42, 45, 50), (45, 49, 52)),
    ),
    PieceSpec(
        id="hungarian-dance",
        score="hungarian-dance.mxl",
        bpm=148,
        beats_per_bar=2,
        excerpt_beats=128,
        expand_repeats=False,
        lead_in_beats=4,
        listen_ranges=((52, 60),),
        lead_instrument="violin",
        secondary_instrument="piano",
        harmony=((43, 46, 50), (38, 43, 47), (36, 39, 43), (38, 42, 45), (43, 46, 50), (38, 42, 45)),
    ),
)


ANCHORS: dict[str, tuple[tuple[int, str], ...]] = {
    "piano": ((36, "C2"), (41, "F2"), (45, "A2"), (48, "C3"), (53, "F3"), (57, "A3"), (60, "C4"), (64, "E4"), (67, "G4"), (72, "C5")),
    "flute": ((59, "B3"), (60, "C4"), (64, "E4"), (67, "G4"), (69, "A4"), (71, "B4"), (72, "C5")),
    "strings": ((48, "C3"), (55, "G3"), (60, "C4"), (67, "G4"), (72, "C5")),
    "glockenspiel": ((60, "C4"), (64, "E4"), (67, "G4"), (72, "C5"), (76, "E5")),
    "violin": ((48, "C3"), (55, "G3"), (60, "C4"), (67, "G4"), (72, "C5")),
    "trumpet": ((48, "C3"), (55, "G3"), (60, "C4"), (67, "G4"), (72, "C5")),
    "timpani": ((36, "C2"), (43, "G2"), (48, "C3"), (55, "G3"), (60, "C4")),
}


def decode_sample(path: Path) -> np.ndarray:
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"],
        check=True,
        stdout=subprocess.PIPE,
    )
    return np.frombuffer(result.stdout, dtype=np.float32).copy()


class Mixer:
    def __init__(self, duration_seconds: float) -> None:
        self.audio = np.zeros((math.ceil(duration_seconds * SAMPLE_RATE), 2), dtype=np.float32)
        self.samples: dict[tuple[str, int], np.ndarray] = {}
        self.rng = np.random.default_rng(7177)

    def sample_for(self, instrument: str, midi: int) -> tuple[np.ndarray, int]:
        anchor_midi, anchor_name = min(ANCHORS[instrument], key=lambda item: abs(item[0] - midi))
        key = (instrument, anchor_midi)
        if key not in self.samples:
            self.samples[key] = decode_sample(INSTRUMENT_ROOT / instrument / f"{anchor_name}.mp3")
        return self.samples[key], anchor_midi

    def note(self, instrument: str, midi: int, start: float, duration: float, level: float, pan: float = 0) -> None:
        if start < 0 or start >= len(self.audio) / SAMPLE_RATE:
            return
        source, anchor = self.sample_for(instrument, midi)
        rate = 2 ** ((midi - anchor) / 12)
        release = 0.3 if instrument in {"piano", "glockenspiel", "timpani"} else 0.16
        output_length = max(1, int((duration + release) * SAMPLE_RATE))
        source_positions = np.arange(output_length, dtype=np.float64) * rate
        valid = source_positions < len(source) - 1
        if not np.any(valid):
            return
        source_positions = source_positions[valid]
        left = source_positions.astype(np.int64)
        fraction = source_positions - left
        rendered = source[left] * (1 - fraction) + source[left + 1] * fraction

        attack = 0.045 if instrument in {"strings", "violin", "flute", "trumpet"} else 0.006
        attack_samples = min(len(rendered), max(1, int(attack * SAMPLE_RATE)))
        rendered[:attack_samples] *= np.linspace(0, 1, attack_samples, dtype=np.float32)
        release_samples = min(len(rendered), max(1, int(release * SAMPLE_RATE)))
        rendered[-release_samples:] *= np.linspace(1, 0, release_samples, dtype=np.float32)
        rendered *= level

        start_index = int(start * SAMPLE_RATE)
        end_index = min(len(self.audio), start_index + len(rendered))
        rendered = rendered[: end_index - start_index]
        left_gain = math.sqrt((1 - max(-1, min(1, pan))) / 2)
        right_gain = math.sqrt((1 + max(-1, min(1, pan))) / 2)
        self.audio[start_index:end_index, 0] += rendered * left_gain
        self.audio[start_index:end_index, 1] += rendered * right_gain

    def noise_hit(self, start: float, level: float, bright: bool = False) -> None:
        length = int((0.055 if bright else 0.16) * SAMPLE_RATE)
        noise = self.rng.normal(0, 1, length).astype(np.float32)
        if bright:
            noise[1:] = noise[1:] - noise[:-1] * 0.86
        else:
            noise = np.cumsum(noise)
            noise /= max(1e-6, np.max(np.abs(noise)))
        noise *= np.exp(-np.linspace(0, 7 if bright else 9, length)).astype(np.float32) * level
        index = int(start * SAMPLE_RATE)
        end = min(len(self.audio), index + length)
        self.audio[index:end, 0] += noise[: end - index] * 0.74
        self.audio[index:end, 1] += noise[: end - index] * 0.68

    def finish(self) -> np.ndarray:
        dry = self.audio.copy()
        for delay, gain, swap in ((0.07, 0.09, True), (0.127, 0.065, False), (0.193, 0.045, True)):
            shift = int(delay * SAMPLE_RATE)
            source = dry[:-shift, ::-1] if swap else dry[:-shift]
            self.audio[shift:] += source * gain
        self.audio = np.tanh(self.audio * 1.28)
        peak = float(np.max(np.abs(self.audio)))
        if peak > 0:
            self.audio *= 0.91 / peak
        fade = min(len(self.audio), int(0.7 * SAMPLE_RATE))
        self.audio[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
        return self.audio


def score_events(spec: PieceSpec) -> tuple[list[list[dict[str, float | int]]], list[dict[str, float | int]]]:
    score = converter.parse(str(SCORE_ROOT / spec.score))
    if spec.expand_repeats:
        score = score.expandRepeats()
    parts: list[list[dict[str, float | int]]] = []
    for part in score.parts:
        events: list[dict[str, float | int]] = []
        for element in part.flatten().notes:
            pitches = [element.pitch.midi] if element.isNote else [pitch.midi for pitch in element.pitches]
            if not pitches or float(element.quarterLength) <= 0:
                continue
            offset = float(element.offset)
            if offset >= spec.excerpt_beats:
                continue
            duration = min(float(element.quarterLength), spec.excerpt_beats - offset)
            for midi in pitches:
                events.append({"beat": offset, "duration": duration, "midi": int(midi)})
        parts.append(events)

    melody_source = parts[0]
    onsets: dict[float, list[dict[str, float | int]]] = {}
    for event in melody_source:
        quantized = round(float(event["beat"]) / spec.density) * spec.density
        if abs(float(event["beat"]) - quantized) <= spec.density * 0.46:
            onsets.setdefault(round(quantized, 4), []).append(event)

    melody: list[dict[str, float | int]] = []
    last_beat = -99.0
    for beat in sorted(onsets):
        if beat - last_beat < spec.density - 1e-4:
            continue
        selected = max(onsets[beat], key=lambda event: int(event["midi"]))
        melody.append({
            "beat": beat + spec.lead_in_beats,
            "duration": max(spec.density, min(2.0, float(selected["duration"]))),
            "midi": int(selected["midi"]),
        })
        last_beat = beat
    return parts, melody


def assign_lanes(melody: list[dict[str, float | int]]) -> None:
    pitches = sorted({int(note["midi"]) for note in melody})
    lane_for_pitch = {
        pitch: round(index * 4 / max(1, len(pitches) - 1))
        for index, pitch in enumerate(pitches)
    }
    for note in melody:
        pitch = int(note["midi"])
        note["lane"] = lane_for_pitch[pitch]


def in_listen_range(beat: float, ranges: tuple[tuple[float, float], ...]) -> bool:
    return any(start <= beat < end for start, end in ranges)


def render_piece(spec: PieceSpec, parts: list[list[dict[str, float | int]]]) -> None:
    beat_seconds = 60 / spec.bpm
    total_beats = spec.lead_in_beats + spec.excerpt_beats + spec.beats_per_bar * 2
    mixer = Mixer(total_beats * beat_seconds + 0.8)
    music_offset = spec.lead_in_beats * beat_seconds

    for part_index, events in enumerate(parts):
        for event_index, event in enumerate(events):
            beat = float(event["beat"])
            midi = int(event["midi"])
            duration = max(0.08, float(event["duration"]) * beat_seconds * 0.92)
            start = music_offset + beat * beat_seconds
            if spec.id == "turkish-march":
                instrument = "piano"
                level = 0.14 if part_index == 0 else 0.095
            elif spec.id == "can-can":
                instrument = "violin" if midi >= 64 else "piano"
                level = 0.13 if midi >= 64 else 0.08
            elif spec.id == "william-tell":
                instrument = "trumpet" if part_index == 0 else "violin"
                level = 0.12 if part_index == 0 else 0.085
            else:
                instrument = "violin" if part_index == 0 else "piano"
                level = 0.13 if part_index == 0 else 0.085
            pan = (-0.22 if part_index % 2 == 0 else 0.22) + ((event_index % 5) - 2) * 0.012
            mixer.note(instrument, midi, start, duration, level, pan)

            is_accent = abs(beat - round(beat)) < 0.02 and int(round(beat)) % spec.beats_per_bar == 0
            if is_accent and midi >= 67:
                color_instrument = "glockenspiel" if spec.id in {"turkish-march", "can-can"} else spec.secondary_instrument
                mixer.note(color_instrument, midi + (12 if midi < 72 else 0), start, min(duration, beat_seconds * 0.65), 0.035, -pan)

    bar_count = math.ceil(spec.excerpt_beats / spec.beats_per_bar)
    for bar in range(bar_count):
        chord = spec.harmony[bar % len(spec.harmony)]
        bar_beat = bar * spec.beats_per_bar
        bar_start = music_offset + bar_beat * beat_seconds
        for index, midi in enumerate(chord):
            mixer.note("strings", midi + (12 if index else 0), bar_start, spec.beats_per_bar * beat_seconds * 0.92, 0.045, (index - 1) * 0.26)
        mixer.note("timpani", chord[0], bar_start, beat_seconds * 0.68, 0.105 if bar % 4 == 0 else 0.065, -0.16)

        for pulse in range(spec.beats_per_bar * 2):
            pulse_beat = bar_beat + pulse * 0.5
            if pulse_beat >= spec.excerpt_beats:
                break
            pulse_start = music_offset + pulse_beat * beat_seconds
            root = chord[0] + (12 if pulse % 2 else 0)
            mixer.note("piano", root, pulse_start, beat_seconds * 0.32, 0.042 if pulse % 2 else 0.06, 0.12)
            mixer.noise_hit(pulse_start, 0.016 if pulse % 2 else 0.024, bright=True)
        if spec.id != "turkish-march":
            mixer.noise_hit(bar_start + beat_seconds, 0.038, bright=False)

    audio = mixer.finish()
    BACKING_ROOT.mkdir(parents=True, exist_ok=True)
    wav_path = BACKING_ROOT / f"{spec.id}.wav"
    ogg_path = BACKING_ROOT / f"{spec.id}.ogg"
    with wave.open(str(wav_path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes((audio * 32767).astype("<i2").tobytes())
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(wav_path),
            "-af", "loudnorm=I=-15.5:TP=-1.2:LRA=7", "-c:a", "libvorbis", "-q:a", "5", str(ogg_path),
        ],
        check=True,
    )
    wav_path.unlink()


def write_charts(charts: dict[str, list[dict[str, float | int | bool]]]) -> None:
    lines = [
        "// Generated by tools/render_classics.py. Do not edit by hand.",
        "export interface FastChartNote {",
        "  beat: number;",
        "  duration: number;",
        "  midi: number;",
        "  lane: number;",
        "  accent: boolean;",
        "}",
        "",
        "export const fastCharts: Record<string, FastChartNote[]> = " + json.dumps(charts, ensure_ascii=False, separators=(",", ":")) + ";",
        "",
    ]
    CHART_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    charts: dict[str, list[dict[str, float | int | bool]]] = {}
    for spec in PIECES:
        parts, melody = score_events(spec)
        melody = [note for note in melody if not in_listen_range(float(note["beat"]), spec.listen_ranges)]
        assign_lanes(melody)
        charts[spec.id] = [
            {
                **note,
                "beat": round(float(note["beat"]), 3),
                "duration": round(float(note["duration"]), 3),
                "accent": int(round(float(note["beat"]))) % spec.beats_per_bar == 0,
            }
            for note in melody
        ]
        render_piece(spec, parts)
        print(f"{spec.id}: {len(charts[spec.id])} chart notes")
    write_charts(charts)


if __name__ == "__main__":
    main()
