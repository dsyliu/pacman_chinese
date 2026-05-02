import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isTouchPrimary } from '../input';

describe('isTouchPrimary', () => {
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

  it('returns true when (pointer: coarse) matches', () => {
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
    expect(isTouchPrimary()).toBe(true);
  });

  it('returns false when (pointer: coarse) does not match', () => {
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })) as any;
    expect(isTouchPrimary()).toBe(false);
  });

  it('returns false when matchMedia is unavailable (SSR safety)', () => {
    delete (window as any).matchMedia;
    expect(isTouchPrimary()).toBe(false);
  });

  it('queries the (pointer: coarse) media feature', () => {
    const spy = vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }));
    window.matchMedia = spy as any;
    isTouchPrimary();
    expect(spy).toHaveBeenCalledWith('(pointer: coarse)');
  });
});
