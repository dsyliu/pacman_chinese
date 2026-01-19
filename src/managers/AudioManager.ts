import Phaser from 'phaser';

export class AudioManager {
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private backgroundMusicInterval: number | null = null;

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

  private createBackgroundMusic(): void {
    if (!this.audioContext) return;

    // Create a pleasant background melody using multiple oscillators
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Simple melody pattern (C, E, G, C - C major chord progression)
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    let currentTime = this.audioContext.currentTime;
    const noteDuration = 0.3;
    const patternDuration = noteDuration * notes.length;

    const playPattern = () => {
      notes.forEach((freq, index) => {
        playNote(freq, currentTime + index * noteDuration, noteDuration * 0.8);
      });
      currentTime += patternDuration;
    };

    // Start the pattern
    playPattern();
    
    // Repeat the pattern
    this.backgroundMusicInterval = window.setInterval(() => {
      if (!this.isMuted) {
        playPattern();
      }
    }, patternDuration * 1000);
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
