import type { HitBank, Song } from "../types";

type TrackedSource = AudioBufferSourceNode | OscillatorNode;

interface HitSpriteDefinition {
  path: string;
  firstMidi: number;
  lastMidi: number;
  firstOffset: number;
  slotSeconds: number;
}

const HIT_SPRITES: Record<HitBank, HitSpriteDefinition> = {
  piano: { path: "/assets/audio/v3/hits/piano.ogg", firstMidi: 48, lastMidi: 84, firstOffset: 0.25, slotSeconds: 1.25 },
  violin: { path: "/assets/audio/v3/hits/violin.ogg", firstMidi: 48, lastMidi: 84, firstOffset: 0.25, slotSeconds: 1.25 },
  trumpet: { path: "/assets/audio/v3/hits/trumpet.ogg", firstMidi: 48, lastMidi: 84, firstOffset: 0.25, slotSeconds: 1.25 },
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private backingBus: GainNode | null = null;
  private playerBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private hitReverb: ConvolverNode | null = null;
  private hitReverbReturn: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pendingBuffers = new Map<string, Promise<AudioBuffer>>();
  private scheduled = new Set<TrackedSource>();
  private songStartTime = 0;
  private useAudioClock = true;

  get ready(): boolean {
    return this.context !== null && this.context.state === "running";
  }

  get now(): number {
    return this.context?.currentTime ?? 0;
  }

  get gameNow(): number {
    return this.useAudioClock && this.context ? this.context.currentTime : performance.now() / 1000;
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
    await Promise.all([
      this.loadBuffer(song.backingTrack),
      this.loadBuffer(HIT_SPRITES[song.hitBank].path),
    ]);
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
    this.songStartTime = context.currentTime + 0.2;
    const source = this.track(context.createBufferSource());
    source.buffer = this.buffers.get(song.backingTrack)!;
    source.connect(this.backingBus!);
    source.start(this.songStartTime);
    this.scheduleCountIn(song, this.songStartTime);
    return this.songStartTime;
  }

  playHit(midi: number, bank: HitBank, velocity = 1): void {
    if (!this.ready || !this.playerBus || !this.context) return;
    const definition = HIT_SPRITES[bank];
    const buffer = this.buffers.get(definition.path);
    if (!buffer) return;
    const pitch = Math.max(definition.firstMidi, Math.min(definition.lastMidi, midi));
    const offset = definition.firstOffset + (pitch - definition.firstMidi) * definition.slotSeconds;
    const now = this.context.currentTime + 0.003;
    const source = this.track(this.context.createBufferSource());
    const gain = this.context.createGain();
    const level = Math.min(1.08, Math.max(0.2, velocity)) * (bank === "trumpet" ? 0.56 : 0.68);
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.008);
    gain.gain.setValueAtTime(level * 0.82, now + 0.52);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);
    source.connect(gain);
    gain.connect(this.playerBus);
    source.start(now, offset, 0.92);
    source.stop(now + 0.93);
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
    compressor.threshold.value = -12;
    compressor.knee.value = 14;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;

    this.master = this.context.createGain();
    this.master.gain.value = 0.88;
    this.backingBus = this.context.createGain();
    this.backingBus.gain.value = 0.76;
    this.playerBus = this.context.createGain();
    this.playerBus.gain.value = 0.92;
    this.effectsBus = this.context.createGain();
    this.effectsBus.gain.value = 0.5;

    this.hitReverb = this.context.createConvolver();
    this.hitReverb.buffer = this.makeImpulse(1.15, 3.4);
    this.hitReverbReturn = this.context.createGain();
    this.hitReverbReturn.gain.value = 0.09;

    this.backingBus.connect(this.master);
    this.playerBus.connect(this.master);
    this.playerBus.connect(this.hitReverb);
    this.effectsBus.connect(this.master);
    this.hitReverb.connect(this.hitReverbReturn);
    this.hitReverbReturn.connect(this.master);
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
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2.01;
    const overtoneGain = this.context.createGain();
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

  private track<T extends TrackedSource>(source: T): T {
    this.scheduled.add(source);
    source.addEventListener("ended", () => this.scheduled.delete(source), { once: true });
    return source;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(this.context!.sampleRate * seconds);
    const impulse = this.context!.createBuffer(2, length, this.context!.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
      }
    }
    return impulse;
  }
}
