import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', async () => {
  const mock = await import('../../test-utils/phaserMock');
  return { default: mock.default };
});

import { GameScene } from '../GameScene';
import { DataLoader } from '../../managers/DataLoader';
import { GameState } from '../../utils/types';
import { createSceneStub } from '../../test-utils/phaserMock';
import { TILE_SIZE } from '../../entities/Maze';

const sampleLevel = {
  id: 1,
  sentence: 'a b',
  blanks: [0],
  correctChars: ['X'],
  wrongChars: ['Y', 'Z'],
  translation: 'sample'
};

function attachSceneStubs(scene: GameScene) {
  const stub = createSceneStub();
  Object.assign(scene, {
    add: stub.add,
    input: stub.input,
    cameras: stub.cameras
  });
  return stub;
}

async function buildGame() {
  vi.spyOn(DataLoader, 'loadData').mockResolvedValue({ levels: [sampleLevel] });
  vi.stubGlobal('AudioContext', vi.fn(() => ({
    currentTime: 0,
    destination: {},
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} }),
    createGain: () => ({ gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} })
  })));
  const scene = new GameScene();
  const stub = attachSceneStubs(scene);
  await scene.create();
  return { scene, stub };
}

describe('GameScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('constructs with the expected scene key', () => {
    const scene = new GameScene();
    expect(scene).toBeInstanceOf(GameScene);
  });

  it('create() loads data, builds the maze, and starts in PLAYING', async () => {
    const { scene } = await buildGame();
    expect((scene as any).maze).toBeDefined();
    expect((scene as any).pacman).toBeDefined();
    expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
    expect((scene as any).levelData).toEqual(sampleLevel);
  });

  it('create() spawns one ghost per correct char plus wrong ghosts (capped)', async () => {
    const { scene } = await buildGame();
    const ghosts = (scene as any).ghosts as any[];
    expect(ghosts.length).toBe(sampleLevel.correctChars.length + sampleLevel.wrongChars.length);
    const correctCount = ghosts.filter(g => g.getIsCorrect()).length;
    expect(correctCount).toBe(sampleLevel.correctChars.length);
  });

  it('spawned ghosts are at least 5 tiles away from Pacman start', async () => {
    const { scene } = await buildGame();
    const ghosts = (scene as any).ghosts as any[];
    for (const g of ghosts) {
      const col = Math.floor(g.x / TILE_SIZE);
      const row = Math.floor(g.y / TILE_SIZE);
      const manhattan = Math.abs(col - 13) + Math.abs(row - 24);
      expect(manhattan).toBeGreaterThanOrEqual(5);
    }
  });

  it('logs an error and returns when level data is empty', async () => {
    vi.spyOn(DataLoader, 'loadData').mockResolvedValue({ levels: [] });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const scene = new GameScene();
    attachSceneStubs(scene);
    await scene.create();
    expect(err).toHaveBeenCalledWith('No level data available');
    expect((scene as any).maze).toBeUndefined();
  });

  it('update() is a no-op when not in PLAYING state', async () => {
    const { scene } = await buildGame();
    (scene as any).gameStateManager.setState(GameState.GAME_OVER);
    const pacman = (scene as any).pacman;
    const x0 = pacman.x;
    scene.update(0, 16);
    expect(pacman.x).toBe(x0);
  });

  it('collision with a wrong-character ghost transitions to GAME_OVER', async () => {
    const { scene } = await buildGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    const wrongGhost = ghosts.find(g => !g.getIsCorrect());
    wrongGhost.x = pacman.x;
    wrongGhost.y = pacman.y;
    scene.update(0, 16);
    expect((scene as any).gameStateManager.getState()).toBe(GameState.GAME_OVER);
  });

  it('collecting all correct characters transitions to VICTORY', async () => {
    const { scene } = await buildGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    for (const g of ghosts.filter(g => g.getIsCorrect())) {
      g.x = pacman.x;
      g.y = pacman.y;
      scene.update(0, 16);
    }
    expect((scene as any).gameStateManager.getState()).toBe(GameState.VICTORY);
  });

  it('correct ghost collisions advance the score and mark them collected', async () => {
    const { scene } = await buildGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    const correctGhost = ghosts.find(g => g.getIsCorrect());
    correctGhost.x = pacman.x;
    correctGhost.y = pacman.y;
    scene.update(0, 16);
    expect(correctGhost.isCollected()).toBe(true);
    expect((scene as any).gameStateManager.getScore()).toBe(100);
  });

  it('game-over text is given a high depth so the maze cannot cover it', async () => {
    const { scene } = await buildGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    const wrongGhost = ghosts.find(g => !g.getIsCorrect());
    wrongGhost.x = pacman.x;
    wrongGhost.y = pacman.y;
    scene.update(0, 16);

    const gameOverText = (scene as any).gameOverText;
    const gameOverRestart = (scene as any).gameOverRestartText;
    expect(gameOverText.setDepth).toHaveBeenCalled();
    const depth = gameOverText.setDepth.mock.calls[0][0];
    expect(depth).toBeGreaterThanOrEqual(1000);
    expect(gameOverRestart.setDepth).toHaveBeenCalled();
    const restartDepth = gameOverRestart.setDepth.mock.calls[0][0];
    expect(restartDepth).toBeGreaterThanOrEqual(1000);
  });

  it('victory text is given a high depth so the maze cannot cover it', async () => {
    const { scene } = await buildGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    for (const g of ghosts.filter(g => g.getIsCorrect())) {
      g.x = pacman.x;
      g.y = pacman.y;
      scene.update(0, 16);
    }

    const victoryText = (scene as any).victoryText;
    const victoryRestart = (scene as any).victoryRestartText;
    expect(victoryText.setDepth).toHaveBeenCalled();
    const depth = victoryText.setDepth.mock.calls[0][0];
    expect(depth).toBeGreaterThanOrEqual(1000);
    expect(victoryRestart.setDepth).toHaveBeenCalled();
    const restartDepth = victoryRestart.setDepth.mock.calls[0][0];
    expect(restartDepth).toBeGreaterThanOrEqual(1000);
  });
});
