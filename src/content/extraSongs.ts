import type { Song, SongSection } from "../types";
import { extraCharts } from "./extraCharts.generated";

export interface ExtraSongInfo {
  introduction: string;
  sourceUrl: string;
  license: string;
  performer?: string;
  worldId?: "past" | "present" | "future" | "fantasy";
  credit: string;
  recordingLicense: string;
  licenseUrl: string;
  chartType: "rhythmic-onset";
  changes: string;
}

function recording(
  file: string, performer: string, license: string, licenseUrl: string,
  introduction: string, worldId: ExtraSongInfo["worldId"],
): ExtraSongInfo {
  return {
    introduction, performer, license, recordingLicense: license, licenseUrl, worldId,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replaceAll(" ", "_"))}`,
    credit: `${file.replace(/\.(ogg|flac)$/, "")} - ${performer}. ${license}. Game excerpt with fades, loudness normalization and silent count-in.`,
    chartType: "rhythmic-onset",
    changes: "Game excerpt, fade-in/out, loudness normalization, 8-beat silent count-in, OGG/AAC encoding. No melody transcription or pitch inference.",
  };
}

const cc0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const pdAuthor = "https://commons.wikimedia.org/wiki/Template:PD-author";
const orchestra = "Czech National Symphony Orchestra / Musopen Symphony Orchestra";

export const extraSongInfo: Record<string, ExtraSongInfo> = {
  "bach-prelude": recording(
    "Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 01 Prelude No. 1 in C major, BWV 846.ogg",
    "Kimiko Ishizaka", "CC0 1.0", cc0,
    "바흐의 평균율 클라비어곡집을 여는 전주곡이에요. 피아니스트 기미코 이시자카의 실제 연주에서 음들이 차례로 펼쳐지는 화음과 잔잔하게 바뀌는 울림을 들어 보세요.", "past",
  ),
  "beethoven-fifth": recording(
    "Ludwig van Beethoven - symphony no. 5 in c minor, op. 67 - i. allegro con brio.ogg",
    "Skidmore College Orchestra", "Public-domain dedication + attribution permission",
    "https://commons.wikimedia.org/wiki/Template:Attribution",
    "베토벤 교향곡 5번의 첫 악장이에요. 스키드모어 칼리지 오케스트라가 연주하는 짧은 리듬 동기가 여러 악기로 이어지며 긴장감을 만드는 순간을 만나 보세요.", "past",
  ),
  "morning-mood": recording(
    "Musopen - Morning.ogg", orchestra, "Public domain (Musopen worldwide dedication)", pdAuthor,
    "그리그의 페르 귄트 모음곡 가운데 아침의 기분이에요. 체코 국립 교향악단의 실제 연주에서 플루트와 오보에가 부드러운 가락을 주고받으며 아침 풍경을 그려요.", "fantasy",
  ),
  "mountain-king": recording(
    "Musopen - In the Hall Of The Mountain King.ogg", orchestra, "Public domain (Musopen worldwide dedication)", pdAuthor,
    "그리그의 페르 귄트 모음곡 가운데 산왕의 궁전에서예요. 체코 국립 교향악단이 같은 짧은 가락을 되풀이하며 점점 더 크고 다급한 움직임을 만들어 냅니다.", "fantasy",
  ),
  "borodin-scherzo": recording(
    "Borodin - String Quartet No. 1 in A major - III. Scherzo. Prestissimo (Musopen String Quartet).flac",
    "Musopen String Quartet", "Public domain (Musopen worldwide dedication)", pdAuthor,
    "보로딘 현악 사중주 1번의 빠른 스케르초예요. 무소픈 현악 사중주단의 바이올린 두 대와 비올라, 첼로가 짧고 민첩한 소리로 서로 호흡을 맞추는 연주를 들어 보세요.", "present",
  ),
  "brahms-tragic": recording(
    "Brahms, Tragic Overture.ogg", orchestra, "CC0 1.0", cc0,
    "브람스의 비극적 서곡은 힘찬 합주와 그 사이의 숨으로 긴장감을 만들어요. 체코 국립 교향악단의 실제 연주에서 두꺼운 관현악 음색과 강한 시작을 느껴 보세요.", "present",
  ),
  "tchaikovsky-march": recording(
    "Tchaikovsky, Symphony No. 6 in B minor, Op. 74, 'Pathetique' - III. Allegro molto vivace.ogg",
    "Musopen Symphony Orchestra", "CC0 1.0", cc0,
    "차이콥스키 교향곡 6번 비창의 세 번째 악장 중 행진곡 구간이에요. 무소픈 심포니 오케스트라의 실제 연주에서 현악과 관악이 어우러지는 활기찬 전진을 들어 보세요.", "future",
  ),
  "bach-fugue": recording(
    "Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 04 Fugue No. 2 in C minor, BWV 847.ogg",
    "Kimiko Ishizaka", "CC0 1.0", cc0,
    "바흐의 평균율 클라비어곡집 중 C단조 푸가예요. 피아니스트 기미코 이시자카가 한 대의 피아노로 여러 성부를 엮습니다. 같은 주제가 다른 높이에서 들어오는 순간에 귀를 기울여 보세요.", "past",
  ),
};

type ExtraMetadata = Omit<Song, "bpm" | "totalBeats" | "melody" | "sections" | "backingTrack" | "backingTrackFallback" | "leadInBeats" | "grade" | "approachSeconds">;

const metadata: ExtraMetadata[] = [
  {
    id: "bach-prelude", number: "E1", title: "바흐 전주곡 C장조",
    subtitle: "펼쳐지는 피아노 화음을 차분히 들어요", origin: "J. S. Bach · BWV 846 전주곡",
    difficulty: "빠른 도전", beatsPerBar: 4, featuredInstrument: "어쿠스틱 피아노",
    listeningPoint: "음을 차례로 펼치는 분산화음", instruments: ["피아노"],
    palette: { ink: "#172b24", deep: "#20392c", accent: "#91dca4", warm: "#eeaa72", mist: "#edf6ee" },
    mission: {
      eyebrow: "실연 감상 E1", title: "펼쳐지는 화음을 들어요",
      description: "피아노가 화음을 한꺼번에 누르지 않고 한 음씩 펼칩니다. 비슷한 움직임 속에서 화음의 색이 달라지는지 귀를 기울여 보세요.",
      question: "피아노의 반주 화음은 주로 어떻게 들렸나요?",
      options: ["한 음씩 차례로 펼쳐졌어요", "타악기만 울렸어요", "목소리로만 불렀어요"], answerIndex: 0,
      hint: "작은 물결처럼 이어지는 피아노 소리를 떠올려 보세요.", badge: "분산화음 탐험가",
    },
  },
  {
    id: "beethoven-fifth", number: "E2", title: "베토벤 운명 교향곡",
    subtitle: "짧은 리듬 동기가 합주를 이끌어요", origin: "L. van Beethoven · 교향곡 5번 1악장",
    difficulty: "빠른 도전", beatsPerBar: 2, featuredInstrument: "관현악 합주",
    listeningPoint: "짧은 리듬 동기의 반복", instruments: ["현악 합주", "목관", "금관", "팀파니"],
    palette: { ink: "#2c1721", deep: "#43212a", accent: "#ed6d88", warm: "#ffcc75", mist: "#faedf1" },
    mission: {
      eyebrow: "실연 감상 E2", title: "되돌아오는 리듬 동기를 찾아요",
      description: "짧은 리듬 동기가 여러 번 돌아오고 다른 악기들로 이어집니다. 긴 소리와 짧은 소리의 대비도 함께 들어 보세요.",
      question: "이 악장의 긴장감을 이끄는 특징은 무엇인가요?",
      options: ["처음부터 끝까지 한 번만 나온 소리", "되풀이되는 짧은 리듬 동기", "피아노 독주만의 울림"], answerIndex: 1,
      hint: "처음 들은 짧은 리듬이 다시 나타나는 순간을 생각해 보세요.", badge: "동기 발견자",
    },
  },
  {
    id: "morning-mood", number: "E3", title: "아침의 기분",
    subtitle: "목관의 부드러운 대화를 들어요", origin: "E. Grieg · 페르 귄트 모음곡 1번 1곡",
    difficulty: "빠른 도전", beatsPerBar: 2, featuredInstrument: "플루트와 오보에",
    listeningPoint: "목관악기가 주고받는 가락", instruments: ["플루트", "오보에", "현악 합주", "호른"],
    palette: { ink: "#173138", deep: "#254751", accent: "#80cfde", warm: "#f5ce71", mist: "#eaf8f5" },
    mission: {
      eyebrow: "실연 감상 E3", title: "가락을 이어받는 목관을 들어요",
      description: "플루트와 오보에가 부드러운 가락을 번갈아 들려줍니다. 같은 가락도 악기가 달라지면 음색이 어떻게 변하는지 들어 보세요.",
      question: "처음의 가락을 주고받는 주요 악기들은 어떤 가족인가요?",
      options: ["타악기", "전자 악기", "목관악기"], answerIndex: 2,
      hint: "플루트와 오보에가 속한 악기 가족을 생각해 보세요.", badge: "목관 음색 탐정",
    },
  },
  {
    id: "mountain-king", number: "E4", title: "산왕의 궁전에서",
    subtitle: "반복되는 가락이 점점 다급해져요", origin: "E. Grieg · 페르 귄트 모음곡 1번 4곡",
    difficulty: "최고 속도", beatsPerBar: 4, featuredInstrument: "관현악 합주",
    listeningPoint: "가락의 반복과 커지는 소리", instruments: ["현악 합주", "바순", "금관", "타악기"],
    palette: { ink: "#25251a", deep: "#3a3b26", accent: "#cce36c", warm: "#ef8c68", mist: "#f4f7de" },
    mission: {
      eyebrow: "실연 감상 E4", title: "반복 속의 변화를 찾아요",
      description: "같은 짧은 가락이 돌아오며 합주의 에너지가 커집니다. 반복되는 가락과 점점 다급해지는 느낌을 함께 찾아보세요.",
      question: "긴장감이 커져도 계속 알아볼 수 있는 것은 무엇인가요?",
      options: ["되풀이되는 짧은 가락", "한 사람의 노랫말", "소리가 전혀 없는 긴 구간"], answerIndex: 0,
      hint: "악기가 많아져도 돌아오는 그 가락을 떠올려 보세요.", badge: "반복 추적자",
    },
  },
  {
    id: "borodin-scherzo", number: "E5", title: "보로딘 현악 스케르초",
    subtitle: "네 현악기의 민첩한 호흡을 느껴요", origin: "A. Borodin · 현악 사중주 1번 3악장",
    difficulty: "최고 속도", beatsPerBar: 2, featuredInstrument: "현악 사중주",
    listeningPoint: "네 현악기가 맞추는 빠른 호흡", instruments: ["제1바이올린", "제2바이올린", "비올라", "첼로"],
    palette: { ink: "#30231a", deep: "#473428", accent: "#ffc477", warm: "#73d8c2", mist: "#fff3df" },
    mission: {
      eyebrow: "실연 감상 E5", title: "현악 사중주의 소리를 구별해요",
      description: "바이올린 두 대, 비올라, 첼로가 빠른 움직임을 함께 만듭니다. 높은 소리와 낮게 받쳐 주는 소리의 어울림을 들어 보세요.",
      question: "이 녹음의 현악 사중주를 이루는 악기 조합은 무엇인가요?",
      options: ["트럼펫 네 대", "바이올린 두 대, 비올라, 첼로", "피아노와 드럼"], answerIndex: 1,
      hint: "바이올린보다 낮은 현악기 둘도 함께 연주해요.", badge: "사중주 동행자",
    },
  },
  {
    id: "brahms-tragic", number: "E6", title: "브람스 비극적 서곡",
    subtitle: "강한 합주와 그 사이의 숨을 들어요", origin: "J. Brahms · 비극적 서곡 Op. 81",
    difficulty: "빠른 도전", beatsPerBar: 2, featuredInstrument: "관현악 합주",
    listeningPoint: "강한 합주와 여린 움직임의 대비", instruments: ["현악 합주", "목관", "금관", "팀파니"],
    palette: { ink: "#282330", deep: "#3c3446", accent: "#d0b4ec", warm: "#efb264", mist: "#f6edf9" },
    mission: {
      eyebrow: "실연 감상 E6", title: "셈여림의 대비를 느껴요",
      description: "힘차게 모인 관현악 소리 뒤로 다른 움직임이 이어집니다. 소리의 세기와 두께가 달라질 때 분위기가 어떻게 바뀌는지 들어 보세요.",
      question: "힘찬 합주와 더 여린 움직임의 차이는 무엇의 대비인가요?",
      options: ["노랫말 언어", "악보의 종이 색", "셈여림"], answerIndex: 2,
      hint: "소리가 얼마나 세거나 여린지를 나타내는 말을 찾아보세요.", badge: "셈여림 관찰자",
    },
  },
  {
    id: "tchaikovsky-march", number: "E7", title: "차이콥스키 교향곡 행진",
    subtitle: "관현악의 활기찬 전진을 따라가요", origin: "P. I. Tchaikovsky · 교향곡 6번 3악장 발췌",
    difficulty: "최고 속도", beatsPerBar: 4, featuredInstrument: "관현악 합주",
    listeningPoint: "여러 악기가 함께 만드는 행진의 힘", instruments: ["현악 합주", "목관", "금관", "타악기"],
    palette: { ink: "#1b292c", deep: "#263d40", accent: "#64dbc8", warm: "#fb8779", mist: "#e7f7f4" },
    mission: {
      eyebrow: "실연 감상 E7", title: "행진하는 합주의 힘을 들어요",
      description: "차이콥스키 교향곡의 행진 구간에서 현악과 관악이 함께 전진합니다. 혼자 내는 소리와는 다른 합주의 에너지를 느껴 보세요.",
      question: "이 녹음에서 활기찬 행진을 만드는 편성은 무엇인가요?",
      options: ["여러 악기가 어우러진 관현악 합주", "반주 없는 독창", "피아노 한 대의 독주"], answerIndex: 0,
      hint: "서로 다른 악기 가족의 소리가 함께 들렸어요.", badge: "행진 합주 지휘자",
    },
  },
  {
    id: "bach-fugue", number: "E8", title: "바흐 푸가 C단조",
    subtitle: "같은 주제가 여러 성부에서 만나요", origin: "J. S. Bach · BWV 847 푸가",
    difficulty: "빠른 도전", beatsPerBar: 4, featuredInstrument: "어쿠스틱 피아노",
    listeningPoint: "여러 성부에 이어지는 같은 주제", instruments: ["피아노"],
    palette: { ink: "#26303c", deep: "#394957", accent: "#b8c9f0", warm: "#eda990", mist: "#eef3fa" },
    mission: {
      eyebrow: "실연 감상 E8", title: "다른 성부로 이어지는 주제를 찾아요",
      description: "짧은 주제가 다른 높이의 성부에서 이어집니다. 피아노 한 대 안에서 여러 가락이 함께 움직이는 푸가의 짜임을 들어 보세요.",
      question: "푸가에서 주제는 주로 어떻게 나타나나요?",
      options: ["반드시 가수가 노랫말로 불러요", "여러 성부에 차례로 이어져요", "처음 한 번 뒤 완전히 사라져요"], answerIndex: 1,
      hint: "같은 모양의 가락이 다른 높이에서 다시 들리는지 떠올려 보세요.", badge: "푸가 주제 탐정",
    },
  },
];

const labels: Record<string, string> = {
  "count-in": "음악을 기다려요", "rhythm-a": "첫 번째 리듬", listening: "악기의 소리를 들어요",
  "rhythm-b": "다시 리듬을 따라가요", outro: "마지막 울림을 들어요",
};

export const extraSongs: Song[] = metadata.map((song) => {
  const chart = extraCharts[song.id];
  if (!chart) throw new Error(`Missing expansion chart: ${song.id}`);
  const sections: SongSection[] = chart.sections.map((section) => ({ ...section, label: labels[section.id] ?? section.label }));
  return {
    ...song, bpm: chart.bpm, totalBeats: chart.totalBeats, leadInBeats: 8, grade: "4~6학년", approachSeconds: 2.8,
    backingTrack: `/assets/audio/expansion-v3/${song.id}.ogg`,
    backingTrackFallback: `/assets/audio/expansion-v3/${song.id}.m4a`,
    sections,
    melody: chart.notes.map((note, index) => ({
      id: `${song.id}-rhythm-${index}`, beat: note.beat, durationBeats: note.duration,
      midi: note.midi, lane: note.lane, accent: note.accent, phrase: `${song.id}-rhythm-${Math.floor(index / 12)}`,
    })),
  };
});
