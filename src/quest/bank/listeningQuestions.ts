import type { BankQuestion, InstrumentId, ListeningClip, ScoreNote, SoundEvent, Visual } from './types';

// Sample-based acoustic stimuli, not live ensemble recordings. All times are quarter-note units.
function sequence(notes: number[], durations = notes.map(() => 1), velocity = 0.5): SoundEvent[] {
  let beat = 0;
  return notes.map((midi, i) => {
    const event = { beat, duration: durations[i], midi, velocity };
    beat += durations[i];
    return event;
  });
}

function clips(id: string, ...specs: { events: SoundEvent[]; instrument?: InstrumentId; bpm?: number }[]): ListeningClip[] {
  return specs.map((spec, i) => ({
    id: `${id}-${String.fromCharCode(97 + i)}`, label: `소리 ${String.fromCharCode(65 + i)}`,
    instrument: spec.instrument ?? 'piano', bpm: spec.bpm ?? 96, events: spec.events,
  }));
}

function score(durations: ScoreNote['duration'][], dotsAt = -1): Visual {
  return { kind: 'score', time: '4/4', notes: durations.map((duration, i) => ({
    keys: ['c/4'], duration, ...(i === dotsAt ? { dots: 1 } : {}),
  })) };
}

const pulse = sequence([60, 60, 60, 60]);
const tune = sequence([60, 62, 64, 60]);
// Each short preparation attack marks a full quarter-note beat; the fourth beat ends at beat 4.
const preparationPulses: SoundEvent[] = [0, 1, 2, 3].map(beat => ({ beat, duration: 0.2, midi: 48, velocity: 0.45 }));
// Timbre tasks match MIDI, timing and velocity parameters, not perfectly controlled acoustics.
// Single-sample transposition changes attack/decay and timbre; asset gains do not ensure equal loudness.
// These limited-library comparisons still need rendered playback and listening validation.
const timbreNotes = sequence([67, 67, 67], [1, 1, 2]);
const chord: SoundEvent[] = [{ beat: 0, duration: 3, midi: [60, 64, 67], velocity: 0.5 }];
const arpeggio = sequence([60, 64, 67]);

export const LISTENING_QUESTIONS: BankQuestion[] = [
  {
    id: 'listen-34-rhythm-1', lessonId: 'rhythm', grade: '3-4', kind: 'listening',
    prompt: '4분음표를 한 박으로 세어요. 소리 A를 듣고 같은 리듬의 악보를 고르세요.',
    audio: clips('listen-34-rhythm-1', { events: pulse }),
    choices: [
      { text: '가', visual: score(['h', 'h']) },
      { text: '나', visual: score(['q', 'q', 'q', 'q']) },
      { text: '다', visual: score(['8', '8', 'q', 'h']) },
    ], correct: 1,
    why: '한 박 길이의 소리가 네 번 나요. 한 박마다 새 소리가 시작하므로 4분음표 네 개로 나타내요.',
    misconceptions: ['두 박 길이의 소리 두 개라면 소리가 두 번만 시작해요.', '한 박마다 소리가 시작하는 것을 찾았어요.', '첫 박 안에서 소리가 두 번 시작하는지 다시 들어 보세요.'],
  },
  {
    id: 'listen-34-rhythm-2', lessonId: 'rhythm', grade: '3-4', kind: 'listening',
    prompt: '4분음표가 한 박입니다. 소리 A의 짧고 긴 순서를 나타낸 악보는 무엇인가요?',
    audio: clips('listen-34-rhythm-2', { events: sequence([60, 60, 60, 60], [0.5, 0.5, 1, 2]) }),
    choices: [
      { text: '가', visual: score(['8', '8', 'q', 'h']) },
      { text: '나', visual: score(['h', 'q', '8', '8']) },
      { text: '다', visual: score(['q', 'q', 'q', 'q']) },
    ], correct: 0,
    why: '처음 두 소리는 각각 반 박, 다음은 한 박, 마지막은 두 박입니다. 합하면 네 박입니다.',
    misconceptions: ['반 박 두 번과 한 박, 두 박의 순서를 바르게 들었습니다.', '가장 긴 소리가 처음이 아니라 끝에 있는지 들어 보세요.', '소리 수가 네 개여도 길이가 모두 같은 것은 아닙니다.'],
  },
  {
    id: 'listen-34-rhythm-3', lessonId: 'rhythm', grade: '3-4', kind: 'listening',
    prompt: '4분음표를 한 박으로 셀 때, 소리 A의 세 소리는 어떤 길이 순서인가요?',
    audio: clips('listen-34-rhythm-3', { events: sequence([60, 60, 60], [2, 1, 1]) }),
    choices: [{ text: '짧은 소리 둘 뒤에 긴 소리 하나' }, { text: '길이가 같은 소리 셋' }, { text: '긴 소리 하나 뒤에 짧은 소리 둘' }], correct: 2,
    why: '첫 소리는 두 박 동안 이어지고, 다음 두 소리는 각각 한 박입니다. 긴 소리가 먼저입니다.',
    misconceptions: ['박을 세며 들어 보세요. 긴 소리가 처음에 있나요, 끝에 있나요?', '소리가 세 번 나도 길이가 모두 같지는 않아요.', '두 박 길이의 소리 뒤에 한 박짜리 소리가 두 번 나는 것을 찾았어요.'],
  },
  {
    id: 'listen-34-rhythm-4', lessonId: 'rhythm', grade: '3-4', kind: 'listening',
    prompt: '소리 A를 네 박으로 세어 보세요. 한 박 안에서 소리가 두 번 시작하는 박은 어디인가요?',
    audio: clips('listen-34-rhythm-4', { events: sequence([60, 60, 60, 60, 60], [1, 0.5, 0.5, 1, 1]) }),
    choices: [{ text: '첫 번째 박' }, { text: '두 번째 박' }, { text: '세 번째 박' }], correct: 1,
    why: '첫 박은 한 소리이고, 둘째 박만 반 박짜리 소리 둘로 나뉩니다. 박의 빠르기는 그대로입니다.',
    misconceptions: ['첫 박에는 소리가 한 번만 시작해요.', '둘째 박 안에서 소리가 두 번 시작하는 것을 찾았어요.', '셋째 박에는 소리가 한 번만 시작해요. 그 앞의 박을 들어 보세요.'],
  },
  {
    id: 'listen-34-rest-1', lessonId: 'rest', grade: '3-4', kind: 'listening',
    prompt: '낮은 준비박(가락 전에 박을 맞추는 소리) 네 번을 들어요. 짧게 울려도 한 박씩 끝까지 세어요. 그 뒤 높은 소리의 가락을 같은 빠르기로 네 박 세어요. 가락에서 쉬는 박은 어디인가요?',
    audio: clips('listen-34-rest-1', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '첫 번째 박' }, { text: '세 번째 박' }, { text: '두 번째 박' }], correct: 2,
    why: '준비박 뒤의 높은 소리는 가락의 첫째·셋째·넷째 박에 나와요. 둘째 박에는 쉬지만, 박을 세는 흐름은 이어가요.',
    misconceptions: ['준비박 뒤 가락의 첫째 박에는 높은 소리가 나요. 그다음 박을 들어 보세요.', '셋째 박에는 높은 소리가 다시 나와요. 그 바로 앞 박을 들어 보세요.', '소리가 없는 둘째 박도 세어서 네 박을 이어 갔어요.'],
  },
  {
    id: 'listen-34-rest-2', lessonId: 'rest', grade: '3-4', kind: 'listening',
    prompt: '낮은 준비박(가락 전에 박을 맞추는 소리) 네 번을 들어요. 네 번째 준비박의 한 박을 끝까지 세어요. 그 뒤에도 같은 빠르기로 박을 세어요. 높은 음의 가락은 어떻게 시작하나요?',
    audio: clips('listen-34-rest-2', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 5, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '준비박 뒤에 한 박을 쉰 뒤 시작한다' }, { text: '준비박 바로 다음 박에 시작한다' }, { text: '준비박 뒤에 두 박을 쉰 뒤 시작한다' }], correct: 0,
    why: '준비박은 짧게 울려도 한 번에 한 박씩 세어요. 네 번째 준비박의 한 박을 다 센 뒤에도 한 박을 더 쉬어요. 높은 음은 가락의 둘째 박에 시작해요.',
    misconceptions: ['준비박 네 박을 모두 센 뒤 가락의 첫 한 박을 쉬는 것을 찾았어요.', '네 번째 준비박의 한 박을 다 센 뒤에도 한 박을 더 기다려요.', '준비박 뒤에는 한 박만 쉬어요. 두 박을 기다리지는 않아요.'],
  },
  {
    id: 'listen-34-pitch-1', lessonId: 'pitch', grade: '3-4', kind: 'listening',
    prompt: '소리 A의 두 소리를 들어보세요. 더 높은 소리는 몇 번째인가요?',
    audio: clips('listen-34-pitch-1', { instrument: 'flute', events: sequence([60, 72]) }),
    choices: [{ text: '첫 번째 소리' }, { text: '두 번째 소리' }, { text: '두 소리의 높이가 같다' }], correct: 1,
    why: '둘째 소리가 첫째 소리보다 높아요. 여기서는 소리의 길이나 크기가 아니라 높고 낮음을 비교해요.',
    misconceptions: ['첫 음에서 다음 음으로 높이가 올라가는지 들어 보세요.', '두 번째 음이 더 높은 것을 바르게 들었습니다.', '길이가 같다는 것과 높이가 같다는 것은 다릅니다.'],
  },
  {
    id: 'listen-34-pitch-2', lessonId: 'pitch', grade: '3-4', kind: 'listening',
    prompt: '소리 A의 두 음을 들어 보세요. 두 번째 음의 높이는 첫 번째와 비교하면 어떤가요?',
    audio: clips('listen-34-pitch-2', { instrument: 'violin', events: sequence([67, 67]) }),
    choices: [{ text: '두 번째가 더 높다' }, { text: '두 번째가 더 낮다' }, { text: '높이가 같다' }], correct: 2,
    why: '두 번 모두 같은 높이의 음을 연주합니다. 소리가 새로 시작해도 음높이가 달라지는 것은 아닙니다.',
    misconceptions: ['소리가 새로 시작해도 높이가 꼭 올라가지는 않아요.', '두 번째 음이 첫 번째보다 낮은지 다시 들어 보세요.', '같은 높이의 음이 두 번 나는 것을 찾았어요.'],
  },
  {
    id: 'listen-34-melody-1', lessonId: 'melody', grade: '3-4', kind: 'listening',
    prompt: '소리 A의 네 음이 움직이는 방향을 들어 보세요. 가락은 어떻게 움직이나요?',
    audio: clips('listen-34-melody-1', { events: sequence([60, 62, 64, 65]) }),
    choices: [{ text: '차례로 올라간다' }, { text: '차례로 내려간다' }, { text: '같은 높이를 반복한다' }], correct: 0,
    why: '도에서 레, 미, 파로 이웃한 음을 따라 올라갑니다. 네 음의 높이가 조금씩 높아집니다.',
    misconceptions: ['이웃한 음으로 올라가는 가락을 바르게 들었습니다.', '다음 소리가 앞 소리보다 높은지 비교해 보세요.', '길이는 같지만 음높이는 조금씩 달라집니다.'],
  },
  {
    id: 'listen-34-melody-2', lessonId: 'melody', grade: '3-4', kind: 'listening',
    prompt: '소리 A의 네 음을 처음부터 끝까지 듣고 가락의 움직임을 고르세요.',
    audio: clips('listen-34-melody-2', { instrument: 'flute', events: sequence([67, 65, 64, 62]) }),
    choices: [{ text: '처음 높이로 되돌아온다' }, { text: '차례로 내려간다' }, { text: '음을 크게 건너뛰며 계속 올라간다' }], correct: 1,
    why: '솔에서 파, 미, 레로 이웃한 음을 따라 내려갑니다. 끝음은 처음 음보다 낮습니다.',
    misconceptions: ['마지막 음은 첫 음과 같지 않고 더 낮아요.', '이웃한 음을 따라 내려가는 차례가기를 찾았어요.', '음 사이를 크게 건너뛰며 올라가나요? 앞 음과 다음 음의 높이를 비교해 보세요.'],
  },
  {
    id: 'listen-34-dynamics-1', lessonId: 'dynamics', grade: '3-4', kind: 'listening',
    prompt: '기기의 소리 크기를 바꾸지 말고 소리 A와 B를 들어 보세요. 같은 리듬을 연주할 때 소리의 세기는 어떻게 다른가요?',
    audio: clips('listen-34-dynamics-1', { events: sequence([60, 60, 60, 60], undefined, 0.25) }, { events: sequence([60, 60, 60, 60], undefined, 0.65) }),
    choices: [{ text: '소리 B가 더 여리다' }, { text: '두 소리의 세기가 같다' }, { text: '소리 B가 더 세다' }], correct: 2,
    why: '같은 악기로 같은 높이와 리듬을 연주했지만 B를 더 세게 연주했어요. 빠르기가 아니라 셈여림, 즉 소리의 세기가 달라요.',
    misconceptions: ['B의 소리가 A보다 작은지 다시 들어 보세요.', '박과 박 사이의 시간이 같아도 소리의 세기는 다를 수 있어요.', '기기의 소리 크기를 바꾸지 않고 더 센 B를 찾았어요.'],
  },
  {
    id: 'listen-34-dynamics-2', lessonId: 'dynamics', grade: '3-4', kind: 'listening',
    prompt: '기기의 소리 크기를 바꾸지 말고 소리 A와 B를 들어 보세요. A에서 B로 바뀔 때 소리의 세기는 어떻게 달라지나요?',
    audio: clips('listen-34-dynamics-2', { events: sequence([64, 64, 64, 64], undefined, 0.65) }, { events: sequence([64, 64, 64, 64], undefined, 0.25) }),
    choices: [{ text: '소리 B가 더 여리다' }, { text: '소리 B가 더 세다' }, { text: '두 소리의 세기가 같다' }], correct: 0,
    why: 'A와 B의 음높이와 박 사이 시간은 같아요. B는 더 여리게, 즉 더 약하게 연주해요.',
    misconceptions: ['같은 리듬에서 소리의 세기가 줄어드는 것을 찾았어요.', '두 번째 연주가 더 작게 들리는지 다시 들어 보세요.', '같은 음을 연주해도 셈여림, 즉 소리의 세기는 달라질 수 있어요.'],
  },
  {
    id: 'listen-34-tempo-1', lessonId: 'tempo', grade: '3-4', kind: 'listening',
    prompt: '같은 네 박 리듬을 연주한 A와 B를 들으세요. 박이 지나가는 빠르기는 어떤가요?',
    audio: clips('listen-34-tempo-1', { events: pulse, bpm: 72 }, { events: pulse, bpm: 120 }),
    choices: [{ text: '소리 B가 더 느리다' }, { text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }], correct: 1,
    why: 'B에서는 같은 네 박의 소리가 더 짧은 시간에 이어집니다. 박 사이 시간이 줄어 더 빠릅니다.',
    misconceptions: ['B에서 박과 박 사이의 시간이 더 길어지는지 들어 보세요.', '같은 리듬이라도 B의 박이 더 빨리 지나가는 것을 찾았어요.', '소리의 수가 같아도 빠르기는 다를 수 있어요.'],
  },
  {
    id: 'listen-34-tempo-2', lessonId: 'tempo', grade: '3-4', kind: 'listening',
    prompt: '소리 A와 B는 똑같은 리듬을 연주해요. 박과 박 사이의 시간을 비교하면 빠르기는 어떻게 다른가요?',
    audio: clips('listen-34-tempo-2', { events: pulse, bpm: 120 }, { events: pulse, bpm: 72 }),
    choices: [{ text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }, { text: '소리 B가 더 느리다' }], correct: 2,
    why: 'B는 같은 네 박을 더 긴 시간에 연주해요. 박과 박 사이의 시간이 길어져 더 느려요.',
    misconceptions: ['B에서 한 박 뒤 다음 박까지 더 오래 기다리는지 들어 보세요.', '소리의 수가 같아도 박이 지나가는 시간은 다를 수 있어요.', '박과 박 사이의 시간이 더 긴 B가 더 느린 것을 찾았어요.'],
  },
  {
    id: 'listen-34-timbre-1', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '먼저 소리 A의 악기 소리를 기억해요. B와 C 중 A와 같은 악기 소리는 어느 것인가요?',
    audio: clips('listen-34-timbre-1', { events: timbreNotes }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes }),
    choices: [{ text: '소리 C' }, { text: '소리 B' }, { text: 'B와 C 모두' }], correct: 0,
    why: 'A와 C는 같은 피아노 소리이고 B는 플루트 소리예요. 높이와 리듬이 같아도 음색, 즉 악기마다 느껴지는 소리의 특징은 달라요.',
    misconceptions: ['A와 같은 악기 소리를 찾았어요.', 'B는 A와 높이가 같아도 다른 악기 소리예요. 소리가 처음 날 때와 이어질 때를 들어 보세요.', '같은 음을 연주해도 악기 소리까지 같지는 않아요.'],
  },
  {
    id: 'listen-34-timbre-2', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '소리 A, B, C는 같은 높이와 리듬이에요. 음색(악기마다 느껴지는 소리의 특징)이 나머지 둘과 다른 하나를 고르세요.',
    audio: clips('listen-34-timbre-2', { events: timbreNotes, instrument: 'violin' }, { events: timbreNotes, instrument: 'cello' }, { events: timbreNotes, instrument: 'violin' }),
    choices: [{ text: '소리 A' }, { text: '소리 B' }, { text: '소리 C' }], correct: 1,
    why: 'A와 C는 바이올린, B는 첼로 소리예요. 음높이는 같지만 악기의 음색은 달라요.',
    misconceptions: ['A와 C를 이어 들어 같은 음색인지 확인하세요.', '나머지 둘과 음색이 다른 B를 바르게 골랐습니다.', 'C는 A와 같은 악기입니다. B와 비교해 보세요.'],
  },
  {
    id: 'listen-34-timbre-3', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '소리 A와 B를 비교하고, C와 D도 비교해요. 두 쌍에서 음색(악기마다 느껴지는 소리의 특징)은 각각 같나요?',
    audio: clips('listen-34-timbre-3', { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: '두 쌍 모두 같다' }, { text: 'A와 B는 다르고, C와 D는 같다' }, { text: 'A와 B는 같고, C와 D는 다르다' }], correct: 2,
    why: 'A와 B는 모두 플루트입니다. C는 플루트, D는 클라리넷이므로 두 번째 쌍의 음색만 다릅니다.',
    misconceptions: ['C와 D는 같은 높이로 연주해도 음색이 달라요.', '먼저 A와 B를 비교해요. 그다음 C와 D를 따로 비교해 보세요.', 'A와 B는 같고 C와 D는 다른 것을 찾았어요.'],
  },
  {
    id: 'listen-34-timbre-4', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '소리 A와 B를 들어 보세요. 두 연주에서 무엇이 달라졌나요?',
    audio: clips('listen-34-timbre-4', { events: timbreNotes, instrument: 'cello' }, { events: timbreNotes, instrument: 'trumpet' }),
    choices: [{ text: '악기의 음색' }, { text: '가락의 음높이 순서' }, { text: '박의 빠르기' }], correct: 0,
    why: 'A는 첼로, B는 트럼펫 소리로 같은 음들을 연주했어요. 음색, 즉 악기마다 느껴지는 소리의 특징이 달라요.',
    misconceptions: ['두 연주에서 악기의 음색이 달라지는 것을 찾았어요.', '두 연주는 같은 높이의 음들을 같은 순서로 연주해요.', '박과 박 사이의 시간은 같아요. 악기 소리의 특징을 비교해 보세요.'],
  },
  {
    id: 'listen-34-harmony-1', lessonId: 'harmony', grade: '3-4', kind: 'listening',
    prompt: 'A와 B는 같은 세 음을 씁니다. 음들이 시작하는 방식을 비교하면 무엇이 맞나요?',
    audio: clips('listen-34-harmony-1', { events: chord }, { events: arpeggio }),
    choices: [{ text: 'A는 차례로, B는 함께 울린다' }, { text: 'A는 함께, B는 차례로 울린다' }, { text: 'A와 B 모두 한 음씩 차례로 울린다' }], correct: 1,
    why: 'A의 세 음은 같은 순간에 시작해 함께 어울립니다. B에서는 같은 세 음이 한 음씩 차례로 시작합니다.',
    misconceptions: ['세 음이 한꺼번에 시작하는 쪽을 다시 들어 보세요.', '세 음이 함께 시작하는 것과 하나씩 시작하는 것을 구별했어요.', 'A에서는 서로 다른 세 음이 한꺼번에 시작해요.'],
  },
  {
    id: 'listen-34-form-1', lessonId: 'form', grade: '3-4', kind: 'listening',
    prompt: '소리 A를 네 박씩 두 부분으로 나누어 들어요. 앞부분과 뒷부분의 가락을 비교하면 어떤가요?',
    audio: clips('listen-34-form-1', { bpm: 120, events: sequence([60, 62, 64, 60, 67, 65, 62, 67]) }),
    choices: [{ text: '같은 가락을 두 번 반복' }, { text: '같은 높이의 음만 계속 반복' }, { text: '서로 다른 두 부분' }], correct: 2,
    why: '앞 네 음은 도·레·미·도, 뒤 네 음은 솔·파·레·솔입니다. 리듬은 같아도 두 가락은 다릅니다.',
    misconceptions: ['리듬이 같아도 가락은 다를 수 있어요. 앞 네 박과 뒤 네 박의 음높이를 비교해 보세요.', '앞부분과 뒷부분 모두 음높이가 여러 번 바뀌어요.', '앞 네 박과 뒤 네 박의 가락이 다른 것을 찾았어요.'],
  },
  {
    id: 'listen-56-rhythm-1', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '4분음표를 한 박으로 세며 소리 A를 들어 보세요. 소리의 길이와 순서가 같은 악보를 고르세요.',
    audio: clips('listen-56-rhythm-1', { events: sequence([60, 60, 60, 60], [1.5, 0.5, 1, 1]) }),
    choices: [
      { text: '가', visual: score(['q', 'q', '8', 'q'], 1) },
      { text: '나', visual: score(['q', '8', 'q', 'q'], 0) },
      { text: '다', visual: score(['8', 'q', 'q', 'q'], 1) },
    ], correct: 1,
    why: '첫 소리는 한 박 반, 다음 소리는 반 박입니다. 이어지는 한 박짜리 둘까지 합하면 네 박입니다.',
    misconceptions: ['한 박 반인 소리가 두 번째에 있나요, 처음에 있나요? 다시 들어 보세요.', '첫 4분음표에 점이 붙어 반 박이 늘어나요. 그 뒤의 반 박 소리까지 잘 들었어요.', '처음 두 소리의 길이 순서를 다시 들어 보세요. 순서가 바뀌면 다른 리듬이에요.'],
  },
  {
    id: 'listen-56-rhythm-2', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '4분음표를 한 박으로 세어요. 소리 A는 네 박이에요. 한 박 안에 같은 길이의 소리 네 개가 들어 있는 박은 어디인가요?',
    audio: clips('listen-56-rhythm-2', { events: sequence([60, 60, 60, 60, 60, 60], [0.25, 0.25, 0.25, 0.25, 1, 2]) }),
    choices: [{ text: '첫 번째 박' }, { text: '두 번째 박' }, { text: '세 번째 박' }], correct: 0,
    why: '처음 한 박이 16분음표 네 개로 나뉩니다. 둘째 박은 한 소리, 셋째부터는 두 박 소리가 이어집니다.',
    misconceptions: ['첫 박 안에서 같은 길이의 소리가 네 번 나는 것을 찾았어요.', '둘째 박에는 4분음표 하나가 들어 있어요.', '셋째 박부터는 한 소리가 두 박 동안 이어져요.'],
  },
  {
    id: 'listen-56-rhythm-3', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '4분음표를 한 박으로 세어요. 소리 A에서 박 중간에 시작해 다음 박까지 이어지는 소리를 들어 보세요. 들은 리듬과 같은 악보를 고르세요.',
    audio: clips('listen-56-rhythm-3', { events: sequence([60, 60, 60, 60], [0.5, 1, 0.5, 2]) }),
    choices: [
      { text: '가', visual: score(['q', '8', '8', 'h']) },
      { text: '나', visual: score(['8', '8', 'q', 'h']) },
      { text: '다', visual: score(['8', 'q', '8', 'h']) },
    ], correct: 2,
    why: '반 박 뒤에 시작한 두 번째 소리가 한 박 동안 이어집니다. 길이 순서는 반 박·한 박·반 박·두 박입니다.',
    misconceptions: ['첫 음의 길이는 한 박이 아니라 반 박이에요.', '두 번째 음은 반 박 뒤에 시작해요. 그 음의 길이는 한 박이에요.', '박 중간에 시작해 한 박 동안 이어지는 소리와 같은 악보를 찾았어요.'],
  },
  {
    id: 'listen-56-rhythm-4', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '소리 A를 네 박으로 세어 들어보세요. 한 박에 소리가 두 번씩 시작하다가 한 번으로 돌아오는 박은 어디인가요?',
    audio: clips('listen-56-rhythm-4', { events: sequence([60, 60, 60, 60, 60, 60], [1, 0.5, 0.5, 0.5, 0.5, 1]) }),
    choices: [{ text: '세 번째 박' }, { text: '네 번째 박' }, { text: '두 번째 박' }], correct: 1,
    why: '둘째와 셋째 박은 각각 반 박 소리 둘입니다. 넷째 박에서 다시 한 박 길이의 한 소리로 돌아옵니다.',
    misconceptions: ['셋째 박에도 반 박짜리 소리가 두 번 나요.', '둘째와 셋째 박에는 두 번씩, 넷째 박에는 한 번 소리가 시작하는 것을 찾았어요.', '둘째 박부터 소리가 한 박에 두 번씩 시작해요. 끝까지 세어 보세요.'],
  },
  {
    id: 'listen-56-rest-1', lessonId: 'rest', grade: '5-6', kind: 'listening',
    prompt: '낮은 준비박(가락 전에 박을 맞추는 소리) 네 번을 들어요. 짧게 울려도 한 박씩 끝까지 세어요. 그 뒤 높은 소리의 가락도 같은 빠르기로 세어요. 짧은 소리 두 번 뒤에 몇 박을 쉬나요?',
    audio: clips('listen-56-rest-1', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 4.5, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '한 박' }, { text: '반 박' }, { text: '두 박' }], correct: 0,
    why: '준비박 뒤 첫 박에는 반 박짜리 소리가 두 번 나요. 둘째 박은 모두 쉬고 셋째 박에 다음 소리가 시작해요. 쉬는 길이는 한 박이에요.',
    misconceptions: ['첫 박에는 짧은 소리가 두 번 나고 둘째 박에는 쉬는 것을 구별했어요.', '앞의 짧은 소리는 반 박씩이에요. 그 뒤에는 둘째 박 전체를 쉬어요.', '소리가 난 첫 박은 쉼에 넣지 않아요. 쉬는 자리는 둘째 박 하나예요.'],
  },
  {
    id: 'listen-56-rest-2', lessonId: 'rest', grade: '5-6', kind: 'listening',
    prompt: '낮은 준비박(가락 전에 박을 맞추는 소리) 네 번을 들어요. 짧게 울려도 4분음표 길이로 한 박씩 끝까지 세어요. 그 뒤에도 같은 빠르기로 세어요. 첫 높은 음은 가락의 첫 박에 시작해요. 쉰 뒤 두 번째 높은 음은 언제 시작하나요?',
    audio: clips('listen-56-rest-2', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 5.5, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '둘째 박이 시작할 때' }, { text: '셋째 박이 시작할 때' }, { text: '둘째 박의 뒤쪽 반 박이 시작할 때' }], correct: 2,
    why: '준비박과 같은 빠르기로 세어요. 첫 높은 음이 시작한 뒤 한 박 반이 지나면 두 번째 높은 음이 시작해요. 둘째 박의 앞쪽 반 박은 쉬고 뒤쪽 반 박에 새 음이 시작해요.',
    misconceptions: ['둘째 박이 시작할 때는 새 음이 나지 않아요. 그 박을 반씩 나누어 세어 보세요.', '셋째 박이 오기 전에 둘째 박의 뒤쪽 반 박에서 새 음이 시작해요.', '남아 울리는 소리가 아니라 새 음이 시작하는 때를 찾았어요. 준비박과 같은 빠르기로 잘 세었어요.'],
  },
  {
    id: 'listen-56-pitch-1', lessonId: 'pitch', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 두 음을 들어 보세요. 두 번째 음의 높이는 첫 번째와 비교하면 어떤가요?',
    audio: clips('listen-56-pitch-1', { instrument: 'flute', events: sequence([60, 72]) }),
    choices: [{ text: '같은 높이이다' }, { text: '한 옥타브 높아진다' }, { text: '한 옥타브 낮아진다' }], correct: 1,
    why: '둘째 음이 첫째 음보다 한 옥타브 높아요. 이 예시의 두 음은 모두 다(C)이며, 음이름이 같아도 높이는 다를 수 있어요.',
    misconceptions: ['두 음의 이름이 같아도 한 옥타브 떨어져 있으면 높이가 달라요.', '도에서 더 높은 도까지 한 옥타브 올라가는 것을 들었어요.', '두 번째 음이 더 높은지, 더 낮은지 다시 들어 보세요.'],
  },
  {
    id: 'listen-56-pitch-2', lessonId: 'pitch', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 세 음 중 가장 낮은 음은 몇 번째인가요?',
    audio: clips('listen-56-pitch-2', { instrument: 'cello', events: sequence([72, 60, 67]) }),
    choices: [{ text: '두 번째 소리' }, { text: '첫 번째 소리' }, { text: '세 번째 소리' }], correct: 0,
    why: '높은 도 다음에 한 옥타브 낮은 도, 그 뒤에 솔이 납니다. 세 음 중 두 번째 도가 가장 낮습니다.',
    misconceptions: ['내려갔다 다시 올라가는 가락에서 가장 낮은 음을 찾았어요.', '첫 음은 가장 낮은 음이 아니라 가장 높은 음이에요.', '마지막 음은 바로 앞 음보다 높아요. 가장 낮은 음이 어디 있는지 다시 들어 보세요.'],
  },
  {
    id: 'listen-56-melody-1', lessonId: 'melody', grade: '5-6', kind: 'listening',
    prompt: '다장조 가락입니다. 소리 A에서 이웃한 음을 건너뛰어 움직이는 곳은 어디인가요?',
    audio: clips('listen-56-melody-1', { events: sequence([60, 64, 62, 60]) }),
    choices: [{ text: '둘째 음에서 셋째 음으로 갈 때' }, { text: '셋째 음에서 넷째 음으로 갈 때' }, { text: '첫째 음에서 둘째 음으로 갈 때' }], correct: 2,
    why: '도에서 미로 갈 때 레를 건너뛰어요. 이렇게 이웃한 음을 건너뛰는 움직임이 도약이에요. 미에서 레, 레에서 도는 이웃한 음으로 움직이는 차례가기예요.',
    misconceptions: ['미에서 레는 이웃한 음으로 내려가는 차례가기예요.', '레에서 도도 이웃한 음으로 움직여요. 사이에 다른 음을 건너뛰지 않아요.', '처음에는 음을 건너뛰는 도약, 그 뒤에는 이웃한 음으로 움직이는 차례가기를 찾았어요.'],
  },
  {
    id: 'listen-56-melody-2', lessonId: 'melody', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 여덟 음을 끝까지 들어보세요. 첫음과 끝음의 높이를 비교한 설명은 무엇인가요?',
    audio: clips('listen-56-melody-2', { instrument: 'violin', events: sequence([60, 64, 67, 64, 65, 62, 67, 60]) }),
    choices: [{ text: '끝음이 처음 음보다 높다' }, { text: '끝음이 처음 음과 같다' }, { text: '끝음이 처음 음보다 낮다' }], correct: 1,
    why: '중간에는 음높이가 여러 번 바뀌어요. 마지막에는 첫음과 같은 높이로 돌아와요. 바로 앞 음이 아니라 첫음을 기억해서 비교해요.',
    misconceptions: ['중간에 나온 높은 음이 아니라 여덟 번째인 마지막 음을 첫음과 비교해요.', '첫음의 높이를 기억해서 마지막에 같은 높이로 돌아온 것을 찾았어요.', '끝음은 바로 앞 음보다 낮아요. 하지만 첫음과는 같은 높이예요. 첫음과 끝음을 비교해 보세요.'],
  },
  {
    id: 'listen-56-dynamics-1', lessonId: 'dynamics', grade: '5-6', kind: 'listening',
    prompt: '기기의 소리 크기를 바꾸지 말고 소리 A의 네 음을 끝까지 들어요. 셈여림(소리의 세기)은 어떻게 바뀌나요?',
    audio: clips('listen-56-dynamics-1', { events: [0.2, 0.35, 0.5, 0.65].map((velocity, beat) => ({ beat, duration: 1, midi: 60, velocity })) }),
    choices: [{ text: '점점 세게' }, { text: '점점 여리게' }, { text: '같은 세기' }], correct: 0,
    why: '같은 높이의 도를 같은 박 간격으로 네 번 연주해요. 소리의 세기만 점점 커져요. 이를 크레셴도, 즉 점점 세게라고 해요. 음높이나 빠르기가 바뀐 것은 아니에요.',
    misconceptions: ['음높이와 박 간격은 같은데 소리가 점점 세지는 것을 들었어요.', '뒤의 음으로 갈수록 소리가 약해지는지 세지는지 다시 들어 보세요.', '같은 음을 반복해도 세기는 달라져요. 처음과 끝, 가운데 음들의 세기를 차례로 비교해 보세요.'],
  },
  {
    id: 'listen-56-dynamics-2', lessonId: 'dynamics', grade: '5-6', kind: 'listening',
    prompt: '기기의 소리 크기를 바꾸지 말고 소리 A를 들어요. 첫 음부터 넷째 음까지 셈여림(소리의 세기)은 어떻게 바뀌나요?',
    audio: clips('listen-56-dynamics-2', { events: [0.65, 0.5, 0.35, 0.2].map((velocity, beat) => ({ beat, duration: 1, midi: 60, velocity })) }),
    choices: [{ text: '점점 세게' }, { text: '점점 여리게' }, { text: '같은 세기' }], correct: 1,
    why: '같은 높이의 도를 같은 박 간격으로 반복해요. 소리의 세기만 점점 작아져요. 이를 디미누엔도, 즉 점점 여리게라고 해요. 음높이나 빠르기가 바뀐 것은 아니에요.',
    misconceptions: ['네 음을 들으며 소리가 점점 세지는지 약해지는지 비교해 보세요.', '음높이와 빠르기는 그대로인데 소리가 점점 여려지는 것을 들었어요.', '음높이가 같아도 셈여림은 바뀔 수 있어요. 네 음의 세기를 차례로 비교해 보세요.'],
  },
  {
    id: 'listen-56-tempo-1', lessonId: 'tempo', grade: '5-6', kind: 'listening',
    prompt: '소리 A와 B는 같은 가락과 리듬을 연주해요. 음표 길이의 비율(서로 몇 배 긴지)은 같아요. 연주하는 빠르기는 어떻게 다른가요?',
    audio: clips('listen-56-tempo-1', { events: tune, bpm: 72 }, { events: tune, bpm: 120 }),
    choices: [{ text: '소리 B가 더 느리다' }, { text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }], correct: 1,
    why: 'B는 같은 가락과 리듬을 더 짧은 시간에 연주해요. 음표 길이의 비율은 같아도 한 박이 더 짧게 지나가므로 B가 더 빨라요.',
    misconceptions: ['B에서 한 박이 더 길게 지나가나요? 박과 박 사이의 시간을 비교해 보세요.', '같은 리듬이어도 B의 한 박이 더 짧게 지나가는 것을 찾았어요.', '음표 길이의 비율이 같아도 한 박이 지나가는 시간은 달라질 수 있어요.'],
  },
  {
    id: 'listen-56-tempo-2', lessonId: 'tempo', grade: '5-6', kind: 'listening',
    prompt: '소리 A에서 각 소리는 한 박의 시작을 알려 줘요. 짧은 소리 다섯 번에 맞춰 박을 세어 보세요. 빠르기는 어떻게 바뀌나요?',
    audio: clips('listen-56-tempo-2', { bpm: 96, events: [0, 1, 2.3, 3.9, 5.8].map(beat => ({ beat, duration: 0.18, midi: 60, velocity: 0.5 })) }),
    choices: [{ text: '점점 느려진다' }, { text: '점점 빨라진다' }, { text: '같은 빠르기를 유지한다' }], correct: 0,
    why: '소리가 날 때마다 한 박이 시작해요. 다음 소리가 나기까지 기다리는 시간이 점점 길어져요. 한 박이 길어지므로 점점 느려져요. 짧은 소리 자체의 길이와 음높이, 세기는 같아요.',
    misconceptions: ['한 박 뒤 다음 박까지 더 오래 기다리므로 점점 느려지는 것을 들었어요.', '점점 빨라지려면 다음 박까지 기다리는 시간이 짧아져야 해요. 여기서는 더 길어져요.', '짧은 소리 자체의 길이는 같아요. 하지만 다음 박까지 기다리는 시간은 점점 길어져요.'],
  },
  {
    id: 'listen-56-timbre-1', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: '소리 A와 B는 높이와 리듬이 같아요. 악기의 음색을 듣고 두 악기가 속한 악기군(악기를 종류별로 묶은 것)을 고르세요.',
    audio: clips('listen-56-timbre-1', { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: '둘 다 현악기' }, { text: '둘 다 금관악기' }, { text: '둘 다 목관악기' }], correct: 2,
    why: 'A는 플루트, B는 클라리넷 소리예요. 음색은 달라도 두 악기는 모두 목관악기에 속해요.',
    misconceptions: ['두 소리는 바이올린이나 첼로처럼 줄을 켜서 내는 소리가 아니에요.', '플루트와 클라리넷은 금관악기가 아니라 목관악기예요.', '음색이 다른 두 악기가 모두 목관악기인 것을 찾았어요.'],
  },
  {
    id: 'listen-56-timbre-2', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: '소리 A와 B는 같은 음을 연주해요. 두 음색을 듣고 알맞은 악기군(악기를 종류별로 묶은 것)을 고르세요.',
    audio: clips('listen-56-timbre-2', { events: timbreNotes, instrument: 'violin' }, { events: timbreNotes, instrument: 'cello' }),
    choices: [{ text: '둘 다 현악기' }, { text: '둘 다 목관악기' }, { text: 'A는 현악기, B는 금관악기' }], correct: 0,
    why: 'A는 바이올린, B는 첼로 소리예요. 둘 다 줄을 켜서 연주하는 현악기예요. 같은 높이로 연주해도 두 악기의 음색은 달라요.',
    misconceptions: ['음색이 다른 두 악기가 모두 현악기인 것을 찾았어요.', '두 소리는 플루트나 클라리넷 같은 목관악기가 아니에요.', 'B는 트럼펫이 아니라 줄을 켜서 연주하는 첼로 소리예요.'],
  },
  {
    id: 'listen-56-timbre-3', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: '같은 높이와 길이로 연주한 소리 A와 B를 들어요. A, B 순서에 맞는 악기군(악기를 종류별로 묶은 것)을 고르세요.',
    audio: clips('listen-56-timbre-3', { events: timbreNotes, instrument: 'trumpet' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: 'A는 목관악기, B는 금관악기' }, { text: 'A는 금관악기, B는 목관악기' }, { text: 'A와 B 모두 현악기' }], correct: 1,
    why: 'A는 금관악기인 트럼펫, B는 목관악기인 클라리넷 소리예요. 같은 음을 연주해도 음색은 달라요.',
    misconceptions: ['A와 B를 다시 들어요. 두 악기군의 순서를 바꾸어 고르지 않았는지 확인해 보세요.', 'A의 트럼펫은 금관악기, B의 클라리넷은 목관악기인 것을 찾았어요.', '두 소리는 바이올린이나 첼로 같은 현악기 소리가 아니에요.'],
  },
  {
    id: 'listen-56-timbre-4', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: '소리 A, B, C를 들어 보세요. 숨을 불어 관(속이 빈 긴 통) 속의 공기를 울리는 악기 두 개를 고르세요.',
    audio: clips('listen-56-timbre-4', { events: timbreNotes }, { events: timbreNotes, instrument: 'trumpet' }, { events: timbreNotes, instrument: 'flute' }),
    choices: [{ text: 'A와 B' }, { text: 'A와 C' }, { text: 'B와 C' }], correct: 2,
    why: 'A는 피아노, B는 트럼펫, C는 플루트 소리예요. 트럼펫은 금관악기, 플루트는 목관악기예요. 둘 다 숨을 불어 연주하는 관악기예요. 피아노는 건반과 연결된 해머(작은 망치)가 현(줄)을 두드려요.',
    misconceptions: ['트럼펫은 관악기이지만 A의 피아노는 숨을 불어 연주하지 않아요.', '플루트는 관악기이지만 A의 피아노는 작은 망치로 줄을 두드려요. B도 함께 들어 보세요.', '소리는 달라도 트럼펫과 플루트는 둘 다 숨을 불어 연주하는 관악기예요.'],
  },
  {
    id: 'listen-56-harmony-1', lessonId: 'harmony', grade: '5-6', kind: 'listening',
    prompt: '소리 A와 B는 모두 도·미·솔을 연주해요. 이 세 음을 연주하는 방법은 어떻게 다른가요?',
    audio: clips('listen-56-harmony-1', { events: chord }, { events: arpeggio }),
    choices: [{ text: 'A는 도·미·솔을 한꺼번에, B는 같은 음들을 차례로 연주한다' }, { text: 'A와 B 모두 세 음을 한꺼번에 연주한다' }, { text: 'A와 B는 서로 다른 음들을 연주한다' }], correct: 0,
    why: 'A는 도·미·솔 화음의 세 음이 한꺼번에 시작해요. B는 같은 세 음이 하나씩 차례로 시작해요. 쓴 음은 같고 울리는 방법이 달라요.',
    misconceptions: ['화음의 음들이 한꺼번에 시작하는 것과 하나씩 시작하는 것을 구별했어요.', 'B의 세 음은 한꺼번에 시작하지 않아요. 하나씩 차례로 시작해요.', 'A와 B는 같은 세 음을 써요. 음들이 시작하는 때와 함께 울리는지가 달라요.'],
  },
  {
    id: 'listen-56-form-1', lessonId: 'form', grade: '5-6', kind: 'listening',
    prompt: '소리 A를 네 박씩 세 부분으로 나누어 들어요. 첫 부분은 a로 적어요. 같은 가락은 같은 글자, 다른 가락은 다른 글자로 적으면 어떤 순서인가요?',
    audio: clips('listen-56-form-1', { bpm: 120, events: sequence([60, 62, 64, 60, 67, 65, 62, 67, 60, 62, 64, 60]) }),
    choices: [{ text: 'aab' }, { text: 'aba' }, { text: 'abb' }], correct: 1,
    why: '첫 네 박의 가락은 a예요. 가운데 네 박은 다른 가락이라 b예요. 마지막 네 박은 첫 가락과 같아서 다시 a예요. 그래서 aba예요.',
    misconceptions: ['첫 부분과 가운데 부분은 리듬이 같아도 가락이 달라요.', '마지막에 첫 가락이 다시 나오는 것을 들었어요.', '마지막 가락은 가운데가 아니라 첫 부분과 같아요.'],
  },
];
