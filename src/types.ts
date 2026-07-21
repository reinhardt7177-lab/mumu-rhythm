export type ScreenName = "library" | "mission" | "game" | "result";

export type HitBank = "piano" | "violin" | "trumpet";

export interface MelodyNote {
  id: string;
  beat: number;
  durationBeats: number;
  midi: number;
  lane: number;
  phrase: string;
  accent?: boolean;
}

export interface SongSection {
  id: string;
  label: string;
  startBeat: number;
  endBeat: number;
  mode: "play" | "listen";
}

export interface ListeningMission {
  eyebrow: string;
  title: string;
  description: string;
  question: string;
  options: string[];
  answerIndex: number;
  hint: string;
  badge: string;
}

export interface SongPalette {
  ink: string;
  deep: string;
  accent: string;
  warm: string;
  mist: string;
}

export interface Song {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  origin: string;
  grade: string;
  difficulty: "빠른 도전" | "최고 속도";
  bpm: number;
  beatsPerBar: 2 | 4;
  leadInBeats: number;
  totalBeats: number;
  hitBank: HitBank;
  featuredInstrument: string;
  listeningPoint: string;
  instruments: string[];
  approachSeconds?: number;
  backingTrack: string;
  artwork: string;
  palette: SongPalette;
  mission: ListeningMission;
  melody: MelodyNote[];
  sections: SongSection[];
}

export type JudgeName = "PERFECT" | "GREAT" | "GOOD" | "MISS";

export interface RuntimeNote extends MelodyNote {
  hit: boolean;
  missed: boolean;
  holding: boolean;
  completed: boolean;
  judgedAt?: number;
}

export interface GameResult {
  songId: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  stars: number;
}
