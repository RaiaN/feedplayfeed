// Fixed-timestep loop. Simulation always advances in exact `stepMs` increments, so a seed plus an input
// tape replays identically regardless of frame rate. Driven by Host.onFrame (dom.ts) or by tests.

export interface LoopOptions {
  step: (dtSeconds: number) => void;
  render: (alpha: number) => void;
  stepMs?: number;
  /** Max steps per frame; beyond this, time is dropped (tab was hidden, slow device). */
  maxSteps?: number;
}

export class FixedLoop {
  readonly stepMs: number;
  readonly maxSteps: number;
  /** Simulation speed multiplier (autoplay/clip tools use >1). */
  timeScale = 1;
  paused = false;
  private accumulator = 0;
  private last: number | null = null;
  private steps = 0;

  constructor(private readonly opts: LoopOptions) {
    this.stepMs = opts.stepMs ?? 1000 / 60;
    this.maxSteps = opts.maxSteps ?? 8;
  }

  /** Total fixed steps run so far. */
  get stepCount(): number {
    return this.steps;
  }

  /** Call once per animation frame with a monotonic timestamp in ms. Returns steps run this frame. */
  frame(nowMs: number): number {
    if (this.last === null || this.paused) {
      this.last = nowMs;
      this.opts.render(0);
      return 0;
    }
    const elapsed = Math.max(0, nowMs - this.last) * this.timeScale;
    this.last = nowMs;
    this.accumulator += elapsed;
    const cap = this.maxSteps * Math.max(1, Math.ceil(this.timeScale));
    let ran = 0;
    while (this.accumulator >= this.stepMs && ran < cap) {
      this.opts.step(this.stepMs / 1000);
      this.accumulator -= this.stepMs;
      ran++;
    }
    if (ran === cap) this.accumulator = 0;
    this.steps += ran;
    this.opts.render(this.accumulator / this.stepMs);
    return ran;
  }

  /** Forget the last timestamp (after resume) so the pause isn't simulated as one long frame. */
  resetClock(): void {
    this.last = null;
    this.accumulator = 0;
  }
}
