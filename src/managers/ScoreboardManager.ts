import Phaser from 'phaser';
import type { InputMode } from '../utils/input';

const STORAGE_KEY = 'pacman_chinese.scoreboard.v1';
const WIN_BONUS = 100;

export interface ScoreboardStats {
  played: number;
  won: number;
  lost: number;
  points: number;
}

interface PersistedStats {
  won: number;
  lost: number;
  points: number;
}

function loadFromSession(): PersistedStats {
  if (typeof sessionStorage === 'undefined') return { won: 0, lost: 0, points: 0 };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { won: 0, lost: 0, points: 0 };
    const parsed = JSON.parse(raw);
    return {
      won: typeof parsed.won === 'number' ? parsed.won : 0,
      lost: typeof parsed.lost === 'number' ? parsed.lost : 0,
      points: typeof parsed.points === 'number' ? parsed.points : 0
    };
  } catch {
    return { won: 0, lost: 0, points: 0 };
  }
}

function saveToSession(stats: PersistedStats): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // sessionStorage may be disabled or full — score just won't persist this session.
  }
}

export class ScoreboardManager {
  private scene: Phaser.Scene;
  private won: number;
  private lost: number;
  private points: number;
  private scoreValueText: Phaser.GameObjects.Text | null = null;
  private playedValueText: Phaser.GameObjects.Text | null = null;
  private wonValueText: Phaser.GameObjects.Text | null = null;
  private lostValueText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const persisted = loadFromSession();
    this.won = persisted.won;
    this.lost = persisted.lost;
    this.points = persisted.points;
  }

  getStats(): ScoreboardStats {
    return {
      played: this.won + this.lost,
      won: this.won,
      lost: this.lost,
      points: this.points
    };
  }

  addPoints(n: number): void {
    this.points += n;
    this.persist();
    this.refresh();
  }

  addWinBonus(): void {
    this.points += WIN_BONUS;
    this.persist();
    this.refresh();
  }

  recordWin(): void {
    this.won += 1;
    this.persist();
    this.refresh();
  }

  recordLoss(): void {
    this.lost += 1;
    this.persist();
    this.refresh();
  }

  render(panelX: number, panelWidth: number, inputMode: InputMode = 'keyboard'): void {
    const centerX = panelX + panelWidth / 2;

    this.addStatic(centerX, 60, 'SCORE', 30, '#FFD24A');
    this.scoreValueText = this.addStatic(centerX, 120, '0', 56, '#FFD24A');

    this.addStatic(centerX, 230, 'STATS', 26, '#FFFFFF');

    this.addStatic(centerX, 310, 'Played', 22, '#FFFFFF');
    this.playedValueText = this.addStatic(centerX, 350, '0', 36, '#FFFFFF');

    this.addStatic(centerX, 440, 'Won', 22, '#33FF66');
    this.wonValueText = this.addStatic(centerX, 480, '0', 36, '#33FF66');

    this.addStatic(centerX, 570, 'Lost', 22, '#FF5555');
    this.lostValueText = this.addStatic(centerX, 610, '0', 36, '#FF5555');

    this.addStatic(centerX, 680, 'HOW TO PLAY', 22, '#FFFFFF');
    this.addStatic(
      centerX,
      750,
      'Eat the correct\ncharacters to fill\nthe blanks. Avoid\nthe wrong ones!',
      16,
      '#BBBBBB'
    );

    this.addStatic(centerX, 830, 'CONTROLS', 22, '#FFFFFF');

    if (inputMode === 'touch') {
      // The CONTROLS section's body in touch mode is the on-screen D-pad, which
      // GameScene draws under this header. We still render a brief restart hint
      // here since the D-pad only covers movement.
      this.addStatic(
        centerX,
        985,
        'Tap anywhere to Restart',
        14,
        '#BBBBBB'
      );
    } else {
      this.addStatic(
        centerX,
        910,
        '↑  Move Up\n↓  Move Down\n←  Move Left\n→  Move Right\nSPACE  Restart',
        16,
        '#BBBBBB'
      );
    }

    this.refresh();
  }

  private persist(): void {
    saveToSession({ won: this.won, lost: this.lost, points: this.points });
  }

  private addStatic(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string
  ): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      fontFamily: 'Arial, sans-serif',
      color,
      align: 'center'
    });
    t.setOrigin(0.5, 0.5);
    return t;
  }

  private refresh(): void {
    const stats = this.getStats();
    if (this.scoreValueText) this.scoreValueText.setText(String(stats.points));
    if (this.playedValueText) this.playedValueText.setText(String(stats.played));
    if (this.wonValueText) this.wonValueText.setText(String(stats.won));
    if (this.lostValueText) this.lostValueText.setText(String(stats.lost));
  }
}
