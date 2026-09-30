"""Deterministic NumPy synthesis core shared by every MUMU original synth track.

Every random source is a per-track ``numpy.random.Generator`` so each song renders
bit-identically regardless of which other songs are built in the same run.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SAMPLE_RATE = 48_000
HOLD_NOTE_MIN_BEATS = 1.75  # Mirrors src/types.ts


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


def synth_note(midi: float, duration: float, amplitude: float, voice: str, pan: float = 0) -> np.ndarray:
    """Pitched voices. bass/pad/lead/pluck are the original Neon Run voices and must stay unchanged."""
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
    elif voice == "chip":
        # Soft square: odd harmonics with a gentle vibrato that grows on long notes.
        vibrato = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * time) * np.minimum(1, time * 3)
        chip_phase = phase * vibrato
        mono = sum(np.sin(chip_phase * harmonic) / harmonic for harmonic in (1, 3, 5, 7)) * 0.8
        env = envelope(length, 0.004, 0.07, 0.62, min(0.12, duration * 0.3))
    elif voice == "bell":
        # Two-operator FM bell; the index decays so the attack sparkles and the tail is round.
        index = 1.7 * np.exp(-time * 7)
        mono = np.sin(phase + index * np.sin(phase * 3.5)) * 0.9 + 0.12 * np.sin(phase * 2)
        env = envelope(length, 0.002, 0.28, 0.32, min(0.3, duration * 0.4))
    elif voice == "brass":
        # Band-limited saw whose upper harmonics open during the attack (filter-sweep feel).
        opening = np.minimum(1, time * 14)
        mono = sum(np.sin(phase * harmonic) / harmonic * (opening if harmonic > 2 else 1) for harmonic in range(1, 9)) * 0.7
        env = envelope(length, 0.025, 0.12, 0.7, min(0.15, duration * 0.3))
    else:  # pluck
        mono = sum(np.sin(phase * harmonic) / harmonic for harmonic in range(1, 6))
        env = envelope(length, 0.002, 0.12, 0.18, min(0.13, duration * 0.4))
    mono = np.tanh(mono * 0.92) * env * amplitude
    return pan_stereo(mono.astype(np.float32), pan)


@dataclass
class Mix:
    """Stereo float mix bus for one track with its own seeded noise generator."""

    bpm: float
    total_beats: float
    tail_seconds: float
    seed: int
    rng: np.random.Generator = field(init=False)
    beat_seconds: float = field(init=False)
    total_seconds: float = field(init=False)
    track: np.ndarray = field(init=False)

    def __post_init__(self) -> None:
        self.rng = np.random.default_rng(self.seed)
        self.beat_seconds = 60 / self.bpm
        self.total_seconds = self.total_beats * self.beat_seconds + self.tail_seconds
        self.track = np.zeros((int(self.total_seconds * SAMPLE_RATE), 2), dtype=np.float32)

    def beat_time(self, beat: float) -> float:
        return beat * self.beat_seconds

    def place(self, sound: np.ndarray, beat: float) -> None:
        start = max(0, int(self.beat_time(beat) * SAMPLE_RATE))
        end = min(len(self.track), start + len(sound))
        if end > start:
            self.track[start:end] += sound[: end - start]

    def note(self, beat: float, beats: float, midi: float, amplitude: float, voice: str, pan: float = 0) -> None:
        self.place(synth_note(midi, beats * self.beat_seconds, amplitude, voice, pan), beat)

    # ---------------------------------------------------------------- drums

    def kick(self) -> np.ndarray:
        duration = 0.42
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        phase = 2 * np.pi * (48 * time + 74 * (1 - np.exp(-time * 28)) / 28)
        body = np.sin(phase) * np.exp(-time * 10.5)
        click = self.rng.normal(0, 1, length).astype(np.float32) * np.exp(-time * 90) * 0.12
        return pan_stereo(np.tanh((body + click) * 1.35) * 0.72, 0)

    def snare(self) -> np.ndarray:
        duration = 0.34
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        noise = self.rng.normal(0, 1, length).astype(np.float32)
        tone = np.sin(2 * np.pi * 185 * time) * np.exp(-time * 16)
        mono = (noise * np.exp(-time * 13) * 0.38 + tone * 0.28) * 0.72
        return pan_stereo(np.tanh(mono), 0.08)

    def hat(self, open_hat: bool = False, pan: float = 0) -> np.ndarray:
        duration = 0.24 if open_hat else 0.075
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        noise = self.rng.normal(0, 1, length).astype(np.float32)
        bright = noise - np.concatenate(([0], noise[:-1]))
        mono = bright * np.exp(-time * (18 if open_hat else 62)) * (0.11 if open_hat else 0.075)
        return pan_stereo(mono, pan)

    def clap(self, pan: float = -0.06) -> np.ndarray:
        """Three quick noise flams followed by a short room tail."""
        duration = 0.3
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        noise = self.rng.normal(0, 1, length).astype(np.float32)
        bright = noise - 0.6 * np.concatenate(([0], noise[:-1]))
        flams = sum(np.exp(-np.maximum(0, time - offset) * 150) * (time >= offset) for offset in (0.0, 0.011, 0.023))
        tail = np.exp(-time * 16) * 0.45
        attack = np.minimum(1, time / 0.0015)  # 1.5 ms ramp keeps the codec from ringing on the onset
        return pan_stereo(np.tanh(bright * (flams + tail) * 0.2) * attack * 0.7, pan)

    def blip(self, midi: float, pan: float = 0) -> np.ndarray:
        """Robot blip: a fast downward sine chirp."""
        duration = 0.09
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        start = midi_frequency(midi)
        phase = 2 * np.pi * (start * 0.5 * time + start * 0.5 * (1 - np.exp(-time * 40)) / 40)
        return pan_stereo(np.sin(phase) * np.exp(-time * 38) * 0.16, pan)

    def crash(self) -> np.ndarray:
        duration = 1.6
        length = int(duration * SAMPLE_RATE)
        time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
        noise = self.rng.normal(0, 1, (length, 2)).astype(np.float32)
        bright = noise - np.vstack(([0, 0], noise[:-1]))
        return (bright * (np.exp(-time * 2.6) * 0.07)[:, None]).astype(np.float32)

    # ---------------------------------------------------------------- master

    def master(
        self,
        delay_seconds: float,
        pump_floor: float,
        pump_depth: float,
        drive: float = 1.18,
        ceiling: float = 0.92,
        delay_right: float = 0.12,
        delay_left: float = 0.06,
    ) -> np.ndarray:
        """Stereo ping-pong delay, sidechain-style pump, soft clip and peak normalize."""
        track = self.track
        delay = int(delay_seconds * SAMPLE_RATE)
        half = delay // 2
        track[delay:, 1] += track[:-delay, 0] * delay_right
        track[half:, 0] += track[:-half, 1] * delay_left
        time = np.arange(len(track), dtype=np.float32) / SAMPLE_RATE
        beat_phase = np.mod(time / self.beat_seconds, 1)
        pump = pump_floor + pump_depth * np.minimum(1, beat_phase * 5.5)
        track *= pump[:, None]
        track = np.tanh(track * drive)
        peak = float(np.max(np.abs(track)))
        return (track / max(1, peak) * ceiling).astype(np.float32)


# -------------------------------------------------------------------- files


def write_wav(track: np.ndarray, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(track, -1, 1) * 32767).astype("<i2")
    with wave.open(str(destination), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def encode(wav_path: Path, output_dir: Path, stem: str, cwd: Path, loudness: float = -14.5, true_peak: float = -1.0, limit: float = 0.96) -> list[Path]:
    """Two-pass loudness normalization, then bit-exact Opus/OGG and AAC/M4A encodes."""
    output_dir.mkdir(parents=True, exist_ok=True)
    analysis = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-i", str(wav_path),
            "-af", f"loudnorm=I={loudness}:TP={true_peak}:LRA=9:print_format=json",
            "-f", "null", "-",
        ],
        cwd=cwd,
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
        f"loudnorm=I={loudness}:TP={true_peak}:LRA=9:linear=true"
        f":measured_I={measured['input_i']}"
        f":measured_LRA={measured['input_lra']}"
        f":measured_TP={measured['input_tp']}"
        f":measured_thresh={measured['input_thresh']}"
        f":offset={measured['target_offset']},"
        f"alimiter=limit={limit}:level=false"  # level=false: keep the ceiling (auto-level would re-normalize to 0 dBFS)
    )
    common = ["ffmpeg", "-y", "-loglevel", "error", "-fflags", "+bitexact", "-i", str(wav_path), "-map_metadata", "-1", "-af", filters]
    outputs = [output_dir / f"{stem}.ogg", output_dir / f"{stem}.m4a"]
    # "-fflags +bitexact" after the input also applies to the muxers, so the Ogg serial
    # number and container metadata are fixed and repeated builds are byte-identical.
    commands = [
        [*common, "-flags:a", "+bitexact", "-c:a", "libopus", "-b:a", "128k", "-fflags", "+bitexact", str(outputs[0])],
        [*common, "-flags:a", "+bitexact", "-c:a", "aac", "-b:a", "160k", "-fflags", "+bitexact", str(outputs[1])],
    ]
    for command in commands:
        subprocess.run(command, cwd=cwd, check=True)
    return outputs
