// MIDI → 게임용 멜로디({n,b}) 추출기
//
// 클래식 곡의 채보 데이터를 만들 때 사용한 오프라인 도구.
// 퍼블릭 도메인 MIDI(예: Wikimedia Commons / BitMidi)에서 멜로디(보통 오른손/최고음)
// 라인을 단선율로 뽑아 game.js의 melody 포맷으로 출력한다. 런타임 의존성은 없다(빌드타임 전용).
//
// 사용:
//   npm install @tonejs/midi
//   node tools/midi_to_melody.mjs <file.mid> [maxSec] [trackIdx] [minMidi] [scale] [cap]
//     maxSec   : 앞에서 몇 초까지 가져올지 (기본 40)
//     trackIdx : 멜로디 트랙 인덱스 (생략 시 노트가 가장 많은 트랙)
//     minMidi  : 이 음(MIDI 번호) 미만은 버림 — 왼손 베이스 제거용 (예: 60 = C4)
//     scale    : 박자 b 값에 곱하는 배율 (빠른 16분음표를 8분음표로 펴려면 2)
//     cap      : 한 음의 최대 박자 (긴 홀드 상한, 기본 4)
//
// 각 시점(16분음표 격자)에서 최고음을 골라 단선율로 만들고, 다음 음까지의 간격으로 b를 계산한다.
import pkg from "@tonejs/midi";
const { Midi } = pkg;
import fs from "fs";

const [file, maxS, tIdx, floor] = [process.argv[2], +(process.argv[3] || 40), process.argv[4], +(process.argv[5] || 0)];
const SCALE = +(process.argv[6] || 1);
const CAP = +(process.argv[7] || 4);
if (!file) {
  console.error("usage: node tools/midi_to_melody.mjs <file.mid> [maxSec] [trackIdx] [minMidi] [scale] [cap]");
  process.exit(1);
}

const midi = new Midi(fs.readFileSync(file));
const bpm = midi.header.tempos[0]?.bpm || 120;
const beatSec = 60 / bpm;
const track =
  tIdx !== undefined
    ? midi.tracks[+tIdx]
    : midi.tracks.reduce((a, b) => (b.notes.length > a.notes.length ? b : a), midi.tracks[0]);

const q = beatSec / 4; // 16분음표 격자
const buckets = new Map();
for (const n of track.notes) {
  if (n.time > maxS || n.midi < floor) continue;
  const slot = Math.round(n.time / q);
  const cur = buckets.get(slot);
  if (!cur || n.midi > cur.midi) buckets.set(slot, { midi: n.midi, time: n.time, dur: n.duration });
}

const slots = [...buckets.keys()].sort((a, b) => a - b);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nm = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);

const out = [];
for (let i = 0; i < slots.length; i++) {
  const cur = buckets.get(slots[i]);
  const next = i + 1 < slots.length ? buckets.get(slots[i + 1]) : null;
  const gap = next ? (next.time - cur.time) / beatSec : cur.dur / beatSec;
  const b = Math.min(CAP, Math.max(0.25, Math.round(gap / 0.25) * 0.25));
  const nb = Math.min(b, Math.max(0.25, Math.round(cur.dur / beatSec / 0.25) * 0.25));
  out.push({ n: nm(cur.midi), b: +(nb * SCALE).toFixed(2) });
  const rb = +((b - nb) * SCALE).toFixed(2);
  if (rb >= 0.25) out.push({ n: "rest", b: rb });
}

const p = out.filter((e) => e.n !== "rest").map((e) => {
  const m = /^([A-G]#?)(-?\d+)$/.exec(e.n);
  return NAMES.indexOf(m[1]) + (+m[2] + 1) * 12;
});
console.error(
  `# ${file} bpm=${bpm.toFixed(1)} track="${track.name}" notes=${p.length} range ${nm(Math.min(...p))}..${nm(
    Math.max(...p),
  )} span=${Math.max(...p) - Math.min(...p)} dur≈${(out.reduce((s, e) => s + e.b, 0) * beatSec).toFixed(1)}s`,
);

const lines = [];
for (let i = 0; i < out.length; i += 8) {
  lines.push("  " + out.slice(i, i + 8).map((e) => `{n:"${e.n}",b:${e.b}}`).join(","));
}
console.log("melody: [\n" + lines.join(",\n") + "\n],");
