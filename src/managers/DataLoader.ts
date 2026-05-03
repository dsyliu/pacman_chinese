import type { GameData, LessonData, LevelData } from '../utils/types';

export class DataLoader {
  private static data: GameData | null = null;

  static async loadData(): Promise<GameData> {
    if (this.data) {
      return this.data;
    }

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/sentences.json`);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      this.data = await response.json() as GameData;
      return this.data;
    } catch (error) {
      console.error('Error loading game data:', error);
      // Return default data if loading fails — keeps the game playable
      // even when the static asset 404s.
      return {
        lessons: [
          {
            id: 1,
            name: 'Lesson 1',
            sentences: [
              {
                id: 1,
                sentence: '我 你',
                correctChars: ['爱'],
                wrongChars: ['恨', '怕', '想'],
                translation: 'I love you'
              }
            ]
          }
        ]
      };
    }
  }

  static getLesson(lessonId: number): LessonData | null {
    if (!this.data) return null;
    return this.data.lessons.find(lesson => lesson.id === lessonId) || null;
  }

  static getAllLessons(): LessonData[] {
    return this.data?.lessons || [];
  }

  static getLevel(lessonId: number, sentenceId: number): LevelData | null {
    const lesson = this.getLesson(lessonId);
    if (!lesson) return null;
    return lesson.sentences.find(s => s.id === sentenceId) || null;
  }
}
