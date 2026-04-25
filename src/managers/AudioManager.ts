import Phaser from 'phaser';

export class AudioManager {
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private backgroundMusicInterval: number | null = null;
  private nextPatternTime: number = 0;

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
  }

  private playNote(
    frequency: number,
    startTime: number,
    duration: number,
    gain: number = 0.08,
    type: OscillatorType = 'square'
  ): void {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const g = this.audioContext.createGain();
    osc.connect(g);
    g.connect(this.audioContext.destination);
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

    // Classic Pac-Man-style intro melody (4 phrases ascending by half-step)
    const REST = 0;
    const melody = [
      // Phrase 1
      523.25, 1046.50, 783.99, 659.25, 1046.50, 783.99, 659.25, REST,
      // Phrase 2 (up a half-step)
      554.37, 1108.73, 830.61, 698.46, 1108.73, 830.61, 698.46, REST,
      // Phrase 3 (up another half-step)
      587.33, 1174.66, 880.00, 698.46, 1174.66, 880.00, 698.46, REST,
      // Phrase 4 (chromatic walk-up resolution)
      622.25, 659.25, 698.46, 698.46, 739.99, 783.99, 830.61, 880.00
    ];

    const noteDuration = 0.11;
    const patternDuration = melody.length * noteDuration;

    const schedulePattern = (startTime: number) => {
      melody.forEach((freq, i) => {
        if (freq === REST) return;
        this.playNote(freq, startTime + i * noteDuration, noteDuration * 0.85);
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
