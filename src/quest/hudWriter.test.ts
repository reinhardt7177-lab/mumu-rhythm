import { describe, expect, it } from 'vitest';
import { HudWriter } from './hudWriter';

class TextElement {
  private content: string | null;
  textWrites = 0;

  constructor(text: string | null = '') { this.content = text; }
  get textContent() { return this.content; }
  set textContent(value: string | null) { this.textWrites++; this.content = value; }
}

class ProgressElement extends TextElement {
  private current = 0;
  private limit = 1;
  writes: string[] = [];

  get value() { return this.current; }
  set value(value: number) {
    this.writes.push('value');
    this.current = Math.max(0, Math.min(value, this.limit));
  }
  get max() { return this.limit; }
  set max(value: number) {
    this.writes.push('max');
    this.limit = value;
    this.current = Math.min(this.current, value);
  }
}

describe('HudWriter', () => {
  it('writes changed text and skips identical live text, including the first call', () => {
    const element = new TextElement('ready');
    const hud = new HudWriter(() => element);
    hud.text('score', 'ready');
    expect(element.textWrites).toBe(0);
    hud.text('score', 42);
    hud.text('score', '42');
    expect(element.textContent).toBe('42');
    expect(element.textWrites).toBe(1);
    hud.text('score', '');
    expect(element.textContent).toBe('');
    expect(element.textWrites).toBe(2);
  });

  it('restores text changed by another UI writer without trusting its last input', () => {
    const element = new TextElement(null);
    const hud = new HudWriter(() => element);
    hud.text('story', 'battle');
    element.textContent = 'home';
    hud.text('story', 'battle');
    expect(element.textContent).toBe('battle');
    expect(element.textWrites).toBe(3);
    element.textContent = 'select';
    hud.text('story', 'select');
    expect(element.textWrites).toBe(4);
  });

  it('lazily caches each found element across both writer methods', () => {
    const score = new TextElement();
    const progress = new ProgressElement();
    const lookups: string[] = [];
    const hud = new HudWriter(id => {
      lookups.push(id);
      return id === 'score' ? score : progress;
    });
    expect(lookups).toEqual([]);
    hud.text('score', '1');
    hud.text('score', '2');
    hud.progress('progress', 0.5);
    hud.text('progress', 'half');
    hud.progress('progress', 0.75);
    expect(lookups).toEqual(['score', 'progress']);
    expect(score.textContent).toBe('2');
    expect(progress.value).toBe(0.75);
  });

  it('updates only changed progress properties and preserves an omitted max', () => {
    const element = new ProgressElement();
    const hud = new HudWriter(() => element);
    hud.progress('hp', 0, 1);
    expect(element.writes).toEqual([]);
    hud.progress('hp', 80, 100);
    hud.progress('hp', 80, 100);
    expect(element.writes).toEqual(['max', 'value']);
    hud.progress('hp', 60);
    expect(element.max).toBe(100);
    expect(element.value).toBe(60);
    expect(element.writes).toEqual(['max', 'value', 'value']);
    hud.progress('hp', 60, 120);
    expect(element.writes).toEqual(['max', 'value', 'value', 'max']);
  });

  it('compares live progress after external writes to either property', () => {
    const element = new ProgressElement();
    const hud = new HudWriter(() => element);
    hud.progress('hp', 80, 100);
    element.max = 200;
    element.value = 20;
    element.writes = [];
    hud.progress('hp', 80, 100);
    expect(element.max).toBe(100);
    expect(element.value).toBe(80);
    expect(element.writes).toEqual(['max', 'value']);
    element.max = 120;
    element.value = 60;
    element.writes = [];
    hud.progress('hp', 60, 120);
    expect(element.writes).toEqual([]);
  });

  it('sets max before value when raising a limit and reads value after lowering it', () => {
    const element = new ProgressElement();
    const hud = new HudWriter(() => element);
    hud.progress('hp', 80, 100);
    expect(element.value).toBe(80);
    expect(element.writes).toEqual(['max', 'value']);
    element.writes = [];
    hud.progress('hp', 40, 40);
    expect(element.value).toBe(40);
    expect(element.writes).toEqual(['max']);
    hud.progress('hp', 0);
    expect(element.value).toBe(0);
    expect(element.writes).toEqual(['max', 'value']);
  });

  it('ignores missing elements and finds elements inserted after a miss', () => {
    let element: ProgressElement | null = null;
    const hud = new HudWriter(() => element);
    expect(() => {
      hud.text('late', 'loading');
      hud.progress('late', 50, 100);
    }).not.toThrow();
    element = new ProgressElement();
    hud.text('late', 'ready');
    hud.progress('late', 50, 100);
    expect(element.textContent).toBe('ready');
    expect(element.value).toBe(50);
  });

  it('does not attach progress properties to a text-only element', () => {
    const element = new TextElement('score');
    const hud = new HudWriter(() => element);
    hud.progress('score', 50, 100);
    expect('value' in element).toBe(false);
    expect('max' in element).toBe(false);
    expect(element.textContent).toBe('score');
  });
});
