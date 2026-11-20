/**
 * Procedural Web Audio bank with night ambient music and sound effects
 * for every Phase 2 event (pickup, lantern lit, pulse, hit, jump, dash,
 * win, lose, shade spawn, 10s countdown, and wind warning).
 */
export class SoundBank {
  private ctx: AudioContext | null = null;
  private volume = 0.7;
  private musicTimer: number | null = null;
  private musicStep = 0;

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  getVolume(): number {
    return this.volume;
  }

  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  startAmbient(): void {
    if (this.musicTimer !== null || typeof window === "undefined") return;
    const pentatonic = [220, 261.63, 293.66, 329.63, 392.0, 329.63, 293.66, 261.63];
    this.musicTimer = window.setInterval(() => {
      if (this.volume <= 0.01) return;
      const freq = pentatonic[this.musicStep % pentatonic.length];
      this.musicStep += 1;
      this.tone(freq, freq * 1.005, 0.95, "sine", 0.025);
    }, 1100);
  }

  stopAmbient(): void {
    if (this.musicTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playPickup(): void {
    this.tone(784, 1046, 0.14, "sine", 0.11);
  }

  playCharm(): void {
    this.tone(587.3, 1174.6, 0.28, "triangle", 0.13);
  }

  playDeposit(lit: boolean): void {
    if (lit) {
      this.tone(523.25, 784, 0.35, "triangle", 0.13);
      setTimeout(() => this.tone(659.25, 1046.5, 0.42, "sine", 0.11), 90);
    } else {
      this.tone(440, 587, 0.18, "triangle", 0.1);
    }
  }

  playPulse(): void {
    this.tone(330, 880, 0.34, "sine", 0.14);
  }

  playJump(): void {
    this.tone(260, 480, 0.12, "sine", 0.08);
  }

  playDash(): void {
    this.tone(520, 220, 0.14, "triangle", 0.1);
  }

  playHit(): void {
    this.tone(180, 78, 0.26, "sawtooth", 0.09);
  }

  playShadeSpawn(): void {
    this.tone(130, 98, 0.35, "sine", 0.08);
  }

  playCountdownTick(): void {
    this.tone(880, 880, 0.08, "sine", 0.09);
  }

  playWindWarn(): void {
    this.tone(240, 420, 0.55, "sine", 0.06);
  }

  playGameOver(won: boolean): void {
    if (won) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        setTimeout(() => this.tone(freq, freq * 1.02, 0.32, "sine", 0.12), i * 110);
      });
    } else {
      this.tone(329.6, 174.6, 0.55, "triangle", 0.12);
    }
  }

  private tone(
    startFreq: number,
    endFreq: number,
    durationSec: number,
    type: OscillatorType,
    baseVolume: number
  ): void {
    const vol = baseVolume * this.volume;
    if (vol <= 0.001 || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }
}
