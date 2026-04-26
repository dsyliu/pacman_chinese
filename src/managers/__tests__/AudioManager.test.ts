import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';

let oscStarts: any[] = [];
let oscStops: any[] = [];
let connections: any[] = [];

function makeMockAudioContext() {
  const ctx = {
    currentTime: 0,
    destination: { name: 'dest' },
    createOscillator: vi.fn(() => {
      const o: any = {
        type: 'square',
        frequency: { value: 0 },
        connect: vi.fn((dest: any) => connections.push(['osc->', dest])),
        start: vi.fn((t: number) => oscStarts.push(t)),
        stop: vi.fn((t: number) => oscStops.push(t))
      };
      return o;
    }),
    createGain: vi.fn(() => {
      const g: any = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn((dest: any) => connections.push(['gain->', dest]))
      };
      return g;
    })
  };
  return ctx;
}

describe('AudioManager', () => {
  let ctx: ReturnType<typeof makeMockAudioContext>;

  beforeEach(() => {
    oscStarts = [];
    oscStops = [];
    connections = [];
    ctx = makeMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => ctx));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initializes a Web Audio context on construction', () => {
    new AudioManager({} as any);
    expect((globalThis as any).AudioContext).toHaveBeenCalled();
  });

  it('warns and continues when AudioContext is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    am.playVictoryMusic();
    am.playGameOverMusic();
    expect(warn).toHaveBeenCalled();
  });

  it('playBackgroundMusic schedules notes via oscillators', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(oscStarts.length).toBeGreaterThan(0);
  });

  it('stopBackgroundMusic clears the scheduling interval', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    const before = ctx.createOscillator.mock.calls.length;
    am.stopBackgroundMusic();
    vi.advanceTimersByTime(2000);
    const after = ctx.createOscillator.mock.calls.length;
    expect(after).toBe(before);
  });

  it('playBackgroundMusic re-schedules another pattern when the timer fires', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    const before = ctx.createOscillator.mock.calls.length;
    ctx.currentTime = 100;
    vi.advanceTimersByTime(400);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(before);
  });

  it('playVictoryMusic plays a short sequence of sine notes', () => {
    const am = new AudioManager({} as any);
    am.playVictoryMusic();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('playGameOverMusic plays a short descending sequence', () => {
    const am = new AudioManager({} as any);
    am.playGameOverMusic();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('setMuted(true) stops the loop and setMuted(false) restarts it', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    const before = ctx.createOscillator.mock.calls.length;
    am.setMuted(true);
    vi.advanceTimersByTime(2000);
    expect(ctx.createOscillator.mock.calls.length).toBe(before);

    am.setMuted(false);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(before);
  });

  it('does not schedule notes while muted', () => {
    const am = new AudioManager({} as any);
    am.setMuted(true);
    const before = ctx.createOscillator.mock.calls.length;
    am.playBackgroundMusic();
    am.playVictoryMusic();
    am.playGameOverMusic();
    expect(ctx.createOscillator.mock.calls.length).toBe(before);
  });
});
