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
    prompt: '4분음표를 한 박으로 셉니다. 소리 A의 리듬과 같은 악보를 고르세요.',
    audio: clips('listen-34-rhythm-1', { events: pulse }),
    choices: [
      { text: '가', visual: score(['h', 'h']) },
      { text: '나', visual: score(['q', 'q', 'q', 'q']) },
      { text: '다', visual: score(['8', '8', 'q', 'h']) },
    ], correct: 1,
    why: '한 박 길이의 소리가 한 박 간격으로 네 번 납니다. 따라서 4분음표 네 개와 같습니다.',
    misconceptions: ['두 박씩 이어지는 소리는 두 번만 시작합니다.', '소리의 시작과 한 박 길이를 모두 바르게 짚었습니다.', '처음 한 박이 둘로 나뉘어 들리는지 다시 확인해 보세요.'],
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
    misconceptions: ['긴 소리가 처음인지 끝인지 시작 간격을 따라 세어 보세요.', '소리가 세 번 나도 세 길이가 모두 같지는 않습니다.', '두 박 뒤에 한 박씩 두 번 이어지는 순서를 찾았습니다.'],
  },
  {
    id: 'listen-34-rhythm-4', lessonId: 'rhythm', grade: '3-4', kind: 'listening',
    prompt: '소리 A를 네 박으로 세어 보세요. 한 박 안에서 소리가 두 번 시작하는 박은 어디인가요?',
    audio: clips('listen-34-rhythm-4', { events: sequence([60, 60, 60, 60, 60], [1, 0.5, 0.5, 1, 1]) }),
    choices: [{ text: '첫 번째 박' }, { text: '두 번째 박' }, { text: '세 번째 박' }], correct: 1,
    why: '첫 박은 한 소리이고, 둘째 박만 반 박짜리 소리 둘로 나뉩니다. 박의 빠르기는 그대로입니다.',
    misconceptions: ['첫 박에는 소리가 한 번만 시작합니다.', '둘째 박 안의 두 시작점을 바르게 찾았습니다.', '소리가 나뉜 뒤에도 셋째 박은 한 소리입니다.'],
  },
  {
    id: 'listen-34-rest-1', lessonId: 'rest', grade: '3-4', kind: 'listening',
    prompt: '낮은 준비박 네 번 뒤에 높은 소리의 가락이 나와요. 같은 박으로 네 박을 세며, 가락에서 쉬는 박을 골라보세요.',
    audio: clips('listen-34-rest-1', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '첫 번째 박' }, { text: '세 번째 박' }, { text: '두 번째 박' }], correct: 2,
    why: '준비박 뒤의 높은 소리는 가락의 첫째·셋째·넷째 박에 나와요. 둘째 박에는 쉬지만, 박을 세는 흐름은 이어가요.',
    misconceptions: ['준비박이 끝난 뒤 첫째 박에는 높은 소리가 나요. 그다음 박을 들어보세요.', '셋째 박에는 높은 소리가 다시 나와요. 그 직전 박을 확인해요.', '소리가 없는 둘째 박도 한 박으로 세어 네 박을 유지했어요.'],
  },
  {
    id: 'listen-34-rest-2', lessonId: 'rest', grade: '3-4', kind: 'listening',
    prompt: '낮은 준비박 네 번을 들은 뒤 같은 박을 이어 세어요. 네 번째 준비박의 한 박을 끝까지 센 다음, 높은 음의 가락은 어떻게 시작하나요?',
    audio: clips('listen-34-rest-2', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 5, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '준비박 뒤에 한 박을 쉰 뒤 시작한다' }, { text: '준비박 바로 다음 박에 시작한다' }, { text: '준비박 뒤에 두 박을 쉰 뒤 시작한다' }], correct: 0,
    why: '준비박은 짧게 울려도 각각 한 박을 셉니다. 네 번째 준비박의 한 박을 다 센 뒤, 가락의 첫 박을 쉬고 둘째 박에 높은 음이 시작합니다.',
    misconceptions: ['준비박 네 박을 모두 센 뒤 가락의 첫 한 박 쉼을 찾았습니다.', '네 번째 준비박을 한 박 끝까지 센 뒤에도 가락은 한 박 더 기다립니다.', '준비박 뒤의 가락에서 쉬는 자리는 처음 한 박입니다. 두 박을 기다리지는 않습니다.'],
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
    prompt: '소리 A의 두 음을 듣고 음높이의 관계를 고르세요.',
    audio: clips('listen-34-pitch-2', { instrument: 'violin', events: sequence([67, 67]) }),
    choices: [{ text: '두 번째가 더 높다' }, { text: '두 번째가 더 낮다' }, { text: '높이가 같다' }], correct: 2,
    why: '두 번 모두 같은 높이의 음을 연주합니다. 소리가 새로 시작해도 음높이가 달라지는 것은 아닙니다.',
    misconceptions: ['새로 소리가 난다는 이유만으로 높아지지는 않습니다.', '두 음의 높이를 비교하면 내려가지 않습니다.', '같은 음높이가 두 번 이어지는 것을 찾았습니다.'],
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
    choices: [{ text: '처음 높이로 되돌아온다' }, { text: '차례로 내려간다' }, { text: '큰 간격으로 계속 올라간다' }], correct: 1,
    why: '솔에서 파, 미, 레로 이웃한 음을 따라 내려갑니다. 끝음은 처음 음보다 낮습니다.',
    misconceptions: ['마지막 음은 첫 음과 같지 않고 더 낮습니다.', '음마다 낮아지는 차례가기를 바르게 들었습니다.', '큰 도약도 상승도 없습니다. 앞뒤 음을 비교하세요.'],
  },
  {
    id: 'listen-34-dynamics-1', lessonId: 'dynamics', grade: '3-4', kind: 'listening',
    prompt: '기기의 음량을 바꾸지 말고 A와 B를 들으세요. 같은 리듬의 연주 세기를 비교하면?',
    audio: clips('listen-34-dynamics-1', { events: sequence([60, 60, 60, 60], undefined, 0.25) }, { events: sequence([60, 60, 60, 60], undefined, 0.65) }),
    choices: [{ text: '소리 B가 더 여리다' }, { text: '두 소리의 세기가 같다' }, { text: '소리 B가 더 세다' }], correct: 2,
    why: '같은 악기와 높이, 리듬에서 B를 더 세게 연주했습니다. 빠르기 차이가 아니라 셈여림 차이입니다.',
    misconceptions: ['B의 소리가 A보다 작아지는지 다시 비교하세요.', '박의 간격이 같아도 연주 세기는 다를 수 있습니다.', '기기 음량을 유지하며 더 센 B를 구별했습니다.'],
  },
  {
    id: 'listen-34-dynamics-2', lessonId: 'dynamics', grade: '3-4', kind: 'listening',
    prompt: '기기의 음량을 그대로 두세요. A에서 B로 바뀌며 연주 세기는 어떻게 달라지나요?',
    audio: clips('listen-34-dynamics-2', { events: sequence([64, 64, 64, 64], undefined, 0.65) }, { events: sequence([64, 64, 64, 64], undefined, 0.25) }),
    choices: [{ text: '소리 B가 더 여리다' }, { text: '소리 B가 더 세다' }, { text: '두 소리의 세기가 같다' }], correct: 0,
    why: 'A와 B의 높이와 박 간격은 같지만 B는 더 여리게 연주합니다. 소리의 세기에 집중해 비교합니다.',
    misconceptions: ['같은 리듬에서 세기가 줄어드는 것을 구별했습니다.', '두 번째 연주가 더 작게 들리는지 다시 확인하세요.', '같은 음을 연주해도 셈여림은 달라질 수 있습니다.'],
  },
  {
    id: 'listen-34-tempo-1', lessonId: 'tempo', grade: '3-4', kind: 'listening',
    prompt: '같은 네 박 리듬을 연주한 A와 B를 들으세요. 박이 지나가는 빠르기는 어떤가요?',
    audio: clips('listen-34-tempo-1', { events: pulse, bpm: 72 }, { events: pulse, bpm: 120 }),
    choices: [{ text: '소리 B가 더 느리다' }, { text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }], correct: 1,
    why: 'B에서는 같은 네 박의 소리가 더 짧은 시간에 이어집니다. 박 사이 시간이 줄어 더 빠릅니다.',
    misconceptions: ['B에서 박과 박 사이 시간이 더 길어지는지 확인하세요.', '같은 리듬이라도 박이 더 빨리 지나감을 들었습니다.', '음의 개수가 같아도 빠르기는 다를 수 있습니다.'],
  },
  {
    id: 'listen-34-tempo-2', lessonId: 'tempo', grade: '3-4', kind: 'listening',
    prompt: 'A와 B에서 똑같은 리듬을 연주합니다. B의 박 간격을 A와 비교해 보세요.',
    audio: clips('listen-34-tempo-2', { events: pulse, bpm: 120 }, { events: pulse, bpm: 72 }),
    choices: [{ text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }, { text: '소리 B가 더 느리다' }], correct: 2,
    why: 'B는 같은 네 박을 더 긴 시간에 연주합니다. 박 사이의 실제 시간이 길어져 더 느립니다.',
    misconceptions: ['B의 시작 간격이 더 벌어지는지 다시 들어 보세요.', '음의 수뿐 아니라 박이 지나가는 시간을 비교하세요.', '더 넓어진 박 간격을 빠르기 감소와 연결했습니다.'],
  },
  {
    id: 'listen-34-timbre-1', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: 'A를 기준 소리로 기억하세요. B와 C 중 A와 같은 악기 소리는 어느 것인가요?',
    audio: clips('listen-34-timbre-1', { events: timbreNotes }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes }),
    choices: [{ text: '소리 C' }, { text: '소리 B' }, { text: 'B와 C 모두' }], correct: 0,
    why: 'A와 C는 같은 피아노 샘플로 연주하고 B는 플루트입니다. 높이와 리듬이 같아도 음색은 다릅니다.',
    misconceptions: ['기준 소리와 같은 음색을 다시 찾아냈습니다.', 'B는 같은 높이지만 소리가 시작되고 이어지는 모양이 다릅니다.', '같은 음들을 연주한다고 악기 소리까지 같지는 않습니다.'],
  },
  {
    id: 'listen-34-timbre-2', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '세 소리는 같은 높이와 리듬입니다. 나머지 둘과 악기 음색이 다른 하나를 고르세요.',
    audio: clips('listen-34-timbre-2', { events: timbreNotes, instrument: 'violin' }, { events: timbreNotes, instrument: 'cello' }, { events: timbreNotes, instrument: 'violin' }),
    choices: [{ text: '소리 A' }, { text: '소리 B' }, { text: '소리 C' }], correct: 1,
    why: 'A와 C는 바이올린, B는 첼로 샘플입니다. 이번에는 음높이가 아니라 같은 음을 낸 음색을 비교합니다.',
    misconceptions: ['A와 C를 이어 들어 같은 음색인지 확인하세요.', '나머지 둘과 음색이 다른 B를 바르게 골랐습니다.', 'C는 A와 같은 악기입니다. B와 비교해 보세요.'],
  },
  {
    id: 'listen-34-timbre-3', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: 'A와 B 한 쌍, C와 D 한 쌍을 비교하세요. 각 쌍에서 악기의 음색은 같나요?',
    audio: clips('listen-34-timbre-3', { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: '두 쌍 모두 같다' }, { text: 'A와 B는 다르고, C와 D는 같다' }, { text: 'A와 B는 같고, C와 D는 다르다' }], correct: 2,
    why: 'A와 B는 모두 플루트입니다. C는 플루트, D는 클라리넷이므로 두 번째 쌍의 음색만 다릅니다.',
    misconceptions: ['같은 음높이로 연주한 C와 D도 음색은 다릅니다.', '먼저 첫 쌍을 비교한 뒤 두 번째 쌍을 따로 비교하세요.', '첫 쌍의 같음과 두 번째 쌍의 다름을 구별했습니다.'],
  },
  {
    id: 'listen-34-timbre-4', lessonId: 'timbre', grade: '3-4', kind: 'listening',
    prompt: '소리 A와 B를 듣고 두 연주 사이에서 달라진 음악 요소를 고르세요.',
    audio: clips('listen-34-timbre-4', { events: timbreNotes, instrument: 'cello' }, { events: timbreNotes, instrument: 'trumpet' }),
    choices: [{ text: '악기의 음색' }, { text: '가락의 음높이 순서' }, { text: '박의 빠르기' }], correct: 0,
    why: 'A는 첼로, B는 트럼펫 샘플로 같은 음형을 재생했습니다. 서로 다른 악기 소리의 음색 차이에 귀를 기울입니다.',
    misconceptions: ['두 연주에서 악기 소리의 음색이 달라지는 것을 찾았습니다.', '악보상 음높이 순서는 두 연주가 모두 같습니다.', '박의 시작 간격은 같고 악기의 소리 특성이 다릅니다.'],
  },
  {
    id: 'listen-34-harmony-1', lessonId: 'harmony', grade: '3-4', kind: 'listening',
    prompt: 'A와 B는 같은 세 음을 씁니다. 음들이 시작하는 방식을 비교하면 무엇이 맞나요?',
    audio: clips('listen-34-harmony-1', { events: chord }, { events: arpeggio }),
    choices: [{ text: 'A는 차례로, B는 함께 울린다' }, { text: 'A는 함께, B는 차례로 울린다' }, { text: 'A와 B 모두 한 음씩 차례로 울린다' }], correct: 1,
    why: 'A의 세 음은 같은 순간에 시작해 함께 어울립니다. B에서는 같은 세 음이 한 음씩 차례로 시작합니다.',
    misconceptions: ['여러 음의 첫 시작이 동시에 나는 쪽을 확인하세요.', '동시에 울림과 차례로 울림을 바르게 구별했습니다.', 'A에서는 한 번의 시작에 서로 다른 세 음이 겹칩니다.'],
  },
  {
    id: 'listen-34-form-1', lessonId: 'form', grade: '3-4', kind: 'listening',
    prompt: '소리 A를 네 박씩 두 부분으로 나누어 들으세요. 두 부분의 가락 관계는 어떤가요?',
    audio: clips('listen-34-form-1', { bpm: 120, events: sequence([60, 62, 64, 60, 67, 65, 62, 67]) }),
    choices: [{ text: '같은 가락을 두 번 반복' }, { text: '한 음높이만 계속 반복' }, { text: '서로 다른 두 부분' }], correct: 2,
    why: '앞 네 음은 도·레·미·도, 뒤 네 음은 솔·파·레·솔입니다. 리듬은 같아도 두 가락은 다릅니다.',
    misconceptions: ['같은 리듬인지와 같은 가락인지를 나누어 비교하세요.', '각 부분 안에서도 음높이가 여러 번 바뀝니다.', '네 박 경계 앞뒤에서 가락의 차이를 찾았습니다.'],
  },
  {
    id: 'listen-56-rhythm-1', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '4분음표를 한 박으로 세며 소리 A를 들어보세요. 들은 리듬과 길이의 순서가 같은 악보는 무엇인가요?',
    audio: clips('listen-56-rhythm-1', { events: sequence([60, 60, 60, 60], [1.5, 0.5, 1, 1]) }),
    choices: [
      { text: '가', visual: score(['q', 'q', '8', 'q'], 1) },
      { text: '나', visual: score(['q', '8', 'q', 'q'], 0) },
      { text: '다', visual: score(['8', 'q', 'q', 'q'], 1) },
    ], correct: 1,
    why: '첫 소리는 한 박 반, 다음 소리는 반 박입니다. 이어지는 한 박짜리 둘까지 합하면 네 박입니다.',
    misconceptions: ['한 박 반인 소리가 두 번째가 아니라 처음에 있습니다.', '점이 늘린 반 박과 뒤의 반 박을 바르게 들었습니다.', '처음 두 길이의 순서를 바꾸면 다른 리듬이 됩니다.'],
  },
  {
    id: 'listen-56-rhythm-2', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '소리 A는 네 박입니다. 한 박 안에 같은 길이의 소리 네 개가 들어 있는 박은?',
    audio: clips('listen-56-rhythm-2', { events: sequence([60, 60, 60, 60, 60, 60], [0.25, 0.25, 0.25, 0.25, 1, 2]) }),
    choices: [{ text: '첫 번째 박' }, { text: '두 번째 박' }, { text: '세 번째 박' }], correct: 0,
    why: '처음 한 박이 16분음표 네 개로 나뉩니다. 둘째 박은 한 소리, 셋째부터는 두 박 소리가 이어집니다.',
    misconceptions: ['한 박을 네 등분한 첫 구간을 바르게 찾았습니다.', '둘째 박에는 4분음표 하나가 들어 있습니다.', '셋째 박부터는 한 소리가 길게 이어집니다.'],
  },
  {
    id: 'listen-56-rhythm-3', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '한 박은 4분음표 길이입니다. 소리 A에서 박 중간에 시작해 다음 박으로 이어지는 리듬은?',
    audio: clips('listen-56-rhythm-3', { events: sequence([60, 60, 60, 60], [0.5, 1, 0.5, 2]) }),
    choices: [
      { text: '가', visual: score(['q', '8', '8', 'h']) },
      { text: '나', visual: score(['8', '8', 'q', 'h']) },
      { text: '다', visual: score(['8', 'q', '8', 'h']) },
    ], correct: 2,
    why: '반 박 뒤에 시작한 두 번째 소리가 한 박 동안 이어집니다. 길이 순서는 반 박·한 박·반 박·두 박입니다.',
    misconceptions: ['첫 음의 길이는 한 박이 아니라 반 박입니다.', '두 번째 시작은 반 박 뒤지만 그 음은 한 박 동안 이어집니다.', '박 중간에 시작하는 한 박짜리 소리까지 바르게 대응했습니다.'],
  },
  {
    id: 'listen-56-rhythm-4', lessonId: 'rhythm', grade: '5-6', kind: 'listening',
    prompt: '소리 A를 네 박으로 세어 들어보세요. 한 박에 소리가 두 번씩 시작하다가 한 번으로 돌아오는 박은 어디인가요?',
    audio: clips('listen-56-rhythm-4', { events: sequence([60, 60, 60, 60, 60, 60], [1, 0.5, 0.5, 0.5, 0.5, 1]) }),
    choices: [{ text: '세 번째 박' }, { text: '네 번째 박' }, { text: '두 번째 박' }], correct: 1,
    why: '둘째와 셋째 박은 각각 반 박 소리 둘입니다. 넷째 박에서 다시 한 박 길이의 한 소리로 돌아옵니다.',
    misconceptions: ['셋째 박도 아직 반 박 소리 두 개로 나뉩니다.', '두 박의 분할 뒤 넷째 박의 복귀를 바르게 들었습니다.', '둘째 박은 나뉘기 시작하는 자리입니다. 끝까지 세어 보세요.'],
  },
  {
    id: 'listen-56-rest-1', lessonId: 'rest', grade: '5-6', kind: 'listening',
    prompt: '낮은 준비박 네 번 뒤의 가락을 같은 박으로 세어 들어보세요. 짧은 소리 두 번 뒤에 쉬는 길이는 얼마인가요?',
    audio: clips('listen-56-rest-1', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 4.5, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '한 박' }, { text: '반 박' }, { text: '두 박' }], correct: 0,
    why: '준비박 뒤의 가락은 반 박짜리 소리 둘로 첫 박을 채워요. 둘째 박은 온전히 쉬고 셋째 박에 다음 소리가 시작하므로, 쉼은 한 박이에요.',
    misconceptions: ['짧은 소리 두 번이 차지한 첫 박과, 소리 없이 지난 둘째 박을 구별했어요.', '앞의 짧은 소리는 반 박씩이지만, 그 뒤에는 둘째 박 전체를 쉬어요.', '소리 낸 첫 박까지 쉼에 더하지 않아요. 쉬는 자리는 둘째 박 하나예요.'],
  },
  {
    id: 'listen-56-rest-2', lessonId: 'rest', grade: '5-6', kind: 'listening',
    prompt: '낮은 준비박 네 번을 들은 뒤 4분음표 한 박씩 같은 박을 이어 세어요. 첫 높은 음이 가락의 첫 박에 시작합니다. 쉰 뒤 두 번째 높은 음은 어느 때 시작하나요?',
    audio: clips('listen-56-rest-2', { instrument: 'piano', events: [
      ...preparationPulses,
      { beat: 4, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 5.5, duration: 0.5, midi: 67, velocity: 0.5 },
      { beat: 6, duration: 1, midi: 67, velocity: 0.5 },
      { beat: 7, duration: 1, midi: 67, velocity: 0.5 },
    ] }),
    choices: [{ text: '둘째 박의 시작' }, { text: '셋째 박의 시작' }, { text: '둘째 박의 뒤쪽 반 박 시작' }], correct: 2,
    why: '준비박의 간격을 유지하면 첫 높은 음의 시작에서 한 박 반 뒤에 두 번째 높은 음이 시작합니다. 둘째 박의 앞쪽 반 박은 쉼이고, 뒤쪽 반 박에 다음 음이 들어옵니다.',
    misconceptions: ['둘째 박의 시작에는 새 음이 들어오지 않습니다. 그 박을 반으로 나누어 세어 보세요.', '셋째 박까지 기다리기 전에 둘째 박의 뒤쪽 반 박에서 다음 음이 시작합니다.', '음의 잔향이 아니라 준비박에 맞춘 시작 시각으로 둘째 박 뒤쪽의 진입을 찾았습니다.'],
  },
  {
    id: 'listen-56-pitch-1', lessonId: 'pitch', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 두 음을 듣고 높이를 비교해 보세요. 둘째 음은 첫째 음과 어떤 관계인가요?',
    audio: clips('listen-56-pitch-1', { instrument: 'flute', events: sequence([60, 72]) }),
    choices: [{ text: '같은 높이이다' }, { text: '한 옥타브 높아진다' }, { text: '한 옥타브 낮아진다' }], correct: 1,
    why: '둘째 음이 첫째 음보다 한 옥타브 높아요. 이 예시의 두 음은 모두 다(C)이며, 음이름이 같아도 높이는 다를 수 있어요.',
    misconceptions: ['같은 음이름이라도 옥타브가 달라 높이가 다를 수 있습니다.', '같은 이름의 도 사이에서 올라가는 옥타브를 들었습니다.', '두 번째가 첫 번째보다 높은지 방향을 다시 들어 보세요.'],
  },
  {
    id: 'listen-56-pitch-2', lessonId: 'pitch', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 세 음 중 가장 낮은 음은 몇 번째인가요?',
    audio: clips('listen-56-pitch-2', { instrument: 'cello', events: sequence([72, 60, 67]) }),
    choices: [{ text: '두 번째 소리' }, { text: '첫 번째 소리' }, { text: '세 번째 소리' }], correct: 0,
    why: '높은 도 다음에 한 옥타브 낮은 도, 그 뒤에 솔이 납니다. 세 음 중 두 번째 도가 가장 낮습니다.',
    misconceptions: ['내려갔다 조금 올라가는 흐름에서 최저음을 찾았습니다.', '첫 음은 가장 낮은 음이 아니라 가장 높은 음입니다.', '끝음이 앞 음보다 올라가므로 최저음은 그 앞에 있습니다.'],
  },
  {
    id: 'listen-56-melody-1', lessonId: 'melody', grade: '5-6', kind: 'listening',
    prompt: '다장조 가락입니다. 소리 A에서 이웃한 음을 건너뛰어 움직이는 곳은 어디인가요?',
    audio: clips('listen-56-melody-1', { events: sequence([60, 64, 62, 60]) }),
    choices: [{ text: '둘째 음에서 셋째 음으로 갈 때' }, { text: '셋째 음에서 넷째 음으로 갈 때' }, { text: '첫째 음에서 둘째 음으로 갈 때' }], correct: 2,
    why: '도에서 미로 갈 때 레를 건너뜁니다. 미에서 레, 레에서 도로 내려오는 두 움직임은 차례가기입니다.',
    misconceptions: ['미에서 레는 이웃한 음으로 내려가는 차례가기입니다.', '레에서 도도 이웃한 음으로 움직입니다.', '가락의 첫 도약과 뒤의 차례가기를 구별했습니다.'],
  },
  {
    id: 'listen-56-melody-2', lessonId: 'melody', grade: '5-6', kind: 'listening',
    prompt: '소리 A의 여덟 음을 끝까지 들어보세요. 첫음과 끝음의 높이를 비교한 설명은 무엇인가요?',
    audio: clips('listen-56-melody-2', { instrument: 'violin', events: sequence([60, 64, 67, 64, 65, 62, 67, 60]) }),
    choices: [{ text: '끝음이 처음 음보다 높다' }, { text: '끝음이 처음 음과 같다' }, { text: '끝음이 처음 음보다 낮다' }], correct: 1,
    why: '가락의 중간에서는 높이가 여러 번 바뀌지만, 마지막에는 첫음과 같은 높이로 돌아와요. 바로 앞 음뿐 아니라 처음 소리를 기억해서 비교해요.',
    misconceptions: ['중간에 나온 높은 음이 아니라 여덟째인 마지막 음을 첫음과 비교해요.', '여러 음이 지난 뒤에도 처음의 높이를 기억해 같은 높이로 돌아온 것을 찾았어요.', '끝음은 바로 앞 음보다 낮지만 첫음과는 같은 높이예요. 비교할 두 자리를 구별해요.'],
  },
  {
    id: 'listen-56-dynamics-1', lessonId: 'dynamics', grade: '5-6', kind: 'listening',
    prompt: '기기 음량을 고정하고 소리 A의 네 음을 끝까지 들으세요. 연주가 이어지며 셈여림은 어떻게 변하나요?',
    audio: clips('listen-56-dynamics-1', { events: [0.2, 0.35, 0.5, 0.65].map((velocity, beat) => ({ beat, duration: 1, midi: 60, velocity })) }),
    choices: [{ text: '점점 세게' }, { text: '점점 여리게' }, { text: '같은 세기' }], correct: 0,
    why: '같은 높이의 도를 같은 박 간격으로 네 번 연주하며 세기를 차례로 키웠습니다. 크레셴도에 해당하는 점점 세게의 변화이며, 음높이 상승이나 빠르기 증가가 아닙니다.',
    misconceptions: ['같은 높이와 박 간격 안에서 점점 세지는 변화를 들었습니다.', '뒤의 음으로 갈수록 세기가 줄어드는지 커지는지 다시 들어 보세요.', '같은 음을 반복해도 세기는 달라집니다. 처음과 끝뿐 아니라 가운데 음들도 비교하세요.'],
  },
  {
    id: 'listen-56-dynamics-2', lessonId: 'dynamics', grade: '5-6', kind: 'listening',
    prompt: '기기 음량을 바꾸지 말고 소리 A를 들으세요. 첫 음부터 넷째 음까지 이어지는 셈여림 변화는 무엇인가요?',
    audio: clips('listen-56-dynamics-2', { events: [0.65, 0.5, 0.35, 0.2].map((velocity, beat) => ({ beat, duration: 1, midi: 60, velocity })) }),
    choices: [{ text: '점점 세게' }, { text: '점점 여리게' }, { text: '같은 세기' }], correct: 1,
    why: '같은 높이의 도를 같은 박 간격으로 반복하며 세기를 차례로 줄였습니다. 디미누엔도에 해당하는 점점 여리게의 변화이며, 음높이 하강이나 빠르기 감소가 아닙니다.',
    misconceptions: ['네 음을 따라 들으며 세기가 커지는 방향인지 줄어드는 방향인지 비교하세요.', '음높이와 빠르기는 그대로인 채 점점 여려지는 변화를 들었습니다.', '음높이가 같아도 셈여림은 변할 수 있습니다. 네 음의 세기를 차례로 비교하세요.'],
  },
  {
    id: 'listen-56-tempo-1', lessonId: 'tempo', grade: '5-6', kind: 'listening',
    prompt: 'A와 B는 음높이 순서와 음표 길이 비율이 같습니다. 실제 연주 빠르기를 비교하면?',
    audio: clips('listen-56-tempo-1', { events: tune, bpm: 72 }, { events: tune, bpm: 120 }),
    choices: [{ text: '소리 B가 더 느리다' }, { text: '소리 B가 더 빠르다' }, { text: '두 소리의 빠르기가 같다' }], correct: 1,
    why: 'B는 같은 가락과 리듬을 더 짧은 실제 시간에 연주합니다. 음표의 비율은 같고 한 박의 시간이 줄었습니다.',
    misconceptions: ['B에서 한 박이 더 길어지는지 시작 간격을 비교하세요.', '리듬 비율과 박의 실제 빠르기를 나누어 판단했습니다.', '같은 음표 길이 비율이라도 한 박의 시간은 달라질 수 있습니다.'],
  },
  {
    id: 'listen-56-tempo-2', lessonId: 'tempo', grade: '5-6', kind: 'listening',
    prompt: '소리 A에서 각 소리는 한 박의 시작을 나타냅니다. 다섯 번의 짧은 소리에 맞춰 박을 짚으면 빠르기는 어떻게 변하나요?',
    audio: clips('listen-56-tempo-2', { bpm: 96, events: [0, 1, 2.3, 3.9, 5.8].map(beat => ({ beat, duration: 0.18, midi: 60, velocity: 0.5 })) }),
    choices: [{ text: '점점 느려진다' }, { text: '점점 빨라진다' }, { text: '같은 빠르기를 유지한다' }], correct: 0,
    why: '각 소리가 한 박의 시작이므로 소리의 시작 사이가 점점 넓어지는 것은 한 박의 시간이 늘어나는 것입니다. 따라서 점점 느려집니다. 각 소리 자체의 길이와 음높이, 세기는 같습니다.',
    misconceptions: ['한 박마다 시작하는 소리 사이의 간격이 넓어져 점점 느려짐을 들었습니다.', '점점 빨라지려면 박의 시작 간격이 좁아져야 합니다. 이 소리는 반대로 넓어집니다.', '짧은 소리 자체의 길이는 같지만 각 박이 시작하는 간격은 점점 넓어집니다.'],
  },
  {
    id: 'listen-56-timbre-1', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: 'A와 B의 악기 음색을 듣고 두 악기가 속한 악기군을 고르세요. 높이와 리듬은 같습니다.',
    audio: clips('listen-56-timbre-1', { events: timbreNotes, instrument: 'flute' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: '둘 다 현악기' }, { text: '둘 다 금관악기' }, { text: '둘 다 목관악기' }], correct: 2,
    why: 'A는 플루트, B는 클라리넷 샘플입니다. 음색은 서로 다르지만 두 악기 모두 목관악기에 속합니다.',
    misconceptions: ['이 두 소리는 줄을 켜는 현악기의 음색이 아닙니다.', '플루트와 클라리넷은 금관이 아닌 목관악기입니다.', '서로 다른 음색을 같은 목관악기군으로 묶었습니다.'],
  },
  {
    id: 'listen-56-timbre-2', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: 'A와 B는 같은 음을 연주합니다. 두 음색을 듣고 알맞은 악기군을 고르세요.',
    audio: clips('listen-56-timbre-2', { events: timbreNotes, instrument: 'violin' }, { events: timbreNotes, instrument: 'cello' }),
    choices: [{ text: '둘 다 현악기' }, { text: '둘 다 목관악기' }, { text: 'A는 현악기, B는 금관악기' }], correct: 0,
    why: 'A는 바이올린, B는 첼로 샘플이며 둘 다 현악기입니다. 같은 높이로 연주해도 두 악기의 음색은 구별됩니다.',
    misconceptions: ['같은 현악기군 안에서 다른 악기 음색을 들었습니다.', '두 소리는 플루트나 클라리넷 같은 목관악기가 아닙니다.', 'B도 트럼펫이 아니라 줄을 켜는 첼로 소리입니다.'],
  },
  {
    id: 'listen-56-timbre-3', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: '같은 높이와 길이의 A와 B를 듣고 악기군의 순서를 고르세요.',
    audio: clips('listen-56-timbre-3', { events: timbreNotes, instrument: 'trumpet' }, { events: timbreNotes, instrument: 'clarinet' }),
    choices: [{ text: 'A는 목관악기, B는 금관악기' }, { text: 'A는 금관악기, B는 목관악기' }, { text: 'A와 B 모두 현악기' }], correct: 1,
    why: 'A는 금관악기인 트럼펫, B는 목관악기인 클라리넷 샘플입니다. 같은 음 조건에서 음색을 비교합니다.',
    misconceptions: ['두 악기군의 순서를 뒤집지 않았는지 다시 비교하세요.', '트럼펫에서 클라리넷으로 바뀌는 악기군을 구별했습니다.', '두 소리는 바이올린이나 첼로의 현악기 음색이 아닙니다.'],
  },
  {
    id: 'listen-56-timbre-4', lessonId: 'timbre', grade: '5-6', kind: 'listening',
    prompt: 'A·B·C의 악기 소리를 들어보세요. 숨을 불어 관 속의 공기를 울리는 악기 두 개를 고르면?',
    audio: clips('listen-56-timbre-4', { events: timbreNotes }, { events: timbreNotes, instrument: 'trumpet' }, { events: timbreNotes, instrument: 'flute' }),
    choices: [{ text: 'A와 B' }, { text: 'A와 C' }, { text: 'B와 C' }], correct: 2,
    why: 'A는 피아노, B는 트럼펫, C는 플루트 소리예요. 트럼펫은 금관악기, 플루트는 목관악기이며 둘 다 숨을 불어 연주하는 관악기예요. 피아노는 건반에 연결된 해머가 현을 두드려요.',
    misconceptions: ['트럼펫은 관악기이지만 A의 피아노는 숨을 불어 연주하지 않아요.', '플루트는 관악기이지만 A의 피아노는 해머로 현을 두드려요. B도 함께 비교해요.', '음색이 다른 트럼펫과 플루트를 소리 내는 방법에 따라 관악기로 묶었어요.'],
  },
  {
    id: 'listen-56-harmony-1', lessonId: 'harmony', grade: '5-6', kind: 'listening',
    prompt: 'A와 B 모두 도·미·솔을 사용합니다. 같은 음 묶음을 연주한 방식의 차이는 무엇인가요?',
    audio: clips('listen-56-harmony-1', { events: chord }, { events: arpeggio }),
    choices: [{ text: 'A는 도·미·솔을 동시에, B는 같은 음들을 차례로 연주한다' }, { text: 'A와 B 모두 세 음을 동시에 연주한다' }, { text: 'A와 B는 서로 다른 음 묶음을 연주한다' }], correct: 0,
    why: 'A는 도·미·솔 화음이 동시에 시작하고 B는 같은 화음의 음을 차례로 펼칩니다. 음 묶음이 아닌 울리는 방식의 차이입니다.',
    misconceptions: ['동시에 쌓은 화음과 같은 음을 펼친 연주를 구별했습니다.', 'B의 세 음은 한 순간이 아니라 세 번에 나누어 시작합니다.', '음 묶음은 같고 시작 시각과 겹쳐 울리는 방식이 다릅니다.'],
  },
  {
    id: 'listen-56-form-1', lessonId: 'form', grade: '5-6', kind: 'listening',
    prompt: '소리 A를 네 박씩 세 부분으로 나누세요. 같은 가락은 같은 글자, 다른 가락은 다른 글자로 적으면?',
    audio: clips('listen-56-form-1', { bpm: 120, events: sequence([60, 62, 64, 60, 67, 65, 62, 67, 60, 62, 64, 60]) }),
    choices: [{ text: 'aab' }, { text: 'aba' }, { text: 'abb' }], correct: 1,
    why: '첫 네 박 가락이 a, 가운데 다른 가락이 b이며 마지막 네 박은 첫 가락 그대로 돌아옵니다. 따라서 aba입니다.',
    misconceptions: ['첫 부분과 가운데 부분은 리듬이 같아도 가락이 다릅니다.', '첫 가락이 마지막에 되돌아오는 세 부분 구성을 들었습니다.', '마지막 가락은 가운데가 아니라 첫 부분과 같습니다.'],
  },
];
