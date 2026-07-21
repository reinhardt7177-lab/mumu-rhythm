from __future__ import annotations

import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tmp" / "real-recordings"
OUTPUT_DIR = ROOT / "public" / "assets" / "audio" / "v4" / "backing"
CHART_PATH = ROOT / "src" / "content" / "fastCharts.generated.ts"


@dataclass(frozen=True)
class Recording:
    song_id: str
    source_name: str
    source_url: str
    offset_seconds: float
    duration_seconds: float
    bpm: int
    lead_in_beats: int
    min_note_gap: float
    listen_label: str


RECORDINGS = [
    Recording(
        song_id="turkish-march",
        source_name="turkish-imslp.mp3",
        source_url=(
            "https://vmirror.imslp.org/files/imglnks/usimg/4/44/"
            "IMSLP111573-PMLP01846-M%C3%BAsica_Cl%C3%A1sica_-_Rondo_Alla_Turca._Wolfgang_Amadeus_Mozart.mp3"
        ),
        offset_seconds=8.26,
        duration_seconds=68.0,
        bpm=129,
        lead_in_beats=4,
        min_note_gap=0.46,
        listen_label="피아노의 셈여림을 들어요",
    ),
    Recording(
        song_id="can-can",
        source_name="can-can-source.ogg",
        source_url=(
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/"
            "Offenbach_-_Orpheus_in_the_Underworld_-_Overture,_Can_Can_section.ogg"
        ),
        offset_seconds=4.29,
        duration_seconds=74.0,
        bpm=185,
        lead_in_beats=4,
        min_note_gap=0.40,
        listen_label="관현악의 층이 커지는 순간을 들어요",
    ),
    Recording(
        song_id="william-tell",
        source_name="william-source.ogg",
        source_url=(
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/"
            "Gioachino_Rossini,_William_Tell_Overture_(military_band_version,_2000).ogg"
        ),
        offset_seconds=450.83,
        duration_seconds=74.0,
        bpm=152,
        lead_in_beats=4,
        min_note_gap=0.43,
        listen_label="금관과 타악기의 대화를 들어요",
    ),
    Recording(
        song_id="hungarian-dance",
        source_name="hungarian-source.mp3",
        source_url="https://cdn.creazilla.com/sounds/7955548/hungarian-dance-no-5-sound.mp3",
        offset_seconds=3.94,
        duration_seconds=74.0,
        bpm=162,
        lead_in_beats=4,
        min_note_gap=0.46,
        listen_label="느려졌다 빨라지는 숨을 들어요",
    ),
]


def run(command: list[str]) -> None:
    print(" ".join(command))
    subprocess.run(command, cwd=ROOT, check=True)


def ensure_source(recording: Recording) -> Path:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    source = SOURCE_DIR / recording.source_name
    if not source.exists():
        run(["curl.exe", "-L", "--ssl-no-revoke", "-o", str(source), recording.source_url])
    return source


def render_backing(recording: Recording, source: Path) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"{recording.song_id}.ogg"
    lead_seconds = recording.lead_in_beats * 60 / recording.bpm
    total_seconds = lead_seconds + recording.duration_seconds + 0.35
    fade_start = recording.duration_seconds - 1.7
    delay_ms = round(lead_seconds * 1000)
    audio_filter = (
        "highpass=f=28,lowpass=f=19000,"
        "afade=t=in:st=0:d=0.08,"
        f"afade=t=out:st={fade_start:.3f}:d=1.7,"
        "loudnorm=I=-15.5:TP=-1.2:LRA=11,"
        f"adelay={delay_ms}:all=1,"
        "apad=pad_dur=0.35,alimiter=limit=0.95"
    )
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{recording.offset_seconds:.3f}",
        "-t", f"{recording.duration_seconds:.3f}",
        "-i", str(source),
        "-af", audio_filter,
        "-t", f"{total_seconds:.3f}",
        "-ar", "48000", "-ac", "2",
        "-c:a", "libvorbis", "-q:a", "7",
        str(output),
    ])
    return output


def select_onsets(y: np.ndarray, sr: int, minimum_gap: float, duration: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    hop_length = 512
    onset_envelope = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    frames = librosa.onset.onset_detect(
        onset_envelope=onset_envelope,
        sr=sr,
        hop_length=hop_length,
        backtrack=False,
        delta=0.11,
        wait=2,
    )
    times = librosa.frames_to_time(frames, sr=sr, hop_length=hop_length)
    strengths = onset_envelope[np.minimum(frames, len(onset_envelope) - 1)]
    selected_times: list[float] = []
    selected_frames: list[int] = []
    selected_strengths: list[float] = []
    for time, frame, strength in zip(times, frames, strengths, strict=True):
        if time < 0.12 or time > duration - 1.0:
            continue
        if selected_times and time - selected_times[-1] < minimum_gap:
            if strength > selected_strengths[-1] * 1.35:
                selected_times[-1] = float(time)
                selected_frames[-1] = int(frame)
                selected_strengths[-1] = float(strength)
            continue
        selected_times.append(float(time))
        selected_frames.append(int(frame))
        selected_strengths.append(float(strength))
    return np.asarray(selected_times), np.asarray(selected_frames), np.asarray(selected_strengths)


def estimate_pitches(y: np.ndarray, sr: int, frames: np.ndarray) -> np.ndarray:
    hop_length = 512
    pitches, magnitudes = librosa.piptrack(
        y=y,
        sr=sr,
        hop_length=hop_length,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        threshold=0.12,
    )
    midi_values: list[int] = []
    for frame in frames:
        left = max(0, int(frame) - 2)
        right = min(magnitudes.shape[1], int(frame) + 3)
        window = magnitudes[:, left:right]
        if window.size == 0 or float(np.max(window)) <= 0:
            midi_values.append(60)
            continue
        pitch_index, time_index = np.unravel_index(int(np.argmax(window)), window.shape)
        frequency = float(pitches[pitch_index, left + time_index])
        midi_values.append(round(float(librosa.hz_to_midi(max(65.0, frequency)))))
    if len(midi_values) >= 3:
        smoothed = np.asarray(midi_values, dtype=float)
        for index in range(1, len(smoothed) - 1):
            smoothed[index] = np.median(smoothed[index - 1:index + 2])
        return np.clip(np.rint(smoothed), 36, 96).astype(int)
    return np.asarray(midi_values, dtype=int)


def build_chart(recording: Recording, source: Path) -> dict[str, object]:
    y, sr = librosa.load(
        source,
        sr=22050,
        mono=True,
        offset=recording.offset_seconds,
        duration=recording.duration_seconds,
    )
    times, frames, strengths = select_onsets(y, sr, recording.min_note_gap, recording.duration_seconds)
    midi_values = estimate_pitches(y, sr, frames)
    boundaries = np.quantile(midi_values, [0.18, 0.38, 0.62, 0.82]) if len(midi_values) else [50, 57, 64, 72]
    lanes = np.digitize(midi_values, boundaries).astype(int)
    for index in range(1, len(lanes)):
        step = int(lanes[index] - lanes[index - 1])
        if abs(step) > 2:
            lanes[index] = lanes[index - 1] + (2 if step > 0 else -2)
    lanes = np.clip(lanes, 0, 4)

    lead_seconds = recording.lead_in_beats * 60 / recording.bpm
    accent_line = float(np.quantile(strengths, 0.76)) if len(strengths) else math.inf
    notes = []
    for index, (time, midi, lane, strength) in enumerate(zip(times, midi_values, lanes, strengths, strict=True)):
        next_time = times[index + 1] if index + 1 < len(times) else time + 0.55
        gap = float(next_time - time)
        note_seconds = min(1.15, max(0.18, gap * 0.72))
        notes.append({
            "beat": round((lead_seconds + float(time)) * recording.bpm / 60, 3),
            "duration": round(note_seconds * recording.bpm / 60, 3),
            "midi": int(midi),
            "lane": int(lane),
            "accent": bool(strength >= accent_line),
        })

    total_seconds = lead_seconds + recording.duration_seconds + 0.35
    total_beats = total_seconds * recording.bpm / 60
    to_beat = lambda seconds: round(seconds * recording.bpm / 60, 3)
    music_start = lead_seconds
    sections = [
        {"id": "count-in", "label": "음악을 기다려요", "startBeat": 0, "endBeat": recording.lead_in_beats, "mode": "listen"},
        {"id": "theme-1", "label": "첫 번째 주제", "startBeat": recording.lead_in_beats, "endBeat": to_beat(music_start + 20), "mode": "play"},
        {"id": "listen", "label": recording.listen_label, "startBeat": to_beat(music_start + 20), "endBeat": to_beat(music_start + 31), "mode": "listen"},
        {"id": "theme-2", "label": "달라진 주제", "startBeat": to_beat(music_start + 31), "endBeat": to_beat(music_start + 53), "mode": "play"},
        {"id": "finale", "label": "마지막 피날레", "startBeat": to_beat(music_start + 53), "endBeat": round(total_beats, 3), "mode": "play"},
    ]
    print(f"{recording.song_id}: {len(notes)} bars, {total_seconds:.2f}s")
    return {"bpm": recording.bpm, "totalBeats": round(total_beats, 3), "notes": notes, "sections": sections}


def write_charts(charts: dict[str, dict[str, object]]) -> None:
    payload = json.dumps(charts, ensure_ascii=False, indent=2)
    content = (
        "// Generated by tools/build_real_music.py. Do not edit by hand.\n"
        "export interface GeneratedChartNote { beat: number; duration: number; midi: number; lane: number; accent: boolean; }\n"
        "export interface GeneratedTrack { bpm: number; totalBeats: number; notes: GeneratedChartNote[]; sections: { id: string; label: string; startBeat: number; endBeat: number; mode: \"play\" | \"listen\"; }[]; }\n"
        f"export const producedTracks: Record<string, GeneratedTrack> = {payload};\n"
    )
    CHART_PATH.write_text(content, encoding="utf-8")


def main() -> None:
    charts: dict[str, dict[str, object]] = {}
    for recording in RECORDINGS:
        print(f"Building {recording.song_id}")
        source = ensure_source(recording)
        render_backing(recording, source)
        charts[recording.song_id] = build_chart(recording, source)
    write_charts(charts)
    print("Real-performance music build complete")


if __name__ == "__main__":
    main()
