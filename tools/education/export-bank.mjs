import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
 const { QUESTIONS, LESSONS, ACTIVITIES } = await server.ssrLoadModule('/src/quest/bank/index.ts');
 const { INSTRUMENT_ASSETS } = await server.ssrLoadModule('/src/quest/bank/audioAssets.ts');
 const kind = { visual: '그림', listening: '듣기', concept: '개념' };
 const source = 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0302';
 const data = { version: 1, scope: '초등 3~4·5~6학년군 1차 핵심 범위. 교육과정 전체 성취를 보장하지 않음.', counts: { lessons: LESSONS.length, visual: QUESTIONS.filter(q => q.kind === 'visual').length, listening: QUESTIONS.filter(q => q.kind === 'listening').length, concept: QUESTIONS.filter(q => q.kind === 'concept').length, activities: ACTIVITIES.length }, sources: [source, 'https://www.law.go.kr/flDownload.do?flSeq=143731563'], lessons: LESSONS, questions: QUESTIONS, activities: ACTIVITIES, instrumentAssets: INSTRUMENT_ASSETS };
 if (QUESTIONS.length !== 96 || ACTIVITIES.length !== 24 || new Set([...QUESTIONS, ...ACTIVITIES].map(q => q.id)).size !== 120) throw Error('Invalid bank totals');
 const lines = ['# 음악 수첩 120항목 교사용 자료', '', '자동 채점 96문항(그림32·듣기40·개념24)과 수행·성찰24활동을 구분합니다. 같은 문제의 곡별 배치는 새 문항으로 세지 않습니다.', '', '## 범위와 사용', '', '- 3~4학년과 5~6학년을 나누어 제시합니다. 1~2학년 통합교과 전용 과정은 포함하지 않습니다.', '- 2022 개정 음악과 교육과정 및 2024-3호 포함 원문을 바탕으로 한 1차 핵심 범위입니다. 모든 성취기준이나 국악 요소를 완전히 다루는 자료는 아닙니다.', '- 실제 학생 대상 난이도·정답률 검증과 교사 감수는 아직 하지 않았습니다. 수업에서는 학생 수준에 맞게 안내하고 수행을 관찰해 주세요.', '- 곡 소개에서 학년군을 선택하면 연주 뒤 그림2·듣기2·개념1의 혼합 문제가 나옵니다. 음악 수첩에서는 전체 항목을 학년·단원별로 탐색합니다.', '- 듣기는 모든 비교 소리를 먼저 재생한 뒤 답을 확인합니다. 로딩·재생 실패는 오답으로 채점하지 않습니다.', '- 정답 확인 후 선택지별 오개념 피드백과 해설을 읽고, 배우기를 연 뒤 같은 문제로 돌아올 수 있습니다.', '- 활동의 체크박스는 자기 관찰용입니다. 감상·창작·신체 표현을 정답 하나로 자동 평가하지 않습니다. 활동 체크는 페이지 이동 때 초기화됩니다.', '- 학습 소리는 CC0 실제 악기 한 음 녹음을 피치 이동·시간 배치한 예시입니다. 실연 합주 녹음이나 지속음 표본은 아니며 음색마다 자연스러운 잔향과 세기 차이가 있습니다.', '', '## 학습 위계', '', '| 단원 | 학습 목표 | 먼저 배우기 |', '| --- | --- | --- |'];
 for (const lesson of LESSONS) lines.push(`| ${lesson.title} | ${lesson.goals.join(' / ')} | ${lesson.prerequisites.map(id => LESSONS.find(l => l.id === id).title).join(' · ') || '시작 단원'} |`);
 for (const grade of ['3-4', '5-6']) {
  lines.push('', `## ${grade === '3-4' ? '3~4학년' : '5~6학년'} 교육자료`, '');
  for (const lesson of LESSONS) {
   const content = lesson.levels[grade];
   lines.push(`### ${lesson.title}`, '', `관련 성취기준: ${lesson.standards[grade].join(' · ')}. 아래 내용은 관련 학습 연습이며 성취 여부 전체의 인증이 아닙니다.`, '', content.intro, '', `예시: ${content.example}`, '', `지도: ${content.guide}`, '', `유의: ${content.pitfall}`, '');
   for (const q of QUESTIONS.filter(q => q.grade === grade && q.lessonId === lesson.id)) {
    lines.push(`#### ${q.id} · ${kind[q.kind]}`, '', q.prompt, '');
    for (const [i, choice] of q.choices.entries()) lines.push(`${i + 1}. ${choice.text}${choice.visual ? ' [악보·도식 보기: 게임 음악 수첩]' : ''}`);
    lines.push('', `정답: ${q.correct + 1}. ${q.choices[q.correct].text}`, '', `해설: ${q.why}`, '');
    for (const [i, feedback] of q.misconceptions.entries()) lines.push(`- ${i + 1}번 피드백: ${feedback}`);
    if (q.audio) lines.push('', `실제 듣기 예시 ID: ${q.audio.map(c => c.id).join(' · ')}. 음원 파일·박 단위 이벤트·빠르기는 JSON 내 같은 ID에 연결됩니다.`);
    lines.push('');
   }
   const activity = ACTIVITIES.find(a => a.grade === grade && a.lessonId === lesson.id);
   lines.push(`#### ${activity.id} · 수행·성찰`, '', activity.title, '', activity.task, '', `준비물: ${activity.materials.join(' · ')}`, '');
   for (const [i, step] of activity.steps.entries()) lines.push(`${i + 1}. ${step}`);
   lines.push('', '관찰 기준:', ''); for (const checkpoint of activity.checkpoints) lines.push(`- ${checkpoint}`);
   lines.push('', `성찰: ${activity.reflection}`, '');
  }
 }
 lines.push('## 출처와 유지 관리', '', `[교육부 2022 개정 교육과정 공지](${source})`, '', '[2024 고시 별책 확인](https://www.law.go.kr/flDownload.do?flSeq=143731563)', '', '국악 용어: 국립국악원 국악사전(장단·한배). 임의 구음 예시는 특정 지역이나 실제 장단의 정형이라고 제시하지 않습니다.', '', '악기 녹음의 정확한 원문·커밋·이용 조건: `quiz-audio-provenance.md`와 `/assets/audio/quiz-v1/manifest.json`.', '', '기계 판독 원본: `public/assets/education/music-bank-120.json`. 문항과 해설의 수정 원본은 `src/quest/bank/`이며 이 문서는 `node tools/education/export-bank.mjs`로 다시 생성합니다.', '');
 const outputs = [['public/assets/education/music-bank-120.json', JSON.stringify(data, null, 2) + '\n'], ['docs/education/music-bank-120.md', lines.join('\n')]];
 for (const [path, text] of outputs) {
  if (process.argv.includes('--check')) { if ((await readFile(path, 'utf8')).replaceAll('\r\n', '\n') !== text) throw Error(`Stale export: ${path}`); }
  else { await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true }); await writeFile(path, text); }
 }
 console.log(JSON.stringify(data.counts));
} finally { await server.close(); }
