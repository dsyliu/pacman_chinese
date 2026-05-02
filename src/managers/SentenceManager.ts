import Phaser from 'phaser';
import { BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT } from '../entities/Maze';
import { getBlankIndices } from '../utils/sentence';
import type { LevelData, CollectedCharacter } from '../utils/types';

export class SentenceManager {
  private scene: Phaser.Scene;
  private sentenceText: Phaser.GameObjects.Text | null = null;
  private translationText: Phaser.GameObjects.Text | null = null;
  private levelData: LevelData | null = null;
  private collectedChars: CollectedCharacter[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  initialize(levelData: LevelData): void {
    // Clean up existing text objects first
    if (this.sentenceText) {
      this.sentenceText.destroy();
      this.sentenceText = null;
    }
    if (this.translationText) {
      this.translationText.destroy();
      this.translationText = null;
    }
    
    this.levelData = levelData;
    this.collectedChars = [];
    this.updateDisplay();
  }

  collectCharacter(char: string, blankIndex: number): void {
    this.collectedChars.push({ char, blankIndex });
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.levelData) return;

    // Destroy existing text if it exists
    if (this.sentenceText) {
      this.sentenceText.destroy();
      this.sentenceText = null;
    }
    if (this.translationText) {
      this.translationText.destroy();
      this.translationText = null;
    }

    const centerX = BOARD_PIXEL_WIDTH / 2;
    // Anchor to the maze, not the canvas, so portrait (taller canvas)
    // doesn't push the sentence to the bottom under the score panel.
    const yPosition = BOARD_PIXEL_HEIGHT + 40;

    // Build the sentence with filled blanks
    let displayText = '';
    const sentenceChars = this.levelData.sentence.split('');
    const blankPositions = new Set(getBlankIndices(this.levelData.sentence));
    let blankIndex = 0;

    for (let i = 0; i < sentenceChars.length; i++) {
      if (blankPositions.has(i)) {
        const collected = this.collectedChars.find(c => c.blankIndex === blankIndex);
        displayText += ' ' + (collected ? collected.char : '?') + ' ';
        blankIndex++;
      } else {
        displayText += sentenceChars[i];
      }
    }

    // Create text object
    this.sentenceText = this.scene.add.text(
      centerX,
      yPosition,
      displayText,
      {
        fontSize: '48px',
        fontFamily: 'Microsoft YaHei, SimHei, Arial, sans-serif',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    this.sentenceText.setOrigin(0.5, 0.5);

    // Add translation below
    this.translationText = this.scene.add.text(
      centerX,
      yPosition + 50,
      `(${this.levelData.translation})`,
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#CCCCCC',
        align: 'center'
      }
    );
    this.translationText.setOrigin(0.5, 0.5);
  }

  getCollectedChars(): CollectedCharacter[] {
    return [...this.collectedChars];
  }

  isComplete(): boolean {
    if (!this.levelData) return false;
    return this.collectedChars.length >= this.levelData.correctChars.length;
  }
}
