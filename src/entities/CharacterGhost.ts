import Phaser from 'phaser';
import { Maze, TILE_SIZE } from './Maze';

export class CharacterGhost extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private isCorrect: boolean;
  private char: string;
  private maze: Maze;
  private collected: boolean = false;
  private speed: number = 110;
  private currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private lastDecisionCol: number = -1;
  private lastDecisionRow: number = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    char: string,
    isCorrect: boolean,
    maze: Maze
  ) {
    super(scene, x, y);
    this.char = char;
    this.isCorrect = isCorrect;
    this.maze = maze;

    this.text = scene.add.text(0, 0, char, {
      fontSize: '24px',
      fontFamily: 'Microsoft YaHei, SimHei, Arial, sans-serif',
      color: '#FFFFFF',
      align: 'center'
    });
    this.text.setOrigin(0.5, 0.5);
    this.text.setStroke('#000000', 2);
    this.add(this.text);

    scene.add.existing(this);
    this.setSize(TILE_SIZE, TILE_SIZE);
  }

  getCharacter(): string {
    return this.char;
  }

  getIsCorrect(): boolean {
    return this.isCorrect;
  }

  collect(): void {
    this.collected = true;
    this.setVisible(false);
    this.setActive(false);
  }

  isCollected(): boolean {
    return this.collected;
  }

  getGridX(): number {
    return this.maze.worldToTile(this.x, this.y).col;
  }

  getGridY(): number {
    return this.maze.worldToTile(this.x, this.y).row;
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  update(delta: number): void {
    if (this.collected) return;

    const moveStep = this.speed * delta / 1000;
    const { col, row } = this.maze.worldToTile(this.x, this.y);
    const center = this.maze.tileToWorld(col, row);
    const tcx = center.x;
    const tcy = center.y;
    const tol = Math.max(moveStep, 3);
    const atCenter = Math.abs(this.x - tcx) <= tol && Math.abs(this.y - tcy) <= tol;

    if (atCenter && (col !== this.lastDecisionCol || row !== this.lastDecisionRow)) {
      this.pickDirection(col, row);
      this.x = tcx;
      this.y = tcy;
      this.lastDecisionCol = col;
      this.lastDecisionRow = row;
    }

    if (this.currentDirection.lengthSq() > 0) {
      this.x += this.currentDirection.x * moveStep;
      this.y += this.currentDirection.y * moveStep;
    }
  }

  private pickDirection(col: number, row: number): void {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    const valid = dirs.filter(d => this.maze.isPath(col + d.x, row + d.y));
    if (valid.length === 0) {
      this.currentDirection.set(0, 0);
      return;
    }

    let candidates = valid;
    if (this.currentDirection.lengthSq() > 0) {
      const nonReverse = valid.filter(
        d => !(d.x === -this.currentDirection.x && d.y === -this.currentDirection.y)
      );
      if (nonReverse.length > 0) candidates = nonReverse;
    }

    const pick = Phaser.Utils.Array.GetRandom(candidates);
    this.currentDirection.set(pick.x, pick.y);
  }
}
