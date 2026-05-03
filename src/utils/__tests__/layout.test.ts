import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCanvasDimensions,
  LANDSCAPE_CANVAS,
  PORTRAIT_CANVAS,
  LESSON_PANEL_WIDTH,
  LESSON_BAR_HEIGHT,
  getPanelRect,
  getMazeOffset,
  getLessonRect
} from '../layout';
import { BOARD_PIXEL_WIDTH } from '../../entities/Maze';

function stubOrientation(portrait: boolean) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: portrait ? q === '(orientation: portrait)' : false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })) as any;
}

describe('getCanvasDimensions', () => {
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

  it('returns landscape dimensions when not in portrait', () => {
    stubOrientation(false);
    expect(getCanvasDimensions()).toEqual(LANDSCAPE_CANVAS);
  });

  it('returns portrait dimensions when in portrait', () => {
    stubOrientation(true);
    expect(getCanvasDimensions()).toEqual(PORTRAIT_CANVAS);
  });

  it('landscape canvas accommodates lesson column + maze + scoreboard', () => {
    expect(LANDSCAPE_CANVAS.width).toBeGreaterThanOrEqual(LESSON_PANEL_WIDTH + BOARD_PIXEL_WIDTH);
  });

  it('portrait canvas accommodates lesson bar + maze height', () => {
    expect(PORTRAIT_CANVAS.height).toBeGreaterThan(PORTRAIT_CANVAS.width);
    expect(PORTRAIT_CANVAS.width).toBe(BOARD_PIXEL_WIDTH);
  });
});

describe('getMazeOffset', () => {
  it('shifts the maze right in landscape to leave room for the lesson column', () => {
    expect(getMazeOffset('landscape')).toEqual({ x: LESSON_PANEL_WIDTH, y: 0 });
  });

  it('shifts the maze down in portrait to leave room for the lesson bar', () => {
    expect(getMazeOffset('portrait')).toEqual({ x: 0, y: LESSON_BAR_HEIGHT });
  });
});

describe('getLessonRect', () => {
  it('in landscape, the lesson column hugs the left edge', () => {
    const rect = getLessonRect('landscape');
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(LESSON_PANEL_WIDTH);
  });

  it('in portrait, the lesson row spans the full canvas width at the top', () => {
    const rect = getLessonRect('portrait');
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(PORTRAIT_CANVAS.width);
  });
});

describe('getPanelRect', () => {
  it('in landscape, the scoreboard sits to the right of the (shifted) maze', () => {
    const rect = getPanelRect('landscape');
    expect(rect.x).toBe(LESSON_PANEL_WIDTH + BOARD_PIXEL_WIDTH);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(LANDSCAPE_CANVAS.width - LESSON_PANEL_WIDTH - BOARD_PIXEL_WIDTH);
  });

  it('in portrait, the scoreboard sits below the sentence (x = 0, y > maze bottom + lesson bar)', () => {
    const rect = getPanelRect('portrait');
    expect(rect.x).toBe(0);
    expect(rect.y).toBeGreaterThan(992 + LESSON_BAR_HEIGHT);
    expect(rect.width).toBe(PORTRAIT_CANVAS.width);
  });
});
