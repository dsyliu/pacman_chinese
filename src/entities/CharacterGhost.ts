import Phaser from 'phaser';

export class CharacterGhost extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private isCorrect: boolean;
  private char: string;
  private gridSize: number = 32;
  private collected: boolean = false;
  private speed: number = 250; // Increased ghost speed
  private currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private directionChangeTimer: number = 0;
  private rotationTimer: number = 0;
  private rotationInterval: number = 0; // Random interval for each ghost

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
    
    // Initialize random rotation interval (between 1-3 seconds)
    this.rotationInterval = 1000 + Math.random() * 2000;
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
    this.rotationTimer += delta;

    // Change direction periodically
    if (this.directionChangeTimer > 2000) {
      this.chooseRandomDirection();
      this.directionChangeTimer = 0;
    }

    // Rotate ghost randomly
    if (this.rotationTimer > this.rotationInterval) {
      this.rotateRandomly();
      this.rotationTimer = 0;
      // Set new random interval for next rotation
      this.rotationInterval = 1000 + Math.random() * 2000;
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

  private rotateRandomly(): void {
    // Randomly choose 90, 180, or 270 degrees
    const rotations = [90, 180, 270];
    const rotationAngle = Phaser.Utils.Array.GetRandom(rotations);
    
    // Convert degrees to radians and add to current rotation
    const currentRotation = this.rotation;
    const newRotation = currentRotation + Phaser.Math.DegToRad(rotationAngle);
    
    // Normalize rotation to 0-2π range
    this.setRotation(newRotation % (Math.PI * 2));
  }
}
