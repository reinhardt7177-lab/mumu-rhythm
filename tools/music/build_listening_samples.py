"""Render short instrument examples from the actual Cloud Hop score."""
from pathlib import Path
import subprocess

import numpy as np
from synth_core import SAMPLE_RATE, synth_note, write_wav
from synth_tracks import ANSWER_A, CALL_A, degree_midi

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'public/assets/audio/v8'
TMP = ROOT / 'tmp/listening'
DEST.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
beat_seconds = 60 / 132

for name, notes, voice in [('cloud-lead', CALL_A, 'chip'), ('cloud-bell', ANSWER_A, 'bell')]:
    track = np.zeros((int((8 * beat_seconds + .5) * SAMPLE_RATE), 2), dtype=np.float32)
    for beat, duration, degree in notes:
        sound = synth_note(degree_midi(62, degree), duration * beat_seconds, .28, voice)
        start = int(beat * beat_seconds * SAMPLE_RATE)
        end = min(len(track), start + len(sound))
        track[start:end] += sound[:end-start]
    wav = TMP / f'{name}.wav'
    write_wav(track, wav)
    for suffix, codec, bitrate in [('ogg', 'libopus', '96k'), ('m4a', 'aac', '128k')]:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-map_metadata', '-1',
                        '-c:a', codec, '-b:a', bitrate, str(DEST / f'{name}.{suffix}')], check=True)
    print(name)
