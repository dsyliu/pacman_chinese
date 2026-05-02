import Phaser from 'phaser';

export const TILE_SIZE = 32;
export const BOARD_COLS = 28;
export const BOARD_ROWS = 31;
export const BOARD_PIXEL_WIDTH = BOARD_COLS * TILE_SIZE;
export const BOARD_PIXEL_HEIGHT = BOARD_ROWS * TILE_SIZE;

export const LAYOUTS: string[][] = [
  // Maze 0 — classic Pac-Man style
  [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '######.##..........##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##..........##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#...##................##...#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '############################'
  ],
  // Maze 1 — open lanes with central pillars
  [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '######.##....##....##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.##....##....##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#...##................##...#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '############################'
  ],
  // Maze 2 — banded chambers with vertical bars
  [
    '############################',
    '#..........................#',
    '#.########.######.########.#',
    '#.########.######.########.#',
    '#............##............#',
    '#.##.######.####.######.##.#',
    '#.##.######.####.######.##.#',
    '#.##.................##....#',
    '#.##.######.####.######.##.#',
    '#.##.######.####.######.##.#',
    '#..........................#',
    '########.##########.########',
    '########.##########.########',
    '#..........................#',
    '#.######.##########.######.#',
    '#.######.##########.######.#',
    '#..........................#',
    '########.##########.########',
    '########.##########.########',
    '#..........................#',
    '#.##.######.####.######.##.#',
    '#.##.######.####.######.##.#',
    '#....##.................##.#',
    '#.##.######.####.######.##.#',
    '#...##................##...#',
    '#.##.######.####.######.##.#',
    '#.##.######.####.######.##.#',
    '#..........................#',
    '#.########.######.########.#',
    '#.########.######.########.#',
    '############################'
  ]
];

export class Maze {
  static readonly TILE_SIZE = TILE_SIZE;
  static readonly COLS = LAYOUTS[0][0].length;
  static readonly ROWS = LAYOUTS[0].length;
  static readonly LAYOUT_COUNT = LAYOUTS.length;

  private grid: boolean[][];
  private dotGrid: boolean[][];
  private graphics: Phaser.GameObjects.Graphics;
  private dotGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layoutIndex: number = 0) {
    const layout = LAYOUTS[layoutIndex] ?? LAYOUTS[0];
    this.grid = layout.map(row => row.split('').map(ch => ch === '#'));
    this.dotGrid = [];
    for (let r = 0; r < Maze.ROWS; r++) {
      this.dotGrid[r] = new Array(Maze.COLS).fill(false);
    }
    this.graphics = scene.add.graphics();
    this.dotGraphics = scene.add.graphics();
    this.render();
  }

  spawnDots(excludeCol: number, excludeRow: number): void {
    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        const isPath = !this.grid[r][c];
        const isExcluded = c === excludeCol && r === excludeRow;
        this.dotGrid[r][c] = isPath && !isExcluded;
      }
    }
    this.redrawDots();
  }

  tryEatDot(col: number, row: number): boolean {
    if (col < 0 || col >= Maze.COLS || row < 0 || row >= Maze.ROWS) return false;
    if (!this.dotGrid[row][col]) return false;
    this.dotGrid[row][col] = false;
    this.redrawDots();
    return true;
  }

  hasDot(col: number, row: number): boolean {
    if (col < 0 || col >= Maze.COLS || row < 0 || row >= Maze.ROWS) return false;
    return this.dotGrid[row][col];
  }

  isWall(col: number, row: number): boolean {
    if (col < 0 || col >= Maze.COLS || row < 0 || row >= Maze.ROWS) return true;
    return this.grid[row][col];
  }

  isPath(col: number, row: number): boolean {
    return !this.isWall(col, row);
  }

  tileToWorld(col: number, row: number): { x: number; y: number } {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2
    };
  }

  worldToTile(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.floor(x / TILE_SIZE),
      row: Math.floor(y / TILE_SIZE)
    };
  }

  getPathTiles(): Array<{ col: number; row: number }> {
    const tiles: Array<{ col: number; row: number }> = [];
    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        if (!this.grid[r][c]) tiles.push({ col: c, row: r });
      }
    }
    return tiles;
  }

  getPixelWidth(): number {
    return Maze.COLS * TILE_SIZE;
  }

  getPixelHeight(): number {
    return Maze.ROWS * TILE_SIZE;
  }

  destroy(): void {
    this.graphics.destroy();
    this.dotGraphics.destroy();
  }

  private redrawDots(): void {
    this.dotGraphics.clear();
    this.dotGraphics.fillStyle(0xFFE0A0, 1);
    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        if (!this.dotGrid[r][c]) continue;
        const cx = c * TILE_SIZE + TILE_SIZE / 2;
        const cy = r * TILE_SIZE + TILE_SIZE / 2;
        this.dotGraphics.fillCircle(cx, cy, 3);
      }
    }
  }

  private render(): void {
    this.graphics.clear();
    const fill = 0x1a1aa6;
    const stroke = 0x3a8cff;

    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        if (!this.grid[r][c]) continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        const inset = 3;

        this.graphics.fillStyle(fill, 1);
        this.graphics.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

        this.graphics.lineStyle(2, stroke, 0.9);
        this.graphics.strokeRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
      }
    }
  }
}
