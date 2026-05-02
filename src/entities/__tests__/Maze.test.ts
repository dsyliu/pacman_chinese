import { describe, it, expect, vi } from 'vitest';
import { LAYOUTS, Maze, TILE_SIZE } from '../Maze';
import { createSceneStub, createGraphicsStub } from '../../test-utils/phaserMock';

const EXPECTED_COLS = 28;
const EXPECTED_ROWS = 31;
const PACMAN_START_COL = 13;
const PACMAN_START_ROW = 24;

function floodFill(layout: string[], startCol: number, startRow: number): Set<string> {
  const seen = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const stack: Array<[number, number]> = [[startCol, startRow]];
  seen.add(key(startCol, startRow));
  while (stack.length > 0) {
    const [c, r] = stack.pop()!;
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= layout[0].length || nr < 0 || nr >= layout.length) continue;
      if (layout[nr][nc] === '#') continue;
      if (seen.has(key(nc, nr))) continue;
      seen.add(key(nc, nr));
      stack.push([nc, nr]);
    }
  }
  return seen;
}

function countPathTiles(layout: string[]): number {
  let count = 0;
  for (const row of layout) {
    for (const ch of row) {
      if (ch === '.') count++;
    }
  }
  return count;
}

describe('Maze LAYOUTS', () => {
  it('has at least one layout', () => {
    expect(LAYOUTS.length).toBeGreaterThan(0);
  });

  describe.each(LAYOUTS.map((layout, i) => ({ index: i, layout })))(
    'layout $index',
    ({ layout }) => {
      it(`has exactly ${EXPECTED_ROWS} rows`, () => {
        expect(layout.length).toBe(EXPECTED_ROWS);
      });

      it(`has every row exactly ${EXPECTED_COLS} characters wide`, () => {
        const offenders = layout
          .map((row, r) => ({ r, len: row.length }))
          .filter(({ len }) => len !== EXPECTED_COLS);
        expect(offenders).toEqual([]);
      });

      it('contains only "#" and "." characters', () => {
        const offenders: Array<{ r: number; c: number; ch: string }> = [];
        layout.forEach((row, r) => {
          for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch !== '#' && ch !== '.') offenders.push({ r, c, ch });
          }
        });
        expect(offenders).toEqual([]);
      });

      it(`has a path tile at the Pacman start (col ${PACMAN_START_COL}, row ${PACMAN_START_ROW})`, () => {
        expect(layout[PACMAN_START_ROW][PACMAN_START_COL]).toBe('.');
      });

      it('has no 2x2 open blocks (corridors must be 1 tile wide)', () => {
        const offenders: Array<{ c: number; r: number }> = [];
        for (let r = 0; r < layout.length - 1; r++) {
          for (let c = 0; c < layout[0].length - 1; c++) {
            if (
              layout[r][c] === '.' &&
              layout[r][c + 1] === '.' &&
              layout[r + 1][c] === '.' &&
              layout[r + 1][c + 1] === '.'
            ) {
              offenders.push({ c, r });
            }
          }
        }
        expect(offenders).toEqual([]);
      });

      it('has every path tile reachable from the Pacman start', () => {
        const reachable = floodFill(layout, PACMAN_START_COL, PACMAN_START_ROW);
        const total = countPathTiles(layout);
        expect(reachable.size).toBe(total);
      });

      it('matches the canonical 28x31 dimensions on the Maze class', () => {
        expect(Maze.COLS).toBe(28);
        expect(Maze.ROWS).toBe(31);
      });

      it('has a fully enclosed wall border', () => {
        const lastRow = layout.length - 1;
        const lastCol = layout[0].length - 1;
        const offenders: Array<{ c: number; r: number; side: string }> = [];
        for (let c = 0; c < layout[0].length; c++) {
          if (layout[0][c] !== '#') offenders.push({ c, r: 0, side: 'top' });
          if (layout[lastRow][c] !== '#') offenders.push({ c, r: lastRow, side: 'bottom' });
        }
        for (let r = 0; r < layout.length; r++) {
          if (layout[r][0] !== '#') offenders.push({ c: 0, r, side: 'left' });
          if (layout[r][lastCol] !== '#') offenders.push({ c: lastCol, r, side: 'right' });
        }
        expect(offenders).toEqual([]);
      });
    }
  );
});

describe('Maze class', () => {
  it('exposes LAYOUT_COUNT matching the LAYOUTS array', () => {
    expect(Maze.LAYOUT_COUNT).toBe(LAYOUTS.length);
  });

  it('renders walls into a graphics object on construction', () => {
    const scene = createSceneStub();
    const graphics = createGraphicsStub();
    scene.add.graphics = vi.fn(() => graphics);

    new Maze(scene as any, 0);
    expect(graphics.clear).toHaveBeenCalled();
    expect(graphics.fillRect).toHaveBeenCalled();
    expect(graphics.strokeRect).toHaveBeenCalled();
  });

  it('falls back to layout 0 when given an out-of-range index', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 999);
    const layout = LAYOUTS[0];
    for (let r = 0; r < layout.length; r++) {
      for (let c = 0; c < layout[r].length; c++) {
        const expectedWall = layout[r][c] === '#';
        expect(m.isWall(c, r)).toBe(expectedWall);
      }
    }
  });

  it('isWall reports walls and isPath reports paths consistently', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    expect(m.isWall(0, 0)).toBe(true);
    expect(m.isPath(0, 0)).toBe(false);
    expect(m.isPath(13, 24)).toBe(true);
    expect(m.isWall(13, 24)).toBe(false);
  });

  it('treats out-of-bounds coordinates as walls', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    expect(m.isWall(-1, 0)).toBe(true);
    expect(m.isWall(0, -1)).toBe(true);
    expect(m.isWall(Maze.COLS, 0)).toBe(true);
    expect(m.isWall(0, Maze.ROWS)).toBe(true);
  });

  it('tileToWorld returns the center pixel of the tile', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    expect(m.tileToWorld(0, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 });
    expect(m.tileToWorld(2, 3)).toEqual({
      x: 2 * TILE_SIZE + TILE_SIZE / 2,
      y: 3 * TILE_SIZE + TILE_SIZE / 2
    });
  });

  it('worldToTile is the inverse of tileToWorld for tile centers', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    for (const [c, r] of [[0, 0], [5, 7], [13, 24]]) {
      const w = m.tileToWorld(c, r);
      expect(m.worldToTile(w.x, w.y)).toEqual({ col: c, row: r });
    }
  });

  it('getPathTiles returns every non-wall cell exactly once', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    const tiles = m.getPathTiles();
    const keys = new Set(tiles.map(t => `${t.col},${t.row}`));
    expect(keys.size).toBe(tiles.length);
    for (const { col, row } of tiles) {
      expect(m.isPath(col, row)).toBe(true);
    }
  });

  it('getPixelWidth and getPixelHeight match COLS*TILE_SIZE and ROWS*TILE_SIZE', () => {
    const scene = createSceneStub();
    const m = new Maze(scene as any, 0);
    expect(m.getPixelWidth()).toBe(Maze.COLS * TILE_SIZE);
    expect(m.getPixelHeight()).toBe(Maze.ROWS * TILE_SIZE);
  });

  it('destroy cleans up wall and dot graphics', () => {
    const scene = createSceneStub();
    const stubs: any[] = [];
    scene.add.graphics = vi.fn(() => {
      const s = createGraphicsStub();
      stubs.push(s);
      return s;
    });
    const m = new Maze(scene as any, 0);
    m.destroy();
    expect(stubs).toHaveLength(2);
    expect(stubs[0].destroy).toHaveBeenCalledOnce();
    expect(stubs[1].destroy).toHaveBeenCalledOnce();
  });

  it('hasDot is false on every tile before spawnDots is called', () => {
    const m = new Maze(createSceneStub() as any, 0);
    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        expect(m.hasDot(c, r)).toBe(false);
      }
    }
  });

  it('spawnDots places a dot on every path tile except the excluded one', () => {
    const m = new Maze(createSceneStub() as any, 0);
    m.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);

    expect(m.hasDot(PACMAN_START_COL, PACMAN_START_ROW)).toBe(false);
    for (let r = 0; r < Maze.ROWS; r++) {
      for (let c = 0; c < Maze.COLS; c++) {
        if (m.isWall(c, r)) {
          expect(m.hasDot(c, r)).toBe(false);
        } else if (c === PACMAN_START_COL && r === PACMAN_START_ROW) {
          expect(m.hasDot(c, r)).toBe(false);
        } else {
          expect(m.hasDot(c, r)).toBe(true);
        }
      }
    }
  });

  it('tryEatDot removes a present dot and returns true; subsequent calls return false', () => {
    const m = new Maze(createSceneStub() as any, 0);
    m.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);

    const tile = m.getPathTiles().find(t => t.col !== PACMAN_START_COL || t.row !== PACMAN_START_ROW)!;
    expect(m.hasDot(tile.col, tile.row)).toBe(true);
    expect(m.tryEatDot(tile.col, tile.row)).toBe(true);
    expect(m.hasDot(tile.col, tile.row)).toBe(false);
    expect(m.tryEatDot(tile.col, tile.row)).toBe(false);
  });

  it('tryEatDot on a wall tile returns false', () => {
    const m = new Maze(createSceneStub() as any, 0);
    m.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);

    const wallTile = (() => {
      for (let r = 0; r < Maze.ROWS; r++) {
        for (let c = 0; c < Maze.COLS; c++) {
          if (m.isWall(c, r)) return { col: c, row: r };
        }
      }
      throw new Error('no wall found');
    })();
    expect(m.tryEatDot(wallTile.col, wallTile.row)).toBe(false);
  });

  it('tryEatDot on out-of-bounds coordinates returns false', () => {
    const m = new Maze(createSceneStub() as any, 0);
    m.spawnDots(PACMAN_START_COL, PACMAN_START_ROW);
    expect(m.tryEatDot(-1, 0)).toBe(false);
    expect(m.tryEatDot(0, -1)).toBe(false);
    expect(m.tryEatDot(Maze.COLS, 0)).toBe(false);
    expect(m.tryEatDot(0, Maze.ROWS)).toBe(false);
  });
});
