import Phaser from 'phaser';

export class AudioManager {
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private backgroundMusicInterval: number | null = null;
  private nextPatternTime: number = 0;
  private bgMasterGain: GainNode | null = null;

  constructor(_scene: Phaser.Scene) {
    this.initializeAudio();
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

  private playNote(
    frequency: number,
    startTime: number,
    duration: number,
    gain: number = 0.08,
    type: OscillatorType = 'square',
    destination?: AudioNode
  ): void {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const g = this.audioContext.createGain();
    osc.connect(g);
    g.connect(destination ?? this.audioContext.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private createBackgroundMusic(): void {
    if (!this.audioContext) return;

    // Master gain for instant cutoff on stopBackgroundMusic
    this.bgMasterGain = this.audioContext.createGain();
    this.bgMasterGain.gain.setValueAtTime(1, this.audioContext.currentTime);
    this.bgMasterGain.connect(this.audioContext.destination);

    // 16-note upbeat I-vi-IV-V arpeggio loop (~1.6 s)
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

    const noteDuration = 0.10;
    const patternDuration = melody.length * noteDuration;

    const schedulePattern = (startTime: number) => {
      melody.forEach((freq, i) => {
        this.playNote(freq, startTime + i * noteDuration, noteDuration * 0.85, 0.08, 'square', this.bgMasterGain!);
      });
    };

    this.nextPatternTime = this.audioContext.currentTime + 0.05;
    schedulePattern(this.nextPatternTime);
    this.nextPatternTime += patternDuration;

    this.backgroundMusicInterval = window.setInterval(() => {
      if (this.isMuted || !this.audioContext) return;
      if (this.nextPatternTime - this.audioContext.currentTime < 0.4) {
        schedulePattern(this.nextPatternTime);
        this.nextPatternTime += patternDuration;
      }
    }, 200);
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
    
    // Stop any existing background music
    this.stopBackgroundMusic();
    
    // Start new background music
    this.createBackgroundMusic();
  }

  stopBackgroundMusic(): void {
    if (this.backgroundMusicInterval) {
      clearInterval(this.backgroundMusicInterval);
      this.backgroundMusicInterval = null;
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
