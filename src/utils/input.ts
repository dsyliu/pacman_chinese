export type InputMode = 'keyboard' | 'touch';
export type Orientation = 'landscape' | 'portrait';

export function isTouchPrimary(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function detectInputMode(): InputMode {
  return isTouchPrimary() ? 'touch' : 'keyboard';
}

export function isPortrait(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(orientation: portrait)').matches;
}

export function detectOrientation(): Orientation {
  return isPortrait() ? 'portrait' : 'landscape';
}
