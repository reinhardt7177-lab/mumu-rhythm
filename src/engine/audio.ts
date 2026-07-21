import type { MelodyNote, Song, SoundWorld } from "../types";

type AudioNodeWithStop = AudioBufferSourceNode | OscillatorNode;
type InstrumentName =
  | "piano"
  | "celesta"
  | "flute"
  | "strings"
  | "glockenspiel"
  | "violin"
  | "trumpet"
  | "timpani";

interface SampleDefinition {
  midi: number;
  path: string;
}

interface LoadedSample extends SampleDefinition {
  buffer: AudioBuffer;
}

const SAMPLE_ROOT = "/assets/audio/instruments";
const SAMPLE_MANIFEST: Record<InstrumentName, SampleDefinition[]> = {
  piano: [
    { midi: 36, path: `${SAMPLE_ROOT}/piano/C2.mp3` },
    { midi: 41, path: `${SAMPLE_ROOT}/piano/F2.mp3` },
    { midi: 45, path: `${SAMPLE_ROOT}/piano/A2.mp3` },
    { midi: 48, path: `${SAMPLE_ROOT}/piano/C3.mp3` },
    { midi: 53, path: `${SAMPLE_ROOT}/piano/F3.mp3` },
    { midi: 57, path: `${SAMPLE_ROOT}/piano/A3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/piano/C4.mp3` },
    { midi: 64, path: `${SAMPLE_ROOT}/piano/E4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/piano/G4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/piano/C5.mp3` },
  ],
  celesta: [
    { midi: 60, path: `${SAMPLE_ROOT}/celesta/C4.mp3` },
    { midi: 64, path: `${SAMPLE_ROOT}/celesta/E4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/celesta/G4.mp3` },
    { midi: 69, path: `${SAMPLE_ROOT}/celesta/A4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/celesta/C5.mp3` },
  ],
  flute: [
    { midi: 59, path: `${SAMPLE_ROOT}/flute/B3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/flute/C4.mp3` },
    { midi: 64, path: `${SAMPLE_ROOT}/flute/E4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/flute/G4.mp3` },
    { midi: 69, path: `${SAMPLE_ROOT}/flute/A4.mp3` },
    { midi: 71, path: `${SAMPLE_ROOT}/flute/B4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/flute/C5.mp3` },
  ],
  strings: [
    { midi: 48, path: `${SAMPLE_ROOT}/strings/C3.mp3` },
    { midi: 55, path: `${SAMPLE_ROOT}/strings/G3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/strings/C4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/strings/G4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/strings/C5.mp3` },
  ],
  glockenspiel: [
    { midi: 60, path: `${SAMPLE_ROOT}/glockenspiel/C4.mp3` },
    { midi: 64, path: `${SAMPLE_ROOT}/glockenspiel/E4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/glockenspiel/G4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/glockenspiel/C5.mp3` },
    { midi: 76, path: `${SAMPLE_ROOT}/glockenspiel/E5.mp3` },
  ],
  violin: [
    { midi: 48, path: `${SAMPLE_ROOT}/violin/C3.mp3` },
    { midi: 55, path: `${SAMPLE_ROOT}/violin/G3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/violin/C4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/violin/G4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/violin/C5.mp3` },
  ],
  trumpet: [
    { midi: 48, path: `${SAMPLE_ROOT}/trumpet/C3.mp3` },
    { midi: 55, path: `${SAMPLE_ROOT}/trumpet/G3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/trumpet/C4.mp3` },
    { midi: 67, path: `${SAMPLE_ROOT}/trumpet/G4.mp3` },
    { midi: 72, path: `${SAMPLE_ROOT}/trumpet/C5.mp3` },
  ],
  timpani: [
    { midi: 36, path: `${SAMPLE_ROOT}/timpani/C2.mp3` },
    { midi: 43, path: `${SAMPLE_ROOT}/timpani/G2.mp3` },
    { midi: 48, path: `${SAMPLE_ROOT}/timpani/C3.mp3` },
    { midi: 55, path: `${SAMPLE_ROOT}/timpani/G3.mp3` },
    { midi: 60, path: `${SAMPLE_ROOT}/timpani/C4.mp3` },
  ],
};

const INSTRUMENT_LEVEL: Record<InstrumentName, number> = {
  piano: 0.78,
  celesta: 0.62,
  flute: 0.54,
  strings: 0.42,
  glockenspiel: 0.5,
  violin: 0.48,
  trumpet: 0.42,
  timpani: 0.46,
};

const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

function leadInstrument(world: SoundWorld): InstrumentName {
  if (world === "starlight") return "celesta";
  if (world === "moonlight") return "flute";
  if (world === "cancan" || world === "hungarian") return "violin";
  if (world === "gallop") return "trumpet";
  return "piano";
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private backingBus: GainNode | null = null;
  private playerBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private sampleBanks = new Map<InstrumentName, LoadedSample[]>();
  private sampleLoadPromise: Promise<void> | null = null;
  private backingBuffers = new Map<string, AudioBuffer>();
  private backingLoadPromises = new Map<string, Promise<AudioBuffer>>();
  private scheduledNodes = new Set<AudioNodeWithStop>();
  private activePreview = false;
  private songStartTime = 0;
  private useAudioClock = true;

  get ready(): boolean {
    return this.context !== null && this.context.state === "running";
  }

  get now(): number {
    return this.context?.currentTime ?? 0;
  }

  get startTime(): number {
    return this.songStartTime;
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

  private setup(): void {
    this.context = new AudioContext({ latencyHint: "interactive" });
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.24;

    this.master = this.context.createGain();
    this.master.gain.value = 0.82;
    this.backingBus = this.context.createGain();
    this.backingBus.gain.value = 0.7;
    this.playerBus = this.context.createGain();
    this.playerBus.gain.value = 0.96;
    this.effectsBus = this.context.createGain();
    this.effectsBus.gain.value = 0.38;

    this.reverb = this.context.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.65, 3.1);
    this.reverbReturn = this.context.createGain();
    this.reverbReturn.gain.value = 0.14;

    this.backingBus.connect(this.master);
    this.playerBus.connect(this.master);
    this.effectsBus.connect(this.master);
    this.backingBus.connect(this.reverb);
    this.playerBus.connect(this.reverb);
    this.reverb.connect(this.reverbReturn);
    this.reverbReturn.connect(this.master);
    this.master.connect(compressor);
    compressor.connect(this.context.destination);
  }

  private async loadSamples(): Promise<void> {
    if (this.sampleLoadPromise) return this.sampleLoadPromise;
    const context = this.context!;
    this.sampleLoadPromise = Promise.all(
      (Object.entries(SAMPLE_MANIFEST) as [InstrumentName, SampleDefinition[]][]).map(async ([instrument, definitions]) => {
        const loaded = await Promise.all(definitions.map(async (definition) => {
          const response = await fetch(definition.path);
          if (!response.ok) throw new Error(`악기 샘플을 불러오지 못했습니다: ${definition.path}`);
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          return { ...definition, buffer };
        }));
        this.sampleBanks.set(instrument, loaded);
      }),
    ).then(() => undefined);
    return this.sampleLoadPromise;
  }

  private async loadBacking(song: Song): Promise<AudioBuffer | null> {
    if (!song.backingTrack) return null;
    const cached = this.backingBuffers.get(song.backingTrack);
    if (cached) return cached;
    const pending = this.backingLoadPromises.get(song.backingTrack);
    if (pending) return pending;
    const context = this.context!;
    const promise = fetch(song.backingTrack).then(async (response) => {
      if (!response.ok) throw new Error(`반주를 불러오지 못했습니다: ${song.backingTrack}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      this.backingBuffers.set(song.backingTrack!, buffer);
      return buffer;
    });
    this.backingLoadPromises.set(song.backingTrack, promise);
    try {
      return await promise;
    } finally {
      this.backingLoadPromises.delete(song.backingTrack);
    }
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const context = this.context!;
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = (1 - index / length) ** decay;
        data[index] = (Math.random() * 2 - 1) * envelope * (channel === 0 ? 1 : 0.92);
      }
    }
    return impulse;
  }

  private track<T extends AudioNodeWithStop>(source: T): T {
    this.scheduledNodes.add(source);
    source.addEventListener("ended", () => this.scheduledNodes.delete(source), { once: true });
    return source;
  }

  stop(): void {
    this.scheduledNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // The source may have already ended.
      }
    });
    this.scheduledNodes.clear();
    this.activePreview = false;
  }

  async suspend(): Promise<void> {
    if (this.context?.state === "running") await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") await this.context.resume();
  }

  async preview(song: Song): Promise<void> {
    const audible = await this.ensureReady();
    if (!audible) throw new Error("오디오 재생이 아직 허용되지 않았습니다.");
    await this.loadSamples();
    const backing = await this.loadBacking(song);
    this.stop();
    this.activePreview = true;
    const startAt = this.now + 0.1;
    const secondsPerBeat = 60 / song.bpm;
    const notes = song.melody.slice(0, 12);
    const previewStartBeat = notes[0]?.beat ?? song.leadInBeats;
    const durationBeats = Math.min(16, song.beatsPerBar * 4);

    if (backing && this.context && this.backingBus) {
      const offsetSeconds = Math.min(backing.duration - 0.2, previewStartBeat * secondsPerBeat);
      const durationSeconds = Math.min(11, backing.duration - offsetSeconds);
      const source = this.track(this.context.createBufferSource());
      source.buffer = backing;
      source.connect(this.backingBus);
      source.start(startAt, Math.max(0, offsetSeconds), durationSeconds);
      window.setTimeout(() => {
        if (this.activePreview) this.stop();
      }, durationSeconds * 1000 + 300);
      return;
    }

    this.scheduleHarmony(song, startAt, previewStartBeat, previewStartBeat + durationBeats, previewStartBeat);
    this.scheduleOrchestration(song, startAt, previewStartBeat, previewStartBeat + durationBeats, previewStartBeat);
    notes.forEach((note) => {
      const when = startAt + (note.beat - previewStartBeat) * secondsPerBeat;
      this.scheduleLead(note, when, secondsPerBeat, song.soundWorld, 0.4, this.backingBus!);
    });

    window.setTimeout(() => {
      if (this.activePreview) this.stop();
    }, durationBeats * secondsPerBeat * 1000 + 300);
  }

  async start(song: Song): Promise<number> {
    this.stop();
    let audible = await this.ensureReady();
    let backing: AudioBuffer | null = null;
    if (audible) {
      try {
        await this.loadSamples();
      } catch {
        audible = false;
      }
    }
    if (audible && song.backingTrack) {
      try {
        backing = await this.loadBacking(song);
      } catch (error) {
        console.error("완성 반주를 불러오지 못해 실시간 반주로 전환합니다.", error);
      }
    }

    this.useAudioClock = audible;
    const startAt = audible ? this.now + 0.42 : performance.now() / 1000 + 0.12;
    this.songStartTime = startAt;
    if (!audible) return startAt;

    this.scheduleCountIn(song, startAt);
    if (backing && this.context && this.backingBus) {
      const source = this.track(this.context.createBufferSource());
      source.buffer = backing;
      source.connect(this.backingBus);
      source.start(startAt);
      return startAt;
    }
    this.scheduleHarmony(song, startAt, 0, song.totalBeats, 0);
    this.scheduleOrchestration(song, startAt, 0, song.totalBeats, 0);
    const secondsPerBeat = 60 / song.bpm;
    song.melody.forEach((note) => {
      const when = startAt + note.beat * secondsPerBeat;
      this.scheduleLead(note, when, secondsPerBeat, song.soundWorld, 0.16, this.backingBus!);
    });
    return startAt;
  }

  playHit(midi: number, world: SoundWorld, velocity = 1): void {
    if (!this.ready || !this.playerBus || this.sampleBanks.size === 0) return;
    this.scheduleSample(leadInstrument(world), midi, this.now + 0.004, 0.72, Math.min(1.05, velocity), this.playerBus);
  }

  playUi(kind: "select" | "success" | "soft"): void {
    if (!this.ready || !this.effectsBus) return;
    const now = this.now;
    const notes = kind === "success" ? [67, 72, 76] : kind === "select" ? [67, 72] : [60];
    if (this.sampleBanks.size > 0) {
      notes.forEach((midi, index) => {
        this.scheduleSample("celesta", midi, now + index * 0.075, 0.35, kind === "soft" ? 0.12 : 0.2, this.effectsBus!);
      });
      return;
    }
    notes.forEach((midi, index) => this.scheduleFallbackBell(midiToFrequency(midi), now + index * 0.075, 0.05, this.effectsBus!));
  }

  private scheduleCountIn(song: Song, startAt: number): void {
    const secondsPerBeat = 60 / song.bpm;
    for (let beat = 0; beat < song.leadInBeats; beat += 1) {
      this.scheduleSample(
        "celesta",
        beat === song.leadInBeats - 1 ? 72 : 67,
        startAt + beat * secondsPerBeat,
        0.32,
        beat === song.leadInBeats - 1 ? 0.28 : 0.18,
        this.effectsBus!,
      );
    }
  }

  private scheduleHarmony(
    song: Song,
    startAt: number,
    fromBeat: number,
    toBeat: number,
    timelineOriginBeat: number,
  ): void {
    const beatSeconds = 60 / song.bpm;
    const beatsPerBar = song.beatsPerBar;
    const firstBar = Math.floor(fromBeat / beatsPerBar);
    const lastBar = Math.ceil(toBeat / beatsPerBar);
    const timeForBeat = (beat: number): number => startAt + (beat - timelineOriginBeat) * beatSeconds;

    for (let bar = firstBar; bar < lastBar; bar += 1) {
      const barBeat = bar * beatsPerBar;
      if (barBeat + beatsPerBar <= fromBeat || barBeat >= toBeat) continue;
      const chord = song.harmony[bar % song.harmony.length];
      const section = song.sections.find((item) => barBeat >= item.startBeat && barBeat < item.endBeat);
      const listenBoost = section?.mode === "listen" ? 1.12 : 1;
      const growth = 0.82 + Math.min(0.18, bar / Math.max(1, lastBar) * 0.18);
      const dynamic = listenBoost * growth;

      if (song.soundWorld === "moonlight") {
        this.scheduleSample("piano", chord[0], timeForBeat(barBeat), beatSeconds * 0.9, 0.24 * dynamic, this.backingBus!, -0.12);
        for (let beat = 1; beat < beatsPerBar; beat += 1) {
          this.scheduleChord(chord.slice(1).map((midi) => midi + 12), timeForBeat(barBeat + beat), beatSeconds * 0.66, 0.1 * dynamic, this.backingBus!);
        }
        continue;
      }

      this.scheduleSample("piano", chord[0] - 12, timeForBeat(barBeat), beatSeconds * 0.82, 0.2 * dynamic, this.backingBus!, -0.15);
      if (beatsPerBar === 4) {
        this.scheduleSample("piano", chord[2], timeForBeat(barBeat + 2), beatSeconds * 0.72, 0.13 * dynamic, this.backingBus!, -0.08);
      }

      if (song.soundWorld === "starlight") {
        const pattern = [0, 2, 1, 2, 0, 2, 1, 2];
        for (let half = 0; half < beatsPerBar * 2; half += 1) {
          const midi = chord[pattern[half % pattern.length]] + 12;
          this.scheduleSample("piano", midi, timeForBeat(barBeat + half * 0.5), beatSeconds * 0.4, 0.075 * dynamic, this.backingBus!, 0.12);
        }
      } else {
        for (let beat = 0; beat < beatsPerBar; beat += 1) {
          const strength = beat === 0 ? 0.12 : beat === 2 ? 0.1 : 0.075;
          this.scheduleChord(chord.map((midi) => midi + 12), timeForBeat(barBeat + beat), beatSeconds * 0.64, strength * dynamic, this.backingBus!);
        }
      }
    }
  }

  private scheduleOrchestration(
    song: Song,
    startAt: number,
    fromBeat: number,
    toBeat: number,
    timelineOriginBeat: number,
  ): void {
    const beatSeconds = 60 / song.bpm;
    const beatsPerBar = song.beatsPerBar;
    const firstBar = Math.floor(fromBeat / beatsPerBar);
    const lastBar = Math.ceil(toBeat / beatsPerBar);
    const timeForBeat = (beat: number): number => startAt + (beat - timelineOriginBeat) * beatSeconds;

    for (let bar = firstBar; bar < lastBar; bar += 1) {
      const barBeat = bar * beatsPerBar;
      if (barBeat + beatsPerBar <= fromBeat || barBeat >= toBeat) continue;
      const chord = song.harmony[bar % song.harmony.length];
      const section = song.sections.find((item) => barBeat >= item.startBeat && barBeat < item.endBeat);
      const listenSection = section?.mode === "listen";
      const phraseLift = 0.9 + Math.min(0.16, bar / Math.max(1, lastBar) * 0.16);
      const stringLevel = (song.soundWorld === "sunrise" ? 0.12 : 0.095) * phraseLift * (listenSection ? 0.86 : 1);

      if (barBeat >= fromBeat) {
        this.scheduleChord(
          chord,
          timeForBeat(barBeat),
          beatSeconds * beatsPerBar * 0.94,
          stringLevel,
          this.backingBus!,
          "strings",
        );
      }

      const sparkleBeats = song.soundWorld === "starlight"
        ? (beatsPerBar === 4 ? [0.5, 1.5, 2.5, 3.5] : [0.5, 1.5, 2.5])
        : song.soundWorld === "moonlight"
          ? [0, beatsPerBar - 0.5]
          : [0, 2];
      sparkleBeats.forEach((beatOffset, index) => {
        const beat = barBeat + beatOffset;
        if (beat < fromBeat || beat >= toBeat || beatOffset >= beatsPerBar) return;
        const chordTone = chord[(bar + index * 2) % chord.length] + 24;
        const level = song.soundWorld === "starlight" ? 0.085 : listenSection ? 0.035 : 0.052;
        this.scheduleSample(
          "glockenspiel",
          chordTone,
          timeForBeat(beat),
          beatSeconds * 0.48,
          level * phraseLift,
          this.backingBus!,
          index % 2 === 0 ? -0.18 : 0.18,
        );
      });
    }
  }

  private scheduleChord(
    chord: number[],
    when: number,
    duration: number,
    velocity: number,
    destination: AudioNode,
    instrument: InstrumentName = "piano",
  ): void {
    chord.forEach((midi, index) => {
      const spread = instrument === "strings" ? 0.42 : 0.24;
      const pan = chord.length <= 1 ? 0 : -spread / 2 + (index / (chord.length - 1)) * spread;
      const stagger = instrument === "strings" ? index * 0.024 : index * 0.014;
      this.scheduleSample(instrument, midi, when + stagger, duration, velocity, destination, pan);
    });
  }

  private scheduleLead(
    note: MelodyNote,
    when: number,
    secondsPerBeat: number,
    world: SoundWorld,
    velocity: number,
    destination: AudioNode,
  ): void {
    const duration = Math.max(0.28, note.durationBeats * secondsPerBeat * 0.9);
    this.scheduleSample(leadInstrument(world), note.midi, when, duration, velocity, destination);
  }

  private scheduleSample(
    instrument: InstrumentName,
    midi: number,
    when: number,
    duration: number,
    velocity: number,
    destination: AudioNode,
    pan = 0,
  ): void {
    const samples = this.sampleBanks.get(instrument);
    if (!samples?.length || !this.context) return;
    const sample = samples.reduce((closest, candidate) => (
      Math.abs(candidate.midi - midi) < Math.abs(closest.midi - midi) ? candidate : closest
    ));
    const playbackRate = 2 ** ((midi - sample.midi) / 12);
    const source = this.track(this.context.createBufferSource());
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const sustained = instrument === "strings" || instrument === "violin" || instrument === "trumpet";
    const attack = sustained ? 0.065 : instrument === "flute" ? 0.045 : 0.006;
    const release = sustained ? 0.3 : instrument === "flute" ? 0.16 : 0.32;
    const naturalDuration = sample.buffer.duration / playbackRate;
    const stopAfter = Math.max(0.14, Math.min(naturalDuration, duration + release));
    const releaseAt = Math.max(when + attack + 0.04, when + Math.min(duration * 0.88, stopAfter - 0.07));
    const level = Math.max(0.0001, velocity * INSTRUMENT_LEVEL[instrument]);

    source.buffer = sample.buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(level, when + attack);
    gain.gain.setValueAtTime(level, releaseAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + stopAfter);
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain);
    gain.connect(panner);
    panner.connect(destination);
    source.start(when);
    source.stop(when + stopAfter + 0.02);
  }

  private scheduleFallbackBell(frequency: number, when: number, volume: number, destination: AudioNode): void {
    const context = this.context!;
    const oscillator = this.track(context.createOscillator());
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + 0.3);
  }
}
