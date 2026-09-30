"""Score definitions for every MUMU original synth track.

Each track is a pure function returning audio + chart from one deterministic score.
Neon Run keeps its V5 arrangement verbatim (same seed and call order, so the audio
is bit-identical). Cloud Hop and Robot Parade are event scores: every charted note
is an audible melody/bass event rendered from the same list, so notes and sound
cannot drift apart.

The two new melodies are original scale-degree sequences written for this project.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np

from synth_core import HOLD_NOTE_MIN_BEATS, Mix, synth_note


@dataclass
class TrackResult:
    id: str
    title: str
    audio: np.ndarray
    chart: dict[str, object]
    seconds: float
    loudness: float = -14.5  # integrated LUFS target for the encoders
    limit: float = 0.96  # pre-encode peak limiter; lower for transient-heavy mixes so AAC/Opus do not overshoot


@dataclass
class Event:
    beat: float
    beats: float
    midi: float
    voice: str
    amplitude: float
    pan: float = 0.0
    lane: int | None = None  # None = heard but not charted
    accent: bool = False


@dataclass
class Score:
    """Event list + drum hits rendered into a Mix; the chart is derived from charted events."""

    events: list[Event] = field(default_factory=list)

    def add(self, event: Event) -> None:
        self.events.append(event)

    def render(self, mix: Mix) -> None:
        for event in self.events:
            mix.note(event.beat, event.beats, event.midi, event.amplitude, event.voice, event.pan)

    def chart_notes(self, exclusive_holds: bool = True) -> list[dict[str, object]]:
        return build_chart_notes(self.events, exclusive_holds)


def build_chart_notes(events: list[Event], exclusive_holds: bool = True) -> list[dict[str, object]]:
    """Turns charted events into game notes with playability rules.

    - one note per onset (no chords), >= 0.25 beat apart
    - same lane re-hits >= 0.5 beat apart and never inside a hold
    - with exclusive_holds, nothing starts while a hold is being held
    """
    candidates = sorted((event for event in events if event.lane is not None), key=lambda event: (event.beat, event.lane))
    notes: list[dict[str, object]] = []
    lane_free = [-1e9] * 5
    hold_until = -1e9
    last_beat = -1e9
    for event in candidates:
        lane = int(event.lane)  # type: ignore[arg-type]
        if not 0 <= lane <= 4:
            raise ValueError(f"lane out of range: {event}")
        if event.beat - last_beat < 0.25 - 1e-9:
            continue
        if event.beat < lane_free[lane] - 1e-9:
            continue
        if exclusive_holds and event.beat < hold_until - 1e-9:
            continue
        is_hold = event.beats >= HOLD_NOTE_MIN_BEATS
        duration = round(event.beats, 3) if is_hold else round(min(event.beats, 1.25) * 0.84, 3)
        notes.append({
            "beat": round(event.beat, 3),
            "duration": duration,
            "midi": int(round(event.midi)),
            "lane": lane,
            "accent": bool(event.accent),
        })
        last_beat = event.beat
        lane_free[lane] = event.beat + (event.beats + 0.25 if is_hold else 0.5)
        if is_hold:
            hold_until = event.beat + event.beats
    return notes


def lane_mapper(low: float, high: float) -> Callable[[float], int]:
    """Linear pitch -> lane map so higher pitches land further right."""
    span = max(1e-6, high - low)
    return lambda value: int(max(0, min(4, round((value - low) / span * 4))))


MAJOR = [0, 2, 4, 5, 7, 9, 11]
DORIAN = [0, 2, 3, 5, 7, 9, 10]


def degree_midi(tonic: int, degree: int, scale: list[int] = MAJOR) -> int:
    """1-based scale degree (8 = octave) to MIDI."""
    index = degree - 1
    return tonic + 12 * (index // len(scale)) + scale[index % len(scale)]


def sections_for(beats: list[tuple[str, str, float, float, str]]) -> list[dict[str, object]]:
    return [{"id": sid, "label": label, "startBeat": start, "endBeat": end, "mode": mode} for sid, label, start, end, mode in beats]


# ====================================================================== S1 Neon Run


def neon_run() -> TrackResult:
    """V5 Neon Run: identical arrangement, seed 7177, identical RNG call order."""
    bpm, lead_beats, bars, tail = 150, 4, 48, 1.6
    total_beats = lead_beats + bars * 4
    mix = Mix(bpm, total_beats, tail, seed=7177)
    kick_sample = mix.kick()
    snare_sample = mix.snare()
    progression = [45, 41, 48, 43]  # A, F, C, G
    chord_intervals = [0, 3, 7, 10]
    arp_patterns = [[0, 2, 1, 3, 2, 1, 0, 2], [0, 1, 3, 2, 1, 3, 2, 1]]
    beat_seconds = mix.beat_seconds

    for bar in range(bars):
        section_beat = lead_beats + bar * 4
        root = progression[bar % len(progression)]
        intensity = 0.58 if bar < 4 else 0.78 if bar < 20 else 0.9
        if 16 <= bar < 20:
            intensity = 0.38

        for chord_midi in [root + 12 + interval for interval in chord_intervals[:3]]:
            mix.place(synth_note(chord_midi, 4.15 * beat_seconds, 0.075 * intensity, "pad", (chord_midi % 3 - 1) * 0.35), section_beat)

        for beat in range(4):
            absolute = section_beat + beat
            if not (16 <= bar < 20) or beat in (0, 2):
                if beat in (0, 2) or (bar >= 36 and beat == 3):
                    mix.place(kick_sample * intensity, absolute)
                if beat in (1, 3):
                    mix.place(snare_sample * intensity, absolute)
            bass_midi = root + 12 + ([0, 0, 7, 10][beat] if bar >= 4 else 0)
            mix.place(synth_note(bass_midi, 0.82 * beat_seconds, 0.22 * intensity, "bass", -0.05), absolute)

        for step in range(8):
            absolute = section_beat + step * 0.5
            mix.place(mix.hat(step % 4 == 3, -0.24 if step % 2 == 0 else 0.24) * intensity, absolute)
            if bar >= 4 and not (16 <= bar < 20):
                chord = [root + 24 + interval for interval in chord_intervals]
                arp_midi = chord[arp_patterns[bar % 2][step]]
                mix.place(synth_note(arp_midi, 0.38 * beat_seconds, 0.092 * intensity, "pluck", (step % 5 - 2) * 0.18), absolute)

        motif = [0, 3, 7, 10, 7, 12, 10, 7] if bar < 24 else [0, 7, 10, 12, 15, 12, 10, 7]
        if bar >= 8 and not (16 <= bar < 20):
            for step, interval in enumerate(motif):
                if bar < 36 and step % 2 == 1:
                    continue
                mix.place(synth_note(root + 24 + interval, 0.42 * beat_seconds, 0.105 * intensity, "lead", (step % 5 - 2) * 0.14), section_beat + step * 0.5)

    audio = mix.master(delay_seconds=0.3, pump_floor=0.72, pump_depth=0.28)

    notes: list[dict[str, object]] = []
    lane_midi = [48, 55, 60, 67, 72]
    patterns = [
        [0, 1, 2, 3, 4, 3, 2, 1],
        [4, 2, 3, 1, 2, 0, 1, 3],
        [0, 2, 4, 3, 1, 2, 4, 1],
        [2, 3, 4, 2, 0, 1, 3, 1],
    ]
    for bar in range(bars):
        start = lead_beats + bar * 4
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

    sections = sections_for([
        ("count-in", "빛의 문이 열려요", 0, 4, "listen"),
        ("launch", "첫 번째 네온 주제", 4, 68, "play"),
        ("break", "신스의 층을 들어요", 68, 84, "listen"),
        ("drive", "더 빨라진 변주", 84, 148, "play"),
        ("finale", "별빛 피날레", 148, total_beats, "play"),
    ])
    chart = {"bpm": bpm, "totalBeats": total_beats, "notes": notes, "sections": sections}
    return TrackResult("neon-run", "Neon Run", audio, chart, mix.total_seconds)


# ====================================================================== S2 Cloud Hop

# Call-and-response (묻고 답하기). Calls climb and end high like a question; answers
# step down and settle on the home note. (beat offset, beats, scale degree)
CALL_A = [(0, .5, 8), (.5, .5, 9), (1, 1, 10), (2, .5, 12), (2.5, .5, 10), (3, 1, 9), (4, .5, 8), (4.5, .5, 10), (5, 1, 11), (6, 2, 12)]
ANSWER_A = [(0, 1, 5), (1, .5, 6), (1.5, .5, 5), (2, 1, 3), (3, 1, 4), (4, .5, 3), (4.5, .5, 2), (5, 1, 2), (6, 2, 1)]
CALL_B = [(0, .5, 10), (.5, 1, 11), (1.5, .5, 12), (2, 1, 13), (3, .5, 12), (3.5, .5, 11), (4, .5, 10), (4.5, .5, 12), (5, 1, 13), (6, 2, 14)]
ANSWER_B = [(0, .5, 8), (.5, .5, 7), (1, 1, 6), (2, .5, 5), (2.5, .5, 6), (3, 1, 4), (4, 1, 3), (5, .5, 2), (5.5, .5, 3), (6, 2, 1)]
CALL_F = [(0, .5, 8), (.5, .5, 10), (1, .5, 12), (1.5, .5, 13), (2, 1.5, 14)]
ANSWER_F = [(0, .5, 7), (.5, .5, 5), (1, .5, 4), (1.5, .5, 3), (2, 1.5, 1)]
ENDING = [(0, .5, 5), (.5, .5, 6), (1, .5, 7), (1.5, .5, 8), (2, 5, 8)]


def cloud_hop() -> TrackResult:
    bpm, lead_beats, bars, tail = 132, 4, 28, 1.8
    total_beats = lead_beats + bars * 4
    mix = Mix(bpm, total_beats, tail, seed=24_132)
    score = Score()
    tonic = 62  # D4, D major
    call_lane = lane_mapper(8, 14)
    answer_lane = lane_mapper(1, 8)
    kick_sample = mix.kick()
    clap_sample = mix.clap()
    progression = [(38, [0, 4, 7]), (47, [0, 3, 7]), (43, [0, 4, 7]), (45, [0, 4, 7])]  # D Bm G A

    def bar_beat(bar: int) -> float:
        return lead_beats + bar * 4

    def phrase(start: float, notes: list[tuple[float, float, int]], role: str, charted: bool = True, shift: int = 0, gain: float = 1) -> None:
        for offset, beats, degree in notes:
            degree += shift
            midi = degree_midi(tonic, degree)
            if role == "call":
                event = Event(start + offset, beats, midi, "chip", 0.1 * gain, 0.28, call_lane(degree) if charted else None, offset % 4 == 0)
            else:
                event = Event(start + offset, beats, midi, "bell", 0.15 * gain, -0.28, answer_lane(degree) if charted else None, offset % 4 == 0)
            score.add(event)

    # Sections (bars): A 0-8, break 8-12, B 12-20, finale 20-28
    for pair in range(2):
        phrase(bar_beat(pair * 4), CALL_A, "call")
        phrase(bar_beat(pair * 4 + 2), ANSWER_A, "answer")
    # Break: only the answer, echoed softly on bells an octave up (listen, no notes).
    phrase(bar_beat(8), ANSWER_A, "answer", charted=False, shift=7, gain=0.55)
    phrase(bar_beat(10), ANSWER_B, "answer", charted=False, shift=7, gain=0.45)
    for pair in range(2):
        phrase(bar_beat(12 + pair * 4), CALL_B, "call")
        phrase(bar_beat(14 + pair * 4), ANSWER_B, "answer")
    for pair in range(3):
        phrase(bar_beat(20 + pair * 2), CALL_F, "call", shift=pair % 2)
        phrase(bar_beat(21 + pair * 2), ANSWER_F, "answer", shift=pair % 2)
    # Together at last: call and answer voices in unison octaves on the ending.
    for offset, beats, degree in ENDING:
        start = bar_beat(26) + offset
        score.add(Event(start, beats, degree_midi(tonic, degree + 7), "chip", 0.085, 0.28, call_lane(min(14, degree + 6)) if beats < 2 else 2, offset == 0))
        score.add(Event(start, beats, degree_midi(tonic, degree), "bell", 0.12, -0.28))

    score.render(mix)

    for bar in range(bars):
        start = bar_beat(bar)
        root, chord = progression[bar % 4]
        in_break = 8 <= bar < 12
        finale = bar >= 20
        intensity = 0.62 if bar < 2 else 0.4 if in_break else 0.95 if finale else 0.82
        for interval in chord:
            mix.note(start, 4.1, root + 24 + interval, 0.06 * intensity, "pad", (interval / 7 - 0.5) * 0.6)
        # "Hop" bass: root / octave bouncing eighths.
        for step in range(8):
            if in_break and step % 2:
                continue
            midi = root + (12 if step % 2 else 0)
            mix.note(start + step * 0.5, 0.42, midi, 0.2 * intensity, "bass", -0.04)
        kicks = [0, 2] if in_break else [0, 2, 2.5] if bar >= 12 else [0, 2]
        for beat in kicks:
            mix.place(kick_sample * intensity, start + beat)
        if not in_break:
            for beat in (1, 3):
                mix.place(clap_sample * intensity, start + beat)
            for step in range(8):
                if step % 2 == 1:
                    mix.place(mix.hat(step == 7, 0.3 if step % 4 == 1 else -0.3) * intensity, start + step * 0.5)
        if bar >= 12 and not in_break:
            chord_tones = [root + 36 + interval for interval in chord] + [root + 48]
            pattern = [0, 1, 2, 3, 2, 1, 2, 3] if bar % 2 == 0 else [3, 2, 1, 0, 1, 2, 3, 2]
            for step, tone in enumerate(pattern):
                mix.note(start + step * 0.5, 0.35, chord_tones[tone], 0.05 * intensity, "pluck", (step % 4 - 1.5) * 0.25)
        if bar in (0, 12, 20):
            mix.place(mix.crash() * intensity, start)
    mix.place(mix.crash(), bar_beat(bars) - 1)

    audio = mix.master(delay_seconds=0.75 * mix.beat_seconds, pump_floor=0.78, pump_depth=0.22)
    sections = sections_for([
        ("count-in", "구름 위로 네 박 세기", 0, 4, "listen"),
        ("call-answer", "묻는 가락 · 대답하는 가락", 4, bar_beat(8), "play"),
        ("echo", "대답만 메아리로 들어요", bar_beat(8), bar_beat(12), "listen"),
        ("higher", "더 높이 묻고 답하기", bar_beat(12), bar_beat(20), "play"),
        ("together", "짧게 주고받는 피날레", bar_beat(20), total_beats, "play"),
    ])
    chart = {"bpm": bpm, "totalBeats": total_beats, "notes": score.chart_notes(), "sections": sections}
    return TrackResult("cloud-hop", "Cloud Hop", audio, chart, mix.total_seconds, loudness=-15.0, limit=0.8)


# ====================================================================== S3 Robot Parade

# Ostinato (반복 리듬꼴): one bar bass riff that never changes. (beat offset, beats, semitones above A)
RIFF = [(0, .75, 0), (.75, .75, 0), (1.5, .5, 7), (2, .5, 10), (2.5, 1, 12), (3.5, .5, 7)]
RIFF_LANES = {0: 0, 7: 1, 10: 2, 12: 3}
# Brass melodies over the ostinato (semitones above A4, A dorian).
MELODY_1 = [(0, .5, 0), (.5, .5, 3), (1, 1, 7), (2, .5, 5), (2.5, .5, 3), (3, 1, 5), (4, .5, 7), (4.5, .5, 10), (5, 1, 12),
            (6, 2, 10), (8, .5, 5), (8.5, .5, 7), (9, 1, 3), (10, .5, 2), (10.5, .5, 3), (11, 1, 0), (12, 4, 7)]
MELODY_2 = [(0, .5, 12), (.5, .5, 10), (1, 1, 7), (2, .5, 9), (2.5, .5, 7), (3, 1, 5), (4, .5, 3), (4.5, .5, 5), (5, 1, 7),
            (6, 2, 3), (8, .5, 0), (8.5, .5, 2), (9, 1, 3), (10, 1, 5), (11, 1, 2), (12, 4, 0)]


def robot_parade() -> TrackResult:
    bpm, lead_beats, bars, tail = 124, 4, 28, 1.8
    total_beats = lead_beats + bars * 4
    mix = Mix(bpm, total_beats, tail, seed=31_124)
    score = Score()
    riff_root = 45  # A2
    melody_root = 69  # A4
    melody_lane = lane_mapper(0, 12)
    kick_sample = mix.kick()
    snare_sample = mix.snare()
    clap_sample = mix.clap(0.1)
    chords = [[57, 60, 64, 67], [62, 66, 69], [55, 59, 62], [57, 60, 64, 67]]  # Am7 D G Am7 over an A pedal

    def bar_beat(bar: int) -> float:
        return lead_beats + bar * 4

    def charted_riff(bar: int) -> bool:
        return bar < 8 or 20 <= bar < 24

    for bar in range(bars):
        start = bar_beat(bar)
        warmup = bar < 2
        for offset, beats, semis in RIFF:
            lane = RIFF_LANES[semis] if charted_riff(bar) else None
            if warmup and offset not in (0, 1.5, 2.5):
                lane = None
            level = 0.24 if 16 <= bar < 20 else 0.2
            score.add(Event(start + offset, beats, riff_root + semis, "bass", level, -0.05, lane, offset == 0))
            # A soft pluck doubles the riff two octaves up so it stays audible on small speakers.
            score.add(Event(start + offset, min(beats, 0.5), riff_root + 24 + semis, "pluck", 0.045, 0.15))

    def melody(first_bar: int, notes: list[tuple[float, float, int]], octave: int = 0) -> None:
        for offset, beats, semis in notes:
            score.add(Event(bar_beat(first_bar) + offset, beats, melody_root + semis + octave, "brass", 0.095, 0.2, melody_lane(semis), offset % 4 == 0))

    melody(8, MELODY_1)
    melody(12, MELODY_2)
    melody(24, MELODY_2)
    # Finale riff bars get a high answering chip line (heard, not charted).
    for bar in range(20, 24):
        for offset, beats, semis in [(0.5, .5, 12), (1, .5, 15), (3, .5, 19), (3.5, .5, 17)]:
            score.add(Event(bar_beat(bar) + offset, beats, melody_root + semis, "chip", 0.05, -0.3))

    score.render(mix)

    for bar in range(bars):
        start = bar_beat(bar)
        gears = 16 <= bar < 20
        finale = bar >= 20
        intensity = 0.6 if bar < 4 else 0.5 if gears else 1.0 if finale else 0.84
        for midi in chords[bar % 4]:
            if not gears:
                mix.note(start, 1.8, midi, 0.035 * intensity, "pad", (midi % 5 - 2) * 0.15)
                mix.note(start + 2, 1.8, midi, 0.03 * intensity, "pad", (midi % 5 - 2) * -0.15)
        # March drums: kick on every beat (four on the floor) from bar 4, snare on 2 & 4.
        for beat in range(4):
            if gears and beat % 2:
                continue
            if bar >= 4 or beat in (0, 2):
                mix.place(kick_sample * intensity, start + beat)
            if beat in (1, 3) and not gears:
                mix.place(snare_sample * intensity * 0.9, start + beat)
                if finale:
                    mix.place(clap_sample * intensity * 0.8, start + beat)
        for step in range(8 if not finale else 16):
            division = 0.5 if not finale else 0.25
            if not gears:
                mix.place(mix.hat(False, -0.25 if step % 2 else 0.25) * intensity * (1 if step % 2 else 0.7), start + step * division)
        if gears or finale:
            # Robot servo blips on the off-beats so the listener hears the riff underneath.
            for step, midi in enumerate([88, 84, 91, 86]):
                mix.place(mix.blip(midi, -0.4 + step * 0.27), start + step + 0.5)
        if bar in (0, 8, 20, 24):
            mix.place(mix.crash() * intensity, start)
    mix.place(mix.crash(), bar_beat(bars))

    audio = mix.master(delay_seconds=0.5 * mix.beat_seconds, pump_floor=0.8, pump_depth=0.2, delay_right=0.1, delay_left=0.05)
    sections = sections_for([
        ("count-in", "로봇들이 줄을 서요", 0, 4, "listen"),
        ("ostinato", "반복 리듬꼴로 행진", 4, bar_beat(8), "play"),
        ("brass", "리듬꼴 위에 가락이 올라타요", bar_beat(8), bar_beat(16), "play"),
        ("gears", "리듬꼴만 남았어요", bar_beat(16), bar_beat(20), "listen"),
        ("parade", "다 함께 퍼레이드", bar_beat(20), total_beats, "play"),
    ])
    chart = {"bpm": bpm, "totalBeats": total_beats, "notes": score.chart_notes(), "sections": sections}
    return TrackResult("robot-parade", "Robot Parade", audio, chart, mix.total_seconds, loudness=-15.0, limit=0.8)


TRACKS: list[Callable[[], TrackResult]] = [neon_run, cloud_hop, robot_parade]
