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
    why: '2분음표 하나는 4분음표 두 개를 이은 길이예요. 음표 수가 달라도 전체 길이는 같을 수 있어요.',
    misconceptions: [
      '4분음표 하나는 2분음표 길이의 절반이에요. 음표 수만 보지 말고 길이도 살펴보세요.',
      '맞아요. 짧은 4분음표 두 개를 이으면 2분음표 하나와 길이가 같아요.',
      '온음표는 2분음표보다 두 배 길어요. 둘 다 머리가 비어 있으니 기둥도 살펴보세요.',
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
    why: '음표 머리는 음표의 둥근 부분이에요. 머리가 검고 기둥이 있는 4분음표가 이 연습에서는 한 박이에요. 무엇을 한 박으로 세는지 연습마다 확인해요.',
    misconceptions: [
      '빈 머리에 기둥이 있는 2분음표는 이 연습에서 두 박이에요.',
      '기둥 없는 빈 머리인 온음표는 이 연습에서 네 박이에요.',
      '맞아요. 이 연습에서 한 박으로 세는 4분음표예요.',
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
      '맞아요. 둘째 박은 소리 없이 쉬어도 속으로 박은 계속 세어요.',
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
    prompt: '4분음표를 한 박으로 세어요. 한 박을 같은 길이 둘로 나누어 손뼉을 두 번 치는 곳은 어디인가요?',
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
    prompt: '소리의 높이는 달라도 괜찮아요. 음표의 길이와 순서가 위 악보와 같은 것을 골라 보세요.',
    visual: score([n('q'), n('h'), n('q')], '4/4'),
    choices: [
      { text: '가', visual: score([n('q', 'g/4'), n('q', 'g/4'), n('h', 'g/4')], '4/4') },
      { text: '나', visual: score([n('q', 'e/5'), n('h', 'e/5'), n('q', 'e/5')], '4/4') },
      { text: '다', visual: score([n('h', 'a/4'), n('q', 'a/4'), n('q', 'a/4')], '4/4') },
    ], correct: 1,
    why: '위 악보의 길이는 짧게, 길게, 짧게예요. 나도 4분음표, 2분음표, 4분음표 순서라서 리듬이 같아요.',
    misconceptions: [
      '가는 긴 음이 끝에 있어요. 전체 길이가 같아도 길이의 순서가 다르면 리듬은 달라요.',
      '맞아요. 소리의 높이가 달라도 음표의 길이와 순서가 같아 리듬이 같아요.',
      '다는 첫 음이 길어요. 위 악보는 가운데 음이 길다는 점을 살펴보세요.',
    ],
  },
  {
    id: 'visual-34-pitch-higher', lessonId: 'pitch', grade: '3-4', kind: 'visual',
    prompt: '같은 높은음자리표에서 왼쪽부터 두 음을 연주해요. 어느 음이 더 높은 소리인가요?',
    visual: score([n('h', 'c/5'), n('h', 'g/5')], '4/4'),
    choices: [{ text: '첫째 음' }, { text: '둘째 음' }, { text: '두 음의 높이가 같아요' }], correct: 1,
    why: '오선은 악보의 다섯 줄이에요. 둘째 음의 머리가 오선에서 더 위에 있어요. 같은 음자리표에서는 음표 머리가 위에 있을수록 더 높은 소리예요.',
    misconceptions: [
      '먼저 나온다고 높은 음은 아니에요. 어느 음표 머리가 더 위에 있는지 살펴보세요.',
      '맞아요. 둘째 음이 첫째 음보다 위에 놓여 있어 더 높은 소리예요.',
      '두 음의 길이는 같아요. 하지만 음표 머리가 놓인 높이는 달라요.',
    ],
  },
  {
    id: 'visual-34-pitch-position', lessonId: 'pitch', grade: '3-4', kind: 'visual',
    prompt: '높은음자리표의 오선은 다섯 줄이에요. 음표 머리가 가운데 줄인 셋째 줄에 놓인 그림을 찾아보세요.',
    choices: [
      { text: '가', visual: score([n('q', 'b/4')]) },
      { text: '나', visual: score([n('q', 'a/4')]) },
      { text: '다', visual: score([n('q', 'c/5')]) },
    ], correct: 0,
    why: '가는 음표 머리 가운데로 셋째 줄이 지나가요. 머리 가운데로 줄이 지나가는지, 머리가 줄 사이의 칸에 있는지 살펴보세요.',
    misconceptions: [
      '맞아요. 음표 머리의 가운데를 오선의 셋째 줄이 지나가요.',
      '나는 둘째 줄과 셋째 줄 사이의 칸에 놓여 있어요. 머리 가운데로 줄이 지나가는지 살펴보세요.',
      '다는 셋째 줄과 넷째 줄 사이의 칸에 놓여 있어요. 줄을 아래부터 세어 보세요.',
    ],
  },
  {
    id: 'visual-34-melody-step', lessonId: 'melody', grade: '3-4', kind: 'visual',
    prompt: '이웃한 음으로 한 음씩 올라가는 가락을 고르세요. 같은 음을 되풀이하거나 중간 음을 건너뛰지 않아요.',
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'e/5'), n('q', 'f/5')], '4/4') },
      { text: '나', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'c/6')], '4/4') },
      { text: '다', visual: score([n('q', 'f/5'), n('q', 'e/5'), n('q', 'd/5'), n('q', 'c/5')], '4/4') },
    ], correct: 0,
    why: '가는 도, 레, 미, 파처럼 이웃한 음으로 한 계단씩 올라가요. 나는 중간 음을 건너뛰며 올라가고, 다는 내려가요.',
    misconceptions: [
      '맞아요. 이웃한 음으로 움직이는 것을 차례가기라고 해요. 가는 차례로 올라가는 가락이에요.',
      '나도 올라가지만 중간 음을 건너뛰어요. 올라감과 차례가기는 같은 뜻이 아니에요.',
      '다는 이웃한 음으로 움직이지만 아래로 내려가요.',
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
    prompt: '셈여림은 소리의 세기예요. 이 셈여림 기호에 맞게 어떻게 연주하나요?',
    visual: labels(['p'], '악보의 셈여림 기호'),
    choices: [{ text: '여리게 연주해요' }, { text: '세게 연주해요' }, { text: '점점 여리게 연주해요' }], correct: 0,
    why: 'p는 피아노라고 읽으며 여리게 연주하라는 셈여림 기호예요. 빠르기나 음높이를 바꾸라는 뜻은 아니에요.',
    misconceptions: [
      '맞아요. p가 나오면 여리게 연주해요.',
      '세게 연주하는 기호는 f예요. p는 그와 달리 여리게 연주해요.',
      'p는 여리게 연주하라는 뜻이에요. 이 기호만으로 점점 여리게 하라는 뜻은 아니에요.',
    ],
  },
  {
    id: 'visual-34-dynamics-contrast', lessonId: 'dynamics', grade: '3-4', kind: 'visual',
    prompt: '같은 가락을 같은 빠르기로 두 번 연주해요. 첫째 연주에서 둘째 연주로 바뀔 때 소리의 세기는 어떻게 달라지나요?',
    visual: labels(['첫째: p', '둘째: f'], '같은 가락의 셈여림 순서'),
    choices: [{ text: '세게 연주하다 여리게 연주해요' }, { text: '두 번 모두 같은 세기로 연주해요' }, { text: '여리게 연주하다 세게 연주해요' }], correct: 2,
    why: 'p는 여리게, f는 세게 연주해요. 가락과 빠르기는 그대로 두고 소리의 세기만 다르게 해요.',
    misconceptions: [
      '그 순서는 f에서 p로 갈 때예요. 그림에서는 p가 먼저 나오고 f가 뒤에 나와요.',
      '가락과 빠르기는 같아도 세기는 달라요. 첫째의 p와 둘째의 f를 구별해요.',
      '맞아요. p에서 f로 바뀌므로 둘째 연주를 더 세게 해요.',
    ],
  },
  {
    id: 'visual-34-form-repeat', lessonId: 'form', grade: '3-4', kind: 'visual',
    prompt: '같은 글자는 같은 음악 부분이에요. 그림에서 서로 같은 부분끼리 짝지은 것은 무엇인가요?',
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
    why: 'a를 두 번 연주한 뒤 b를 두 번 연주해요. 몇 번 연주하는지와 어떤 순서인지 함께 살펴봐요.',
    misconceptions: [
      '맞아요. 같은 부분을 두 번씩 이어 연주하고, 가운데에서 다른 부분으로 바뀌어요.',
      '번갈아 연주하면 a, b, a, b가 돼요. 그림은 같은 글자가 붙어 있어요.',
      'a도 두 칸이에요. 전체 칸 수만 세지 말고 a와 b가 각각 몇 번 나오는지 세어 보세요.',
    ],
  },
  {
    id: 'visual-34-gugak-cycle', lessonId: 'gugak', grade: '3-4', kind: 'visual',
    prompt: '구음은 악기 소리를 입으로 따라 부르는 말이에요. 그림은 같은 묶음을 되풀이하는 연습이에요. 빈칸에서 이어 부를 구음은 무엇인가요?',
    visual: labels(['덩', '쿵', '덕', '덩', '쿵', '?'], '구음으로 부르는 반복 연습'),
    choices: [{ text: '덩' }, { text: '덕' }, { text: '쿵' }], correct: 1,
    why: '덩, 쿵, 덕을 한 묶음으로 되풀이해요. 둘째 묶음에서도 쿵 다음에는 덕이 와요. 이 연습에서는 장단 이름을 묻지 않아요.',
    misconceptions: [
      '덩은 이 연습 묶음의 시작이에요. 덕까지 부른 뒤에 처음으로 돌아가요.',
      '맞아요. 앞 묶음과 같은 순서로 부르면 빈칸에는 덕이 들어가요.',
      '바로 앞이 쿵이에요. 같은 구음을 반복하는 것이 아니라 묶음 전체를 되풀이해요.',
    ],
  },
  {
    id: 'visual-34-gugak-syllables', lessonId: 'gugak', grade: '3-4', kind: 'visual',
    prompt: '각 칸은 같은 길이의 한 박이에요. 한 박 안에서 두 글자를 나누어 부르는 칸은 어디인가요?',
    visual: labels(['1박: 봄', '2박: 바·람', '3박: 분', '4박: 다'], '가사를 박에 맞춰 부르기: ·는 글자를 나누는 표시'),
    choices: [{ text: '첫째 박' }, { text: '셋째 박' }, { text: '둘째 박' }], correct: 2,
    why: '가사를 박에 맞춰 붙여 부르는 모양을 말붙임새라고 해요. 둘째 박에서는 바와 람을 한 박 안에 나누어 불러요. 글자가 두 개여도 그 칸은 한 박이에요.',
    misconceptions: [
      '첫째 박에는 봄 한 글자가 있어요. 한 박에 몇 글자를 부르는지 살펴보세요.',
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
    why: '음표 오른쪽의 점은 원래 길이의 절반을 더해요. 2분음표의 두 박에 한 박을 더해요. 그래서 점2분음표는 이 연습에서 세 박이에요.',
    misconceptions: [
      '2분음표만 연주하면 점이 더한 한 박이 빠져요. 점이 더한 길이도 세어 보세요.',
      '맞아요. 두 박과 한 박을 합친 세 박이 점2분음표와 같아요.',
      '점이 길이를 무조건 두 배로 늘리지는 않아요. 온음표 네 박보다 한 박 짧아요.',
    ],
  },
  {
    id: 'visual-56-duration-subdivide', lessonId: 'duration', grade: '5-6', kind: 'visual',
    prompt: '4분음표를 한 박으로 세어요. 위 음표를 같은 길이의 음표 네 개로 나눠요. 빠르기와 전체 길이를 바꾸지 않은 악보를 고르세요.',
    visual: score([n('q')]),
    choices: [
      { text: '가', visual: score([n('16'), n('16')]) },
      { text: '나', visual: score([n('8'), n('8'), n('8'), n('8')]) },
      { text: '다', visual: score([n('16'), n('16'), n('16'), n('16')]) },
    ], correct: 2,
    why: '16분음표는 4분음표 길이의 4분의 1이에요. 네 개를 고르게 이어 연주하면 원래 한 박의 길이가 돼요.',
    misconceptions: [
      '16분음표 두 개는 반 박이에요. 음표가 네 개인지, 합쳐서 한 박인지 모두 확인해요.',
      '8분음표 네 개는 두 박이에요. 개수와 함께 각 음표의 길이도 확인해요.',
      '맞아요. 16분음표 네 개를 합치면 한 박이에요. 한 박을 나누어도 박을 세는 빠르기는 같아요.',
    ],
  },
  {
    id: 'visual-56-rest-dot', lessonId: 'rest', grade: '5-6', kind: 'visual',
    prompt: '4분음표가 한 박인 연습이에요. 그림의 쉼표에서는 몇 박 동안 쉬나요?',
    visual: score([r('q', 1)]),
    choices: [{ text: '한 박 반' }, { text: '한 박' }, { text: '반 박' }], correct: 0,
    why: '쉼표에 붙은 점도 원래 길이의 절반을 더해요. 한 박에 반 박을 더하여 한 박 반 동안 소리를 쉬어요.',
    misconceptions: [
      '맞아요. 점의 반 박까지 소리 없이 세어야 다음 소리를 제때 시작할 수 있어요.',
      '한 박은 점 없는 4분쉼표의 길이예요. 오른쪽 점이 더한 길이도 세어 보세요.',
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
    prompt: '4분음표가 한 박이에요. 보기의 악보 하나를 이 리듬 뒤에 붙여요. 네 박짜리 한 마디가 되는 것은 어느 것인가요?',
    visual: score([n('q', 'c/5', 1), n('8')]),
    choices: [
      { text: '가', visual: score([n('q')]) },
      { text: '나', visual: score([n('h')]) },
      { text: '다', visual: score([n('h', 'c/5', 1)]) },
    ], correct: 1,
    why: '점4분음표 한 박 반과 8분음표 반 박을 합치면 두 박이에요. 남은 두 박을 2분음표로 채우면 네 박이 돼요.',
    misconceptions: [
      '한 박만 붙이면 전체가 세 박이에요. 그림에 있는 두 박과 더해 보세요.',
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
    why: '가는 앞의 세 박에서 소리를 내고 마지막 박을 쉬어요. 소리 내는 시간과 쉬는 시간은 바꾸기 전과 같아요. 하지만 쉬는 자리가 달라져서 리듬은 달라져요.',
    misconceptions: [
      '맞아요. 전체 길이는 네 박 그대로예요. 쉬는 자리만 마지막 박으로 옮겼어요.',
      '나는 마지막에 쉼을 더했지만 둘째 박의 쉼도 남겨 두었어요. 서로 자리를 바꿔야 해요.',
      '다는 첫째 박도 쉼으로 바꿨어요. 쉼표와 마지막 음표만 자리를 바꾸고 다른 음표는 그대로 두어요.',
    ],
  },
  {
    id: 'visual-56-pitch-name', lessonId: 'pitch', grade: '5-6', kind: 'visual',
    prompt: '높은음자리표에서 그림의 음표를 읽어 보세요. 이 음의 음이름은 무엇인가요?',
    visual: score([n('q', 'c/4')]),
    choices: [{ text: '나(B)' }, { text: '다(C)' }, { text: '라(D)' }], correct: 1,
    why: '오선 밖에 짧게 더 그은 줄을 덧줄이라고 해요. 높은음자리표에서 아래 첫째 덧줄을 지나는 음은 가운데 다(C)예요. 줄과 칸을 하나씩 짚어 보세요.',
    misconceptions: [
      '나(B)는 가운데 다(C)보다 한 음 아래예요. 그림에서는 아래 첫째 덧줄이 음표 머리 가운데를 지나가요.',
      '맞아요. 높은음자리표 아래 첫째 덧줄이 가운데 다(C)의 자리예요.',
      '라(D)는 가운데 다(C)보다 한 음 위의 칸에 있어요. 그림에서는 칸이 아니라 덧줄이 음표 머리 가운데를 지나가요.',
    ],
  },
  {
    id: 'visual-56-pitch-register', lessonId: 'pitch', grade: '5-6', kind: 'visual',
    prompt: '두 음의 음이름은 모두 다(C)예요. 악보에서 두 음의 높이를 바르게 비교한 것은 무엇인가요?',
    visual: score([n('h', 'c/4'), n('h', 'c/5')], '4/4'),
    choices: [{ text: '음이름이 같아서 높이도 같아요' }, { text: '둘째 음이 한 옥타브 낮아요' }, { text: '둘째 음이 한 옥타브 높아요' }], correct: 2,
    why: '음이름은 같아도 놓인 높이가 달라요. 둘째 다는 첫째 다보다 한 옥타브 위에 있는 음이에요.',
    misconceptions: [
      '같은 음이름이 다른 높이에서도 나와요. 음이름만 보지 말고 오선 위치도 살펴봐요.',
      '둘째 음의 머리는 더 위에 있어요. 첫째 음보다 낮은 음이 아니라 높은 음이에요.',
      '맞아요. 같은 다 음이 한 옥타브 간격으로 위아래에 놓여 있어요.',
    ],
  },
  {
    id: 'visual-56-melody-arch', lessonId: 'melody', grade: '5-6', kind: 'visual',
    prompt: '첫째부터 셋째 음까지는 중간 음을 건너뛰며 올라가요. 마지막에는 한 번 내려와요. 이 가락을 골라 보세요.',
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'e/5'), n('q', 'd/5')], '4/4') },
      { text: '나', visual: score([n('q', 'g/5'), n('q', 'e/5'), n('q', 'c/5'), n('q', 'e/5')], '4/4') },
      { text: '다', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'e/5')], '4/4') },
    ], correct: 2,
    why: '다는 도에서 미, 미에서 솔로 건너뛰며 올라가요. 마지막에는 솔에서 미로 내려와요. 이웃한 음으로 움직이면 차례가기, 중간 음을 건너뛰면 뛰어가기예요.',
    misconceptions: [
      '가도 올라갔다 내려와요. 하지만 앞의 음들은 이웃한 음으로 차례로 올라가요. 중간 음을 건너뛰지 않아요.',
      '나는 먼저 내려갔다가 올라가요. 올라간 뒤 내려오는 가락을 찾아보세요.',
      '맞아요. 앞에서는 뛰어 올라가고 마지막 한 번은 내려오는 가락이에요.',
    ],
  },
  {
    id: 'visual-56-melody-revise', lessonId: 'melody', grade: '5-6', kind: 'visual',
    prompt: '앞의 세 음은 그대로 두고 마지막 음만 바꿔요. 셋째 음에서 바로 이웃한 음으로 내려오며 끝나는 악보를 고르세요.',
    visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'g/5')], '4/4'),
    choices: [
      { text: '가', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'a/5')], '4/4') },
      { text: '나', visual: score([n('q', 'c/5'), n('q', 'd/5'), n('q', 'g/5'), n('q', 'f/5')], '4/4') },
      { text: '다', visual: score([n('q', 'c/5'), n('q', 'e/5'), n('q', 'g/5'), n('q', 'f/5')], '4/4') },
    ], correct: 1,
    why: '나는 도, 레, 솔을 그대로 두고 마지막만 파로 바꿨어요. 솔에서 파로 이웃한 음을 내려오므로 두 조건을 모두 지켜요.',
    misconceptions: [
      '가는 솔에서 라로 올라가요. 마지막 음을 바꿨지만 내려오라는 조건과 달라요.',
      '맞아요. 앞의 세 음은 그대로 두었어요. 마지막만 솔에서 바로 아래 음인 파로 내려오게 바꿨어요.',
      '다는 끝은 맞지만 둘째 음도 레에서 미로 바꿨어요. 마지막 음만 바꿔야 해요.',
    ],
  },
  {
    id: 'visual-56-dynamics-crescendo', lessonId: 'dynamics', grade: '5-6', kind: 'visual',
    prompt: '화살표를 따라 소리의 세기를 조금씩 바꾸며 한 가락을 연주해요. 소리의 세기는 어떻게 달라지나요?',
    visual: labels(['p', '→', 'mf', '→', 'f'], '화살표를 따라 조금씩 바꾸는 소리의 세기'),
    choices: [{ text: '소리가 조금씩 여려지는 변화' }, { text: '소리가 조금씩 세지는 변화' }, { text: '처음 세기가 그대로인 변화' }], correct: 1,
    why: 'p에서 mf를 거쳐 f로 가면 여리게 시작해서 점점 세게 연주해요. 점점 세게 하라는 말을 크레셴도라고 해요.',
    misconceptions: [
      '점점 여리게 하려면 더 여린 기호 쪽으로 가야 해요. 그림은 p에서 f 쪽으로 가요.',
      '맞아요. 여리게 시작해서 조금씩 더 세게 연주해요.',
      'p, mf, f는 서로 다른 세기예요. 처음 세기 그대로가 아니라 조금씩 바꾸어 연주해요.',
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
    why: 'mf보다 p가 더 여린 세기예요. 가처럼 조금씩 여리게 연주해요. 소리를 여리게 해도 박을 세는 빠르기는 같게 해요.',
    misconceptions: [
      '맞아요. 시작은 mf, 끝은 p라서 점점 여리게 한다는 조건에 맞아요.',
      '나는 여리게 시작해서 세게 끝나요. 처음보다 여리게 끝나지 않아요.',
      '다는 시작과 끝이 mf로 같아요. 끝을 더 여리게 한다는 조건에 맞지 않아요.',
    ],
  },
  {
    id: 'visual-56-form-return', lessonId: 'form', grade: '5-6', kind: 'visual',
    prompt: '같은 글자는 같은 가락이에요. 처음과 끝은 그대로 두고 가운데만 새 가락 c로 바꿔요. 바르게 바꾼 그림을 고르세요.',
    visual: labels(['a', 'b', 'a'], '바꾸기 전의 세 부분'),
    choices: [
      { text: '가', visual: labels(['b', 'c', 'b'], '바꾼 순서 가') },
      { text: '나', visual: labels(['a', 'c', 'a'], '바꾼 순서 나') },
      { text: '다', visual: labels(['a', 'c', 'b'], '바꾼 순서 다') },
    ], correct: 1,
    why: '가운데 부분만 바꾸면 a-c-a가 돼요. 처음과 끝에서는 같은 가락 a를 연주해요. 가운데에서만 새 가락 c를 연주해요.',
    misconceptions: [
      '가는 가운데뿐 아니라 처음과 끝도 b로 바꿨어요. 처음과 끝은 원래 그림의 a로 두어야 해요.',
      '맞아요. 처음과 끝의 a는 남겨 두고 가운데 b만 c로 바꿨어요.',
      '다는 가운데뿐 아니라 마지막도 b로 바꿨어요. 마지막에는 처음 가락 a가 다시 나와야 해요.',
    ],
  },
  {
    id: 'visual-56-form-expand', lessonId: 'form', grade: '5-6', kind: 'visual',
    prompt: '그림의 큰 부분을 A-B-A 순서로 연주해요. 큰 부분 안의 작은 가락을 하나씩 늘어놓으면 어떤 순서인가요?',
    visual: labels(['A: a + a', 'B: b + b'], '대문자는 큰 부분, 소문자는 작은 가락'),
    choices: [
      { text: '가', visual: labels(['a', 'b', 'a', 'b', 'a', 'b'], '작은 가락의 순서 가') },
      { text: '나', visual: labels(['a', 'a', 'b', 'b', 'b', 'b'], '작은 가락의 순서 나') },
      { text: '다', visual: labels(['a', 'a', 'b', 'b', 'a', 'a'], '작은 가락의 순서 다') },
    ], correct: 2,
    why: 'A에서는 a를 두 번, B에서는 b를 두 번 연주해요. A-B-A를 작은 가락으로 풀어 쓰면 a-a, b-b, a-a 순서예요.',
    misconceptions: [
      '가는 a와 b를 번갈아 놓았어요. 큰 부분마다 어떤 작은 가락 두 개가 들어 있는지 그림을 확인해요.',
      '나는 마지막 큰 부분도 B로 연주한 순서예요. 마지막에는 A가 돌아와야 해요.',
      '맞아요. A의 a-a, B의 b-b, 다시 A의 a-a 순서로 연주해요.',
    ],
  },
  {
    id: 'visual-56-gugak-accent', lessonId: 'gugak', grade: '5-6', kind: 'visual',
    prompt: '각 칸의 길이는 같아요. >는 힘주어 치는 자리예요. 힘주어 치는 것을 세라고 해요. 이 연습에서 세를 살리는 방법은 무엇인가요?',
    visual: labels(['> 덩', '쿵', '덕', '쿵'], '구음 연습: >는 힘주어 치는 자리'),
    choices: [{ text: '첫 칸에 힘을 주고 각 칸의 길이는 그대로 둬요' }, { text: '첫 칸만 빨리 지나가요' }, { text: '모든 칸을 같은 세기로 쳐요' }], correct: 0,
    why: '세를 살리려면 힘주는 자리를 더 세게 쳐요. 첫 칸을 더 세게 쳐도 각 칸의 길이는 같게 해요.',
    misconceptions: [
      '맞아요. 첫 칸을 더 세게 치고, 각 칸의 길이는 그대로 두어요.',
      '힘주는 것과 빨리 지나가는 것은 달라요. 첫 칸의 길이도 다른 칸과 같아요.',
      '모든 칸을 같은 세기로 치면 >가 있는 자리를 더 세게 칠 수 없어요.',
    ],
  },
  {
    id: 'visual-56-gugak-hanbae', lessonId: 'gugak', grade: '5-6', kind: 'visual',
    prompt: '각 구음을 부를 때 한 박이 시작돼요. ·는 두 줄에서 같은 길이의 시간을 나타내요. 한배는 국악에서 쓰는 빠르기예요. 나중의 한배는 어떻게 달라졌나요?',
    visual: labels(['처음: 덩 · · 쿵 · · 덕 · ·', '나중: 덩 · 쿵 · 덕 ·'], '악기 소리를 입으로 부르는 구음 사이의 시간 비교', 'rows'),
    choices: [{ text: '더 느려져요' }, { text: '더 빨라져요' }, { text: '빠르기는 같고 세기만 달라져요' }], correct: 1,
    why: '한 구음에서 다음 구음까지가 한 박의 간격이에요. · 하나의 시간은 같고, 나중 줄에는 ·가 더 적어요. 박의 간격이 짧아져서 한배가 빨라져요.',
    misconceptions: [
      '기다리는 시간이 길어져야 더 느려져요. 나중 줄에서는 기다리는 칸이 줄었어요.',
      '맞아요. 구음의 순서는 같고, 다음 구음을 부를 때까지의 시간이 짧아져요. 그래서 더 빨라져요.',
      '그림은 소리의 세기가 아니라 구음 사이의 시간을 보여 줘요. 소리가 더 세거나 여린지는 알 수 없어요.',
    ],
  },
];
