import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    width: 896,
    height: 1112
  },
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
