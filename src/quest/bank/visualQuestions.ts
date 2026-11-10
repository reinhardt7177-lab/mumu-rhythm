import type { BankQuestion, ScoreNote, Visual } from './types';

const n = (duration: ScoreNote['duration'], key = 'c/5', dots?: number): ScoreNote =>
  ({ keys: [key], duration, ...(dots ? { dots } : {}) });
const r = (duration: ScoreNote['duration'], dots?: number): ScoreNote =>
  ({ keys: ['c/5'], duration, rest: true, ...(dots ? { dots } : {}) });
const score = (notes: ScoreNote[], time?: string): Visual =>
  ({ kind: 'score', notes, ...(time ? { time } : {}) });
const labels = (cells: string[], caption: string, layout?: 'rows'): Visual =>
  ({ kind: 'labels', cells, caption, ...(layout ? { layout } : {}) });

export const VISUAL_QUESTIONS: BankQuestion[] = [
  {
    id: 'visual-34-duration-equivalent', lessonId: 'duration', grade: '3-4', kind: 'visual',
    prompt: '위 음표와 전체 길이가 같은 악보를 골라 보세요. 빠르기는 모두 같아요.',
    visual: score([n('h')]),
    choices: [
      { text: '가', visual: score([n('q')]) },
      { text: '나', visual: score([n('q'), n('q')]) },
      { text: '다', visual: score([n('w')]) },
    ], correct: 1,
    why: '2분음표 하나는 4분음표 두 개를 이은 길이예요. 음표 개수가 달라도 전체 길이는 같을 수 있어요.',
    misconceptions: [
      '4분음표 하나는 2분음표 길이의 절반이에요. 하나라는 개수만 비교하지 않아요.',
      '맞아요. 짧은 4분음표 두 개를 이으면 2분음표 하나와 길이가 같아요.',
      '온음표는 2분음표보다 두 배 길어요. 빈 머리라도 기둥이 있는지 살펴보세요.',
    ],
  },
  {
    id: 'visual-34-duration-unit', lessonId: 'duration', grade: '3-4', kind: 'visual',
    prompt: '이번 연습에서는 4분음표를 한 박으로 세어요. 한 박 동안 소리 내는 음표는 어느 것인가요?',
    choices: [
      { text: '가', visual: score([n('h')]) },
      { text: '나', visual: score([n('w')]) },
      { text: '다', visual: score([n('q')]) },
    ], correct: 2,
    why: '지금 정한 기준에서는 검은 머리와 기둥이 있는 4분음표가 한 박이에요. 한 박의 기준은 연습마다 확인해요.',
    misconceptions: [
      '빈 머리에 기둥이 있는 2분음표는 이 연습에서 두 박이에요.',
      '기둥 없는 빈 머리인 온음표는 이 연습에서 네 박이에요.',
      '맞아요. 이 연습의 한 박 기준으로 정한 4분음표예요.',
    ],
  },
  {
    id: 'visual-34-rest-space', lessonId: 'rest', grade: '3-4', kind: 'visual',
    prompt: '4분음표를 한 박으로 세며 왼쪽부터 연주해요. 소리를 내지 않고 쉬는 박은 몇 번째인가요?',
    visual: score([n('q'), r('q'), n('q'), n('q')], '4/4'),
    choices: [{ text: '첫째 박' }, { text: '둘째 박' }, { text: '넷째 박' }], correct: 1,
    why: '둘째 자리에 4분쉼표가 있어요. 그 한 박도 속으로 세고, 셋째 박에서 다시 소리를 내요.',
    misconceptions: [
      '첫째 자리에는 음표가 있어 소리를 내요. 쉼표 모양이 있는 자리를 찾아보세요.',
      '맞아요. 둘째 박은 쉬지만, 박을 세는 움직임까지 멈추지는 않아요.',
      '넷째 자리에도 음표가 있어요. 소리가 없는 자리는 둘째 박이에요.',
    ],
  },
  {
    id: 'visual-34-rest-length', lessonId: 'rest', grade: '3-4', kind: 'visual',
    prompt: '4분음표를 한 박으로 세어요. 이 쉼표에서는 몇 박 동안 소리를 쉬어야 할까요?',
    visual: score([r('h')]),
    choices: [{ text: '반 박' }, { text: '한 박' }, { text: '두 박' }], correct: 2,
    why: '2분쉼표는 2분음표와 같은 길이를 쉬어요. 4분음표가 한 박인 이 연습에서는 두 박 동안 쉬어요.',
    misconceptions: [
      '반 박을 쉬는 것은 이 기준에서 8분쉼표예요. 쉼표도 길이가 서로 달라요.',
      '한 박만 쉬면 4분쉼표의 길이가 돼요. 2분쉼표는 그 두 배예요.',
      '맞아요. 소리 없이 하나, 둘을 세고 다음 소리로 이어 가요.',
    ],
  },
  {
    id: 'visual-34-rhythm-pairs', lessonId: 'rhythm', grade: '3-4', kind: 'visual',
    prompt: '4분음표를 한 박으로 세어요. 이 리듬에서 한 박을 똑같이 나누어 두 번 손뼉 치는 곳은 어디인가요?',
    visual: score([n('q'), n('8'), n('8'), n('h')], '4/4'),
    choices: [{ text: '둘째 박' }, { text: '첫째 박' }, { text: '셋째 박부터 넷째 박까지' }], correct: 0,
    why: '둘째 박에 8분음표 두 개가 있어요. 한 박의 길이는 그대로 두고 그 안에서 손뼉을 두 번 쳐요.',
    misconceptions: [
      '맞아요. 8분음표 두 개를 합치면 이 연습의 한 박이 돼요.',
      '첫째 박에는 4분음표 하나만 있어요. 한 번 손뼉 치는 자리예요.',
      '끝의 2분음표는 두 박 동안 한 소리를 이어 가는 기호예요.',
    ],
  },
  {
    id: 'visual-34-rhythm-match', lessonId: 'rhythm', grade: '3-4', kind: 'visual',
    prompt: '위 악보와 소리의 높이는 달라도 길이의 순서가 같은 악보를 골라 보세요.',
    visual: score([n('q'), n('h'), n('q')], '4/4'),
    choices: [
      { text: '가', visual: score([n('q', 'g/4'), n('q', 'g/4'), n('h', 'g/4')], '4/4') },
      { text: '나', visual: score([n('q', 'e/5'), n('h', 'e/5'), n('q', 'e/5')], '4/4') },
      { text: '다', visual: score([n('h', 'a/4'), n('q', 'a/4'), n('q', 'a/4')], '4/4') },
    ], correct: 1,
    why: '위 악보의 길이는 짧게, 길게, 짧게예요. 나도 4분음표, 2분음표, 4분음표 순서라서 리듬이 같아요.',
    misconceptions: [
      '가는 긴 음이 끝에 있어요. 전체 길이가 같아도 길이의 순서가 다르면 리듬은 달라요.',
      '맞아요. 음높이가 바뀌어도 음표의 길이와 순서가 같아 리듬이 같아요.',
      '다는 첫 음이 길어요. 위 악보는 가운데 음이 길다는 점을 살펴보세요.',
    ],
  },
  {
    id: 'visual-34-pitch-higher', lessonId: 'pitch', grade: '3-4', kind: 'visual',
    prompt: '같은 높은음자리표에서 왼쪽부터 두 음을 연주해요. 어느 음이 더 높은 소리인가요?',
    visual: score([n('h', 'c/5'), n('h', 'g/5')], '4/4'),
    choices: [{ text: '첫째 음' }, { text: '둘째 음' }, { text: '두 음의 높이가 같아요' }], correct: 1,
    why: '둘째 음의 머리가 오선에서 더 위에 있어요. 같은 음자리표에서는 음표 머리의 위아래 위치로 높이를 비교해요.',
    misconceptions: [
      '먼저 나온다고 높은 음은 아니에요. 음표 머리의 세로 위치를 살펴보세요.',
      '맞아요. 둘째 음이 첫째 음보다 위에 놓여 있어 더 높은 소리예요.',
      '두 음의 길이는 같지만 머리의 세로 위치가 달라 높이는 달라요.',
    ],
  },
  {
    id: 'visual-34-pitch-position', lessonId: 'pitch', grade: '3-4', kind: 'visual',
    prompt: '높은음자리표의 오선에서 음표 머리가 가운데 줄인 셋째 줄에 놓인 그림을 찾아보세요.',
    choices: [
      { text: '가', visual: score([n('q', 'b/4')]) },
      { text: '나', visual: score([n('q', 'a/4')]) },
      { text: '다', visual: score([n('q', 'c/5')]) },
    ], correct: 0,
    why: '가는 음표 머리를 셋째 줄이 가로질러요. 줄에 놓인 음과 줄 사이의 칸에 놓인 음을 구별해 보세요.',
    misconceptions: [
      '맞아요. 음표 머리의 가운데를 오선의 셋째 줄이 지나가요.',
      '나는 둘째 줄과 셋째 줄 사이의 칸에 놓여 있어요. 칸과 줄을 구별해요.',
      '다는 셋째 줄과 넷째 줄 사이의 칸에 놓여 있어요. 줄을 아래부터 세어 보세요.',
    ],
  },
  {
    id: 'visual-34-melody-step', lessonId: 'melody', grade: '3-4', kind: 'visual',
    prompt: '같은 음이 되풀이되거나 음을 건너뛰지 않고, 한 음씩 차례로 올라가는 가락을 골라 보세요.',
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'e/5'), n('q', 'f/5')], '4/4') },
      { text: '나', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'c/6')], '4/4') },
      { text: '다', visual: score([n('q', 'f/5'), n('q', 'e/5'), n('q', 'd/5'), n('q', 'c/5')], '4/4') },
    ], correct: 0,
    why: '가는 도, 레, 미, 파처럼 이웃한 음으로 한 계단씩 올라가요. 나는 뛰어가고, 다는 내려가요.',
    misconceptions: [
      '맞아요. 이웃한 음으로만 올라가므로 차례가기 가락이에요.',
      '나도 올라가지만 중간 음을 건너뛰어요. 올라감과 차례가기는 같은 뜻이 아니에요.',
      '다는 이웃한 음으로 움직이지만 방향이 아래로 향해요.',
    ],
  },
  {
    id: 'visual-34-melody-turn', lessonId: 'melody', grade: '3-4', kind: 'visual',
    prompt: '음표 머리를 왼쪽부터 따라가 보세요. 이 가락은 어느 방향으로 움직이나요?',
    visual: score([n('q', 'e/5'), n('q', 'd/5'), n('q', 'c/5'), n('q', 'd/5')], '4/4'),
    choices: [{ text: '처음부터 끝까지 올라가요' }, { text: '내려간 뒤 같은 높이에 머물러요' }, { text: '내려갔다가 마지막에 올라가요' }], correct: 2,
    why: '처음 세 음은 미, 레, 도로 내려가고, 마지막에 도에서 레로 올라가요. 가락의 방향이 한 번 바뀌어요.',
    misconceptions: [
      '악보를 읽는 방향은 오른쪽이지만, 음높이는 음표의 위아래 위치로 살펴봐요.',
      '마지막 두 음의 머리는 서로 다른 높이에 있어요. 끝에서 조금 올라가요.',
      '맞아요. 처음에는 내려가다가 가장 낮은 음 뒤에서 올라가요.',
    ],
  },
  {
    id: 'visual-34-dynamics-symbol', lessonId: 'dynamics', grade: '3-4', kind: 'visual',
    prompt: '악보에 이 셈여림 기호가 보이면 소리의 세기를 어떻게 표현하나요?',
    visual: labels(['p'], '악보의 셈여림 기호'),
    choices: [{ text: '여리게 연주해요' }, { text: '세게 연주해요' }, { text: '점점 여리게 연주해요' }], correct: 0,
    why: 'p는 피아노라고 읽으며 여리게 연주하라는 셈여림 기호예요. 빠르기나 음높이를 바꾸라는 뜻은 아니에요.',
    misconceptions: [
      '맞아요. p에서는 소리의 세기를 여리게 표현해요.',
      '세게 연주하는 기호는 f예요. p는 그와 달리 여리게 연주해요.',
      'p는 여리게 연주할 세기를 알려 줘요. 그 기호만으로 점점 줄이라는 뜻은 아니에요.',
    ],
  },
  {
    id: 'visual-34-dynamics-contrast', lessonId: 'dynamics', grade: '3-4', kind: 'visual',
    prompt: '같은 가락을 같은 빠르기로 두 번 연주해요. 첫째에서 둘째로 갈 때 기호에 맞는 변화는 무엇인가요?',
    visual: labels(['첫째: p', '둘째: f'], '같은 가락의 셈여림 순서'),
    choices: [{ text: '세게 연주하다 여리게 연주해요' }, { text: '두 번 모두 같은 세기로 연주해요' }, { text: '여리게 연주하다 세게 연주해요' }], correct: 2,
    why: 'p는 여리게, f는 세게 연주해요. 가락과 빠르기를 유지하면서 소리의 세기를 대비할 수 있어요.',
    misconceptions: [
      '그 순서는 f에서 p로 갈 때예요. 그림에서는 p가 먼저 나오고 f가 뒤에 나와요.',
      '가락과 빠르기는 같아도 세기는 달라요. 첫째의 p와 둘째의 f를 구별해요.',
      '맞아요. p에서 f로 바뀌므로 둘째 연주를 더 세게 표현해요.',
    ],
  },
  {
    id: 'visual-34-form-repeat', lessonId: 'form', grade: '3-4', kind: 'visual',
    prompt: '같은 글자는 같은 음악 부분이에요. 아래 구성에서 서로 같은 부분끼리 짝지은 것은 무엇인가요?',
    visual: labels(['a', 'b', 'a'], '왼쪽부터 연주하는 세 부분'),
    choices: [{ text: '첫째와 둘째 부분' }, { text: '첫째와 셋째 부분' }, { text: '둘째와 셋째 부분' }], correct: 1,
    why: '첫째와 셋째 부분이 모두 a예요. 가운데 b는 다르고, 끝에서 처음의 음악 부분이 다시 나와요.',
    misconceptions: [
      'a와 b는 다른 부분을 나타내요. 바로 옆에 있다고 같은 음악은 아니에요.',
      '맞아요. 같은 a가 처음과 끝에 있으므로 이 두 부분이 같아요.',
      '둘째는 b이고 셋째는 a예요. 같은 글자가 쓰였는지 비교해 보세요.',
    ],
  },
  {
    id: 'visual-34-form-group', lessonId: 'form', grade: '3-4', kind: 'visual',
    prompt: '같은 글자는 같은 음악 부분이에요. 이 순서대로 연주하는 방법을 골라 보세요.',
    visual: labels(['a', 'a', 'b', 'b'], '네 부분의 연주 순서'),
    choices: [{ text: 'a를 두 번 한 뒤 b를 두 번 해요' }, { text: 'a와 b를 번갈아 두 번씩 해요' }, { text: 'a를 한 번 한 뒤 b를 세 번 해요' }], correct: 0,
    why: '같은 a 두 개가 먼저 모여 있고, 그 뒤에 b 두 개가 모여 있어요. 반복 횟수뿐 아니라 순서도 살펴봐요.',
    misconceptions: [
      '맞아요. 같은 부분을 두 번씩 이어 연주하고, 가운데에서 다른 부분으로 바뀌어요.',
      '번갈아 연주하면 a, b, a, b가 돼요. 그림은 같은 글자가 붙어 있어요.',
      'a도 두 칸이에요. 전체 칸 수만 맞추지 말고 각 부분의 반복을 확인해요.',
    ],
  },
  {
    id: 'visual-34-gugak-cycle', lessonId: 'gugak', grade: '3-4', kind: 'visual',
    prompt: '그림은 같은 묶음을 되풀이하는 연습용 구음꼴이에요. 빈칸에서 이어 부를 구음은 무엇인가요?',
    visual: labels(['덩', '쿵', '덕', '덩', '쿵', '?'], '구음으로 부르는 반복 연습'),
    choices: [{ text: '덩' }, { text: '덕' }, { text: '쿵' }], correct: 1,
    why: '덩, 쿵, 덕의 순서가 한 묶음으로 반복돼요. 둘째 묶음에서도 쿵 다음에는 덕이 와요. 특정 장단의 이름을 묻는 문제는 아니에요.',
    misconceptions: [
      '덩은 이 연습 묶음의 시작이에요. 덕까지 부른 뒤에 처음으로 돌아가요.',
      '맞아요. 한 묶음의 순서를 유지하면 빈칸에는 덕이 들어가요.',
      '바로 앞이 쿵이에요. 같은 구음을 반복하는 것이 아니라 묶음 전체를 되풀이해요.',
    ],
  },
  {
    id: 'visual-34-gugak-syllables', lessonId: 'gugak', grade: '3-4', kind: 'visual',
    prompt: '각 칸은 같은 길이의 한 박이에요. 두 글자를 한 박 안에 나누어 붙여 부르는 칸은 어디인가요?',
    visual: labels(['1박: 봄', '2박: 바·람', '3박: 분', '4박: 다'], '가사 붙임새: ·는 글자 사이의 경계'),
    choices: [{ text: '첫째 박' }, { text: '셋째 박' }, { text: '둘째 박' }], correct: 2,
    why: '둘째 박의 바·람은 두 글자를 한 박 안에 넣은 말붙임새예요. 글자가 많아도 칸의 길이는 다른 박과 같아요.',
    misconceptions: [
      '첫째 박에는 봄 한 글자가 있어요. 글자 수와 박의 길이를 나누어 살펴봐요.',
      '셋째 박에는 분 한 글자가 있어요. 두 글자가 나뉘어 있는 칸을 찾아보세요.',
      '맞아요. 바와 람을 둘째 박 안에 나누어 부르고, 다음 박은 제때 이어 가요.',
    ],
  },
  {
    id: 'visual-56-duration-dot', lessonId: 'duration', grade: '5-6', kind: 'visual',
    prompt: '4분음표를 한 박으로 정했어요. 위 음표와 전체 길이가 같은 악보는 무엇인가요? 빠르기는 모두 같아요.',
    visual: score([n('h', 'c/5', 1)]),
    choices: [
      { text: '가', visual: score([n('h')]) },
      { text: '나', visual: score([n('h'), n('q')]) },
      { text: '다', visual: score([n('w')]) },
    ], correct: 1,
    why: '점은 원래 음표 길이의 절반을 더해요. 2분음표의 두 박에 한 박을 더하므로 점2분음표는 이 기준에서 세 박이에요.',
    misconceptions: [
      '2분음표만 연주하면 점이 더한 한 박이 빠져요. 점도 길이에 포함해요.',
      '맞아요. 두 박과 한 박을 합친 세 박이 점2분음표와 같아요.',
      '점이 길이를 무조건 두 배로 늘리지는 않아요. 온음표 네 박보다 한 박 짧아요.',
    ],
  },
  {
    id: 'visual-56-duration-subdivide', lessonId: 'duration', grade: '5-6', kind: 'visual',
    prompt: '4분음표를 한 박으로 세어요. 위 음표를 같은 길이의 음표 네 개로 나누려 해요. 빠르기와 전체 길이를 유지한 악보를 고르세요.',
    visual: score([n('q')]),
    choices: [
      { text: '가', visual: score([n('16'), n('16')]) },
      { text: '나', visual: score([n('8'), n('8'), n('8'), n('8')]) },
      { text: '다', visual: score([n('16'), n('16'), n('16'), n('16')]) },
    ], correct: 2,
    why: '16분음표는 4분음표 길이의 4분의 1이에요. 네 개를 고르게 이어 연주하면 원래 한 박의 길이가 돼요.',
    misconceptions: [
      '16분음표 두 개는 반 박이에요. 네 개로 나누는 조건과 원래 한 박의 길이를 모두 확인해요.',
      '8분음표 네 개는 두 박이에요. 개수와 함께 각 음표의 길이도 확인해요.',
      '맞아요. 한 박을 네 부분으로 나누어도 전체 박의 속도는 바뀌지 않아요.',
    ],
  },
  {
    id: 'visual-56-rest-dot', lessonId: 'rest', grade: '5-6', kind: 'visual',
    prompt: '4분음표가 한 박인 연습이에요. 그림의 쉼표 하나가 차지하는 쉼의 길이는 얼마인가요?',
    visual: score([r('q', 1)]),
    choices: [{ text: '한 박 반' }, { text: '한 박' }, { text: '반 박' }], correct: 0,
    why: '쉼표에 붙은 점도 원래 길이의 절반을 더해요. 한 박에 반 박을 더하여 한 박 반 동안 소리를 쉬어요.',
    misconceptions: [
      '맞아요. 점의 반 박까지 소리 없이 세어야 다음 소리를 제때 시작할 수 있어요.',
      '한 박은 점 없는 4분쉼표 길이예요. 오른쪽 점이 더하는 쉼을 빠뜨리지 않아요.',
      '점이 더한 길이만 세면 반 박이에요. 원래 쉼표의 한 박도 함께 세어야 해요.',
    ],
  },
  {
    id: 'visual-56-rest-balance', lessonId: 'rest', grade: '5-6', kind: 'visual',
    prompt: '4분음표를 한 박으로 세어요. 이 마디에서 소리 내는 시간과 쉬는 시간을 바르게 비교한 것은 무엇인가요?',
    visual: score([n('q'), r('h'), n('q')], '4/4'),
    choices: [{ text: '소리 세 박, 쉼 한 박' }, { text: '소리 한 박, 쉼 세 박' }, { text: '소리 두 박, 쉼 두 박' }], correct: 2,
    why: '4분음표 두 개의 소리가 합쳐서 두 박이고, 가운데 2분쉼표도 두 박이에요. 기호 개수가 아니라 길이를 더해요.',
    misconceptions: [
      '기호가 세 개라고 소리가 세 박인 것은 아니에요. 가운데 기호는 두 박짜리 쉼표예요.',
      '양 끝의 4분음표가 각각 한 박씩 소리 나요. 소리의 길이를 둘 다 더해요.',
      '맞아요. 두 음표의 소리와 한 쉼표의 쉼이 각각 두 박씩 차지해요.',
    ],
  },
  {
    id: 'visual-56-rhythm-complete', lessonId: 'rhythm', grade: '5-6', kind: 'visual',
    prompt: '4분음표가 한 박이에요. 이 리듬 뒤에 선택지 하나를 붙여 네 박짜리 한 마디를 완성하려면 무엇이 필요한가요?',
    visual: score([n('q', 'c/5', 1), n('8')]),
    choices: [
      { text: '가', visual: score([n('q')]) },
      { text: '나', visual: score([n('h')]) },
      { text: '다', visual: score([n('h', 'c/5', 1)]) },
    ], correct: 1,
    why: '점4분음표 한 박 반과 8분음표 반 박을 합치면 두 박이에요. 남은 두 박을 2분음표로 채우면 네 박이 돼요.',
    misconceptions: [
      '한 박만 붙이면 전체가 세 박이에요. 먼저 제시된 두 박과 더해 보세요.',
      '맞아요. 남은 두 박을 채우므로 전체가 정확히 네 박이 돼요.',
      '점2분음표는 세 박이라서 붙이면 다섯 박이 돼요. 마디의 길이를 넘어요.',
    ],
  },
  {
    id: 'visual-56-rhythm-reorder', lessonId: 'rhythm', grade: '5-6', kind: 'visual',
    prompt: '위 리듬에서 쉼표와 마지막 음표의 자리만 서로 바꿔요. 나머지는 그대로 둔 악보를 고르세요. 4분음표를 한 박으로 세어요.',
    visual: score([n('q'), r('q'), n('q'), n('q')], '4/4'),
    choices: [
      { text: '가', visual: score([n('q'), n('q'), n('q'), r('q')], '4/4') },
      { text: '나', visual: score([n('q'), r('q'), n('q'), r('q')], '4/4') },
      { text: '다', visual: score([r('q'), n('q'), n('q'), r('q')], '4/4') },
    ], correct: 0,
    why: '가는 앞의 세 박에서 소리를 내고 마지막 박을 쉬어요. 소리와 쉼의 총길이는 같아도 놓인 자리를 바꾸면 리듬이 달라져요.',
    misconceptions: [
      '맞아요. 네 박의 길이를 유지하면서 쉬는 자리가 마지막 박으로 바뀌었어요.',
      '나는 마지막에 쉼을 더했지만 둘째 박의 쉼도 남겨 두었어요. 서로 자리를 바꿔야 해요.',
      '다는 첫째 박도 쉼으로 바꿨어요. 바꾸기로 한 두 자리 밖의 음표는 그대로 두어요.',
    ],
  },
  {
    id: 'visual-56-pitch-name', lessonId: 'pitch', grade: '5-6', kind: 'visual',
    prompt: '높은음자리표에서 그림의 음표가 나타내는 음이름은 무엇인가요?',
    visual: score([n('q', 'c/4')]),
    choices: [{ text: '나(B)' }, { text: '다(C)' }, { text: '라(D)' }], correct: 1,
    why: '높은음자리표에서 아래 첫째 덧줄의 음은 가운데 다(C)예요. 줄과 칸을 아래위로 짚으며 음이름을 확인해요.',
    misconceptions: [
      '나(B)는 가운데 다(C)보다 한 음 아래예요. 지금 음표 머리는 아래 첫째 덧줄 위에 있어요.',
      '맞아요. 높은음자리표 아래 첫째 덧줄이 가운데 다(C)의 자리예요.',
      '라(D)는 가운데 다(C)보다 한 음 위의 칸에 있어요. 지금 음표 머리는 칸이 아니라 덧줄 위에 있어요.',
    ],
  },
  {
    id: 'visual-56-pitch-register', lessonId: 'pitch', grade: '5-6', kind: 'visual',
    prompt: '두 음은 모두 다(C)라는 음이름을 가졌어요. 이 악보에서 두 음의 높이 관계를 설명한 것은 무엇인가요?',
    visual: score([n('h', 'c/4'), n('h', 'c/5')], '4/4'),
    choices: [{ text: '음이름이 같아서 높이도 같아요' }, { text: '둘째 음이 한 옥타브 낮아요' }, { text: '둘째 음이 한 옥타브 높아요' }], correct: 2,
    why: '음이름은 같아도 놓인 높이가 달라요. 둘째 다는 첫째 다보다 한 옥타브 위에 있는 음이에요.',
    misconceptions: [
      '같은 음이름이 다른 높이에서도 나와요. 음이름만 보지 말고 오선 위치도 살펴봐요.',
      '둘째 음의 머리는 더 위에 있어요. 낮아진 것이 아니라 높아진 관계예요.',
      '맞아요. 같은 다 음이 한 옥타브 간격으로 위아래에 놓여 있어요.',
    ],
  },
  {
    id: 'visual-56-melody-arch', lessonId: 'melody', grade: '5-6', kind: 'visual',
    prompt: '첫째부터 셋째 음까지 뛰어 올라간 뒤, 마지막에 한 번 내려오는 가락은 어느 것인가요?',
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'e/5'), n('q', 'd/5')], '4/4') },
      { text: '나', visual: score([n('q', 'g/5'), n('q', 'e/5'), n('q', 'c/5'), n('q', 'e/5')], '4/4') },
      { text: '다', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'e/5')], '4/4') },
    ], correct: 2,
    why: '다는 도에서 미, 미에서 솔로 건너뛰며 올라가고, 마지막에 솔에서 미로 내려와요. 방향과 차례·뛰어가기를 함께 살펴봐요.',
    misconceptions: [
      '가도 올라갔다 내려오지만 앞의 음들은 차례로 움직여요. 뛰어 올라가는 조건이 맞지 않아요.',
      '나는 먼저 내려갔다가 올라가요. 방향이 바뀌는 순서가 반대예요.',
      '맞아요. 앞에서는 뛰어 올라가고 마지막 한 번은 내려오는 가락이에요.',
    ],
  },
  {
    id: 'visual-56-melody-revise', lessonId: 'melody', grade: '5-6', kind: 'visual',
    prompt: '앞의 세 음은 그대로 두고 마지막 음만 바꿔요. 셋째 음에서 한 음 차례로 내려오며 끝나는 악보는 무엇인가요?',
    visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'g/5')], '4/4'),
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'a/5')], '4/4') },
      { text: '나', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'f/5')], '4/4') },
      { text: '다', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'f/5')], '4/4') },
    ], correct: 1,
    why: '나는 도, 레, 솔을 그대로 두고 마지막만 파로 바꿨어요. 솔에서 파로 이웃한 음을 내려오므로 두 조건을 모두 지켜요.',
    misconceptions: [
      '가는 솔에서 라로 올라가요. 마지막 음을 바꿨지만 내려오라는 조건과 달라요.',
      '맞아요. 앞 세 음을 유지하고 끝만 솔에서 파로 차례 내려오게 바꿨어요.',
      '다는 끝은 맞지만 둘째 음도 레에서 미로 바꿨어요. 바꿀 수 있는 범위를 확인해요.',
    ],
  },
  {
    id: 'visual-56-dynamics-crescendo', lessonId: 'dynamics', grade: '5-6', kind: 'visual',
    prompt: '아래 셈여림 계획을 한 가락에 걸쳐 부드럽게 이어 표현해요. 어떤 변화에 귀 기울여야 하나요?',
    visual: labels(['p', '→', 'mf', '→', 'f'], '화살표를 따라 조금씩 변화시키는 셈여림'),
    choices: [{ text: '소리가 조금씩 여려지는 변화' }, { text: '소리가 조금씩 세지는 변화' }, { text: '처음 세기를 그대로 유지하는 변화' }], correct: 1,
    why: 'p에서 mf를 거쳐 f로 가면 여리게 시작해서 점점 세게 표현해요. 이런 세기의 변화를 크레셴도로 나타낼 수 있어요.',
    misconceptions: [
      '점점 여리게 하려면 더 여린 기호 쪽으로 가야 해요. 그림은 p에서 f 쪽으로 가요.',
      '맞아요. 세기의 중간 단계를 거쳐 점점 세게 표현하는 계획이에요.',
      'p, mf, f는 서로 다른 세기예요. 처음 세기를 유지하지 않고 조금씩 바꾸어 표현해요.',
    ],
  },
  {
    id: 'visual-56-dynamics-plan', lessonId: 'dynamics', grade: '5-6', kind: 'visual',
    prompt: '같은 빠르기를 지키며 화살표를 따라 셈여림을 조금씩 바꿔요. 처음보다 여리게 끝나는 계획을 고르세요.',
    choices: [
      { text: '가', visual: labels(['mf', '→', 'p'], '셈여림 계획 가') },
      { text: '나', visual: labels(['p', '→', 'f'], '셈여림 계획 나') },
      { text: '다', visual: labels(['mf', '→', 'mf'], '셈여림 계획 다') },
    ], correct: 0,
    why: 'mf보다 p가 더 여린 세기예요. 가처럼 조금씩 여리게 하되, 소리를 줄인다고 박의 속도까지 늦추지는 않아요.',
    misconceptions: [
      '맞아요. 시작은 mf, 끝은 p라서 점점 여리게 한다는 조건에 맞아요.',
      '나는 여리게 시작하여 세게 끝나요. 원하는 변화와 반대 방향이에요.',
      '다는 시작과 끝이 mf로 같아요. 끝을 더 여리게 한다는 조건에 맞지 않아요.',
    ],
  },
  {
    id: 'visual-56-form-return', lessonId: 'form', grade: '5-6', kind: 'visual',
    prompt: '같은 글자는 같은 가락이에요. 그림의 처음과 끝은 두고 가운데만 새 가락 c로 바꾸세요. 바꾼 구성은 무엇인가요?',
    visual: labels(['a', 'b', 'a'], '바꾸기 전의 세 부분'),
    choices: [
      { text: '가', visual: labels(['b', 'c', 'b'], '바꾼 구성 가') },
      { text: '나', visual: labels(['a', 'c', 'a'], '바꾼 구성 나') },
      { text: '다', visual: labels(['a', 'c', 'b'], '바꾼 구성 다') },
    ], correct: 1,
    why: '가운데 부분만 바꾸면 a-c-a가 돼요. 처음 가락이 마지막에 돌아오는 관계는 유지하면서 가운데의 대비를 새롭게 만들어요.',
    misconceptions: [
      '가는 가운데뿐 아니라 처음과 끝도 b로 바꿨어요. 처음과 끝은 원래 그림의 a를 지켜요.',
      '맞아요. 처음과 끝의 a는 남겨 두고 가운데 b만 c로 바꿨어요.',
      '다는 가운데와 함께 마지막도 b로 바꿨어요. 처음 가락으로 돌아오는 관계를 지켜야 해요.',
    ],
  },
  {
    id: 'visual-56-form-expand', lessonId: 'form', grade: '5-6', kind: 'visual',
    prompt: '그림의 큰 부분을 A-B-A 순서로 연주해요. 각 부분을 펼쳤을 때 작은 가락의 순서는 무엇인가요?',
    visual: labels(['A: a + a', 'B: b + b'], '대문자는 큰 부분, 소문자는 작은 가락'),
    choices: [
      { text: '가', visual: labels(['a', 'b', 'a', 'b', 'a', 'b'], '작은 가락의 순서 가') },
      { text: '나', visual: labels(['a', 'a', 'b', 'b', 'b', 'b'], '작은 가락의 순서 나') },
      { text: '다', visual: labels(['a', 'a', 'b', 'b', 'a', 'a'], '작은 가락의 순서 다') },
    ], correct: 2,
    why: '큰 부분 A 하나에는 작은 a가 두 번 들어 있어요. A-B-A를 각각 풀어 쓰면 a-a, b-b, a-a 순서예요.',
    misconceptions: [
      '가는 a와 b를 번갈아 놓았어요. 큰 부분마다 어떤 작은 가락 두 개가 들어 있는지 그림을 확인해요.',
      '나는 마지막 큰 부분도 B로 연주한 순서예요. 마지막에는 A가 돌아와야 해요.',
      '맞아요. 큰 부분 세 개를 작은 가락 두 개씩으로 바르게 펼쳤어요.',
    ],
  },
  {
    id: 'visual-56-gugak-accent', lessonId: 'gugak', grade: '5-6', kind: 'visual',
    prompt: '각 칸의 길이는 같고 >는 힘주어 치는 세를 표시해요. 이 연습 구음꼴의 세를 살리는 방법은 무엇인가요?',
    visual: labels(['> 덩', '쿵', '덕', '쿵'], '연습용 구음꼴: >는 힘주어 치는 자리'),
    choices: [{ text: '첫 칸에 힘을 주고 칸의 간격은 유지해요' }, { text: '첫 칸만 빨리 지나가요' }, { text: '모든 칸을 같은 세기로 쳐요' }], correct: 0,
    why: '세를 살린다는 것은 소리의 힘을 구별하는 일이에요. 첫 칸에 힘을 주더라도 정해 둔 칸의 간격은 유지해요.',
    misconceptions: [
      '맞아요. 힘주는 자리와 시간의 간격을 구별하여 연주하는 방법이에요.',
      '힘주는 것과 빨리 지나가는 것은 달라요. 첫 칸의 길이도 다른 칸과 같아요.',
      '모든 칸의 힘을 같게 하면 >로 표시한 자리의 세가 드러나지 않아요.',
    ],
  },
  {
    id: 'visual-56-gugak-hanbae', lessonId: 'gugak', grade: '5-6', kind: 'visual',
    prompt: '각 구음은 한 박의 시작이에요. ·는 두 줄에서 같은 길이의 시간 눈금이에요. 나중의 한배는 어떻게 달라졌나요?',
    visual: labels(['처음: 덩 · · 쿵 · · 덕 · ·', '나중: 덩 · 쿵 · 덕 ·'], '구음 사이의 시간 칸을 비교하는 연습 그림', 'rows'),
    choices: [{ text: '더 느려져요' }, { text: '더 빨라져요' }, { text: '빠르기는 같고 세기만 달라져요' }], correct: 1,
    why: '각 구음이 박의 시작이므로 구음 사이가 박의 간격이에요. 나중에는 같은 시간 눈금으로 잰 박의 간격이 짧아져서 한배가 빨라져요.',
    misconceptions: [
      '기다리는 시간이 길어져야 더 느려져요. 나중 줄에서는 기다리는 칸이 줄었어요.',
      '맞아요. 같은 구음 순서의 사이가 짧아져서 더 빠르게 이어져요.',
      '그림은 소리의 힘이 아니라 사이의 시간을 보여 줘요. 세기 변화는 표시하지 않았어요.',
    ],
  },
];
