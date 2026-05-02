import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', async () => {
  const mock = await import('../../test-utils/phaserMock');
  return { default: mock.default };
});

import { Pacman } from '../Pacman';
import { Maze, TILE_SIZE } from '../Maze';
import { createSceneStub } from '../../test-utils/phaserMock';

function spawn(col: number = 13, row: number = 24) {
  const scene = createSceneStub();
  const maze = new Maze(scene as any, 0);
  const start = maze.tileToWorld(col, row);
  const pacman = new Pacman(scene as any, start.x, start.y, maze);
  return { scene, maze, pacman };
}

describe('Pacman', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spawns aligned to a tile center', () => {
    const { pacman } = spawn(13, 24);
    expect(pacman.x % TILE_SIZE).toBe(TILE_SIZE / 2);
    expect(pacman.y % TILE_SIZE).toBe(TILE_SIZE / 2);
  });

  it('reports its grid position correctly', () => {
    const { pacman } = spawn(13, 24);
    expect(pacman.getGridX()).toBe(13);
    expect(pacman.getGridY()).toBe(24);
  });

  it('stays put when no key is pressed', () => {
    const { pacman } = spawn();
    const x0 = pacman.x;
    const y0 = pacman.y;
    pacman.update(0, 16);
    expect(pacman.x).toBe(x0);
    expect(pacman.y).toBe(y0);
  });

  it('starts moving in the queued direction when input arrives', () => {
    const { scene, pacman } = spawn();
    const x0 = pacman.x;
    scene._cursorKeys.left.isDown = true;
    pacman.update(0, 100);
    expect(pacman.x).toBeLessThan(x0);
    expect(pacman.currentDirection.x).toBe(-1);
  });

  it('stops at the next tile center when running into a wall', () => {
    const { scene, pacman, maze } = spawn(13, 24);
    scene._cursorKeys.up.isDown = true;
    for (let i = 0; i < 200; i++) {
      pacman.update(0, 16);
    }
    const col = pacman.getGridX();
    const row = pacman.getGridY();
    expect(maze.isWall(col, row - 1)).toBe(true);
    expect(pacman.x).toBe(col * TILE_SIZE + TILE_SIZE / 2);
    expect(pacman.y).toBe(row * TILE_SIZE + TILE_SIZE / 2);
    expect(pacman.currentDirection.lengthSq()).toBe(0);
  });

  it('reverses direction immediately when the opposite key is pressed', () => {
    const { scene, pacman } = spawn();
    scene._cursorKeys.left.isDown = true;
    pacman.update(0, 50);
    expect(pacman.currentDirection.x).toBe(-1);
    scene._cursorKeys.left.isDown = false;
    scene._cursorKeys.right.isDown = true;
    pacman.update(0, 16);
    expect(pacman.currentDirection.x).toBe(1);
  });

  it('getWorldPosition returns the current x, y as a Vector2-ish object', () => {
    const { pacman } = spawn();
    const p = pacman.getWorldPosition();
    expect(p.x).toBe(pacman.x);
    expect(p.y).toBe(pacman.y);
  });

  it('animates the mouth while moving', () => {
    const { scene, pacman } = spawn();
    scene._cursorKeys.right.isDown = true;
    for (let i = 0; i < 5; i++) pacman.update(0, 16);
    expect((pacman as any).mouthAngle).toBeGreaterThan(0);
  });

  describe('swipe input', () => {
    it('queues a right move on a horizontal swipe right', () => {
      const { scene, pacman } = spawn(13, 24);
      const x0 = pacman.x;
      scene._emitInput('pointerdown', { x: 100, y: 100 });
      scene._emitInput('pointerup', { x: 200, y: 105 });
      pacman.update(0, 100);
      expect(pacman.x).toBeGreaterThan(x0);
      expect(pacman.currentDirection.x).toBe(1);
    });

    it('queues a left move on a horizontal swipe left', () => {
      const { scene, pacman } = spawn(13, 24);
      const x0 = pacman.x;
      scene._emitInput('pointerdown', { x: 200, y: 100 });
      scene._emitInput('pointerup', { x: 50, y: 90 });
      pacman.update(0, 100);
      expect(pacman.x).toBeLessThan(x0);
      expect(pacman.currentDirection.x).toBe(-1);
    });

    it('queues a down move on a vertical swipe down', () => {
      const { scene, pacman } = spawn(6, 9);
      const y0 = pacman.y;
      scene._emitInput('pointerdown', { x: 100, y: 100 });
      scene._emitInput('pointerup', { x: 105, y: 200 });
      pacman.update(0, 100);
      expect(pacman.y).toBeGreaterThan(y0);
      expect(pacman.currentDirection.y).toBe(1);
    });

    it('queues an up move on a vertical swipe up', () => {
      const { scene, pacman } = spawn(6, 9);
      const y0 = pacman.y;
      scene._emitInput('pointerdown', { x: 100, y: 200 });
      scene._emitInput('pointerup', { x: 90, y: 100 });
      pacman.update(0, 100);
      expect(pacman.y).toBeLessThan(y0);
      expect(pacman.currentDirection.y).toBe(-1);
    });

    it('ignores small movements below the swipe threshold (taps)', () => {
      const { scene, pacman } = spawn(13, 24);
      const x0 = pacman.x;
      const y0 = pacman.y;
      scene._emitInput('pointerdown', { x: 100, y: 100 });
      scene._emitInput('pointerup', { x: 110, y: 105 });
      pacman.update(0, 100);
      expect(pacman.x).toBe(x0);
      expect(pacman.y).toBe(y0);
    });

    it('picks the dominant axis on diagonal swipes', () => {
      const { scene, pacman } = spawn(13, 24);
      scene._emitInput('pointerdown', { x: 100, y: 100 });
      // dx=120 dominates dy=40 → horizontal
      scene._emitInput('pointerup', { x: 220, y: 140 });
      pacman.update(0, 100);
      expect(pacman.currentDirection.x).toBe(1);
      expect(pacman.currentDirection.y).toBe(0);
    });
  });
});
