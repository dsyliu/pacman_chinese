import Phaser from 'phaser';

export class Pacman extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private mouthAngle: number = 0;
  private mouthOpen: boolean = true;
  private speed: number = 150;
  private gridSize: number = 32;
  public currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private nextDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasdKeys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, gridSize: number = 32) {
    super(scene, x, y);
    this.gridSize = gridSize;
    
    // Create graphics for Pacman
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    // Setup input - ensure keyboard exists
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      
      // Add WASD support using addKeys
      const wasd = scene.input.keyboard.addKeys('W,S,A,D') as any;
      this.wasdKeys = {
        up: wasd.W,
        down: wasd.S,
        left: wasd.A,
        right: wasd.D,
        space: wasd.W, // Dummy
        shift: wasd.W  // Dummy
      } as Phaser.Types.Input.Keyboard.CursorKeys;
    } else {
      // Fallback if keyboard not available
      this.cursors = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false }
      } as unknown as Phaser.Types.Input.Keyboard.CursorKeys;
    }

    scene.add.existing(this);
    this.setSize(this.gridSize, this.gridSize);
  }


  update(_time: number, delta: number): void {
    // Handle input - check both arrow keys and WASD
    const leftPressed = this.cursors.left.isDown || (this.wasdKeys && this.wasdKeys.left.isDown);
    const rightPressed = this.cursors.right.isDown || (this.wasdKeys && this.wasdKeys.right.isDown);
    const upPressed = this.cursors.up.isDown || (this.wasdKeys && this.wasdKeys.up.isDown);
    const downPressed = this.cursors.down.isDown || (this.wasdKeys && this.wasdKeys.down.isDown);

    // Set next direction based on input
    if (leftPressed) {
      this.nextDirection.set(-1, 0);
    } else if (rightPressed) {
      this.nextDirection.set(1, 0);
    } else if (upPressed) {
      this.nextDirection.set(0, -1);
    } else if (downPressed) {
      this.nextDirection.set(0, 1);
    }

    // Update direction immediately when input changes (no walls, so free direction change)
    if (this.nextDirection.length() > 0) {
      // Only change if the direction is actually different
      if (this.currentDirection.x !== this.nextDirection.x || 
          this.currentDirection.y !== this.nextDirection.y) {
        this.currentDirection.copy(this.nextDirection);
      }
    }

    // Move Pacman (no wall collision - free movement)
    if (this.currentDirection.length() > 0) {
      const moveX = this.currentDirection.x * this.speed * (delta / 1000);
      const moveY = this.currentDirection.y * this.speed * (delta / 1000);
      this.x += moveX;
      this.y += moveY;
      
      // Keep Pacman within screen bounds
      const screenWidth = this.scene.cameras.main.width;
      const screenHeight = this.scene.cameras.main.height - 150;
      const radius = this.gridSize / 2;
      
      this.x = Phaser.Math.Clamp(this.x, radius, screenWidth - radius);
      this.y = Phaser.Math.Clamp(this.y, radius, screenHeight - radius);
    }

    // Animate mouth - continuously open/close while moving
    if (this.currentDirection.length() > 0) {
      this.mouthAngle += delta * 0.008; // Faster animation when moving
      if (this.mouthAngle > Math.PI * 2) {
        this.mouthAngle = 0;
      }
      // Use sine wave for smooth open/close animation
      const mouthOpenness = Math.sin(this.mouthAngle);
      this.mouthOpen = mouthOpenness > 0;
    } else {
      // When not moving, keep mouth closed
      this.mouthOpen = false;
    }

    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    
    const radius = this.gridSize / 2 - 2;
    const centerX = 0;
    const centerY = 0;

    // Draw Pacman circle
    this.graphics.fillStyle(0xFFFF00); // Yellow
    
    // Calculate mouth opening
    let startAngle = 0;
    let endAngle = Math.PI * 2;
    
    // Calculate mouth opening - always point in direction of movement
    // Angles: 0° = right, 90° = down, 180° = left, 270° = up
    // Only open mouth when moving
    if (this.currentDirection.length() > 0 && this.mouthOpen) {
      if (this.currentDirection.x > 0) {
        // Moving right - mouth gap on right side (0°)
        // Gap from -45° to 45°, draw from 45° to 315° (wraps)
        startAngle = 0.25 * Math.PI;  // 45° (top-right)
        endAngle = 1.75 * Math.PI;   // 315° (bottom-right, wraps around)
      } else if (this.currentDirection.x < 0) {
        // Moving left - mouth gap on left side (180°)
        // Gap from 135° to 225°, draw from 225° to 135° (wraps)
        startAngle = 1.25 * Math.PI;  // 225° (bottom-left)
        endAngle = 0.75 * Math.PI + 2 * Math.PI;  // 135° + 360° to wrap correctly
      } else if (this.currentDirection.y > 0) {
        // Moving down - mouth gap on bottom (90°)
        // Gap from 45° to 135°, draw from 135° to 45° (wraps)
        startAngle = 0.75 * Math.PI;  // 135° (top-left)
        endAngle = 0.25 * Math.PI + 2 * Math.PI;  // 45° + 360° to wrap correctly
      } else if (this.currentDirection.y < 0) {
        // Moving up - mouth gap on top (270°)
        // Gap from 225° to 315°, draw from 315° to 225° (wraps)
        startAngle = 1.75 * Math.PI;  // 315° (bottom-right)
        endAngle = 1.25 * Math.PI + 2 * Math.PI;  // 225° + 360° to wrap correctly
      }
    }

    // Draw Pacman as a pie slice
    this.graphics.beginPath();
    this.graphics.moveTo(centerX, centerY);
    this.graphics.arc(centerX, centerY, radius, startAngle, endAngle);
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  getGridX(): number {
    return Math.round(this.x / this.gridSize);
  }

  getGridY(): number {
    return Math.round(this.y / this.gridSize);
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}
