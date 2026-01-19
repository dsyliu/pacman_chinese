import Phaser from 'phaser';
import { Pacman } from '../entities/Pacman';
import { CharacterGhost } from '../entities/CharacterGhost';
import { SentenceManager } from '../managers/SentenceManager';
import { GameStateManager } from '../managers/GameState';
import { DataLoader } from '../managers/DataLoader';
import { GameState } from '../utils/types';
import type { LevelData } from '../utils/types';

export class GameScene extends Phaser.Scene {
  private pacman!: Pacman;
  private ghosts: CharacterGhost[] = [];
  private sentenceManager!: SentenceManager;
  private gameStateManager!: GameStateManager;
  private levelData: LevelData | null = null;
  private gridSize: number = 32;
  private mazeWidth: number = 0;
  private mazeHeight: number = 0;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private victoryText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  private walls: boolean[][] = []; // 2D array: kept for compatibility but all false (no walls)

  constructor() {
    super({ key: 'GameScene' });
  }

  async create() {
    // Ensure keyboard is enabled
    if (this.input.keyboard) {
      // Focus the canvas to receive keyboard input
      this.input.keyboard.enabled = true;
      
      // Add click handler to focus canvas
      this.input.on('pointerdown', () => {
        if (this.input.keyboard) {
          this.input.keyboard.enabled = true;
        }
      });
    }

    // Initialize managers
    this.gameStateManager = new GameStateManager();
    this.sentenceManager = new SentenceManager(this);

    // Load level data (randomly select a level)
    const gameData = await DataLoader.loadData();
    if (gameData.levels.length > 0) {
      const randomIndex = Math.floor(Math.random() * gameData.levels.length);
      this.levelData = gameData.levels[randomIndex];
    } else {
      this.levelData = null;
    }

    if (!this.levelData) {
      console.error('No level data available');
      return;
    }

    // Setup game world
    this.setupMaze();
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData);
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);

    // Setup input for restart (spacebar)
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.restart();
    });
  }

  private setupMaze(): void {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height - 150; // Reserve space for sentence UI

    this.mazeWidth = Math.floor(screenWidth / this.gridSize);
    this.mazeHeight = Math.floor(screenHeight / this.gridSize);

    // No walls - just calculate dimensions for open space
    this.walls = [];
    for (let y = 0; y < this.mazeHeight; y++) {
      this.walls[y] = [];
      for (let x = 0; x < this.mazeWidth; x++) {
        this.walls[y][x] = false; // All open space
      }
    }
  }

  private setupPacman(): void {
    const startX = (this.mazeWidth / 2) * this.gridSize;
    const startY = (this.mazeHeight / 2) * this.gridSize;
    this.pacman = new Pacman(this, startX, startY, this.gridSize);
    // No walls, so no need to set walls
  }

  private spawnGhosts(): void {
    if (!this.levelData) return;

    // Clear any existing ghosts first (should already be cleared, but be safe)
    this.ghosts.forEach(ghost => {
      if (ghost) {
        ghost.destroy();
      }
    });
    this.ghosts = [];

    // Get Pacman's starting position
    const pacmanStartX = (this.mazeWidth / 2) * this.gridSize;
    const pacmanStartY = (this.mazeHeight / 2) * this.gridSize;
    const minDistance = 20; // Minimum distance from Pacman

    // Find valid spawn positions (at least 20 pixels away from Pacman)
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < this.mazeHeight; y++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        const worldX = x * this.gridSize;
        const worldY = y * this.gridSize;
        const distance = Phaser.Math.Distance.Between(
          pacmanStartX,
          pacmanStartY,
          worldX,
          worldY
        );
        
        if (distance >= minDistance) {
          validPositions.push({ x: worldX, y: worldY });
        }
      }
    }

    // Shuffle positions
    const shuffled = Phaser.Utils.Array.Shuffle([...validPositions]);

    // Spawn correct character ghosts based on new level data
    this.levelData.correctChars.forEach((char, index) => {
      if (index < shuffled.length) {
        const pos = shuffled[index];
        const ghost = new CharacterGhost(this, pos.x, pos.y, char, true, this.gridSize);
        this.ghosts.push(ghost);
      }
    });

    // Spawn wrong character ghosts based on new level data
    const wrongCount = Math.min(this.levelData.wrongChars.length, 5);
    for (let i = 0; i < wrongCount; i++) {
      const char = this.levelData.wrongChars[i];
      const posIndex = this.levelData.correctChars.length + i;
      if (posIndex < shuffled.length) {
        const pos = shuffled[posIndex];
        const ghost = new CharacterGhost(this, pos.x, pos.y, char, false, this.gridSize);
        this.ghosts.push(ghost);
      }
    }
  }

  update(time: number, delta: number): void {
    if (this.gameStateManager.getState() !== GameState.PLAYING) {
      return;
    }

    // Update Pacman
    this.pacman.update(time, delta);

    // Update ghosts (pass all ghosts for collision detection)
    for (const ghost of this.ghosts) {
      if (!ghost.isCollected()) {
        ghost.update(delta, this.walls, this.ghosts); // Pass all ghosts for collision detection
      }
    }

    // Check collisions
    this.checkCollisions();
  }


  private checkCollisions(): void {
    const pacmanPos = this.pacman.getWorldPosition();
    const collisionDistance = this.gridSize * 0.7; // Collision threshold

    for (const ghost of this.ghosts) {
      if (ghost.isCollected()) continue;

      const ghostPos = ghost.getWorldPosition();
      const distance = Phaser.Math.Distance.Between(
        pacmanPos.x,
        pacmanPos.y,
        ghostPos.x,
        ghostPos.y
      );

      if (distance < collisionDistance) {
        if (ghost.getIsCorrect()) {
          // Collect correct character
          this.collectCorrectCharacter(ghost);
        } else {
          // Hit wrong character - game over
          this.gameOver();
          return;
        }
      }
    }
  }

  private collectCorrectCharacter(ghost: CharacterGhost): void {
    ghost.collect();

    // Find which blank this character fills
    if (!this.levelData) return;

    const charIndex = this.levelData.correctChars.indexOf(ghost.getCharacter());
    if (charIndex === -1) return;

    // Get the blank index for this character (support multiple blanks)
    const blankIndex = charIndex; // Use character index as blank index
    
    // Update sentence manager
    this.sentenceManager.collectCharacter(ghost.getCharacter(), blankIndex);
    
    // Update game state
    this.gameStateManager.collectCharacter(ghost.getCharacter(), blankIndex);

    // Check for victory
    if (this.gameStateManager.isAllCollected()) {
      this.victory();
    }
  }

  private gameOver(): void {
    this.gameStateManager.setState(GameState.GAME_OVER);
    
    if (!this.gameOverText) {
      const screenWidth = this.cameras.main.width;
      const screenHeight = this.cameras.main.height;
      
      this.gameOverText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 - 50,
        'Game Over!',
        {
          fontSize: '64px',
          color: '#FF0000',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.gameOverText.setOrigin(0.5, 0.5);

      this.restartText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 + 50,
        'Press Space to Restart',
        {
          fontSize: '32px',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.restartText.setOrigin(0.5, 0.5);
    } else {
      this.gameOverText.setVisible(true);
      if (this.restartText) {
        this.restartText.setVisible(true);
      }
    }
  }

  private victory(): void {
    this.gameStateManager.setState(GameState.VICTORY);
    
    if (!this.victoryText) {
      const screenWidth = this.cameras.main.width;
      const screenHeight = this.cameras.main.height;
      
      this.victoryText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 - 50,
        'Victory!',
        {
          fontSize: '64px',
          color: '#00FF00',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.victoryText.setOrigin(0.5, 0.5);

      this.restartText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 + 50,
        'Press SPACE to Restart',
        {
          fontSize: '32px',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.restartText.setOrigin(0.5, 0.5);
    } else {
      this.victoryText.setVisible(true);
      if (this.restartText) {
        this.restartText.setVisible(true);
      }
    }
  }

  private async restart(): Promise<void> {
    // Clean up existing game objects
    if (this.pacman) {
      this.pacman.destroy();
    }
    
    // Destroy all ghosts
    this.ghosts.forEach(ghost => {
      if (ghost) {
        ghost.destroy();
      }
    });
    this.ghosts = [];
    
    // Hide game over/victory text
    if (this.gameOverText) {
      this.gameOverText.setVisible(false);
    }
    if (this.victoryText) {
      this.victoryText.setVisible(false);
    }
    if (this.restartText) {
      this.restartText.setVisible(false);
    }

    // Randomly select a new level
    const gameData = await DataLoader.loadData();
    if (gameData.levels.length > 0) {
      const randomIndex = Math.floor(Math.random() * gameData.levels.length);
      this.levelData = gameData.levels[randomIndex];
    } else {
      this.levelData = null;
    }

    if (!this.levelData) {
      console.error('No level data available');
      return;
    }

    // Reset game state
    this.gameStateManager.reset();
    
    // Reinitialize everything with new level
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData); // This will re-render the sentence
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);
  }
}
