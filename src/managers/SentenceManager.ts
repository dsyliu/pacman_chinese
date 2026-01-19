import Phaser from 'phaser';
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

    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    const yPosition = screenHeight - 80;

    // Build the sentence with filled blanks
    let displayText = '';
    const sentenceChars = this.levelData.sentence.split('');
    let blankIndex = 0;

    for (let i = 0; i < sentenceChars.length; i++) {
      if (this.levelData.blanks.includes(i)) {
        const collected = this.collectedChars.find(c => c.blankIndex === blankIndex);
        if (collected) {
          displayText += collected.char;
        } else {
          displayText += '□'; // Empty square to indicate missing character
        }
        blankIndex++;
      } else {
        // Skip underscores - they're just placeholders in the data
        if (sentenceChars[i] !== '_') {
          displayText += sentenceChars[i];
        }
      }
    }

    // Create text object
    this.sentenceText = this.scene.add.text(
      screenWidth / 2,
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
      screenWidth / 2,
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
