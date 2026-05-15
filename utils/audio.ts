class AudioEngine {
  private ctx: AudioContext | null = null;
  private lastAttackTime = 0;
  private lastMoveTime = 0;
  private attackCooldown = 150;
  private moveCooldown = 200;

  private get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playClick() {
    this.beep(440, 0.05, 'square');
  }

  playMatch() {
    this.beep(660, 0.1, 'sine');
    this.scheduleBeep(880, 0.1, 'sine', 0.2, 0.05);
  }

  playSummon() {
    this.beep(220, 0.2, 'sawtooth', 0.1);
  }

  playAttack(isRanged: boolean, unitType?: string) {
    const now = Date.now();
    if (now - this.lastAttackTime < this.attackCooldown) return;
    this.lastAttackTime = now;

    if (isRanged) {
      this.arrowShoot();
    } else if (unitType === 'CAVALRY' || unitType === 'SPEARMAN') {
      this.thrustAttack();
    } else {
      this.meleeAttack();
    }
  }

  playHit(isHeavy: boolean = false) {
    if (isHeavy) {
      this.noise(0.08, 0.15, 0.1);
      this.beep(80, 0.15, 'sine', 0.15);
    } else {
      this.noise(0.03, 0.05, 0.1);
    }
  }

  playFootstep() {
    const now = Date.now();
    if (now - this.lastMoveTime < this.moveCooldown) return;
    this.lastMoveTime = now;
    this.beep(100 + Math.random() * 30, 0.03, 'sine', 0.02);
  }

  playCharge() {
    this.beep(200, 0.15, 'sawtooth', 0.1);
    this.scheduleBeep(300, 0.1, 'sawtooth', 0.08, 0.05);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      this.scheduleBeep(freq, 0.2, 'triangle', 0.2, i * 0.15);
    });
  }

  playDefeat() {
    const notes = [392.00, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      this.scheduleBeep(freq, 0.3, 'sawtooth', 0.2, i * 0.2);
    });
  }

  playError() {
    this.beep(220, 0.1, 'square');
    this.scheduleBeep(110, 0.1, 'square', 0.2, 0.1);
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, delay = 0) {
    const ctx = this.context;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  private scheduleBeep(freq: number, duration: number, type: OscillatorType, volume: number, delay: number) {
    this.beep(freq, duration, type, volume, delay);
  }

  private noise(duration: number, volume = 0.1, decay = 0.1) {
    const ctx = this.context;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + decay);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  private arrowShoot() {
    this.beepWithRamp(800, 1200, 0.08, 0.1, 'sine');
  }

  private meleeAttack() {
    this.noise(0.04, 0.06, 0.05);
    this.beep(200, 0.06, 'square', 0.05);
  }

  private thrustAttack() {
    this.beepWithRamp(150, 400, 0.06, 0.12, 'sawtooth');
  }

  private beepWithRamp(startFreq: number, endFreq: number, volume: number, duration: number, type: OscillatorType) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration * 0.8);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export const audio = new AudioEngine();
