
class AudioEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    this.init();
    this.beep(440, 0.05, 'square');
  }

  playMatch() {
    this.init();
    this.beep(660, 0.1, 'sine');
    setTimeout(() => this.beep(880, 0.1, 'sine'), 50);
  }

  playSummon() {
    this.init();
    this.beep(220, 0.2, 'sawtooth', 0.1);
  }

  playAttack(isRanged: boolean) {
    this.init();
    if (isRanged) {
      this.noise(0.1, 0.1, 0.05);
    } else {
      this.beep(150, 0.05, 'square', 0.1);
    }
  }

  playHit() {
    this.init();
    this.noise(0.05, 0.05, 0.2);
  }

  playVictory() {
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, 0.2, 'triangle'), i * 150);
    });
  }

  playDefeat() {
    this.init();
    const notes = [392.00, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, 0.3, 'sawtooth'), i * 200);
    });
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private noise(duration: number, volume = 0.1, decay = 0.1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration + decay);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }
}

export const audio = new AudioEngine();
