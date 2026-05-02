import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCanvasDimensions,
  LANDSCAPE_CANVAS,
  PORTRAIT_CANVAS,
  getPanelRect
} from '../layout';

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

  it('landscape canvas is wider than tall and portrait is taller than wide', () => {
    expect(LANDSCAPE_CANVAS.width).toBeGreaterThanOrEqual(LANDSCAPE_CANVAS.height);
    expect(PORTRAIT_CANVAS.height).toBeGreaterThan(PORTRAIT_CANVAS.width);
  });

  it('portrait width matches the maze board width so the maze fills the canvas horizontally', () => {
    expect(PORTRAIT_CANVAS.width).toBe(896);
  });
});

describe('getPanelRect', () => {
  it('in landscape, the panel sits to the right of the maze (x = 896, y = 0)', () => {
    const rect = getPanelRect('landscape');
    expect(rect.x).toBe(896);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(LANDSCAPE_CANVAS.width - 896);
  });

  it('in portrait, the panel sits below the sentence (x = 0, y > maze bottom)', () => {
    const rect = getPanelRect('portrait');
    expect(rect.x).toBe(0);
    expect(rect.y).toBeGreaterThan(992); // below the 28x31 maze
    expect(rect.width).toBe(PORTRAIT_CANVAS.width);
  });
});
