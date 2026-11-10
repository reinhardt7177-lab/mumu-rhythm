"""Build hash-pinned CC0 acoustic quiz WAVs; never cut a recorded release.

Requires Python + numpy and ffmpeg already on PATH. No synthesizer is used.
The piano is deliberately a 6.64 s exception: --strict-duration rejects it.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import quote
from urllib.request import Request, urlopen
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "public/assets/audio/quiz-v1"
COMMIT = "440300901dfe9275fd84e0b7763af1f8443ae62e"
MAP_COMMIT = "6dd651d55dde97fd4028699be9d4481f26917891"
REPO = "https://github.com/sgossner/VSCO-2-CE"
RAW = "https://raw.githubusercontent.com/sgossner/VSCO-2-CE"
RATE = 44100
CREDIT = ("VSCO 2 CE / Versilian Studios; recorded by Sam Gossner & Simon Dalzell; "
          "sample cutting by Elan Hickler / Soundemote")
SOURCES = [
    dict(id="piano", path="Keys/Upright Nr1/UR1_C4_pp_RR2.wav",
         blob="7bf1428e674ebf683fc54d8cc460b539eca751e2", rootMidi=60,
         mapping="VSUpright1.sfz", mappingBlob="8718cadcf5e03df456cc48505a54ff5a3d4f463f",
         mappedSample="UR1_C4_pp_RR1.wav", articulation="upright piano, pianissimo, round robin 2"),
    dict(id="flute", path="Woodwinds/Flute/stac/LDFlute_stac_C4_v3_rr1.wav",
         blob="681ee8fa3bf49317d8c42f4ae46cbc5d920db08a", rootMidi=72,
         mapping="FluteStac.sfz", mappingBlob="5c245e5f2ecec74635986d1a1df4b071435eddb6",
         articulation="staccato, velocity layer 3, round robin 1"),
    dict(id="violin", path="Strings/Solo Violin/spic/LLVln_spic_C3_v2_rr1.wav",
         blob="2db2c5caa332b7f80ce3db072751ffb261e02507", rootMidi=60,
         mapping="SViolinSpic.sfz", mappingBlob="a04d077361f034474a32b71504edc1c987655400",
         articulation="solo violin spiccato, velocity layer 2, round robin 1"),
    dict(id="trumpet", path="Brass/Trumpet/stac/Sum_SHTrumpet_stac_C3_v2_rr1.wav",
         blob="ab8da5c0a735702b45b8c4dada74f74abf816218", rootMidi=60,
         mapping="TrumpetStac.sfz", mappingBlob="64f2092f3071770882b9ca4e7725fd8b0e37b9cb",
         articulation="unmuted staccato, velocity layer 2, round robin 1"),
    dict(id="clarinet", path="Woodwinds/Clarinet/stac/DCClar_stac_D3_v2_rr1_sum.wav",
         blob="39dd33d152d2ee22c2b21a7d927d4dd0ca2159f9", rootMidi=62,
         mapping="ClarinetStac.sfz", mappingBlob="a3dc0f0a7b304ac368a4d91d3bf7d4490e07a1e5",
         articulation="staccato, velocity layer 2, round robin 1"),
    dict(id="cello", path="Strings/Cello Section/spic/spic_C3_v1_RR1.wav",
         blob="cc9f933429d125d89238c28baa48ff64819563d0", rootMidi=60,
         mapping="CelloEnsSpic.sfz", mappingBlob="5f60a7a6eb7ed8de53e60dd8145453691cb881b3",
         articulation="cello section (not solo), spiccato, velocity layer 1, round robin 1"),
]


def blob_sha(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def fetch(cache, commit, path, expected):
    target = cache / commit / path
    if not target.exists():
        request = Request(f"{RAW}/{commit}/{quote(path)}", headers={"User-Agent": "mumu-quiz-audio-builder"})
        with urlopen(request, timeout=90) as response:
            data = response.read()
        if blob_sha(data) != expected:
            raise ValueError(f"Source blob mismatch: {path}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    data = target.read_bytes()
    if blob_sha(data) != expected:
        raise ValueError(f"Cached source blob mismatch: {target}")
    return data


def mapping_root(text, filename):
    for region in text.split("<region>")[1:]:
        sample = re.search(r"\bsample=([^\r\n]+?)(?=\s+[a-z_]+=|[\r\n]|$)", region)
        if sample and sample.group(1).strip().replace("\\", "/").split("/")[-1] == filename:
            root = re.search(r"\bpitch_keycenter=(\d+)", region)
            if root:
                return int(root.group(1))
    raise ValueError(f"No official pitch_keycenter for {filename}")


def pad_to_minimum(pcm, rate=RATE):
    return np.pad(pcm, (0, max(0, 2 * rate - len(pcm))))


def measure(pcm, rate, root):
    x = pcm.astype(np.float64) / 32768
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x * x)))
    if not np.isfinite(rms) or rms <= 0.0001 or peak >= 0.999:
        raise ValueError("Silent, invalid, or clipped recording")
    # Check actual periodicity independently of the producer's filename octave.
    onset = int(np.flatnonzero(np.abs(x) > peak * .05)[0])
    segment = x[onset + int(.03 * rate):onset + int(.23 * rate)]
    segment = segment - np.mean(segment)
    n = len(segment)
    spectrum = np.fft.rfft(segment, n=2 ** (2 * n - 1).bit_length())
    corr = np.fft.irfft(spectrum * spectrum.conj())[:n]
    energy = np.concatenate(([0.], np.cumsum(segment * segment)))
    lags = np.arange(int(rate / 1200), int(rate / 80))
    score = 2 * corr[lags] / np.maximum(energy[n - lags] + energy[n] - energy[lags], 1e-20)
    peaks = np.flatnonzero((score[1:-1] > score[:-2]) & (score[1:-1] >= score[2:])) + 1
    if not len(peaks):
        raise ValueError("Cannot verify acoustic note periodicity")
    candidates = peaks[score[peaks] >= max(.6, float(np.max(score[peaks])) * .9)]
    if not len(candidates):
        raise ValueError("No stable acoustic note periodicity")
    index = int(candidates[0])
    lag = float(lags[index])
    if 0 < index < len(score) - 1:
        a, b, c = score[index - 1:index + 2]
        lag += .5 * (a - c) / (a - 2 * b + c)
    hz = rate / lag
    midi = 69 + 12 * math.log2(hz / 440)
    if abs(midi - root) > .65:
        raise ValueError(f"Measured MIDI {midi:.3f} does not match documented root {root}")
    return dict(durationSeconds=round(len(pcm) / rate, 6), frames=len(pcm),
                rms=round(rms, 8), rmsDbfs=round(20 * math.log10(rms), 3),
                peak=round(peak, 8), estimatedHz=round(hz, 3),
                estimatedMidi=round(midi, 4), centsFromRoot=round(100 * (midi - root), 2))


def validate(dest, strict=False):
    manifest = json.loads((dest / "manifest.json").read_text())
    if {item["id"] for item in manifest["samples"]} != {s["id"] for s in SOURCES}:
        raise ValueError("Manifest must contain exactly the six instrument IDs")
    total = 0
    exceptions = []
    for item in manifest["samples"]:
        path = dest / f"{item['id']}.wav"
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != item["outputSha256"]:
            raise ValueError(f"Output hash mismatch: {path}")
        with wave.open(io.BytesIO(data), "rb") as wav:
            if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype()) != (1, 2, RATE, "NONE"):
                raise ValueError(f"Not mono 44.1 kHz PCM16 WAV: {path}")
            pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
        stats = measure(pcm, RATE, item["rootMidi"])
        if stats != item["measurements"]:
            raise ValueError(f"Stale measurements: {path}")
        duration = stats["durationSeconds"]
        if not 2 <= duration <= 4:
            if item["id"] != "piano" or not 4 < duration < 7:
                raise ValueError(f"Unexpected duration: {path}")
            exceptions.append(f"piano: {duration}s > 4s (full release preserved)")
        total += len(data)
        print(f"{item['id']:8s} {duration:.6f}s PCM16 mono {len(data):7d} bytes "
              f"RMS {stats['rmsDbfs']:7.3f} dBFS MIDI {stats['estimatedMidi']:.4f}")
    if total > 2_000_000:
        raise ValueError(f"WAV budget exceeded: {total}")
    print(f"TOTAL {total} WAV bytes; {len(exceptions)} duration exception(s)")
    for exception in exceptions:
        print(f"DURATION EXCEPTION: {exception}")
    if strict and exceptions:
        raise ValueError("Strict 2-4 second requirement NOT MET for piano")


def build(cache):
    # Verify the upstream dedication before fetching or processing recordings.
    license_data = fetch(cache, COMMIT, "LICENSE", "670154e3538863b2d9891fd5483160fbdfc89164")
    if b"CC0 1.0 Universal" not in license_data:
        raise ValueError("Upstream is not the verified CC0 dedication")
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "LICENSE-VSCO-2-CE.txt").write_bytes(license_data)
    samples = []
    for source in SOURCES:
        raw = fetch(cache, COMMIT, source["path"], source["blob"])
        mapping = fetch(cache, MAP_COMMIT, source["mapping"], source["mappingBlob"])
        mapped_sample = source.get("mappedSample", Path(source["path"]).name)
        if mapping_root(mapping.decode("utf-8-sig"), mapped_sample) != source["rootMidi"]:
            raise ValueError(f"SFZ root mismatch: {source['id']}")
        (DEST / "source-mappings").mkdir(exist_ok=True)
        (DEST / "source-mappings" / source["mapping"]).write_bytes(mapping)
        decoded = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-map_metadata", "-1",
                                  "-ac", "1", "-ar", str(RATE), "-acodec", "pcm_s16le",
                                  "-f", "s16le", "pipe:1"], input=raw, capture_output=True, check=True).stdout
        original = np.frombuffer(decoded, dtype="<i2")
        pcm = pad_to_minimum(original)
        path = DEST / f"{source['id']}.wav"
        with wave.open(str(path), "wb") as wav:
            wav.setparams((1, 2, RATE, len(pcm), "NONE", "not compressed"))
            wav.writeframes(pcm.astype("<i2").tobytes())
        stats = measure(pcm, RATE, source["rootMidi"])
        samples.append(dict(**source, sourceCommit=COMMIT, mappingCommit=MAP_COMMIT,
                            sourceUrl=f"{REPO}/blob/{COMMIT}/{quote(source['path'])}",
                            sourceSha256=hashlib.sha256(raw).hexdigest(),
                            outputSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                            sourceFrames=len(original), silenceTrimmedFrames=0,
                            trailingSilenceAddedFrames=len(pcm) - len(original),
                            measurements=stats, gain=round(.6 / stats["peak"], 5),
                            credit=CREDIT, license="CC0-1.0",
                            licenseUrl=f"{REPO}/blob/{COMMIT}/LICENSE"))
    manifest = dict(sourceRepository=REPO, sourceCommit=COMMIT, mappingCommit=MAP_COMMIT,
                    processing="ffmpeg mono PCM16 44100 Hz; all source frames retained; zero-pad only to 2 seconds; no synthesis, looping, pitch correction, fades, or normalization",
                    durationException="Piano is 6.637029 seconds to preserve its complete recorded decay/release; strict 2-4 second specification is not fully met.",
                    samples=samples)
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    validate(DEST)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "mumu-quiz-v1-cache")
    parser.add_argument("--verify", action="store_true", help="offline verification of shipped outputs")
    parser.add_argument("--strict-duration", action="store_true", help="fail on the documented long piano")
    args = parser.parse_args()
    if not args.verify:
        build(args.cache)
    validate(DEST, strict=args.strict_duration)
