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
}

export const LANDSCAPE_CANVAS: CanvasDims = { width: 1152, height: 1112 };

// Portrait canvas: maze on top (896x992) + sentence + horizontally-laid-out
// score panel below. Width matches the maze so the maze fills the canvas
// horizontally. The compact horizontal panel is roughly 320px tall.
export const PORTRAIT_CANVAS: CanvasDims = { width: BOARD_PIXEL_WIDTH, height: 1500 };

// Below the sentence/translation strip (which sits ~120px below the maze).
export const PORTRAIT_PANEL_Y = BOARD_PIXEL_HEIGHT + 140;

export function getCanvasDimensions(): CanvasDims {
  return isPortrait() ? PORTRAIT_CANVAS : LANDSCAPE_CANVAS;
}

export function getPanelRect(orientation: Orientation): PanelRect {
  if (orientation === 'portrait') {
    return { x: 0, y: PORTRAIT_PANEL_Y, width: PORTRAIT_CANVAS.width };
  }
  return {
    x: BOARD_PIXEL_WIDTH,
    y: 0,
    width: LANDSCAPE_CANVAS.width - BOARD_PIXEL_WIDTH
  };
}
