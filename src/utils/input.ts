export type InputMode = 'keyboard' | 'touch';

export function isTouchPrimary(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function detectInputMode(): InputMode {
  return isTouchPrimary() ? 'touch' : 'keyboard';
}
