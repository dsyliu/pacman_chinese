import Phaser from 'phaser';

export class CharacterGhost extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private isCorrect: boolean;
  private char: string;
  private gridSize: number = 32;
  private collected: boolean = false;
  private speed: number = 80;
  private currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private directionChangeTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    char: string,
    isCorrect: boolean,
    gridSize: number = 32
  ) {
    super(scene, x, y);
    this.char = char;
    this.isCorrect = isCorrect;
    this.gridSize = gridSize;

    // Create text for Chinese character
    this.text = scene.add.text(0, 0, char, {
      fontSize: '48px',
      fontFamily: 'Microsoft YaHei, SimHei, Arial, sans-serif',
      color: '#FFFFFF', // Same color for all characters
      align: 'center'
    });
    this.text.setOrigin(0.5, 0.5);
    this.add(this.text);

    // Add subtle glow effect
    this.text.setStroke('#000000', 2);

    scene.add.existing(this);
    this.setSize(this.gridSize, this.gridSize);
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
    return Math.round(this.x / this.gridSize);
  }

  getGridY(): number {
    return Math.round(this.y / this.gridSize);
  }

  getWorldPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  update(delta: number, _walls: boolean[][], otherGhosts: CharacterGhost[]): void {
    if (this.collected) return;

    this.directionChangeTimer += delta;

    // Change direction periodically
    if (this.directionChangeTimer > 2000) {
      this.chooseRandomDirection();
      this.directionChangeTimer = 0;
    }

    // Move ghost (no wall collision - free movement)
    if (this.currentDirection.length() > 0) {
      const moveX = this.currentDirection.x * this.speed * (delta / 1000);
      const moveY = this.currentDirection.y * this.speed * (delta / 1000);
      
      const newX = this.x + moveX;
      const newY = this.y + moveY;
      
      // Check collision with other ghosts
      const collisionRadius = this.gridSize;
      let collided = false;
      
      for (const otherGhost of otherGhosts) {
        if (otherGhost === this || otherGhost.isCollected()) continue;
        
        const otherPos = otherGhost.getWorldPosition();
        const distance = Phaser.Math.Distance.Between(newX, newY, otherPos.x, otherPos.y);
        
        if (distance < collisionRadius) {
          // Bounce off other ghost
          const angle = Phaser.Math.Angle.Between(newX, newY, otherPos.x, otherPos.y);
          this.currentDirection.set(Math.cos(angle), Math.sin(angle));
          collided = true;
          break;
        }
      }
      
      if (!collided) {
        this.x = newX;
        this.y = newY;
      }
      
      // Keep ghost within screen bounds
      const screenWidth = this.scene.cameras.main.width;
      const screenHeight = this.scene.cameras.main.height - 150;
      const radius = this.gridSize / 2;
      
      // Bounce off screen edges
      if (this.x < radius || this.x > screenWidth - radius) {
        this.currentDirection.x *= -1;
        this.x = Phaser.Math.Clamp(this.x, radius, screenWidth - radius);
      }
      if (this.y < radius || this.y > screenHeight - radius) {
        this.currentDirection.y *= -1;
        this.y = Phaser.Math.Clamp(this.y, radius, screenHeight - radius);
      }
    }
  }

  private chooseRandomDirection(): void {
    const directions = [
      new Phaser.Math.Vector2(1, 0),   // Right
      new Phaser.Math.Vector2(-1, 0),   // Left
      new Phaser.Math.Vector2(0, 1),     // Down
      new Phaser.Math.Vector2(0, -1)    // Up
    ];

    const randomDir = Phaser.Utils.Array.GetRandom(directions);
    this.currentDirection.copy(randomDir);
  }
}
