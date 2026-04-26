import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', async () => {
  const mock = await import('../../test-utils/phaserMock');
  return { default: mock.default };
});

import { CharacterGhost } from '../CharacterGhost';
import { Maze, TILE_SIZE } from '../Maze';
import { createSceneStub } from '../../test-utils/phaserMock';

function spawn(char: string, isCorrect: boolean, col: number = 13, row: number = 24) {
  const scene = createSceneStub();
  const maze = new Maze(scene as any, 0);
  const w = maze.tileToWorld(col, row);
  const ghost = new CharacterGhost(scene as any, w.x, w.y, char, isCorrect, maze);
  return { scene, maze, ghost };
}

describe('CharacterGhost', () => {
  it('exposes its character and correctness', () => {
    const { ghost } = spawn('愛', true);
    expect(ghost.getCharacter()).toBe('愛');
    expect(ghost.getIsCorrect()).toBe(true);
  });

  it('reports its grid position consistent with its world position', () => {
    const { ghost } = spawn('愛', true, 6, 1);
    expect(ghost.getGridX()).toBe(6);
    expect(ghost.getGridY()).toBe(1);
  });

  it('collect() flags the ghost as collected and stops further updates', () => {
    const { ghost } = spawn('恨', false, 6, 1);
    ghost.collect();
    expect(ghost.isCollected()).toBe(true);
    const x0 = ghost.x;
    ghost.update(1000);
    expect(ghost.x).toBe(x0);
  });

  it('picks a direction at the spawn intersection and starts moving', () => {
    const { ghost } = spawn('愛', true, 6, 1);
    const x0 = ghost.x;
    const y0 = ghost.y;
    ghost.update(100);
    const moved = ghost.x !== x0 || ghost.y !== y0;
    expect(moved).toBe(true);
  });

  it('getWorldPosition reports the current x/y', () => {
    const { ghost } = spawn('愛', true, 6, 1);
    const p = ghost.getWorldPosition();
    expect(p.x).toBe(ghost.x);
    expect(p.y).toBe(ghost.y);
  });

  it('moves only along path tiles (never into a wall)', () => {
    const { ghost, maze } = spawn('愛', true, 6, 1);
    for (let i = 0; i < 200; i++) {
      ghost.update(16);
      const col = Math.floor(ghost.x / TILE_SIZE);
      const row = Math.floor(ghost.y / TILE_SIZE);
      expect(maze.isWall(col, row)).toBe(false);
    }
  });
});
