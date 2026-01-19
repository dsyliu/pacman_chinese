import type { GameData, LevelData } from '../utils/types';

export class DataLoader {
  private static data: GameData | null = null;

  static async loadData(): Promise<GameData> {
    if (this.data) {
      return this.data;
    }

    try {
      const response = await fetch('/data/sentences.json');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      this.data = await response.json() as GameData;
      return this.data;
    } catch (error) {
      console.error('Error loading game data:', error);
      // Return default data if loading fails
      return {
        levels: [
          {
            id: 1,
            sentence: "我__你",
            blanks: [1],
            correctChars: ["爱"],
            wrongChars: ["恨", "怕", "想"],
            translation: "I love you"
          }
        ]
      };
    }
  }

  static getLevel(levelId: number): LevelData | null {
    if (!this.data) {
      return null;
    }
    return this.data.levels.find(level => level.id === levelId) || null;
  }

  static getAllLevels(): LevelData[] {
    return this.data?.levels || [];
  }
}
