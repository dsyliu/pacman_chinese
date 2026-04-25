import Phaser from 'phaser';

export const TILE_SIZE = 32;

const LAYOUT: string[] = [
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
];

export class Maze {
  static readonly TILE_SIZE = TILE_SIZE;
  static readonly COLS = LAYOUT[0].length;
  static readonly ROWS = LAYOUT.length;

  private grid: boolean[][];
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.grid = LAYOUT.map(row => row.split('').map(ch => ch === '#'));
    this.graphics = scene.add.graphics();
    this.render();
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
