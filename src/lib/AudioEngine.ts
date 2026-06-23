export class AudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Synth playback failed:", e);
    }
  }

  public click() {
    this.playTone(800, "sine", 0.1, 0.05);
  }

  public error() {
    this.playTone(150, "sawtooth", 0.3, 0.1);
  }

  public good() {
    this.playTone(400, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(600, "sine", 0.2, 0.1), 100);
  }

  public bad() {
    this.playTone(300, "square", 0.2, 0.1);
    setTimeout(() => this.playTone(200, "square", 0.3, 0.1), 150);
  }

  public alarm() {
    this.playTone(600, "square", 0.2, 0.05);
    setTimeout(() => this.playTone(400, "square", 0.2, 0.05), 200);
  }

  public mech() {
    this.playTone(100, "square", 0.5, 0.1);
    setTimeout(() => this.playTone(80, "sawtooth", 1.0, 0.1), 200);
  }
}

export const sfx = new AudioEngine();
