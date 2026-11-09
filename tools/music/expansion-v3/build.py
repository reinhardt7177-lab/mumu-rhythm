"""Build eight licensed acoustic excerpts and honest onset-based rhythm charts.

Dependencies are already installed: numpy, librosa, soundfile, FFmpeg, curl.
Network is opt-in (--download); --verify works entirely offline.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
# Keep optional JIT caches inside the scoped, writable source cache.
os.environ.setdefault("NUMBA_CACHE_DIR", str(HERE / "sources/numba-cache"))

import librosa
import numpy as np
import soundfile as sf

ROOT = HERE.parents[2]
ASSETS = ROOT / "public/assets/audio/expansion-v3"
CHARTS = ROOT / "src/content/extraCharts.generated.ts"
MANIFEST = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
LEAD_BEATS = 8


def run(args: list[str]) -> None:
    subprocess.run(args, check=True, cwd=ROOT)


def source_url(item: dict) -> str:
    filename = item["file"].replace(" ", "_")
    digest = hashlib.md5(filename.encode("utf-8")).hexdigest()
    return f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{quote(filename, safe='')}"


def page_url(item: dict) -> str:
    return "https://commons.wikimedia.org/wiki/File:" + quote(item["file"].replace(" ", "_"), safe="")


def get_source(item: dict, download: bool) -> Path:
    source = HERE / "sources" / (item["id"] + Path(item["file"]).suffix)
    if not source.exists():
        if not download:
            raise SystemExit(f"Missing {source}. Use --download with approved network access.")
        source.parent.mkdir(parents=True, exist_ok=True)
        partial = source.with_suffix(source.suffix + ".partial")
        run(["curl.exe", "--fail", "--location", "--silent", "--show-error", "--retry", "3",
             "--ssl-revoke-best-effort", "--max-time", "240", "--output", str(partial), source_url(item)])
        if item["sourceSha1"] and hashlib.sha1(partial.read_bytes()).hexdigest() != item["sourceSha1"]:
            raise ValueError(f"Source fingerprint mismatch: {item['id']}")
        partial.replace(source)
    if item["sourceSha1"] and hashlib.sha1(source.read_bytes()).hexdigest() != item["sourceSha1"]:
        raise ValueError(f"Cached source fingerprint mismatch: {item['id']}")
    return source


def render(item: dict, source: Path) -> Path:
    ASSETS.mkdir(parents=True, exist_ok=True)
    lead_seconds = LEAD_BEATS * 60 / item["bpm"]
    total = lead_seconds + item["duration"] + 0.25
    wave = HERE / "sources" / (item["id"] + "-edit.wav")
    filters = (
        f"afade=t=in:st=0:d=0.06,afade=t=out:st={item['duration'] - 1.8}:d=1.8,"
        "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,"
        f"adelay={round(lead_seconds * 48000)}S:all=1,apad=pad_dur=0.25"
    )
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(item["offset"]),
         "-i", str(source), "-t", str(item["duration"]), "-ar", "48000", "-ac", "2",
         "-c:a", "pcm_f32le", str(wave)])
    # Process the exact trimmed audio, then insert sample-accurate count-in silence.
    master = HERE / "sources" / (item["id"] + "-master.wav")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wave),
         "-af", filters, "-t", f"{total:.9f}", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", str(master)])
    for extension, codec in [("ogg", ["-c:a", "libvorbis", "-q:a", "6"]),
                             ("m4a", ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"])]:
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(master), *codec,
             "-metadata", f"title={item['title']} (MUMU game edit)",
             "-metadata", f"artist={item['performer']}",
             "-metadata", f"copyright={item['license']}; {page_url(item)}; excerpt, fades, loudness normalization",
             str(ASSETS / f"{item['id']}.{extension}")])
    return master


def make_chart(item: dict, master: Path) -> dict:
    y, sr = librosa.load(master, sr=22050, mono=True)
    bpm = item["bpm"]
    lead = LEAD_BEATS * 60 / bpm
    total_seconds = sf.info(master).duration
    to_beat = lambda time: round(time * bpm / 60, 5)
    total_beats = to_beat(total_seconds)
    sections = [
        {"id": "count-in", "label": "Count in", "startBeat": 0, "endBeat": LEAD_BEATS, "mode": "listen"},
        {"id": "rhythm-a", "label": "Rhythm A", "startBeat": LEAD_BEATS, "endBeat": to_beat(lead + 22), "mode": "play"},
        {"id": "listening", "label": "Listen", "startBeat": to_beat(lead + 22), "endBeat": to_beat(lead + 30), "mode": "listen"},
        {"id": "rhythm-b", "label": "Rhythm B", "startBeat": to_beat(lead + 30), "endBeat": to_beat(lead + item["duration"] - 1.8), "mode": "play"},
        {"id": "outro", "label": "Outro", "startBeat": to_beat(lead + item["duration"] - 1.8), "endBeat": total_beats, "mode": "listen"},
    ]
    hop = 220  # 9.98ms at 22050Hz; target times remain on the recorded performance.
    envelope = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    frames = librosa.onset.onset_detect(onset_envelope=envelope, sr=sr, hop_length=hop,
                                      backtrack=False, delta=0.065, wait=3)
    candidates = []
    for frame in frames:
        seconds = float(librosa.frames_to_time(frame, sr=sr, hop_length=hop))
        beat = to_beat(seconds)
        section = next((s for s in sections if s["startBeat"] <= beat < s["endBeat"]), None)
        if not section or section["mode"] != "play" or seconds < lead + 0.12:
            continue
        if beat + 0.22 * bpm / 60 > section["endBeat"]:
            continue
        strength = float(envelope[frame])
        if candidates and seconds - candidates[-1][0] < item["minimumGap"]:
            if strength > candidates[-1][1] * 1.2:
                candidates[-1] = (seconds, strength)
        else:
            candidates.append((seconds, strength))
    if len(candidates) < 35:
        raise ValueError(f"Too few genuine onsets for {item['id']}: {len(candidates)}")
    threshold = np.quantile([strength for _, strength in candidates], 0.75)
    # Lanes are an ergonomic visual pattern, NOT inferred pitches. MIDI is a compatibility placeholder.
    pattern = [2, 1, 3, 0, 4, 3, 1, 2, 0, 2, 4, 1]
    notes = [{"beat": to_beat(seconds), "duration": round(0.20 * bpm / 60, 5),
              "midi": 60, "lane": pattern[i % len(pattern)], "accent": bool(strength >= threshold)}
             for i, (seconds, strength) in enumerate(candidates)]
    return {"bpm": bpm, "totalBeats": total_beats, "notes": notes, "sections": sections}


def verify() -> None:
    report = json.loads((ASSETS / "provenance.json").read_text(encoding="utf-8"))
    for item in MANIFEST:
        for ext in ["ogg", "m4a"]:
            path = ASSETS / f"{item['id']}.{ext}"
            data = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
            ], text=True, encoding="utf-8"))
            stream = data["streams"][0]
            duration = float(data["format"]["duration"])
            assert 45 <= duration <= 90, (path, duration)
            expected = LEAD_BEATS * 60 / item["bpm"] + item["duration"] + 0.25
            assert abs(duration - expected) < 0.05, (path, duration, expected)
            assert stream["channels"] == 2 and int(stream["sample_rate"]) == 48000
            assert hashlib.sha256(path.read_bytes()).hexdigest() == report[item["id"]]["sha256"][ext]
            # Fully decode every file, not just the container header.
            pcm = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path),
                "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", "48000", "-"])
            # A power-preserving mono downmix can add 3dB to centered stereo signals.
            samples = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2)
            assert np.all(np.isfinite(samples)) and np.max(np.abs(samples)) < 1
            lead = LEAD_BEATS * 60 / item["bpm"]
            assert np.max(np.abs(samples[:int((lead - 0.1) * 48000)])) < 0.001
            music = samples[int((lead + 1) * 48000):int((lead + item["duration"] - 2) * 48000)]
            assert np.sqrt(np.mean(music ** 2)) > 0.01
            print(f"Verified {item['id']}.{ext}: {duration:.3f}s, stereo 48kHz, peak {np.max(np.abs(samples)):.3f}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
        return
    tracks, credits = {}, {}
    for item in MANIFEST:
        print(f"Building {item['id']}", flush=True)
        source = get_source(item, args.download)
        master = render(item, source)
        tracks[item["id"]] = make_chart(item, master)
        credits[item["id"]] = {
            **{key: item[key] for key in ["title", "composer", "performer", "license", "licenseUrl", "evidence", "offset", "duration"]},
            "sourceUrl": page_url(item), "downloadUrl": source_url(item),
            "revisionUrl": f"https://commons.wikimedia.org/w/index.php?oldid={item['revision']}",
            "sourceSha1": hashlib.sha1(source.read_bytes()).hexdigest(),
            "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "verifiedOn": "2026-11-09", "chartType": "rhythmic-onset",
            "changes": "excerpt, 60ms fade-in, 1.8s fade-out, -16 LUFS normalization, 8-beat silent count-in, encoding",
            "sha256": {ext: hashlib.sha256((ASSETS / f"{item['id']}.{ext}").read_bytes()).hexdigest() for ext in ["ogg", "m4a"]},
        }
        print(f"  {len(tracks[item['id']]['notes'])} onset targets", flush=True)
    content = (
        '// Generated by tools/music/expansion-v3/build.py. Rhythm targets, not melody transcription.\n'
        'import type { SongSection } from "../types";\n'
        'export interface ExtraChart { bpm: number; totalBeats: number; notes: { beat: number; duration: number; midi: number; lane: number; accent: boolean }[]; sections: SongSection[] }\n'
        'export const extraCharts: Record<string, ExtraChart> = ' + json.dumps(tracks, ensure_ascii=True, indent=2) + ';\n'
    )
    CHARTS.write_text(content, encoding="utf-8")
    (ASSETS / "provenance.json").write_text(json.dumps(credits, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    verify()


if __name__ == "__main__":
    main()
