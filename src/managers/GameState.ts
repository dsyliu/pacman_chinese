import { GameState as GameStateEnum, CollectedCharacter } from '../utils/types';

export class GameStateManager {
  private currentState: GameStateEnum = GameStateEnum.MENU;
  private collectedChars: CollectedCharacter[] = [];
  private totalCorrectChars: number = 0;
  private score: number = 0;

  setState(state: GameStateEnum): void {
    this.currentState = state;
  }

  getState(): GameStateEnum {
    return this.currentState;
  }

  initializeLevel(totalCorrect: number): void {
    this.collectedChars = [];
    this.totalCorrectChars = totalCorrect;
    this.score = 0;
    this.currentState = GameStateEnum.PLAYING;
  }

  collectCharacter(char: string, blankIndex: number): void {
    this.collectedChars.push({ char, blankIndex });
    this.score += 100;
  }

  getCollectedChars(): CollectedCharacter[] {
    return [...this.collectedChars];
  }

  isAllCollected(): boolean {
    return this.collectedChars.length >= this.totalCorrectChars;
  }

  getScore(): number {
    return this.score;
  }

  reset(): void {
    this.collectedChars = [];
    this.totalCorrectChars = 0;
    this.score = 0;
    this.currentState = GameStateEnum.MENU;
  }
}
