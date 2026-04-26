import Phaser from 'phaser';
import { Pacman } from '../entities/Pacman';
import { CharacterGhost } from '../entities/CharacterGhost';
import { Maze, TILE_SIZE } from '../entities/Maze';
import { SentenceManager } from '../managers/SentenceManager';
import { GameStateManager } from '../managers/GameState';
import { DataLoader } from '../managers/DataLoader';
import { AudioManager } from '../managers/AudioManager';
import { GameState } from '../utils/types';
import type { LevelData } from '../utils/types';

const PACMAN_START_COL = 13;
const PACMAN_START_ROW = 24;
const MIN_GHOST_TILES_FROM_PACMAN = 5;
const MAX_WRONG_GHOSTS = 5;

export class GameScene extends Phaser.Scene {
  private pacman!: Pacman;
  private ghosts: CharacterGhost[] = [];
  private maze!: Maze;
  private sentenceManager!: SentenceManager;
  private gameStateManager!: GameStateManager;
  private audioManager!: AudioManager;
  private levelData: LevelData | null = null;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private victoryText: Phaser.GameObjects.Text | null = null;
  private gameOverRestartText: Phaser.GameObjects.Text | null = null;
  private victoryRestartText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  async create() {
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.on('pointerdown', () => {
        if (this.input.keyboard) {
          this.input.keyboard.enabled = true;
        }
      });
    }

    this.gameStateManager = new GameStateManager();
    this.sentenceManager = new SentenceManager(this);
    this.audioManager = new AudioManager(this);

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

    this.maze = new Maze(this, Math.floor(Math.random() * Maze.LAYOUT_COUNT));
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData);
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);

    this.audioManager.playBackgroundMusic();

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.restart();
    });
  }

  private setupPacman(): void {
    const start = this.maze.tileToWorld(PACMAN_START_COL, PACMAN_START_ROW);
    this.pacman = new Pacman(this, start.x, start.y, this.maze);
  }

  private spawnGhosts(): void {
    if (!this.levelData) return;

    this.ghosts.forEach(ghost => ghost && ghost.destroy());
    this.ghosts = [];

    const allPathTiles = this.maze.getPathTiles();
    const validTiles = allPathTiles.filter(t => {
      const dCol = t.col - PACMAN_START_COL;
      const dRow = t.row - PACMAN_START_ROW;
      return Math.abs(dCol) + Math.abs(dRow) >= MIN_GHOST_TILES_FROM_PACMAN;
    });

    const shuffled = Phaser.Utils.Array.Shuffle([...validTiles]);
    let posIndex = 0;

    this.levelData.correctChars.forEach(char => {
      if (posIndex < shuffled.length) {
        const tile = shuffled[posIndex++];
        const world = this.maze.tileToWorld(tile.col, tile.row);
        this.ghosts.push(new CharacterGhost(this, world.x, world.y, char, true, this.maze));
      }
    });

    const wrongCount = Math.min(this.levelData.wrongChars.length, MAX_WRONG_GHOSTS);
    for (let i = 0; i < wrongCount; i++) {
      if (posIndex < shuffled.length) {
        const tile = shuffled[posIndex++];
        const world = this.maze.tileToWorld(tile.col, tile.row);
        const char = this.levelData.wrongChars[i];
        this.ghosts.push(new CharacterGhost(this, world.x, world.y, char, false, this.maze));
      }
    }
  }

  update(time: number, delta: number): void {
    if (this.gameStateManager.getState() !== GameState.PLAYING) {
      return;
    }

    this.pacman.update(time, delta);

    for (const ghost of this.ghosts) {
      if (!ghost.isCollected()) {
        ghost.update(delta);
      }
    }

    this.checkCollisions();
  }

  private checkCollisions(): void {
    const pacmanPos = this.pacman.getWorldPosition();
    const collisionDistance = TILE_SIZE * 0.7;

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
          this.collectCorrectCharacter(ghost);
        } else {
          this.gameOver();
          return;
        }
      }
    }
  }

  private collectCorrectCharacter(ghost: CharacterGhost): void {
    ghost.collect();

    if (!this.levelData) return;

    const charIndex = this.levelData.correctChars.indexOf(ghost.getCharacter());
    if (charIndex === -1) return;

    const blankIndex = charIndex;

    this.sentenceManager.collectCharacter(ghost.getCharacter(), blankIndex);
    this.gameStateManager.collectCharacter(ghost.getCharacter(), blankIndex);

    if (this.gameStateManager.isAllCollected()) {
      this.victory();
    }
  }

  private gameOver(): void {
    this.gameStateManager.setState(GameState.GAME_OVER);
    this.audioManager.playGameOverMusic();

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
      this.gameOverText.setDepth(1000);

      this.gameOverRestartText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 + 50,
        'Press Space to Restart',
        {
          fontSize: '32px',
          color: '#FF0000',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.gameOverRestartText.setOrigin(0.5, 0.5);
      this.gameOverRestartText.setDepth(1000);
    } else {
      this.gameOverText.setVisible(true);
      if (this.gameOverRestartText) {
        this.gameOverRestartText.setVisible(true);
      }
    }
  }

  private victory(): void {
    this.gameStateManager.setState(GameState.VICTORY);
    this.audioManager.playVictoryMusic();

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
      this.victoryText.setDepth(1000);

      this.victoryRestartText = this.add.text(
        screenWidth / 2,
        screenHeight / 2 + 50,
        'Press SPACE to Restart',
        {
          fontSize: '32px',
          color: '#00FF00',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.victoryRestartText.setOrigin(0.5, 0.5);
      this.victoryRestartText.setDepth(1000);
    } else {
      this.victoryText.setVisible(true);
      if (this.victoryRestartText) {
        this.victoryRestartText.setVisible(true);
      }
    }
  }

  private async restart(): Promise<void> {
    if (this.pacman) {
      this.pacman.destroy();
    }

    this.ghosts.forEach(ghost => ghost && ghost.destroy());
    this.ghosts = [];

    if (this.maze) {
      this.maze.destroy();
    }

    if (this.gameOverText) this.gameOverText.setVisible(false);
    if (this.victoryText) this.victoryText.setVisible(false);
    if (this.gameOverRestartText) this.gameOverRestartText.setVisible(false);
    if (this.victoryRestartText) this.victoryRestartText.setVisible(false);

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

    this.gameStateManager.reset();

    this.maze = new Maze(this, Math.floor(Math.random() * Maze.LAYOUT_COUNT));
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData);
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);

    this.audioManager.playBackgroundMusic();
  }
}
