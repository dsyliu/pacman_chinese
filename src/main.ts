import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1600,
  height: 900,
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
  },
  audio: {
    disableWebAudio: false
  }
};

new Phaser.Game(config);
