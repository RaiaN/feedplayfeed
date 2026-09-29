export type Easing = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
} satisfies Record<string, Easing>;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export interface TweenSpec {
  from: number;
  to: number;
  /** Seconds. */
  duration: number;
  ease?: Easing;
  delay?: number;
  onUpdate: (value: number) => void;
  onDone?: () => void;
}

interface Active extends Required<Omit<TweenSpec, 'onDone'>> {
  onDone: (() => void) | undefined;
  t: number;
}

/** Tween manager. With `instant` (reduced motion), tweens jump straight to their end value. */
export class Tweens {
  instant = false;
  private active: Active[] = [];

  add(spec: TweenSpec): void {
    if (this.instant || spec.duration <= 0) {
      spec.onUpdate(spec.to);
      spec.onDone?.();
      return;
    }
    this.active.push({ ease: ease.linear, delay: 0, ...spec, onDone: spec.onDone, t: 0 });
  }

  update(dt: number): void {
    const done: Active[] = [];
    for (const tw of this.active) {
      tw.t += dt;
      const local = tw.t - tw.delay;
      if (local < 0) continue;
      const p = Math.min(1, local / tw.duration);
      tw.onUpdate(lerp(tw.from, tw.to, tw.ease(p)));
      if (p >= 1) done.push(tw);
    }
    if (done.length) {
      this.active = this.active.filter((tw) => !done.includes(tw));
      for (const tw of done) tw.onDone?.();
    }
  }

  clear(): void {
    this.active = [];
  }

  get count(): number {
    return this.active.length;
  }
}
