import type { Song } from "../types";

type TrackedSource = AudioBufferSourceNode | OscillatorNode;

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private backingBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private popNoise: AudioBuffer | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pendingBuffers = new Map<string, Promise<AudioBuffer>>();
  private scheduled = new Set<TrackedSource>();
  private useAudioClock = true;
  private masterLevel = 0.88;

  get ready(): boolean {
    return this.context !== null && this.context.state === "running";
  }

  get gameNow(): number {
    return this.useAudioClock && this.context ? this.context.currentTime : performance.now() / 1000;
  }

  setMasterVolume(value: number): void {
    this.masterLevel = Math.max(0, Math.min(1, value));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.masterLevel, this.context.currentTime, 0.025);
    }
  }

  async ensureReady(timeoutMs = 3000): Promise<boolean> {
    if (!this.context) this.setup();
    if (this.context?.state === "running") return true;
    const resume = this.context?.resume().then(() => this.context?.state === "running").catch(() => false) ?? Promise.resolve(false);
    const timeout = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), timeoutMs));
    return Promise.race([resume, timeout]);
  }

  async preload(song: Song): Promise<void> {
    const audible = await this.ensureReady();
    if (!audible) throw new Error("브라우저가 소리 재생을 허용하지 않았습니다.");
    await this.loadBuffer(song.backingTrack);
  }

  async preview(song: Song): Promise<void> {
    await this.preload(song);
    this.stop();
    const context = this.context!;
    const backing = this.buffers.get(song.backingTrack)!;
    const startAt = context.currentTime + 0.08;
    const previewOffset = Math.min(backing.duration - 0.5, song.leadInBeats * 60 / song.bpm);
    const duration = Math.min(12, backing.duration - previewOffset);
    const source = this.track(context.createBufferSource());
    source.buffer = backing;
    source.connect(this.backingBus!);
    source.start(startAt, Math.max(0, previewOffset), duration);
  }

  async start(song: Song): Promise<number> {
    this.stop();
    await this.preload(song);
    const context = this.context!;
    this.useAudioClock = true;
    const songStartTime = context.currentTime + 0.2;
    const source = this.track(context.createBufferSource());
    source.buffer = this.buffers.get(song.backingTrack)!;
    source.connect(this.backingBus!);
    source.start(songStartTime);
    this.scheduleCountIn(song, songStartTime);
    return songStartTime;
  }

  playPop(lane: number, accent: boolean): void {
    if (!this.ready || !this.effectsBus || !this.context || !this.popNoise) return;
    const now = this.context.currentTime + 0.002;
    const source = this.track(this.context.createBufferSource());
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.popNoise;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(760 + lane * 170, now);
    filter.Q.value = 0.72;
    const level = accent ? 0.105 : 0.068;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.13 : 0.095));
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsBus);
    source.start(now);
    source.stop(now + 0.15);
  }

  playUi(kind: "select" | "success" | "soft"): void {
    if (!this.ready || !this.effectsBus || !this.context) return;
    const pitches = kind === "success" ? [523.25, 659.25, 783.99] : kind === "select" ? [659.25, 783.99] : [440];
    pitches.forEach((frequency, index) => this.scheduleBell(frequency, this.context!.currentTime + index * 0.075, kind === "soft" ? 0.025 : 0.05));
  }

  stop(): void {
    this.scheduled.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source may already have reached its natural end.
      }
    });
    this.scheduled.clear();
  }

  async suspend(): Promise<void> {
    if (this.context?.state === "running") await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") await this.context.resume();
  }

  private setup(): void {
    this.context = new AudioContext({ latencyHint: "interactive" });
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 12;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;

    this.master = this.context.createGain();
    this.master.gain.value = this.masterLevel;
    this.backingBus = this.context.createGain();
    this.backingBus.gain.value = 0.92;
    this.effectsBus = this.context.createGain();
    this.effectsBus.gain.value = 0.48;
    this.popNoise = this.makePopNoise();

    this.backingBus.connect(this.master);
    this.effectsBus.connect(this.master);
    this.master.connect(compressor);
    compressor.connect(this.context.destination);
  }

  private async loadBuffer(path: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(path);
    if (cached) return cached;
    const pending = this.pendingBuffers.get(path);
    if (pending) return pending;
    const promise = fetch(path).then(async (response) => {
      if (!response.ok) throw new Error(`음원을 불러오지 못했습니다: ${path}`);
      const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(path, buffer);
      return buffer;
    });
    this.pendingBuffers.set(path, promise);
    try {
      return await promise;
    } finally {
      this.pendingBuffers.delete(path);
    }
  }

  private scheduleCountIn(song: Song, startAt: number): void {
    const secondsPerBeat = 60 / song.bpm;
    for (let beat = 0; beat < song.leadInBeats; beat += 1) {
      const strong = beat === song.leadInBeats - 1;
      this.scheduleBell(strong ? 1046.5 : 783.99, startAt + beat * secondsPerBeat, strong ? 0.055 : 0.032);
    }
  }

  private scheduleBell(frequency: number, when: number, level: number): void {
    if (!this.context || !this.effectsBus) return;
    const oscillator = this.track(this.context.createOscillator());
    const overtone = this.context.createOscillator();
    const gain = this.context.createGain();
    const overtoneGain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2.01;
    overtoneGain.gain.value = 0.16;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    oscillator.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(this.effectsBus);
    oscillator.start(when);
    overtone.start(when);
    oscillator.stop(when + 0.3);
    overtone.stop(when + 0.3);
  }

  private makePopNoise(): AudioBuffer {
    const duration = 0.16;
    const length = Math.floor(this.context!.sampleRate * duration);
    const buffer = this.context!.createBuffer(1, length, this.context!.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.32 + white * 0.68;
      const envelope = (1 - index / length) ** 4.6;
      data[index] = previous * envelope;
    }
    return buffer;
  }

  private track<T extends TrackedSource>(source: T): T {
    this.scheduled.add(source);
    source.addEventListener("ended", () => this.scheduled.delete(source), { once: true });
    return source;
  }
}
