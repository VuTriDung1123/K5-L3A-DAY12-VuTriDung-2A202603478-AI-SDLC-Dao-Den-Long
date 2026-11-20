/**
 * Procedural Web Audio synthesizer for Dao Den Long.
 * Zero external audio assets required; all sounds are synthesized gently in real time.
 */
export class SoundBank {
  private ctx: AudioContext | null = null;
  muted = false;

  unlock(): void {
    if (this.muted || typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  playPickup(): void {
    this.tone(784, 1046, 0.14, "sine", 0.08);
  }

  playDeposit(lit: boolean): void {
    if (lit) {
      this.tone(523.25, 784, 0.35, "triangle", 0.11);
      setTimeout(() => this.tone(659.25, 1046.5, 0.42, "sine", 0.09), 90);
    } else {
      this.tone(440, 587, 0.18, "triangle", 0.08);
    }
  }

  playPulse(): void {
    this.tone(330, 880, 0.32, "sine", 0.11);
  }

  playHit(): void {
    this.tone(180, 82, 0.24, "sawtooth", 0.07);
  }

  playGameOver(won: boolean): void {
    if (won) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        setTimeout(() => this.tone(freq, freq * 1.02, 0.32, "sine", 0.09), i * 110);
      });
    } else {
      this.tone(329.6, 196, 0.5, "triangle", 0.09);
    }
  }

  private tone(
    startFreq: number,
    endFreq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }
}
