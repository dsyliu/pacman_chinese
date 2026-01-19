import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1152,
  height: 648,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  input: {
    keyboard: true
  }
};

new Phaser.Game(config);
