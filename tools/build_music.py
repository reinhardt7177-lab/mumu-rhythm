from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

from music21 import chord, instrument, meter, note, stream, tempo


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "music-toolchain"
RENDER_DIR = ROOT / "tmp" / "music-renders"
BACKING_DIR = ROOT / "public" / "assets" / "audio" / "v3" / "backing"
HIT_DIR = ROOT / "public" / "assets" / "audio" / "v3" / "hits"
CHART_OUTPUT = ROOT / "src" / "content" / "fastCharts.generated.ts"

FLUIDSYNTH_URL = (
    "https://github.com/FluidSynth/fluidsynth/releases/download/v2.5.6/"
    "fluidsynth-v2.5.6-win10-x64-cpp11.zip"
)
SOUNDFONT_URL = "https://raw.githubusercontent.com/ad-si/GeneralUser/master/GeneralUser.sf2"


@dataclass(frozen=True)
class SourceEvent:
    beat: float
    duration: float
    pitches: tuple[int, ...]


@dataclass(frozen=True)
class TrackSpec:
    song_id: str
    bpm: int
    beats_per_bar: int
    lead_program: int
    lead_bank: str
    passes: int
    interlude_after: int
    harmony: tuple[tuple[int, int, int], ...]
    score: str


# Melody transcriptions adapted from appleweiping/cadenza (MIT).
# The arrangements, orchestration, dynamics and gameplay charts are original to this project.
TRACKS = (
    TrackSpec(
        song_id="turkish-march",
        bpm=144,
        beats_per_bar=2,
        lead_program=0,
        lead_bank="piano",
        passes=3,
        interlude_after=1,
        harmony=((45, 52, 57), (40, 47, 52), (41, 48, 53), (40, 47, 52)),
        score="""
        B4/16 A4/16 G#4/16 A4/16 C5/8 C5/16 D5/16 C5/16 B4/16 C5/8 | E5/16 F5/16 E5/16 D#5/16 E5/16 B5/16 A5/16 G#5/16 A5/8
        B5/16 A5/16 G#5/16 A5/16 C6/4 A5/16 C6/16 | B5/16 A5/16 G5/16 A5/16 B5/16 A5/16 G5/16 A5/16 C6/8 A5/8
        C5/16 D5/16 C5/16 B4/16 C5/16 E5/16 D5/16 C5/16 B4/16 C5/16 B4/16 A4/16 G#4/8 E4/8
        A4/16 B4/16 C5/16 D5/16 E5/16 F5/16 E5/16 D#5/16 E5/16 B5/16 A5/16 G#5/16 A5/16 B5/16 A5/16 G#5/16
        A5/4 E5/8 C5/8 A4/4 r/4
        B4/16 A4/16 G#4/16 A4/16 C5/8 C5/16 D5/16 C5/16 B4/16 C5/8 | E5/16 F5/16 E5/16 D#5/16 E5/16 B5/16 A5/16 G#5/16 A5/8
        B5/16 A5/16 G#5/16 A5/16 C6/4 A5/16 C6/16 | B5/16 A5/16 G5/16 A5/16 B5/16 A5/16 G5/16 A5/16 C6/8 A5/8
        A5/8 [A4+E5]/8 [A4+C5]/8 [E5+A5]/8 (A5,E5,A4)/2~
        """,
    ),
    TrackSpec(
        song_id="can-can",
        bpm=172,
        beats_per_bar=2,
        lead_program=40,
        lead_bank="violin",
        passes=3,
        interlude_after=1,
        harmony=((45, 49, 52), (40, 44, 47), (38, 42, 45), (40, 44, 47)),
        score="""
        D5/8 D5/8 E5/8 C#5/8 D5/8 A4/8 A4/8 D5/8 | E5/8 C#5/8 D5/8 A4/8 A4/8 D5/8 E5/8 C#5/8
        D5/8 D5/8 F#5/8 E5/8 D5/8 C#5/8 B4/8 A4/8 | G4/8 A4/8 B4/8 C#5/8 D5/4 A4/4
        D5/8 D5/8 E5/8 C#5/8 D5/8 A4/8 A4/8 D5/8 | E5/8 C#5/8 D5/8 A4/8 A4/8 D5/8 E5/8 C#5/8
        F#5/8 G5/8 A5/8 F#5/8 E5/8 D5/8 C#5/8 B4/8 | A4/8 B4/8 C#5/8 E5/8 D5/4 A4/4
        A4/8 A4/8 B4/8 G4/8 A4/8 F#4/8 F#4/8 A4/8 | B4/8 G4/8 A4/8 F#4/8 F#4/8 A4/8 B4/8 G4/8
        A4/8 A4/8 C#5/8 B4/8 A4/8 G4/8 F#4/8 E4/8 | D4/8 E4/8 F#4/8 G4/8 A4/4 A4/4
        F#5/8 G5/8 A5/8 F#5/8 E5/8 D5/8 C#5/8 B4/8 | A4/8 B4/8 C#5/8 E5/8 [D5+F#5]/2
        """,
    ),
    TrackSpec(
        song_id="william-tell",
        bpm=160,
        beats_per_bar=2,
        lead_program=56,
        lead_bank="trumpet",
        passes=4,
        interlude_after=2,
        harmony=((36, 43, 48), (43, 47, 50), (45, 49, 52), (36, 43, 48)),
        score="""
        G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/8 G4/8
        G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/8 G4/8
        C5/8 E5/8 G5/4 E5/8 C5/8 G4/4 | E5/16 E5/16 E5/8 E5/16 E5/16 E5/8 F5/8 E5/8 D5/8 C5/8
        G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/16 G4/16 G4/8 G4/8 G4/8
        C5/8 E5/8 G5/4 E5/8 C5/8 G4/4 | E5/8 G5/8 F5/8 D5/8 C5/4 E4/4
        G4/8 C5/16 C5/16 C5/8 D5/16 D5/16 D5/8 E5/8 F5/8 G5/8 | E5/8 C5/8 G5/4 E5/8 C5/8 G4/4
        G4/8 C5/16 C5/16 C5/8 D5/16 D5/16 D5/8 E5/8 F5/8 G5/8 | [E5+G5]/8 r/8 [C5+E5]/8 r/8 (C5,G4,C4)/2~
        """,
    ),
    TrackSpec(
        song_id="hungarian-dance",
        bpm=146,
        beats_per_bar=2,
        lead_program=40,
        lead_bank="violin",
        passes=3,
        interlude_after=1,
        harmony=((43, 46, 50), (38, 43, 47), (36, 39, 43), (38, 42, 45)),
        score="""
        D5/4 Bb5/4. A5/8 G5/8 A5/8 | D5/4 D5/4 r/4 D5/8 E5/8
        F#5/8 G5/8 A5/8 F#5/8 D5/4 A4/8 Bb4/8 | C5/8 A4/8 F#4/8 A4/8 G4/2
        D5/4 Bb5/4. A5/8 G5/8 A5/8 | D5/4 D5/4 r/4 D5/8 E5/8
        F#5/8 G5/8 A5/8 F#5/8 D5/4 A4/8 C5/8 | Bb4/8 A4/8 F#4/8 A4/8 (G4,G3)/2~
        G5/8. F#5/16 F#5/4 A5/8. G5/16 G5/4 | Bb5/8 A5/8 G5/8 F#5/8 G5/4 D5/4
        G5/8. F#5/16 F#5/4 A5/8. G5/16 G5/4 | Bb5/8 A5/8 G5/8 A5/8 [G5+G4]/2
        """,
    ),
)


NOTE_PATTERN = re.compile(r"^([A-Ga-g])([#b]?)(-?\d+)$")


def midi_number(name: str) -> int:
    match = NOTE_PATTERN.match(name)
    if not match:
        raise ValueError(f"Unsupported pitch: {name}")
    letter, accidental, octave_text = match.groups()
    semitone = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[letter.upper()]
    if accidental == "#":
        semitone += 1
    elif accidental == "b":
        semitone -= 1
    return (int(octave_text) + 1) * 12 + semitone


def parse_duration(value: str) -> float:
    value = value.removesuffix("~")
    dotted = value.endswith(".")
    denominator = int(value.removesuffix("."))
    beats = 4 / denominator
    return beats * (1.5 if dotted else 1)


def parse_score(text: str) -> list[SourceEvent]:
    events: list[SourceEvent] = []
    beat = 0.0
    for token in text.replace("|", " ").split():
        pitch_text, duration_text = token.rsplit("/", 1)
        duration = parse_duration(duration_text)
        if pitch_text == "r":
            beat += duration
            continue
        if pitch_text.startswith("["):
            pitches = tuple(midi_number(item) for item in pitch_text[1:-1].split("+"))
        elif pitch_text.startswith("("):
            pitches = tuple(midi_number(item) for item in pitch_text[1:-1].split(","))
        else:
            pitches = (midi_number(pitch_text),)
        events.append(SourceEvent(beat=beat, duration=duration, pitches=pitches))
        beat += duration
    return events


def add_midi_note(part: stream.Part, pitch: int, offset: float, duration: float, velocity: int) -> None:
    item = note.Note(pitch)
    item.quarterLength = max(0.08, duration)
    item.volume.velocity = max(1, min(127, velocity))
    part.insert(max(0, offset), item)


def add_midi_chord(part: stream.Part, pitches: tuple[int, ...], offset: float, duration: float, velocity: int) -> None:
    item = chord.Chord(pitches)
    item.quarterLength = max(0.08, duration)
    item.volume.velocity = max(1, min(127, velocity))
    part.insert(max(0, offset), item)


def make_part(name: str, program: int) -> stream.Part:
    part = stream.Part(id=name)
    gm_instrument = instrument.instrumentFromMidiProgram(program)
    gm_instrument.partName = name
    part.insert(0, gm_instrument)
    return part


def source_length(events: list[SourceEvent]) -> float:
    return max((event.beat + event.duration for event in events), default=0)


def arrange_track(spec: TrackSpec) -> tuple[stream.Score, list[dict[str, object]], float, list[dict[str, object]]]:
    source = parse_score(spec.score)
    phrase_beats = math.ceil(source_length(source) / spec.beats_per_bar) * spec.beats_per_bar
    intro_beats = spec.beats_per_bar * 2
    interlude_beats = spec.beats_per_bar * 4
    outro_beats = spec.beats_per_bar * 2

    score = stream.Score(id=spec.song_id)
    lead = make_part("Lead", spec.lead_program)
    piano = make_part("Piano", 0)
    strings = make_part("Strings", 48)
    bass = make_part("Bass", 32)
    color_program = 73 if spec.song_id == "turkish-march" else 60
    color = make_part("Color", color_program)
    timpani = make_part("Timpani", 47)

    lead.insert(0, tempo.MetronomeMark(number=spec.bpm))
    lead.insert(0, meter.TimeSignature(f"{spec.beats_per_bar}/4"))

    timeline: list[tuple[float, int]] = []
    cursor = float(intro_beats)
    sections: list[dict[str, object]] = [
        {"id": "intro", "label": "악기 소리를 먼저 들어요", "startBeat": 0, "endBeat": intro_beats, "mode": "listen"}
    ]
    for pass_index in range(spec.passes):
        start = cursor
        timeline.append((start, pass_index))
        cursor += phrase_beats
        sections.append({
            "id": f"theme-{pass_index + 1}",
            "label": ("주제 가락" if pass_index == 0 else "더 풍성해진 가락" if pass_index < spec.passes - 1 else "마지막 피날레"),
            "startBeat": start,
            "endBeat": cursor,
            "mode": "play",
        })
        if pass_index == spec.interlude_after:
            sections.append({
                "id": "listen",
                "label": "연주를 쉬고 악기 층을 들어요",
                "startBeat": cursor,
                "endBeat": cursor + interlude_beats,
                "mode": "listen",
            })
            cursor += interlude_beats
    sections.append({"id": "outro", "label": "마지막 울림", "startBeat": cursor, "endBeat": cursor + outro_beats, "mode": "listen"})
    total_beats = cursor + outro_beats

    # Musical count-in: low pulse, then a bright dominant cue.
    for beat_index in range(intro_beats):
        harmony = spec.harmony[(beat_index // spec.beats_per_bar) % len(spec.harmony)]
        add_midi_note(piano, harmony[0] - 12, beat_index, 0.38, 44 + beat_index * 3)
        if beat_index == intro_beats - 1:
            add_midi_chord(color, tuple(value + 12 for value in harmony), beat_index, 0.8, 72)

    chart_notes: list[dict[str, object]] = []
    pitch_values = [max(event.pitches) for event in source]
    pitch_scale = sorted(set(pitch_values))
    lane_for_pitch = {
        pitch: round(index * 4 / max(1, len(pitch_scale) - 1))
        for index, pitch in enumerate(pitch_scale)
    }

    for start, pass_index in timeline:
        dynamic = 82 + pass_index * 9
        for event_index, event in enumerate(source):
            event_start = start + event.beat
            lead_pitches = event.pitches
            add_midi_chord(lead, lead_pitches, event_start, event.duration * 0.88, dynamic + (8 if event_index % 8 == 0 else 0))
            if pass_index >= 2 and event_index % 2 == 0:
                add_midi_note(color, max(lead_pitches) + (12 if max(lead_pitches) < 76 else 0), event_start, event.duration * 0.7, 45 + pass_index * 6)

            # Keep the chart readable for children while preserving fast musical motion in the backing.
            grid = round(event.beat * 4)
            density_ok = event.duration >= 0.5 or grid % (2 if pass_index < spec.passes - 1 else 1) == 0
            if density_ok:
                pitch = max(lead_pitches)
                chart_notes.append({
                    "beat": round(event_start, 4),
                    "duration": round(max(0.5, event.duration), 4),
                    "midi": pitch,
                    "lane": lane_for_pitch[pitch],
                    "accent": event_index % 8 == 0 or event.duration >= 1.5,
                })

        first_bar = int(start // spec.beats_per_bar)
        last_bar = int(math.ceil((start + phrase_beats) / spec.beats_per_bar))
        for bar in range(first_bar, last_bar):
            bar_beat = bar * spec.beats_per_bar
            harmony = spec.harmony[bar % len(spec.harmony)]
            local_pass = pass_index
            add_midi_note(bass, harmony[0] - 12, bar_beat, 0.72, 64 + local_pass * 6)
            add_midi_note(timpani, harmony[0], bar_beat, 0.48, 46 + local_pass * 8)
            for beat_index in range(spec.beats_per_bar):
                beat = bar_beat + beat_index
                chord_velocity = 46 + local_pass * 5 + (8 if beat_index == 0 else 0)
                if spec.song_id == "turkish-march":
                    tone = harmony[(beat_index + bar) % len(harmony)] + 12
                    add_midi_note(piano, tone, beat, 0.52, chord_velocity + 8)
                else:
                    add_midi_chord(piano, tuple(value + 12 for value in harmony), beat, 0.42, chord_velocity)
            add_midi_chord(strings, harmony, bar_beat, spec.beats_per_bar * 0.92, 38 + local_pass * 8)

    # Interlude uses the same harmony without interactive notes so students can listen to orchestration.
    listen_section = next(section for section in sections if section["id"] == "listen")
    listen_start = float(listen_section["startBeat"])
    listen_end = float(listen_section["endBeat"])
    for bar_beat in range(int(listen_start), int(listen_end), spec.beats_per_bar):
        harmony = spec.harmony[(bar_beat // spec.beats_per_bar) % len(spec.harmony)]
        add_midi_note(bass, harmony[0] - 12, bar_beat, spec.beats_per_bar * 0.8, 64)
        add_midi_chord(strings, harmony, bar_beat, spec.beats_per_bar * 0.94, 62)
        add_midi_chord(color, tuple(value + 12 for value in harmony), bar_beat + 0.12, spec.beats_per_bar * 0.72, 54)

    final_harmony = spec.harmony[-1]
    add_midi_note(bass, final_harmony[0] - 12, cursor, outro_beats * 0.92, 88)
    add_midi_chord(piano, tuple(value + 12 for value in final_harmony), cursor, outro_beats * 0.88, 96)
    add_midi_chord(strings, final_harmony, cursor, outro_beats * 0.94, 78)
    add_midi_note(timpani, final_harmony[0], cursor, 1.2, 92)

    for part in (lead, piano, strings, bass, color, timpani):
        score.insert(0, part)
    return score, chart_notes, total_beats, sections


def download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 1024:
        return
    print(f"Downloading {url}")
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl:
        command = [curl, "-L", "--fail", "--silent", "--show-error"]
        if Path(curl).name.lower() == "curl.exe":
            command.append("--ssl-no-revoke")
        subprocess.run([*command, "-o", str(target), url], check=True)
        return
    urllib.request.urlretrieve(url, target)


def ensure_toolchain() -> tuple[Path, Path]:
    TMP.mkdir(parents=True, exist_ok=True)
    archive = TMP / "fluidsynth.zip"
    fluid_root = TMP / "fluidsynth"
    soundfont = TMP / "GeneralUser.sf2"
    if not fluid_root.exists():
        download(FLUIDSYNTH_URL, archive)
        with zipfile.ZipFile(archive) as source:
            source.extractall(fluid_root)
    executable = next(fluid_root.rglob("fluidsynth.exe"), None)
    if executable is None:
        raise RuntimeError("FluidSynth executable was not found after extraction")
    if not soundfont.exists() or soundfont.stat().st_size < 1024:
        gh = shutil.which("gh.exe") or shutil.which("gh")
        if gh:
            print("Downloading GeneralUser.sf2 through a shallow GitHub clone")
            clone_path = TMP / "generaluser-repo"
            if not clone_path.exists():
                subprocess.run([gh, "repo", "clone", "ad-si/GeneralUser", str(clone_path), "--", "--depth", "1"], check=True)
            shutil.copyfile(clone_path / "GeneralUser.sf2", soundfont)
        else:
            download(SOUNDFONT_URL, soundfont)
    return executable, soundfont


def run(command: list[str]) -> None:
    print(" ".join(command))
    subprocess.run(command, check=True)


def render_midi(fluidsynth: Path, soundfont: Path, midi_path: Path, wav_path: Path) -> None:
    run([
        str(fluidsynth), "-ni", "-q", "-F", str(wav_path), "-r", "48000", "-g", "0.82",
        "-R", "1", "-C", "1", str(soundfont), str(midi_path),
    ])


def encode_audio(wav_path: Path, output_path: Path, fade_out: float = 1.2) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    duration_result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(wav_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(duration_result.stdout.strip())
    fade_start = max(0, duration - fade_out)
    audio_filter = (
        "highpass=f=30,lowpass=f=18500,"
        "acompressor=threshold=-18dB:ratio=2.2:attack=12:release=160:makeup=1.6dB,"
        f"afade=t=out:st={fade_start:.3f}:d={fade_out:.3f},"
        "loudnorm=I=-15:TP=-1.2:LRA=9,alimiter=limit=0.95"
    )
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-af", audio_filter,
        "-c:a", "libvorbis", "-q:a", "6", str(output_path),
    ])


def build_hit_sprite(fluidsynth: Path, soundfont: Path, bank: str, program: int) -> None:
    score = stream.Score(id=f"{bank}-hits")
    part = make_part(bank, program)
    part.insert(0, tempo.MetronomeMark(number=60))
    for index, midi in enumerate(range(48, 85)):
        add_midi_note(part, midi, 0.25 + index * 1.25, 0.76, 112)
    score.insert(0, part)
    midi_path = RENDER_DIR / f"hits-{bank}.mid"
    wav_path = RENDER_DIR / f"hits-{bank}.wav"
    score.write("midi", fp=midi_path)
    render_midi(fluidsynth, soundfont, midi_path, wav_path)
    output_path = HIT_DIR / f"{bank}.ogg"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path),
        "-af", "highpass=f=35,alimiter=limit=0.94", "-c:a", "libvorbis", "-q:a", "5", str(output_path),
    ])


def write_charts(charts: dict[str, dict[str, object]]) -> None:
    payload = json.dumps(charts, ensure_ascii=False, indent=2)
    CHART_OUTPUT.write_text(
        "// Generated by tools/build_music.py. Do not edit by hand.\n"
        "export interface GeneratedChartNote { beat: number; duration: number; midi: number; lane: number; accent: boolean; }\n"
        "export interface GeneratedTrack { totalBeats: number; notes: GeneratedChartNote[]; sections: { id: string; label: string; startBeat: number; endBeat: number; mode: \"play\" | \"listen\"; }[]; }\n"
        f"export const producedTracks: Record<string, GeneratedTrack> = {payload};\n",
        encoding="utf-8",
    )


def main() -> None:
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    BACKING_DIR.mkdir(parents=True, exist_ok=True)
    HIT_DIR.mkdir(parents=True, exist_ok=True)
    fluidsynth, soundfont = ensure_toolchain()
    charts: dict[str, dict[str, object]] = {}
    for spec in TRACKS:
        print(f"Building {spec.song_id}")
        score, notes, total_beats, sections = arrange_track(spec)
        midi_path = RENDER_DIR / f"{spec.song_id}.mid"
        wav_path = RENDER_DIR / f"{spec.song_id}.wav"
        score.write("midi", fp=midi_path)
        render_midi(fluidsynth, soundfont, midi_path, wav_path)
        encode_audio(wav_path, BACKING_DIR / f"{spec.song_id}.ogg")
        charts[spec.song_id] = {
            "totalBeats": total_beats,
            "notes": notes,
            "sections": sections,
        }

    for bank, program in (("piano", 0), ("violin", 40), ("trumpet", 56)):
        build_hit_sprite(fluidsynth, soundfont, bank, program)
    write_charts(charts)
    print("Music build complete")


if __name__ == "__main__":
    main()
