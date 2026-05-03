export interface LevelData {
  id: number;
  sentence: string;
  correctChars: string[];
  wrongChars: string[];
  translation: string;
}

export interface LessonData {
  id: number;
  name: string;
  sentences: LevelData[];
}

export interface GameData {
  lessons: LessonData[];
}

export interface CollectedCharacter {
  char: string;
  blankIndex: number;
}

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

export interface GhostData {
  char: string;
  isCorrect: boolean;
  x: number;
  y: number;
}
