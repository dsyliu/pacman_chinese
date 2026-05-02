import Phaser from 'phaser';
import type { InputMode } from '../utils/input';

export type LayoutMode = 'vertical' | 'horizontal';

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

  render(
    panelX: number,
    panelWidth: number,
    inputMode: InputMode = 'keyboard',
    panelY: number = 0,
    layoutMode: LayoutMode = 'vertical'
  ): void {
    if (layoutMode === 'horizontal') {
      this.renderHorizontal(panelX, panelY, panelWidth, inputMode);
      return;
    }
    const centerX = panelX + panelWidth / 2;
    const y = (offset: number) => panelY + offset;

    this.addStatic(centerX, y(60), 'SCORE', 30, '#FFD24A');
    this.scoreValueText = this.addStatic(centerX, y(120), '0', 56, '#FFD24A');

    this.addStatic(centerX, y(230), 'STATS', 26, '#FFFFFF');

    this.addStatic(centerX, y(310), 'Played', 22, '#FFFFFF');
    this.playedValueText = this.addStatic(centerX, y(350), '0', 36, '#FFFFFF');

    this.addStatic(centerX, y(440), 'Won', 22, '#33FF66');
    this.wonValueText = this.addStatic(centerX, y(480), '0', 36, '#33FF66');

    this.addStatic(centerX, y(570), 'Lost', 22, '#FF5555');
    this.lostValueText = this.addStatic(centerX, y(610), '0', 36, '#FF5555');

    this.addStatic(centerX, y(680), 'HOW TO PLAY', 22, '#FFFFFF');
    this.addStatic(
      centerX,
      y(750),
      'Eat the correct\ncharacters to fill\nthe blanks. Avoid\nthe wrong ones!',
      16,
      '#BBBBBB'
    );

    this.addStatic(centerX, y(830), 'CONTROLS', 22, '#FFFFFF');

    if (inputMode === 'touch') {
      // The CONTROLS section's body in touch mode is the on-screen D-pad, which
      // GameScene draws under this header. We still render a brief restart hint
      // here since the D-pad only covers movement.
      this.addStatic(
        centerX,
        y(985),
        'Tap anywhere to Restart',
        14,
        '#BBBBBB'
      );
    } else {
      this.addStatic(
        centerX,
        y(910),
        '↑  Move Up\n↓  Move Down\n←  Move Left\n→  Move Right\nSPACE  Restart',
        16,
        '#BBBBBB'
      );
    }

    this.refresh();
  }

  private renderHorizontal(panelX: number, panelY: number, panelWidth: number, inputMode: InputMode): void {
    // Single horizontal band: SCORE | Played | Won | Lost | CONTROLS labels
    // on the top row; their numeric values / controls body share the row below.
    const scoreX = panelX + panelWidth * 0.10;
    const playedX = panelX + panelWidth * 0.28;
    const wonX = panelX + panelWidth * 0.43;
    const lostX = panelX + panelWidth * 0.58;
    const controlsX = panelX + panelWidth * 0.86;
    const centerX = panelX + panelWidth / 2;
    const y = (offset: number) => panelY + offset;
    const labelY = y(30);
    const valueY = y(85);

    // Top row — labels.
    this.addStatic(scoreX, labelY, 'SCORE', 26, '#FFD24A');
    this.addStatic(playedX, labelY, 'Played', 22, '#FFFFFF');
    this.addStatic(wonX, labelY, 'Won', 22, '#33FF66');
    this.addStatic(lostX, labelY, 'Lost', 22, '#FF5555');
    this.addStatic(controlsX, labelY, 'CONTROLS', 26, '#FFFFFF');

    // Bottom row — numeric values and controls body, sharing one y.
    this.scoreValueText = this.addStatic(scoreX, valueY, '0', 36, '#FFD24A');
    this.playedValueText = this.addStatic(playedX, valueY, '0', 28, '#FFFFFF');
    this.wonValueText = this.addStatic(wonX, valueY, '0', 28, '#33FF66');
    this.lostValueText = this.addStatic(lostX, valueY, '0', 28, '#FF5555');

    if (inputMode === 'keyboard') {
      this.addStatic(controlsX, valueY, '↑↓←→ Move\nSPACE Restart', 14, '#BBBBBB');
    }
    // touch mode: GameScene draws the D-pad cluster centered at (controlsX, valueY)

    // HOW TO PLAY across the bottom of the panel.
    this.addStatic(centerX, y(155), 'HOW TO PLAY', 18, '#FFFFFF');
    this.addStatic(
      centerX,
      y(185),
      'Eat the correct characters to fill the blanks. Avoid the wrong ones!',
      14,
      '#BBBBBB'
    );

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
