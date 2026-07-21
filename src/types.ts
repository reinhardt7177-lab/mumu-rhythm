export type ScreenName = "library" | "mission" | "game" | "result";

export type SoundWorld =
  | "starlight"
  | "sunrise"
  | "moonlight"
  | "turkish"
  | "cancan"
  | "gallop"
  | "hungarian";

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
  collection: "foundation" | "speed";
  title: string;
  subtitle: string;
  origin: string;
  grade: string;
  difficulty: "처음" | "차근차근" | "도전";
  bpm: number;
  beatsPerBar: 2 | 3 | 4;
  leadInBeats: number;
  totalBeats: number;
  soundWorld: SoundWorld;
  approachSeconds?: number;
  backingTrack?: string;
  artwork: string;
  palette: SongPalette;
  mission: ListeningMission;
  melody: MelodyNote[];
  sections: SongSection[];
  harmony: number[][];
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
