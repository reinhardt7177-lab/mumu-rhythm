import { BookOpen, ChevronLeft, ChevronRight, X, createElement } from 'lucide';
import { ACTIVITIES, LESSONS, QUESTIONS } from './bank';
import type { Activity, GradeBand, Lesson, LessonId } from './bank/types';
import { visualElement } from './notation';
import type { QuizAudio } from './quizAudio';
import { QuizPanel, soundControls } from './quizPanel';

type Tab = 'learn' | 'questions' | 'activities';
let notebookId = 0;

export class MusicNotebook {
  private readonly dialog: HTMLDialogElement;
  private readonly gradeSelect: HTMLSelectElement;
  private readonly lessonSelect: HTMLSelectElement;
  private readonly body: HTMLDivElement;
  private readonly previous: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private readonly position: HTMLOutputElement;
  private readonly tabs = new Map<Tab, HTMLButtonElement>();
  private tab: Tab = 'learn';
  private index = 0;
  private readonly answers = new Map<string, number>();
  private questionOrigin: { grade: GradeBand; lesson: string; index: number } | undefined;

  constructor(private readonly player: QuizAudio) {
    const quest = document.querySelector('.quest');
    if (!quest) throw new Error('MusicNotebook requires .quest');
    const dialog = this.dialog = document.createElement('dialog');
    dialog.className = 'notebook';
    dialog.setAttribute('aria-label', '음악 수첩 96문제·24활동');
    const head = document.createElement('div'); head.className = 'notebook-head';
    const title = document.createElement('h2'); title.textContent = '음악 수첩';
    const count = document.createElement('small'); count.textContent = '96문제·24활동';
    head.append(createElement(BookOpen), title, count, this.iconButton(X, '닫기', () => this.close()));

    const filters = document.createElement('div'); filters.className = 'notebook-filters';
    this.gradeSelect = document.createElement('select');
    for (const [value, text] of [['3-4', '3~4학년'], ['5-6', '5~6학년']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; this.gradeSelect.append(option);
    }
    this.lessonSelect = document.createElement('select');
    const all = document.createElement('option'); all.value = ''; all.textContent = '전체'; this.lessonSelect.append(all);
    for (const lesson of LESSONS) {
      const option = document.createElement('option'); option.value = lesson.id; option.textContent = lesson.title; this.lessonSelect.append(option);
    }
    for (const [text, select] of [['학년', this.gradeSelect], ['단원', this.lessonSelect]] as const) {
      const label = document.createElement('label');
      const name = document.createElement('span'); name.textContent = text;
      label.append(name, select); filters.append(label);
      select.addEventListener('change', () => { this.index = 0; this.render(); });
    }

    this.body = document.createElement('div'); this.body.className = 'notebook-body';
    this.body.id = `music-notebook-body-${++notebookId}`;
    this.body.setAttribute('role', 'tabpanel'); this.body.tabIndex = 0;
    const tabs = document.createElement('div'); tabs.className = 'notebook-tabs';
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '수첩 보기');
    for (const [key, text] of [['learn', '배우기'], ['questions', '문제'], ['activities', '활동']] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.id = `${this.body.id}-${key}`; button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', this.body.id);
      button.onclick = () => this.selectTab(key);
      button.addEventListener('keydown', event => {
        const keys = [...this.tabs.keys()], current = keys.indexOf(key);
        const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!offset && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        const target = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys[keys.length - 1] : keys[(current + offset + keys.length) % keys.length];
        this.selectTab(target); this.tabs.get(target)!.focus();
      });
      this.tabs.set(key, button); tabs.append(button);
    }

    const pager = document.createElement('div'); pager.className = 'notebook-pager';
    pager.setAttribute('aria-label', '수첩 페이지');
    this.previous = this.iconButton(ChevronLeft, '이전', () => { this.index--; this.render(); });
    this.next = this.iconButton(ChevronRight, '다음', () => { this.index++; this.render(); });
    this.position = document.createElement('output'); this.position.setAttribute('aria-live', 'polite');
    pager.append(this.previous, this.position, this.next);
    dialog.append(head, filters, tabs, this.body, pager);
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.addEventListener('close', () => { if (!dialog.open) this.cleanup(); });
    quest.append(dialog);
  }

  open(grade: GradeBand, lessonId?: LessonId): void {
    this.answers.clear(); this.questionOrigin = undefined;
    this.gradeSelect.value = grade;
    this.lessonSelect.value = LESSONS.some(lesson => lesson.id === lessonId) ? lessonId! : '';
    this.tab = 'learn'; this.index = 0; this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    this.cleanup();
    if (this.dialog.open) this.dialog.close();
  }

  private cleanup(): void {
    this.player.stop(); this.body.replaceChildren(); this.body.scrollTop = 0;
    this.position.textContent = ''; this.answers.clear(); this.questionOrigin = undefined;
  }

  private iconButton(icon: typeof X, label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'icon';
    button.title = label; button.setAttribute('aria-label', label); button.append(createElement(icon)); button.onclick = action;
    return button;
  }

  private selectTab(tab: Tab): void {
    if (tab !== 'learn') this.questionOrigin = undefined;
    this.tab = tab; this.index = 0; this.render();
  }

  private text(tag: 'h3' | 'h4' | 'p', value: string): HTMLElement {
    const element = document.createElement(tag); element.textContent = value; this.body.append(element); return element;
  }

  private render(): void {
    this.player.stop(); this.body.replaceChildren(); this.body.scrollTop = 0;
    const grade = this.gradeSelect.value as GradeBand, lessonId = this.lessonSelect.value;
    const lessons = LESSONS.filter(lesson => !lessonId || lesson.id === lessonId);
    const questions = QUESTIONS.filter(question => question.grade === grade && (!lessonId || question.lessonId === lessonId));
    const activities = ACTIVITIES.filter(activity => activity.grade === grade && (!lessonId || activity.lessonId === lessonId));
    const total = this.tab === 'learn' ? lessons.length : this.tab === 'questions' ? questions.length : activities.length;
    this.index = Math.max(0, Math.min(this.index, total - 1));
    for (const [key, button] of this.tabs) {
      button.setAttribute('aria-selected', String(this.tab === key)); button.tabIndex = this.tab === key ? 0 : -1;
    }
    this.body.setAttribute('aria-labelledby', this.tabs.get(this.tab)!.id);
    const name = this.tab === 'learn' ? '배우기' : this.tab === 'questions' ? '문제' : '활동';
    this.position.textContent = `${name} ${total ? this.index + 1 : 0} / ${total}`;
    this.previous.disabled = total === 0 || this.index === 0; this.next.disabled = total === 0 || this.index === total - 1;
    if (!total) { this.text('p', '이 학년과 단원에 맞는 자료가 없어요.'); return; }

    if (this.tab === 'learn') {
      const lesson = lessons[this.index], content = lesson.levels[grade];
      if (this.questionOrigin) {
        const back = document.createElement('button'); back.type = 'button'; back.className = 'lesson-link';
        const label = document.createElement('span'); label.textContent = '돌아가기';
        back.append(createElement(ChevronLeft), label);
        back.onclick = () => {
          const origin = this.questionOrigin;
          if (!origin) return;
          this.gradeSelect.value = origin.grade; this.lessonSelect.value = origin.lesson;
          this.tab = 'questions'; this.index = origin.index; this.questionOrigin = undefined; this.render();
          (this.body.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? this.body).focus();
        };
        this.body.append(back);
      }
      this.text('h3', lesson.title); this.text('p', content.intro);
      this.text('h4', '예시'); this.text('p', content.example);
      if (content.visual) this.body.append(visualElement(content.visual));
      if (content.audio?.length) this.body.append(soundControls(this.player, content.audio));
      this.text('h4', '함께 해요'); this.text('p', content.guide);
      this.text('h4', '살펴볼 점'); this.text('p', content.pitfall);
      if (lesson.prerequisites.length) {
        this.text('h4', '먼저 해 볼 수업');
        const links = document.createElement('nav'); links.setAttribute('aria-label', '선수 수업');
        for (const id of lesson.prerequisites) {
          const prerequisite = LESSONS.find(item => item.id === id);
          if (!prerequisite) continue;
          const link = document.createElement('button'); link.type = 'button'; link.className = 'lesson-link'; link.textContent = prerequisite.title;
          link.onclick = () => { this.lessonSelect.value = id; this.index = 0; this.render(); this.body.focus(); };
          links.append(link);
        }
        this.body.append(links);
      }
      this.teacherDetails(lesson, grade);
    } else if (this.tab === 'questions') {
      const root = document.createElement('div'); this.body.append(root);
      const question = questions[this.index];
      const panel = new QuizPanel(root, this.player, id => {
        this.questionOrigin = { grade, lesson: lessonId, index: this.index };
        this.lessonSelect.value = id; this.selectTab('learn');
        this.body.focus();
      }, 'study');
      panel.render([question]);
      const answer = this.answers.get(question.id);
      for (const input of root.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
        if (answer !== undefined) input.checked = Number(input.value) === answer;
        input.addEventListener('change', () => { if (input.checked) this.answers.set(question.id, Number(input.value)); });
      }
      const check = document.createElement('button'); check.type = 'button'; check.textContent = '확인';
      const result = document.createElement('p'); result.setAttribute('role', 'status');
      check.onclick = () => { this.player.stop(); result.textContent = panel.grade(); };
      this.body.append(check, result);
    } else {
      this.renderActivity(activities[this.index]);
    }
  }

  private teacherDetails(lesson: Lesson, grade: GradeBand): void {
    const details = document.createElement('details'), summary = document.createElement('summary');
    summary.textContent = '교사용 교육과정 근거'; details.append(summary);
    const standards = document.createElement('p'); standards.textContent = lesson.standards[grade].join(' · '); details.append(standards);
    const scope = document.createElement('p');
    scope.textContent = '2024 일부개정 포함 음악과 교육과정 9~16쪽 성취기준·22쪽 음악 요소표. 이 수업은 해당 기준의 일부를 연습해요.';
    details.append(scope);
    for (const [label, url] of [
      ['교육부 2022 교육과정 고시', 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0302'],
      ['2024 일부개정 고시', 'https://www.law.go.kr/flDownload.do?flSeq=143731563'],
      ['120항목 교육자료·해설 원본 (JSON)', '/assets/education/music-bank-120.json'],
    ]) {
      const line = document.createElement('p'), link = document.createElement('a'); link.textContent = label;
      link.setAttribute('href', url); link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer');
      line.append(link); details.append(line);
    }
    this.body.append(details);
  }

  private renderActivity(activity: Activity): void {
    this.text('h3', activity.title); this.text('p', activity.task);
    for (const [heading, items, ordered] of [['준비물', activity.materials, false], ['활동 순서', activity.steps, true]] as const) {
      this.text('h4', heading);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      for (const item of items) { const row = document.createElement('li'); row.textContent = item; list.append(row); }
      this.body.append(list);
    }
    this.text('h4', '스스로 살펴보기');
    const list = document.createElement('ul');
    for (const checkpoint of activity.checkpoints) {
      const row = document.createElement('li'), label = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      const text = document.createElement('span'); text.textContent = checkpoint;
      label.append(checkbox, text); row.append(label); list.append(row);
    }
    this.body.append(list); this.text('h4', '돌아보기'); this.text('p', activity.reflection);
  }
}
