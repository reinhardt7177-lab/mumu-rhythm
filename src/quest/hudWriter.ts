export interface HudElement {
  textContent: string | null;
  value?: number;
  max?: number;
}

export class HudWriter {
  private readonly elements = new Map<string, HudElement>();

  constructor(private readonly getElementById: (id: string) => HudElement | null) {}

  private get(id: string): HudElement | null {
    const cached = this.elements.get(id);
    if (cached) return cached;
    const element = this.getElementById(id);
    if (element) this.elements.set(id, element);
    return element;
  }

  text(id: string, value: string | number): void {
    const element = this.get(id);
    if (!element) return;
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
  }

  progress(id: string, value: number, max?: number): void {
    const element = this.get(id);
    if (!element || typeof element.value !== 'number' || typeof element.max !== 'number') return;
    // Changing max can clamp the live value, so compare value afterwards.
    if (max !== undefined && element.max !== max) element.max = max;
    if (element.value !== value) element.value = value;
  }
}
