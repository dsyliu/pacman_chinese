import Phaser from 'phaser';
import { Pacman } from '../entities/Pacman';
import { CharacterGhost } from '../entities/CharacterGhost';
import { Maze, TILE_SIZE, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT } from '../entities/Maze';
import { SentenceManager } from '../managers/SentenceManager';
import { GameStateManager } from '../managers/GameState';
import { DataLoader } from '../managers/DataLoader';
import { AudioManager } from '../managers/AudioManager';
import { ScoreboardManager } from '../managers/ScoreboardManager';
import { detectInputMode, detectOrientation } from '../utils/input';
import { getPanelRect } from '../utils/layout';
import type { InputMode } from '../utils/input';
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
  private scoreboardManager!: ScoreboardManager;
  private levelData: LevelData | null = null;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private victoryText: Phaser.GameObjects.Text | null = null;
  private gameOverRestartText: Phaser.GameObjects.Text | null = null;
  private victoryRestartText: Phaser.GameObjects.Text | null = null;
  private startSplashText: Phaser.GameObjects.Text | null = null;
  private spaceRestartBound: boolean = false;
  private tapRestartBound: boolean = false;
  private inputMode: InputMode = 'keyboard';

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
    this.scoreboardManager = new ScoreboardManager(this);

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
    this.maze.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData);
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);

    this.inputMode = detectInputMode();
    const orientation = detectOrientation();
    const panel = getPanelRect(orientation);
    const layoutMode = orientation === 'portrait' ? 'horizontal' : 'vertical';
    this.scoreboardManager.render(panel.x, panel.width, this.inputMode, panel.y, layoutMode);
    if (this.inputMode === 'touch') {
      // In horizontal (portrait) panel, the D-pad sits in the right column,
      // aligned with the CONTROLS header. In vertical (landscape) panel,
      // the D-pad is centered.
      const cx = layoutMode === 'horizontal'
        ? panel.x + panel.width * 0.88
        : panel.x + panel.width / 2;
      // Horizontal: D-pad sits in the right column at the body row,
      // aligned with the CONTROLS body in keyboard mode.
      const cy = layoutMode === 'horizontal' ? panel.y + 85 : panel.y + 905;
      this.renderDPad(cx, cy);
    }

    // Hold the game in MENU until the user dismisses the start splash;
    // this also satisfies the browser autoplay policy on the same gesture.
    this.gameStateManager.setState(GameState.MENU);

    this.showStartSplash();
  }

  private showStartSplash(): void {
    this.startSplashText = this.add.text(BOARD_PIXEL_WIDTH / 2, BOARD_PIXEL_HEIGHT / 2, 'Tap or Press Any Key to Start', {
      fontSize: '40px',
      color: '#FFFF00',
      fontFamily: 'Arial, sans-serif'
    });
    this.startSplashText.setOrigin(0.5, 0.5);
    this.startSplashText.setDepth(2000);

    const begin = () => this.beginGame();
    this.input.once('pointerdown', begin);
    this.input.keyboard!.once('keydown', begin);
  }

  beginGame(): void {
    if (this.gameStateManager.getState() !== GameState.MENU) return;
    if (this.startSplashText) {
      this.startSplashText.destroy();
      this.startSplashText = null;
    }
    this.audioManager.resume();
    this.audioManager.playBackgroundMusic();
    this.gameStateManager.setState(GameState.PLAYING);

    if (!this.spaceRestartBound) {
      this.input.keyboard!.on('keydown-SPACE', () => {
        this.restart();
      });
      this.spaceRestartBound = true;
    }

    if (!this.tapRestartBound) {
      this.input.on('pointerdown', () => {
        const s = this.gameStateManager.getState();
        if (s === GameState.GAME_OVER || s === GameState.VICTORY) {
          this.restart();
        }
      });
      this.tapRestartBound = true;
    }
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

    if (this.maze.tryEatDot(this.pacman.getGridX(), this.pacman.getGridY())) {
      this.scoreboardManager.addPoints(1);
    }

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
    this.scoreboardManager.recordLoss();

    if (!this.gameOverText) {
      const centerX = BOARD_PIXEL_WIDTH / 2;
      const centerY = BOARD_PIXEL_HEIGHT / 2;

      this.gameOverText = this.add.text(
        centerX,
        centerY - 50,
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
        centerX,
        centerY + 50,
        this.restartHintText(),
        {
          fontSize: '32px',
          color: '#FF0000',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.gameOverRestartText.setOrigin(0.5, 0.5);
      this.gameOverRestartText.setDepth(1000);
      this.makeRestartButton(this.gameOverRestartText);
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
    this.scoreboardManager.addWinBonus();
    this.scoreboardManager.recordWin();

    if (!this.victoryText) {
      const centerX = BOARD_PIXEL_WIDTH / 2;
      const centerY = BOARD_PIXEL_HEIGHT / 2;

      this.victoryText = this.add.text(
        centerX,
        centerY - 50,
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
        centerX,
        centerY + 50,
        this.restartHintText(),
        {
          fontSize: '32px',
          color: '#00FF00',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.victoryRestartText.setOrigin(0.5, 0.5);
      this.victoryRestartText.setDepth(1000);
      this.makeRestartButton(this.victoryRestartText);
    } else {
      this.victoryText.setVisible(true);
      if (this.victoryRestartText) {
        this.victoryRestartText.setVisible(true);
      }
    }
  }

  private renderDPad(cx: number, cy: number): void {
    const buttons: Array<{ label: string; dx: number; dy: number; ox: number; oy: number }> = [
      { label: '↑', dx: 0, dy: -1, ox: 0, oy: -55 },
      { label: '↓', dx: 0, dy: 1, ox: 0, oy: 55 },
      { label: '←', dx: -1, dy: 0, ox: -55, oy: 0 },
      { label: '→', dx: 1, dy: 0, ox: 55, oy: 0 }
    ];
    for (const b of buttons) {
      const btn = this.add.text(cx + b.ox, cy + b.oy, b.label, {
        fontSize: '32px',
        color: '#FFFFFF',
        backgroundColor: '#3a3a4a',
        padding: { x: 14, y: 8 },
        fontFamily: 'Arial, sans-serif'
      });
      btn.setOrigin(0.5, 0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.pacman.queueDirection(b.dx, b.dy);
      });
    }
  }

  private restartHintText(): string {
    return this.inputMode === 'touch' ? 'Tap to Restart' : 'Press SPACE to Restart';
  }

  private makeRestartButton(text: Phaser.GameObjects.Text): void {
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      this.restart();
    });
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
    this.maze.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);
    this.setupPacman();
    this.spawnGhosts();
    this.sentenceManager.initialize(this.levelData);
    this.gameStateManager.initializeLevel(this.levelData.correctChars.length);

    this.audioManager.playBackgroundMusic();
  }
}
