import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';

let oscStarts: any[] = [];
let oscStops: any[] = [];
let connections: any[] = [];
let bufferSourceStarts: any[] = [];
let bufferSourceStops: any[] = [];

function makeMockAudioContext() {
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
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
    }),
    createBuffer: vi.fn((channels: number, samples: number, rate: number) => {
      return {
        numberOfChannels: channels,
        length: samples,
        sampleRate: rate,
        getChannelData: vi.fn(() => new Float32Array(samples))
      };
    }),
    createBufferSource: vi.fn(() => {
      const s: any = {
        buffer: null,
        loop: false,
        connect: vi.fn((dest: any) => connections.push(['bgsrc->', dest])),
        disconnect: vi.fn(),
        start: vi.fn((t?: number) => bufferSourceStarts.push(t ?? 0)),
        stop: vi.fn((t?: number) => bufferSourceStops.push(t ?? 0))
      };
      return s;
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
    bufferSourceStarts = [];
    bufferSourceStops = [];
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

  it('playBackgroundMusic creates a looping AudioBufferSourceNode and starts it', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    expect(ctx.createBufferSource).toHaveBeenCalled();
    expect(bufferSourceStarts.length).toBe(1);
    const source = ctx.createBufferSource.mock.results[0].value;
    expect(source.loop).toBe(true);
    expect(source.buffer).not.toBeNull();
  });

  it('playBackgroundMusic builds the background buffer once and reuses it across calls', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    am.stopBackgroundMusic();
    am.playBackgroundMusic();
    // Buffer is synthesized once (lazy) and cached for subsequent plays.
    expect(ctx.createBuffer).toHaveBeenCalledTimes(1);
    // But each play creates a fresh BufferSource (a source can only be
    // started once per the Web Audio spec).
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
  });

  it('stopBackgroundMusic stops the buffer source so the loop ends', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    am.stopBackgroundMusic();
    expect(bufferSourceStops.length).toBe(1);
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
    expect(bufferSourceStarts.length).toBe(1);

    am.setMuted(true);
    expect(bufferSourceStops.length).toBe(1);

    am.setMuted(false);
    expect(bufferSourceStarts.length).toBe(2);
  });

  it('does not schedule audio while muted', () => {
    const am = new AudioManager({} as any);
    am.setMuted(true);
    am.playBackgroundMusic();
    am.playVictoryMusic();
    am.playGameOverMusic();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
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

  it('playBackgroundMusic starts the loop synchronously inside the user gesture even when AudioContext is suspended (Android fix)', () => {
    // Android Chrome silently drops audio for nodes created OUTSIDE the
    // originating user gesture. The buffer-source approach lets us start
    // exactly one node in-gesture and have it loop forever in the audio
    // thread — no out-of-gesture setInterval scheduling.
    const suspendedCtx: any = {
      ...makeMockAudioContext(),
      state: 'suspended',
      resume: vi.fn(() => new Promise(() => {})) // never resolves
    };
    vi.stubGlobal('AudioContext', vi.fn(() => suspendedCtx));

    const am = new AudioManager({} as any);
    am.playBackgroundMusic();

    // Resume requested + buffer source created and started, all synchronously.
    expect(suspendedCtx.resume).toHaveBeenCalled();
    expect(suspendedCtx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(bufferSourceStarts.length).toBe(1);
  });

  it('playBackgroundMusic primes the audio pipeline with a zero-gain warmup oscillator inside the user gesture (Android fix)', () => {
    // The warmup ensures Android sees audio creation inside the gesture
    // before the buffer source is wired up.
    const suspendedCtx: any = {
      ...makeMockAudioContext(),
      state: 'suspended',
      resume: vi.fn(() => new Promise(() => {}))
    };
    vi.stubGlobal('AudioContext', vi.fn(() => suspendedCtx));

    const am = new AudioManager({} as any);
    am.playBackgroundMusic();

    // First gain node belongs to the warmup and must be zero-gain so it
    // doesn't actually emit sound.
    const warmupGain = suspendedCtx.createGain.mock.results[0].value;
    expect(warmupGain.gain.value).toBe(0);
  });

  it('stopBackgroundMusic ramps the master gain to zero so the loop goes silent', () => {
    const am = new AudioManager({} as any);
    am.playBackgroundMusic();
    // First createGain call is the warmup oscillator's gain. The bg master
    // gain is the second createGain call, created right before the buffer
    // source is wired up.
    const masterGain = ctx.createGain.mock.results[1].value;
    am.stopBackgroundMusic();
    expect(masterGain.gain.cancelScheduledValues).toHaveBeenCalled();
    const rampCalls = masterGain.gain.linearRampToValueAtTime.mock.calls;
    const rampedToZero = rampCalls.some((c: any[]) => c[0] === 0);
    expect(rampedToZero).toBe(true);
  });
});
