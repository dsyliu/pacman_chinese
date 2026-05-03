import Phaser from 'phaser';

interface AudioDebugInfo {
  resumeAttempts: number;
  suspendedAtPlayCount: number;
  startCalls: number;
  stopCalls: number;
  warmupCalls: number;
  bufferBuilt: boolean;
  lastResumeError: string;
}

export interface AudioDebugSnapshot extends AudioDebugInfo {
  state: string;
  currentTime: number;
  isMuted: boolean;
}

export class AudioManager {
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private bgMasterGain: GainNode | null = null;
  private bgBuffer: AudioBuffer | null = null;
  private bgSource: AudioBufferSourceNode | null = null;
  private debugInfo: AudioDebugInfo = {
    resumeAttempts: 0,
    suspendedAtPlayCount: 0,
    startCalls: 0,
    stopCalls: 0,
    warmupCalls: 0,
    bufferBuilt: false,
    lastResumeError: ''
  };

  constructor(_scene: Phaser.Scene) {
    this.initializeAudio();
    // Pre-build the music buffer at construction so playBackgroundMusic
    // does no synthesis inside the user gesture — only node creation +
    // start(), keeping the in-gesture work as small as possible.
    if (this.audioContext) {
      this.bgBuffer = this.buildBackgroundBuffer();
      this.debugInfo.bufferBuilt = this.bgBuffer !== null;
    }
  }

  getDebugSnapshot(): AudioDebugSnapshot {
    return {
      state: this.audioContext?.state ?? 'no-ctx',
      currentTime: this.audioContext?.currentTime ?? 0,
      isMuted: this.isMuted,
      ...this.debugInfo
    };
  }

  private initializeAudio(): void {
    // Initialize Web Audio API
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported');
      return;
    }
    this.installAutoResume();
  }

  private installAutoResume(): void {
    if (typeof window === 'undefined' || !this.audioContext) return;
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'];
    const handler = () => {
      this.resume();
      events.forEach(e => {
        window.removeEventListener(e, handler, true);
        if (typeof document !== 'undefined') {
          document.removeEventListener(e, handler, true);
        }
      });
    };
    events.forEach(e => {
      // capture phase so we still see the event even if Phaser/the canvas
      // calls stopPropagation in a later listener
      window.addEventListener(e, handler, true);
      if (typeof document !== 'undefined') {
        document.addEventListener(e, handler, true);
      }
    });
  }

  resume(): void {
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended' && typeof this.audioContext.resume === 'function') {
        this.audioContext.resume();
      }
    } catch {
      // ignore
    }
  }

  private buildBackgroundBuffer(): AudioBuffer | null {
    if (!this.audioContext) return null;

    // 16-note upbeat I-vi-IV-V arpeggio (~1.6 s) pre-rendered into an
    // AudioBuffer so that playBackgroundMusic only needs to create one
    // AudioBufferSourceNode (not 16 oscillators per loop). Looping is
    // handled natively by the source's `loop = true`, which avoids the
    // out-of-gesture setInterval scheduling that Android Chrome silences.
    const melody = [
      // I  (C):  C  E  G  C5
      261.63, 329.63, 392.00, 523.25,
      // vi (Am): A  C5 E5 A5
      440.00, 523.25, 659.25, 880.00,
      // IV (F):  F  A  C5 F5
      349.23, 440.00, 523.25, 698.46,
      // V  (G):  G  B  D5 G5
      392.00, 493.88, 587.33, 783.99
    ];
    const noteSlot = 0.10;
    const playFraction = 0.85;
    const fadeIn = 0.004;
    const peakGain = 0.08;
    const sampleRate = this.audioContext.sampleRate;
    const samplesPerSlot = Math.max(1, Math.floor(noteSlot * sampleRate));
    const playSamples = Math.floor(noteSlot * playFraction * sampleRate);
    const fadeInSamples = Math.max(1, Math.floor(fadeIn * sampleRate));
    const totalSamples = melody.length * samplesPerSlot;

    const buffer = this.audioContext.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let n = 0; n < melody.length; n++) {
      const freq = melody[n];
      const noteStart = n * samplesPerSlot;
      const period = sampleRate / freq;
      for (let i = 0; i < samplesPerSlot; i++) {
        if (i >= playSamples) break;
        // Square wave from sample-aligned phase to avoid drift between notes.
        const square = (i % period) < period / 2 ? 1 : -1;
        let env: number;
        if (i < fadeInSamples) {
          env = peakGain * (i / fadeInSamples);
        } else {
          // Exponential decay from peakGain to ~0.001 over the rest of the
          // play window — same shape the oscillator path used.
          const decayProgress = (i - fadeInSamples) / Math.max(1, playSamples - fadeInSamples);
          env = peakGain * Math.pow(0.001 / peakGain, decayProgress);
        }
        data[noteStart + i] = square * env;
      }
    }
    return buffer;
  }

  private createVictoryMusic(): void {
    if (!this.audioContext) return;

    // Play a cheerful ascending melody (C, E, G, C - victory fanfare)
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    const startTime = this.audioContext.currentTime;
    
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const noteStart = startTime + index * 0.15;
      const noteDuration = 0.2;
      
      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(0.3, noteStart + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, noteStart + noteDuration);
      
      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteDuration);
    });
  }

  private createGameOverMusic(): void {
    if (!this.audioContext) return;

    // Play a descending sad melody (C, A, F, D - minor progression)
    const notes = [261.63, 220.00, 174.61, 146.83]; // C4, A3, F3, D3
    const startTime = this.audioContext.currentTime;
    
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sawtooth'; // More dramatic sound
      
      const noteStart = startTime + index * 0.2;
      const noteDuration = 0.3;
      
      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, noteStart + noteDuration);
      
      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteDuration);
    });
  }

  playBackgroundMusic(): void {
    if (this.isMuted || !this.audioContext) return;

    this.stopBackgroundMusic();

    this.warmupAudioPipeline();

    if (this.audioContext.state === 'suspended') {
      this.debugInfo.suspendedAtPlayCount++;
      if (typeof this.audioContext.resume === 'function') {
        this.debugInfo.resumeAttempts++;
        this.audioContext.resume().catch((err) => {
          this.debugInfo.lastResumeError = String(err);
        });
      }
    }

    if (!this.bgBuffer) {
      this.bgBuffer = this.buildBackgroundBuffer();
      this.debugInfo.bufferBuilt = this.bgBuffer !== null;
    }
    if (!this.bgBuffer) return;

    this.bgMasterGain = this.audioContext.createGain();
    this.bgMasterGain.gain.setValueAtTime(1, this.audioContext.currentTime);
    this.bgMasterGain.connect(this.audioContext.destination);

    this.bgSource = this.audioContext.createBufferSource();
    this.bgSource.buffer = this.bgBuffer;
    this.bgSource.loop = true;
    this.bgSource.connect(this.bgMasterGain);
    this.bgSource.start();
    this.debugInfo.startCalls++;
  }

  private warmupAudioPipeline(): void {
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const g = this.audioContext.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(this.audioContext.destination);
      const t = this.audioContext.currentTime;
      osc.start(t);
      osc.stop(t + 0.05);
      this.debugInfo.warmupCalls++;
    } catch {
      // ignore — warmup is best-effort
    }
  }

  stopBackgroundMusic(): void {
    if (this.bgSource) {
      try { this.bgSource.stop(); } catch { /* already stopped */ }
      try { this.bgSource.disconnect(); } catch { /* already disconnected */ }
      this.bgSource = null;
      this.debugInfo.stopCalls++;
    }
    if (this.audioContext && this.bgMasterGain) {
      const now = this.audioContext.currentTime;
      try {
        this.bgMasterGain.gain.cancelScheduledValues(now);
        this.bgMasterGain.gain.setValueAtTime(this.bgMasterGain.gain.value ?? 0, now);
        this.bgMasterGain.gain.linearRampToValueAtTime(0, now + 0.05);
      } catch {
        // ignore
      }
      this.bgMasterGain = null;
    }
  }

  playVictoryMusic(): void {
    this.stopBackgroundMusic();
    if (!this.isMuted && this.audioContext) {
      this.createVictoryMusic();
    }
  }

  playGameOverMusic(): void {
    this.stopBackgroundMusic();
    if (!this.isMuted && this.audioContext) {
      this.createGameOverMusic();
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  }
}
