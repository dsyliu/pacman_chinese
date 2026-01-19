export interface LevelData {
  id: number;
  sentence: string;
  blanks: number[]; // Indices where blanks appear
  correctChars: string[];
  wrongChars: string[];
  translation: string;
}

export interface GameData {
  levels: LevelData[];
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
