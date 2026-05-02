import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('phaser', async () => {
  const mock = await import('../../test-utils/phaserMock');
  return { default: mock.default };
});

import { GameScene } from '../GameScene';
import { DataLoader } from '../../managers/DataLoader';
import { GameState } from '../../utils/types';
import { createSceneStub } from '../../test-utils/phaserMock';
import { TILE_SIZE, BOARD_PIXEL_WIDTH } from '../../entities/Maze';

const sampleLevel = {
  id: 1,
  sentence: ' b',
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

async function buildGame(opts: { autoStart?: boolean } = {}) {
  vi.spyOn(DataLoader, 'loadData').mockResolvedValue({ levels: [sampleLevel] });
  vi.stubGlobal('AudioContext', vi.fn(() => ({
    currentTime: 0,
    destination: {},
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} }),
    createGain: () => ({ gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => {} })
  })));
  const scene = new GameScene();
  const stub = attachSceneStubs(scene);
  await scene.create();
  if (opts.autoStart !== false) {
    (scene as any).beginGame();
  }
  return { scene, stub };
}

describe('GameScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('constructs with the expected scene key', () => {
    const scene = new GameScene();
    expect(scene).toBeInstanceOf(GameScene);
  });

  it('create() loads data and builds the maze; beginGame() transitions to PLAYING', async () => {
    const { scene } = await buildGame();
    expect((scene as any).maze).toBeDefined();
    expect((scene as any).pacman).toBeDefined();
    expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
    expect((scene as any).levelData).toEqual(sampleLevel);
  });

  it('create() holds the game in MENU and shows a start splash until first interaction', async () => {
    const { scene, stub } = await buildGame({ autoStart: false });
    expect((scene as any).gameStateManager.getState()).toBe(GameState.MENU);
    expect((scene as any).startSplashText).not.toBeNull();
    const splash = (scene as any).startSplashText;
    expect(splash.text).toMatch(/Start/i);
    expect(splash.setDepth).toHaveBeenCalled();
    const depth = splash.setDepth.mock.calls[0][0];
    expect(depth).toBeGreaterThanOrEqual(1000);
    // Splash registered once-handlers for first interaction
    expect((stub.input.once as any).mock.calls.length).toBeGreaterThan(0);
    expect((stub.input.keyboard.once as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('beginGame() destroys the splash, starts music, and transitions to PLAYING', async () => {
    const { scene } = await buildGame({ autoStart: false });
    const splash = (scene as any).startSplashText;
    expect(splash.destroy).toBeDefined();
    (scene as any).beginGame();
    expect((scene as any).startSplashText).toBeNull();
    expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
    expect(splash.destroy).toHaveBeenCalled();
  });

  it('beginGame() is a no-op when not in MENU state', async () => {
    const { scene } = await buildGame();
    // Already in PLAYING via auto-start
    const stateBefore = (scene as any).gameStateManager.getState();
    (scene as any).beginGame();
    expect((scene as any).gameStateManager.getState()).toBe(stateBefore);
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

  it('create() spawns dots on every path tile except the Pacman start', async () => {
    const { scene } = await buildGame();
    const maze = (scene as any).maze;
    expect(maze.hasDot(13, 24)).toBe(false);
    const pathTiles = maze.getPathTiles() as Array<{ col: number; row: number }>;
    const sample = pathTiles.find(t => !(t.col === 13 && t.row === 24))!;
    expect(maze.hasDot(sample.col, sample.row)).toBe(true);
  });

  it('scoreboard panel renders at the right of the maze (panelX = BOARD_PIXEL_WIDTH)', async () => {
    const { stub } = await buildGame();
    const textCalls = (stub.add.text as any).mock.calls as Array<any[]>;
    const scorePanelXValues = textCalls
      .filter(c => typeof c[2] === 'string' && ['SCORE', 'STATS', 'Played', 'Won', 'Lost'].includes(c[2]))
      .map(c => c[0]);
    expect(scorePanelXValues.length).toBeGreaterThan(0);
    for (const x of scorePanelXValues) {
      expect(x).toBeGreaterThanOrEqual(BOARD_PIXEL_WIDTH);
    }
  });

  it('end-screen and splash text are centered on the maze midpoint, not the canvas midpoint', async () => {
    const { scene, stub } = await buildGame({ autoStart: false });
    const splashCall = (stub.add.text as any).mock.calls.find(
      (c: any[]) => typeof c[2] === 'string' && /Press Any Key to Start/i.test(c[2])
    );
    expect(splashCall![0]).toBe(BOARD_PIXEL_WIDTH / 2);

    (scene as any).beginGame();
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    const wrongGhost = ghosts.find(g => !g.getIsCorrect());
    wrongGhost.x = pacman.x;
    wrongGhost.y = pacman.y;
    scene.update(0, 16);

    const gameOverCall = (stub.add.text as any).mock.calls.find(
      (c: any[]) => typeof c[2] === 'string' && c[2] === 'Game Over!'
    );
    expect(gameOverCall![0]).toBe(BOARD_PIXEL_WIDTH / 2);
  });

  it('eating a dot via update() increments scoreboard points by 1', async () => {
    const { scene } = await buildGame();
    const maze = (scene as any).maze;
    const pacman = (scene as any).pacman;
    const scoreboard = (scene as any).scoreboardManager;

    // Pick a tile too close to Pacman start for any ghost to spawn there
    // (ghosts require Manhattan >= 5), and not the start tile itself
    // (which has no dot).
    const dotTile = (maze.getPathTiles() as Array<{ col: number; row: number }>)
      .find(t => {
        if (t.col === 13 && t.row === 24) return false;
        return Math.abs(t.col - 13) + Math.abs(t.row - 24) < 5;
      })!;
    expect(maze.hasDot(dotTile.col, dotTile.row)).toBe(true);

    const center = maze.tileToWorld(dotTile.col, dotTile.row);
    pacman.x = center.x;
    pacman.y = center.y;

    const before = scoreboard.getStats().points;
    scene.update(0, 16);
    expect(scoreboard.getStats().points).toBe(before + 1);
    expect(maze.hasDot(dotTile.col, dotTile.row)).toBe(false);

    // Idempotent — no double-counting on subsequent frames over an already-eaten tile.
    scene.update(0, 16);
    expect(scoreboard.getStats().points).toBe(before + 1);
  });

  it('game-over records a loss on the scoreboard', async () => {
    const { scene } = await buildGame();
    const scoreboard = (scene as any).scoreboardManager;
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];
    const wrongGhost = ghosts.find(g => !g.getIsCorrect());
    wrongGhost.x = pacman.x;
    wrongGhost.y = pacman.y;

    const before = scoreboard.getStats();
    scene.update(0, 16);
    const after = scoreboard.getStats();
    expect(after.lost).toBe(before.lost + 1);
    expect(after.won).toBe(before.won);
    expect(after.points).toBe(before.points); // no bonus on loss
  });

  it('victory records a win plus a 100-point bonus on the scoreboard', async () => {
    const { scene } = await buildGame();
    const scoreboard = (scene as any).scoreboardManager;
    const pacman = (scene as any).pacman;
    const ghosts = (scene as any).ghosts as any[];

    const before = scoreboard.getStats();
    for (const g of ghosts.filter(g => g.getIsCorrect())) {
      g.x = pacman.x;
      g.y = pacman.y;
      scene.update(0, 16);
    }
    const after = scoreboard.getStats();
    expect(after.won).toBe(before.won + 1);
    expect(after.points).toBeGreaterThanOrEqual(before.points + 100);
  });

  describe('input-mode-aware restart and splash', () => {
    let originalMatchMedia: typeof window.matchMedia | undefined;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      if (originalMatchMedia) {
        window.matchMedia = originalMatchMedia;
      } else {
        delete (window as any).matchMedia;
      }
    });

    it('start splash text mentions both Tap and Press Any Key', async () => {
      const { stub } = await buildGame({ autoStart: false });
      const splashCall = (stub.add.text as any).mock.calls.find(
        (c: any[]) => typeof c[2] === 'string' && /Press Any Key/i.test(c[2])
      );
      expect(splashCall).toBeDefined();
      expect(splashCall![2]).toMatch(/Tap/i);
    });

    it('game-over restart text is interactive and triggers restart on tap', async () => {
      const { scene } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      const wrongGhost = ghosts.find(g => !g.getIsCorrect());
      wrongGhost.x = pacman.x;
      wrongGhost.y = pacman.y;
      scene.update(0, 16);
      expect((scene as any).gameStateManager.getState()).toBe(GameState.GAME_OVER);

      const restartText = (scene as any).gameOverRestartText;
      expect(restartText.setInteractive).toHaveBeenCalled();

      restartText._emit('pointerdown');
      // Restart is async (loads level data); let microtasks flush.
      await new Promise(resolve => setTimeout(resolve, 0));
      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
    });

    it('victory restart text is interactive and triggers restart on tap', async () => {
      const { scene } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      for (const g of ghosts.filter(g => g.getIsCorrect())) {
        g.x = pacman.x;
        g.y = pacman.y;
        scene.update(0, 16);
      }
      expect((scene as any).gameStateManager.getState()).toBe(GameState.VICTORY);

      const restartText = (scene as any).victoryRestartText;
      expect(restartText.setInteractive).toHaveBeenCalled();

      restartText._emit('pointerdown');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
    });

    it('restart hint says "Press SPACE" in keyboard mode', async () => {
      const { scene } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      const wrongGhost = ghosts.find(g => !g.getIsCorrect());
      wrongGhost.x = pacman.x;
      wrongGhost.y = pacman.y;
      scene.update(0, 16);
      const restartText = (scene as any).gameOverRestartText;
      expect(restartText.text).toMatch(/SPACE/);
    });

    it('a tap anywhere during GAME_OVER restarts the game', async () => {
      const { scene, stub } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      const wrongGhost = ghosts.find(g => !g.getIsCorrect());
      wrongGhost.x = pacman.x;
      wrongGhost.y = pacman.y;
      scene.update(0, 16);
      expect((scene as any).gameStateManager.getState()).toBe(GameState.GAME_OVER);
      const mazeBefore = (scene as any).maze;

      stub._emitInput('pointerdown', { x: 50, y: 50 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
      expect((scene as any).maze).not.toBe(mazeBefore);
    });

    it('a tap anywhere during VICTORY restarts the game', async () => {
      const { scene, stub } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      for (const g of ghosts.filter(g => g.getIsCorrect())) {
        g.x = pacman.x;
        g.y = pacman.y;
        scene.update(0, 16);
      }
      expect((scene as any).gameStateManager.getState()).toBe(GameState.VICTORY);
      const mazeBefore = (scene as any).maze;

      stub._emitInput('pointerdown', { x: 50, y: 50 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
      expect((scene as any).maze).not.toBe(mazeBefore);
    });

    function stubTouchMode() {
      window.matchMedia = vi.fn((q: string) => ({
        matches: q === '(pointer: coarse)',
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      })) as any;
    }

    it('renders 4 directional D-pad buttons (↑↓←→) in touch mode', async () => {
      stubTouchMode();
      const { stub } = await buildGame();
      const labels = (stub.add.text as any).mock.calls.map((c: any[]) => c[2]);
      expect(labels).toContain('↑');
      expect(labels).toContain('↓');
      expect(labels).toContain('←');
      expect(labels).toContain('→');
    });

    it('does not render D-pad buttons in keyboard mode', async () => {
      const { stub } = await buildGame();
      const labels = (stub.add.text as any).mock.calls.map((c: any[]) => c[2]);
      // Keyboard mode shows arrows inside a multi-line string, never as a standalone label.
      expect(labels).not.toContain('↑');
      expect(labels).not.toContain('↓');
      expect(labels).not.toContain('←');
      expect(labels).not.toContain('→');
    });

    it('tapping each D-pad button queues the matching direction on Pacman', async () => {
      stubTouchMode();
      const { scene, stub } = await buildGame();
      const pacman = (scene as any).pacman;
      const spy = vi.spyOn(pacman, 'queueDirection');

      const texts = (stub.add.text as any).mock.results.map((r: any) => r.value);
      const upBtn = texts.find((t: any) => t.text === '↑');
      const downBtn = texts.find((t: any) => t.text === '↓');
      const leftBtn = texts.find((t: any) => t.text === '←');
      const rightBtn = texts.find((t: any) => t.text === '→');

      upBtn._emit('pointerdown');
      expect(spy).toHaveBeenLastCalledWith(0, -1);
      downBtn._emit('pointerdown');
      expect(spy).toHaveBeenLastCalledWith(0, 1);
      leftBtn._emit('pointerdown');
      expect(spy).toHaveBeenLastCalledWith(-1, 0);
      rightBtn._emit('pointerdown');
      expect(spy).toHaveBeenLastCalledWith(1, 0);
    });

    it('D-pad buttons are setInteractive so taps register', async () => {
      stubTouchMode();
      const { stub } = await buildGame();
      const texts = (stub.add.text as any).mock.results.map((r: any) => r.value);
      for (const arrow of ['↑', '↓', '←', '→']) {
        const btn = texts.find((t: any) => t.text === arrow);
        expect(btn.setInteractive).toHaveBeenCalled();
      }
    });

    it('a tap during PLAYING does NOT restart the game', async () => {
      const { scene, stub } = await buildGame();
      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
      const mazeBefore = (scene as any).maze;

      stub._emitInput('pointerdown', { x: 50, y: 50 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect((scene as any).gameStateManager.getState()).toBe(GameState.PLAYING);
      expect((scene as any).maze).toBe(mazeBefore);
    });

    it('restart hint says "Tap" in touch mode', async () => {
      window.matchMedia = vi.fn((q: string) => ({
        matches: q === '(pointer: coarse)',
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      })) as any;
      const { scene } = await buildGame();
      const pacman = (scene as any).pacman;
      const ghosts = (scene as any).ghosts as any[];
      const wrongGhost = ghosts.find(g => !g.getIsCorrect());
      wrongGhost.x = pacman.x;
      wrongGhost.y = pacman.y;
      scene.update(0, 16);
      const restartText = (scene as any).gameOverRestartText;
      expect(restartText.text).toMatch(/Tap/i);
      expect(restartText.text).not.toMatch(/SPACE/);
    });
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
