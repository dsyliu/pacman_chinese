import Phaser from 'phaser';
import { Maze, TILE_SIZE } from './Maze';

export class Pacman extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private mouthAngle: number = 0;
  private mouthOpen: boolean = true;
  private speed: number = 160;
  private maze: Maze;
  public currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private queuedDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private radius: number;

  constructor(scene: Phaser.Scene, x: number, y: number, maze: Maze) {
    super(scene, x, y);
    this.maze = maze;
    this.radius = TILE_SIZE / 2 - 2;

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      const wasd = scene.input.keyboard.addKeys('W,S,A,D') as any;
      this.wasdKeys = {
        up: wasd.W,
        down: wasd.S,
        left: wasd.A,
        right: wasd.D,
        space: wasd.W,
        shift: wasd.W
      } as Phaser.Types.Input.Keyboard.CursorKeys;
    } else {
      this.cursors = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false }
      } as unknown as Phaser.Types.Input.Keyboard.CursorKeys;
    }

    scene.add.existing(this);
    this.setSize(TILE_SIZE, TILE_SIZE);
  }

  update(_time: number, delta: number): void {
    const left = this.cursors.left.isDown || !!(this.wasdKeys && this.wasdKeys.left.isDown);
    const right = this.cursors.right.isDown || !!(this.wasdKeys && this.wasdKeys.right.isDown);
    const up = this.cursors.up.isDown || !!(this.wasdKeys && this.wasdKeys.up.isDown);
    const down = this.cursors.down.isDown || !!(this.wasdKeys && this.wasdKeys.down.isDown);

    if (left) this.queuedDirection.set(-1, 0);
    else if (right) this.queuedDirection.set(1, 0);
    else if (up) this.queuedDirection.set(0, -1);
    else if (down) this.queuedDirection.set(0, 1);

    if (this.queuedDirection.x === this.currentDirection.x &&
        this.queuedDirection.y === this.currentDirection.y) {
      this.queuedDirection.set(0, 0);
    }

    const moveStep = this.speed * delta / 1000;
    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);
    const tcx = col * TILE_SIZE + TILE_SIZE / 2;
    const tcy = row * TILE_SIZE + TILE_SIZE / 2;
    const tol = Math.max(moveStep, 3);
    const atCenter = Math.abs(this.x - tcx) <= tol && Math.abs(this.y - tcy) <= tol;

    if (this.queuedDirection.lengthSq() > 0) {
      const reversing = this.currentDirection.lengthSq() > 0 &&
        this.queuedDirection.x === -this.currentDirection.x &&
        this.queuedDirection.y === -this.currentDirection.y;

      if (reversing) {
        this.currentDirection.copy(this.queuedDirection);
        this.queuedDirection.set(0, 0);
      } else if (atCenter) {
        const nc = col + this.queuedDirection.x;
        const nr = row + this.queuedDirection.y;
        if (this.maze.isPath(nc, nr)) {
          this.x = tcx;
          this.y = tcy;
          this.currentDirection.copy(this.queuedDirection);
          this.queuedDirection.set(0, 0);
        }
      }
    }

    if (this.currentDirection.lengthSq() > 0) {
      if (atCenter) {
        const nc = col + this.currentDirection.x;
        const nr = row + this.currentDirection.y;
        if (this.maze.isWall(nc, nr)) {
          this.x = tcx;
          this.y = tcy;
          this.currentDirection.set(0, 0);
        }
      }

      if (this.currentDirection.lengthSq() > 0) {
        this.x += this.currentDirection.x * moveStep;
        this.y += this.currentDirection.y * moveStep;
      }
    }

    if (this.currentDirection.lengthSq() > 0) {
      this.mouthAngle += delta * 0.008;
      if (this.mouthAngle > Math.PI * 2) this.mouthAngle = 0;
      this.mouthOpen = Math.sin(this.mouthAngle) > 0;
    } else {
      this.mouthOpen = false;
    }

    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    const radius = this.radius;
    const cx = 0;
    const cy = 0;

    this.graphics.fillStyle(0xFFFF00);

    let startAngle = 0;
    let endAngle = Math.PI * 2;

    if (this.currentDirection.lengthSq() > 0 && this.mouthOpen) {
      if (this.currentDirection.x > 0) {
        startAngle = 0.25 * Math.PI;
        endAngle = 1.75 * Math.PI;
      } else if (this.currentDirection.x < 0) {
        startAngle = 1.25 * Math.PI;
        endAngle = 0.75 * Math.PI + 2 * Math.PI;
      } else if (this.currentDirection.y > 0) {
        startAngle = 0.75 * Math.PI;
        endAngle = 0.25 * Math.PI + 2 * Math.PI;
      } else if (this.currentDirection.y < 0) {
        startAngle = 1.75 * Math.PI;
        endAngle = 1.25 * Math.PI + 2 * Math.PI;
      }
    }

    this.graphics.beginPath();
    this.graphics.moveTo(cx, cy);
    this.graphics.arc(cx, cy, radius, startAngle, endAngle);
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  getGridX(): number {
    return Math.floor(this.x / TILE_SIZE);
  }

  getGridY(): number {
    return Math.floor(this.y / TILE_SIZE);
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}
