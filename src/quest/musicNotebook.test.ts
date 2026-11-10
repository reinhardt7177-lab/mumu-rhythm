import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuizAudio } from './quizAudio';

vi.mock('lucide', () => ({ createElement: () => document.createElement('svg'), BookOpen: [], X: [], ChevronLeft: [], ChevronRight: [] }));
vi.mock('./notation', () => ({ visualElement: () => document.createElement('figure') }));
vi.mock('./bank', async () => ({
  ...await import('./bank/lessons'), ...await import('./bank/activities'),
  QUESTIONS: [{ id: 'one', grade: '3-4', lessonId: 'pulse' }, { id: 'two', grade: '3-4', lessonId: 'pulse' }, { id: 'three', grade: '5-6', lessonId: 'pitch' }],
}));
vi.mock('./quizPanel', () => ({
  soundControls: () => document.createElement('div'),
  QuizPanel: class {
    constructor(private root: HTMLElement, _player: QuizAudio, private onLesson: (id: string) => void) {}
    render(questions: { id: string; lessonId: string }[]) {
      this.root.textContent = questions[0].id;
      for (const value of ['0', '1']) {
        const input = document.createElement('input'); input.type = 'radio'; input.value = value; this.root.append(input);
      }
      const button = document.createElement('button'); button.textContent = '수업 보기';
      button.onclick = () => this.onLesson(questions[0].lessonId); this.root.append(button);
    }
    grade() { return '확인했어요'; }
  },
}));

class Element extends EventTarget {
  children: Element[] = [];
  attributes = new Map<string, string>();
  style: Record<string, string> = {};
  className = ''; id = ''; value = ''; type = ''; title = ''; tabIndex = 0;
  disabled = false; hidden = false; checked = false; open = false;
  focused = false;
  private text = '';
  onclick: (() => void) | null = null;
  constructor(readonly tagName: string) { super(); }
  set textContent(value: string) { this.text = value; this.children = []; }
  get textContent(): string { return this.text + this.children.map(child => child.textContent).join(''); }
  append(...children: Element[]) { this.children.push(...children); }
  replaceChildren(...children: Element[]) { this.text = ''; this.children = children; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  querySelectorAll(selector: string): Element[] {
    return all(this).filter(node => node.tagName === 'input' && node.type === 'radio' && (!selector.includes(':checked') || node.checked));
  }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
  focus() { this.focused = true; }
  click() { if (!this.disabled) { this.onclick?.(); this.dispatchEvent(new Event('click')); } }
}
const all = (root: Element): Element[] => [root, ...root.children.flatMap(all)];
const button = (root: Element, name: string) => all(root).find(node => node.tagName === 'button' && (node.textContent === name || node.getAttribute('aria-label') === name))!;

afterEach(() => vi.unstubAllGlobals());

describe('MusicNotebook navigation and audio lifetime', () => {
  async function setup() {
    const quest = new Element('main');
    vi.stubGlobal('document', { createElement: (tag: string) => new Element(tag), querySelector: (selector: string) => selector === '.quest' ? quest : null });
    const modules = import.meta.glob<{ MusicNotebook: new (player: QuizAudio) => { open(grade: string, lesson?: string): void; close(): void } }>('./musicNotebook.ts', { eager: true });
    expect(modules['./musicNotebook.ts']?.MusicNotebook).toBeTypeOf('function');
    const stop = vi.fn();
    const notebook = new modules['./musicNotebook.ts'].MusicNotebook({ stop } as unknown as QuizAudio);
    return { quest, notebook, stop, dialog: quest.children[0] };
  }

  it('opens an owned native dialog with independent grade and all twelve lesson filters', async () => {
    const { dialog, notebook } = await setup(); notebook.open('5-6', 'pitch');
    expect(dialog.tagName).toBe('dialog'); expect(dialog.open).toBe(true);
    expect(all(dialog).find(node => node.tagName === 'h2')?.textContent).toBe('음악 수첩');
    expect(all(dialog).find(node => node.tagName === 'small')?.textContent).toBe('96문제·24활동');
    expect(all(dialog).every(node => Object.keys(node.style).length === 0)).toBe(true);
    const selects = all(dialog).filter(node => node.tagName === 'select');
    expect(selects.map(node => node.value)).toEqual(['5-6', 'pitch']);
    expect(selects[1].children).toHaveLength(13);
  });

  it('links prerequisites and exposes grade-matched standards with the official source in teacher details', async () => {
    const { dialog, notebook } = await setup(); notebook.open('5-6', 'melody');
    const details = all(dialog).find(node => node.tagName === 'details');
    expect(details?.textContent).toContain('[6음03-03]');
    expect(all(details!).some(node => node.tagName === 'a' && node.getAttribute('href')?.includes('www.moe.go.kr/'))).toBe(true);
    button(dialog, '소리의 높낮이').click();
    expect(all(dialog).find(node => node.tagName === 'h3')?.textContent).toBe('소리의 높낮이');
  });

  it('returns from a lesson to the same unfiltered question and selected answer with safe focus', async () => {
    const { dialog, notebook } = await setup(); notebook.open('3-4'); button(dialog, '문제').click(); button(dialog, '다음').click();
    const selected = all(dialog).filter(node => node.type === 'radio')[1]; selected.checked = true; selected.dispatchEvent(new Event('change'));
    button(dialog, '수업 보기').click(); button(dialog, '돌아가기').click();
    const selects = all(dialog).filter(node => node.tagName === 'select');
    expect(selects.map(node => node.value)).toEqual(['3-4', '']);
    expect(all(dialog).find(node => node.className === 'notebook-pager')?.textContent).toContain('2 / 2');
    const restored = all(dialog).filter(node => node.type === 'radio')[1];
    expect(restored.checked).toBe(true); expect(restored.focused).toBe(true);
    expect(all(dialog).find(node => node.className === 'notebook-body')?.textContent).toContain('two');
  });

  it('shows one question at a time with real filtered counts and stops at navigation boundaries', async () => {
    const { dialog, notebook, stop } = await setup(); notebook.open('3-4', 'pulse');
    button(dialog, '문제').click();
    const body = all(dialog).find(node => node.className === 'notebook-body')!;
    const pager = all(dialog).find(node => node.className === 'notebook-pager')!;
    expect(body.textContent).toContain('one'); expect(body.textContent).not.toContain('two'); expect(pager.textContent).toContain('1 / 2');
    const count = stop.mock.calls.length;
    button(dialog, '다음').click();
    expect(stop.mock.calls.length).toBeGreaterThan(count); expect(body.textContent).toContain('two');
    expect(pager.textContent).toContain('2 / 2'); expect(button(dialog, '다음').disabled).toBe(true);
    button(dialog, '확인').click(); expect(body.textContent).toContain('확인했어요');
    button(dialog, '수업 보기').click(); expect(body.textContent).not.toContain('two');
    expect(button(dialog, '배우기').getAttribute('aria-selected')).toBe('true');
  });

  it('handles empty filters, activity self-checks and native cancellation without leaving audio', async () => {
    const { dialog, notebook, stop } = await setup(); notebook.open('3-4', 'pulse');
    button(dialog, '활동').click();
    expect(all(dialog).filter(node => node.type === 'checkbox').length).toBeGreaterThanOrEqual(2);
    button(dialog, '문제').click();
    const selects = all(dialog).filter(node => node.tagName === 'select');
    selects[0].value = '5-6'; const count = stop.mock.calls.length;
    selects[0].dispatchEvent(new Event('change')); expect(stop.mock.calls.length).toBeGreaterThan(count);
    expect(dialog.textContent).toContain('없어요'); expect(button(dialog, '다음').disabled).toBe(true);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true })); expect(dialog.open).toBe(false);
    expect(all(dialog).find(node => node.className === 'notebook-body')?.children).toHaveLength(0);
    notebook.open('3-4'); expect(dialog.open).toBe(true); notebook.close(); expect(dialog.open).toBe(false);
  });
});
