// Procedural WebAudio blips with a global mute. The AudioContext comes from the host (dom.ts), is created lazily
// and resumed on the first user gesture, as mobile browsers require.

export type AudioContextFactory = () => AudioContext | null;

export interface BlipOptions {
  freq: number;
  /** Seconds. */
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Frequency to slide to by the end of the blip. */
  slideTo?: number;
  /** Seconds from now to start. */
  delay?: number;
}

export class Sound {
  muted: boolean;
  private ctx: AudioContext | null = null;

  constructor(
    private readonly factory: AudioContextFactory,
    muted = false,
  ) {
    this.muted = muted;
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) this.ctx = this.factory();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
  }

  blip({ freq, duration = 0.08, type = 'square', gain = 0.08, slideTo, delay = 0 }: BlipOptions): void {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Short filtered-noise burst (splashes, crashes). */
  noise(duration = 0.25, gain = 0.1): void {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Deterministic noise (no Math.random): audio never feeds back into the simulation, but keep runs reproducible.
    let x = 12345;
    for (let i = 0; i < len; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      data[i] = ((x / 0x7fffffff) * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    amp.gain.value = gain;
    src.buffer = buf;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  }
}

/**
 * Heartbeat: a low "lub-dub" whose rate the game sets every step (e.g. from the nearest threat's distance).
 * Call update() from the simulation step; beats are counted in simulated time.
 */
export class Heartbeat {
  private phase = 0;
  beats = 0;

  constructor(private readonly sound: Sound | undefined) {}

  /** Advance by dt seconds at `bpm` (0 = silent). Returns true on the step a beat fires. */
  update(dt: number, bpm: number): boolean {
    if (bpm <= 0) {
      this.phase = 0;
      return false;
    }
    this.phase += (dt * bpm) / 60;
    if (this.phase < 1) return false;
    this.phase -= Math.floor(this.phase);
    this.beats++;
    // Present but under the effects (blips sit around 0.03–0.08).
    const gain = Math.min(0.1, 0.04 + bpm / 3000);
    this.sound?.blip({ freq: 62, slideTo: 40, duration: 0.11, type: 'sine', gain });
    this.sound?.blip({ freq: 55, slideTo: 36, duration: 0.1, type: 'sine', gain: gain * 0.7, delay: 0.16 });
    return true;
  }
}
