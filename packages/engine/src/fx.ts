// Render-side "adrenaline" effects shared by games: vignette, screen shake, flash, hit-stop.
// Pure canvas + time math (no DOM, no Math.random). All of them go quiet under reduced motion.
import { clamp } from './tween.ts';

/** Dark edges closing in. `strength` 0–1: 0 = none, 1 = only a small hole of light remains. */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number,
  color = '0,0,0',
  cx = w / 2,
  cy = h / 2,
): void {
  const s = clamp(strength, 0, 1);
  if (s <= 0) return;
  const outer = Math.hypot(w, h) * 0.75;
  const inner = outer * (1 - s) * 0.9;
  const g = ctx.createRadialGradient(cx, cy, Math.max(1, inner), cx, cy, outer);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${0.35 + 0.6 * s})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Screen shake driven by render time. trigger() on impact, offset() each frame. */
export class Shake {
  private until = 0;
  private amp = 0;

  trigger(now: number, amplitude = 8, duration = 0.3): void {
    this.until = Math.max(this.until, now + duration);
    this.amp = Math.max(this.amp * (this.until > now ? 1 : 0), amplitude);
  }

  offset(now: number, reducedMotion: boolean): { x: number; y: number } {
    if (reducedMotion || now >= this.until) {
      this.amp = 0;
      return { x: 0, y: 0 };
    }
    const k = this.amp * clamp((this.until - now) / 0.3, 0, 1);
    return { x: Math.sin(now * 91) * k, y: Math.cos(now * 73) * k * 0.6 };
  }
}

/** Full-screen colour flash that fades out (danger hit, near-miss). Reduced motion uses a softer, shorter flash. */
export class Flash {
  private at = -1;
  private color = '255,255,255';
  private dur = 0.25;

  trigger(now: number, color = '255,255,255', duration = 0.25): void {
    this.at = now;
    this.color = color;
    this.dur = duration;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, reducedMotion: boolean): void {
    if (this.at < 0) return;
    const t = (now - this.at) / this.dur;
    if (t >= 1 || t < 0) return;
    const peak = reducedMotion ? 0.25 : 0.55;
    ctx.fillStyle = `rgba(${this.color},${peak * (1 - t)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Hit-stop / slow-mo for the simulation: returns the dt the game should simulate with.
 * Deterministic: driven by simulated time only, so replays stay identical.
 */
export class TimeWarp {
  private left = 0;
  private scale = 1;

  /** Slow the sim to `scale` (e.g. 0.3) for `seconds` of real sim steps. */
  trigger(seconds: number, scale: number): void {
    this.left = Math.max(this.left, seconds);
    this.scale = scale;
  }

  apply(dt: number): number {
    if (this.left <= 0) return dt;
    this.left -= dt;
    return dt * this.scale;
  }

  get active(): boolean {
    return this.left > 0;
  }
}
