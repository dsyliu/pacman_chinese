import { isPortrait, type Orientation } from './input';
import { BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT } from '../entities/Maze';

export interface CanvasDims {
  width: number;
  height: number;
}

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface MazeOffset {
  x: number;
  y: number;
}

// Lessons menu sits on the LEFT of the maze in landscape and ABOVE the
// maze in portrait. The maze is shifted by these amounts to make room.
export const LESSON_PANEL_WIDTH = 128;
export const LESSON_BAR_HEIGHT = 60;

// Landscape: lessons | maze (896) | scoreboard. Width = 128 + 896 + 256 = 1280.
export const LANDSCAPE_CANVAS: CanvasDims = { width: 1280, height: 1112 };

// Portrait: lessons bar (60) on top, maze (896×992), sentence/translation,
// then a horizontally-laid-out scoreboard. Width matches the maze.
export const PORTRAIT_CANVAS: CanvasDims = { width: BOARD_PIXEL_WIDTH, height: 1560 };

// Below the sentence/translation strip (which sits ~120px below the maze).
export const PORTRAIT_PANEL_Y = LESSON_BAR_HEIGHT + BOARD_PIXEL_HEIGHT + 140;

export function getCanvasDimensions(): CanvasDims {
  return isPortrait() ? PORTRAIT_CANVAS : LANDSCAPE_CANVAS;
}

export function getMazeOffset(orientation: Orientation): MazeOffset {
  if (orientation === 'portrait') {
    return { x: 0, y: LESSON_BAR_HEIGHT };
  }
  return { x: LESSON_PANEL_WIDTH, y: 0 };
}

export function getPanelRect(orientation: Orientation): PanelRect {
  if (orientation === 'portrait') {
    return { x: 0, y: PORTRAIT_PANEL_Y, width: PORTRAIT_CANVAS.width };
  }
  // Scoreboard sits to the right of the (now-shifted) maze.
  return {
    x: LESSON_PANEL_WIDTH + BOARD_PIXEL_WIDTH,
    y: 0,
    width: LANDSCAPE_CANVAS.width - LESSON_PANEL_WIDTH - BOARD_PIXEL_WIDTH
  };
}

export function getLessonRect(orientation: Orientation): PanelRect {
  if (orientation === 'portrait') {
    return { x: 0, y: 0, width: PORTRAIT_CANVAS.width, height: LESSON_BAR_HEIGHT };
  }
  return { x: 0, y: 0, width: LESSON_PANEL_WIDTH };
}
