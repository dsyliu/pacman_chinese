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
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn()
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

  it('resume() calls AudioContext.resume() when context is suspended', () => {
    const resumeFn = vi.fn();
    const suspendedCtx: any = {
      ...makeMockAudioContext(),
      state: 'suspended',
      resume: resumeFn
    };
    vi.stubGlobal('AudioContext', vi.fn(() => suspendedCtx));
    const am = new AudioManager({} as any);
    am.resume();
    expect(resumeFn).toHaveBeenCalled();
  });

  it('resume() is a no-op when context is already running', () => {
    const resumeFn = vi.fn();
    const runningCtx: any = {
      ...makeMockAudioContext(),
      state: 'running',
      resume: resumeFn
    };
    vi.stubGlobal('AudioContext', vi.fn(() => runningCtx));
    const am = new AudioManager({} as any);
    am.resume();
    expect(resumeFn).not.toHaveBeenCalled();
  });

  it('playBackgroundMusic defers music scheduling until AudioContext resume resolves (Android first-launch fix)', async () => {
    let resolveResume: () => void = () => {};
    const resumePromise = new Promise<void>(r => { resolveResume = r; });
    const suspendedCtx: any = {
      ...makeMockAudioContext(),
      state: 'suspended',
      resume: vi.fn(() => resumePromise)
    };
    vi.stubGlobal('AudioContext', vi.fn(() => suspendedCtx));

    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    // Resume hasn't resolved yet → only the synchronous warmup oscillator
    // (one) should have been created. The 16-note melody must be deferred
    // so it doesn't fire silently against a still-suspended currentTime.
    expect(suspendedCtx.createOscillator).toHaveBeenCalledTimes(1);
    const callsAfterWarmup = suspendedCtx.createOscillator.mock.calls.length;

    suspendedCtx.state = 'running';
    resolveResume();
    // Flush enough microtask hops to drain the resume().then().catch() chain.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(suspendedCtx.createOscillator.mock.calls.length).toBeGreaterThan(callsAfterWarmup);
  });

  it('playBackgroundMusic primes the audio pipeline with a zero-gain warmup oscillator inside the user gesture (Android fix)', () => {
    // Android Chrome silently drops audio for oscillators created outside
    // the originating user gesture. The warmup ensures the browser sees
    // audio creation inside the gesture so the deferred music scheduling
    // actually produces sound.
    const suspendedCtx: any = {
      ...makeMockAudioContext(),
      state: 'suspended',
      resume: vi.fn(() => new Promise(() => {})) // never resolves
    };
    vi.stubGlobal('AudioContext', vi.fn(() => suspendedCtx));

    const am = new AudioManager({} as any);
    am.playBackgroundMusic();

    // Exactly one oscillator (the warmup) should have been created
    // synchronously, even though resume() never resolves.
    expect(suspendedCtx.createOscillator).toHaveBeenCalledTimes(1);
    // First gain node belongs to the warmup and must be zero-gain so it
    // doesn't actually emit sound.
    const warmupGain = suspendedCtx.createGain.mock.results[0].value;
    expect(warmupGain.gain.value).toBe(0);
  });

  it('stopBackgroundMusic ramps the master gain to zero so queued notes go silent', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    // First createGain call is the warmup oscillator's gain (zero-gain primer
    // for Android). The bg master gain is the second createGain call,
    // created at the start of createBackgroundMusic before any notes.
    const masterGain = ctx.createGain.mock.results[1].value;
    am.stopBackgroundMusic();
    expect(masterGain.gain.cancelScheduledValues).toHaveBeenCalled();
    const rampCalls = masterGain.gain.linearRampToValueAtTime.mock.calls;
    const rampedToZero = rampCalls.some((c: any[]) => c[0] === 0);
    expect(rampedToZero).toBe(true);
  });
});
