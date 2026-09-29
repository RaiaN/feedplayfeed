// Wolf Night simulation: pure and deterministic (seeded RNG, simulated time only).
// Wolves creep toward the girl from the dark. Tap toward them to flash the lantern (a cone) and drive them back.
// Flashing a wolf that is already close is a close call: big bonus and multiplier +1. A flash that hits nothing
// resets the multiplier. Oil drains over time and per flash; tap fireflies to refill. Survive until dawn.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { WolfNightConfig } from './config.ts';

export interface Wolf {
  id: number;
  x: number;
  y: number;
  /** Distance still to retreat after a flash. */
  retreat: number;
  stun: number;
}

export interface Firefly {
  id: number;
  x: number;
  y: number;
  life: number;
}

export type SimEvent =
  | { type: 'spawn'; time: number; id: number; x: number; y: number }
  | { type: 'flash'; time: number; angle: number; hits: number[]; close: number }
  | { type: 'miss'; time: number; angle: number }
  | { type: 'fizzle'; time: number }
  | { type: 'firefly'; time: number; id: number; x: number; y: number }
  | { type: 'collect'; time: number; id: number; x: number; y: number; points: number }
  | { type: 'push'; time: number; id: number; close: boolean; points: number; x: number; y: number }
  | { type: 'caught'; time: number; id: number }
  | { type: 'dawn'; time: number; points: number };

/** How long the "caught" freeze plays before the round ends. */
export const CAUGHT_HOLD = 0.9;

export class WolfNightSim {
  time = 0;
  score = 0;
  multiplier = 1;
  oil = 1;
  cooldown = 0;
  wolves: Wolf[] = [];
  fireflies: Firefly[] = [];
  caught: Wolf | null = null;
  caughtFor = 0;
  survived = false;
  closeCalls = 0;
  pushes = 0;
  flashes = 0;
  collected = 0;
  readonly events: SimEvent[] = [];
  private nextId = 0;
  private spawnLeft: number;
  private fireflyLeft: number;
  private secondsScored = 0;
  private readonly rng: Rng;

  constructor(
    readonly config: WolfNightConfig,
    readonly seed: string,
  ) {
    this.rng = createRng(seed).fork('wolfnight');
    // Opening wolves start close and on screen: danger is visible in the very first frame.
    for (let i = 0; i < config.wolves.startCount; i++)
      this.spawnWolf(config.wolves.openingDistance + i * config.wolves.openingStep);
    this.spawnLeft = config.wolves.spawnStart;
    this.fireflyLeft = config.fireflies.firstAfter;
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get over(): boolean {
    return this.caught !== null && this.caughtFor >= CAUGHT_HOLD;
  }

  get lightRadius(): number {
    return lerp(this.config.lantern.minRadius, this.config.lantern.maxRadius, this.oil);
  }

  /** Whole seconds survived. */
  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  distance(w: { x: number; y: number }): number {
    return Math.hypot(w.x - this.config.girl.x, w.y - this.config.girl.y);
  }

  /** 0 = calm, 1 = a wolf is at the girl. */
  get danger(): number {
    const { catchRadius, dangerFalloff } = this.config.girl;
    let nearest = Infinity;
    for (const w of this.wolves) nearest = Math.min(nearest, this.distance(w));
    return 1 - clamp((nearest - catchRadius) / dangerFalloff, 0, 1);
  }

  step(dt: number, thumb: Thumb): void {
    if (this.caught) {
      this.caughtFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;
    while (this.secondsScored < this.seconds) {
      this.secondsScored++;
      this.score += c.scoring.perSecond;
    }
    this.oil = Math.max(0, this.oil - c.lantern.drainPerSecond * dt);
    this.cooldown = Math.max(0, this.cooldown - dt);

    this.spawnLeft -= dt;
    if (this.spawnLeft <= 0) {
      if (this.wolves.length < c.wolves.max) this.spawnWolf(1);
      this.spawnLeft += lerp(c.wolves.spawnStart, c.wolves.spawnEnd, this.progress);
    }
    this.fireflyLeft -= dt;
    if (this.fireflyLeft <= 0) {
      this.spawnFirefly();
      this.fireflyLeft += c.fireflies.every;
    }
    for (const f of this.fireflies) f.life -= dt;
    this.fireflies = this.fireflies.filter((f) => f.life > 0);

    if (thumb.pressed) this.tap(thumb.x, thumb.y);

    const speed = lerp(c.wolves.speedStart, c.wolves.speedEnd, this.progress);
    for (const w of this.wolves) {
      const d = this.distance(w);
      const ux = (w.x - c.girl.x) / (d || 1);
      const uy = (w.y - c.girl.y) / (d || 1);
      if (w.retreat > 0) {
        const m = Math.min(w.retreat, c.wolves.retreatSpeed * dt);
        w.retreat -= m;
        w.x += ux * m;
        w.y += uy * m;
      } else if (w.stun > 0) {
        w.stun -= dt;
      } else {
        const m = Math.min(d, speed * dt);
        w.x -= ux * m;
        w.y -= uy * m;
        if (this.distance(w) <= c.girl.catchRadius) {
          this.caught = w;
          this.events.push({ type: 'caught', time: this.time, id: w.id });
          return;
        }
      }
    }

    if (!this.survived && this.time >= c.roundSeconds - 1e-9) {
      this.survived = true;
      this.score += c.scoring.dawnBonus;
      this.events.push({ type: 'dawn', time: this.time, points: c.scoring.dawnBonus });
    }
  }

  private tap(x: number, y: number): void {
    const c = this.config;
    // Fireflies first: a tap on one collects it instead of flashing.
    const hit = this.fireflies.filter((f) => Math.hypot(f.x - x, f.y - y) <= c.fireflies.tapRadius);
    if (hit.length) {
      for (const f of hit) {
        const points = c.scoring.firefly * this.multiplier;
        this.oil = Math.min(1, this.oil + c.fireflies.oil);
        this.score += points;
        this.collected++;
        this.events.push({ type: 'collect', time: this.time, id: f.id, x: f.x, y: f.y, points });
      }
      this.fireflies = this.fireflies.filter((f) => !hit.includes(f));
      return;
    }
    if (this.cooldown > 0 || this.oil < c.lantern.flashCost) {
      this.events.push({ type: 'fizzle', time: this.time });
      return;
    }
    this.oil -= c.lantern.flashCost;
    this.cooldown = c.lantern.cooldown;
    this.flashes++;
    const angle = Math.atan2(y - c.girl.y, x - c.girl.x);
    const half = ((c.lantern.flashConeDeg / 2) * Math.PI) / 180;
    const hits = this.wolves.filter((w) => {
      if (w.retreat > 0) return false;
      const d = this.distance(w);
      if (d > c.lantern.flashRange) return false;
      const a = Math.atan2(w.y - c.girl.y, w.x - c.girl.x);
      return angleDiff(a, angle) <= half || Math.hypot(w.x - x, w.y - y) <= c.lantern.directTapRadius;
    });
    if (!hits.length) {
      this.multiplier = 1;
      this.events.push({ type: 'miss', time: this.time, angle });
      return;
    }
    let close = 0;
    for (const w of hits) {
      const isClose = this.distance(w) < c.scoring.closeCallRadius;
      const points = (isClose ? c.scoring.closeCall : c.scoring.push) * this.multiplier;
      this.score += points;
      this.pushes++;
      if (isClose) {
        close++;
        this.closeCalls++;
        this.multiplier = Math.min(c.scoring.maxMultiplier, this.multiplier + 1);
      }
      w.retreat = c.wolves.pushBack;
      w.stun = c.wolves.stun;
      this.events.push({ type: 'push', time: this.time, id: w.id, close: isClose, points, x: w.x, y: w.y });
    }
    this.events.push({ type: 'flash', time: this.time, angle, hits: hits.map((w) => w.id), close });
  }

  private spawnWolf(distanceScale: number): void {
    const c = this.config;
    const a = this.rng.range(0, Math.PI * 2);
    const d = c.wolves.spawnDistance * distanceScale;
    const w: Wolf = {
      id: this.nextId++,
      x: clamp(c.girl.x + Math.cos(a) * d, 12, 348),
      y: clamp(c.girl.y + Math.sin(a) * d, 110, c.wolves.spawnMaxY),
      retreat: 0,
      stun: 0,
    };
    this.wolves.push(w);
    this.events.push({ type: 'spawn', time: this.time, id: w.id, x: w.x, y: w.y });
  }

  private spawnFirefly(): void {
    const c = this.config;
    const a = this.rng.range(0, Math.PI * 2);
    const d = this.rng.range(c.fireflies.minDistance, c.fireflies.maxDistance);
    const f: Firefly = {
      id: this.nextId++,
      x: clamp(c.girl.x + Math.cos(a) * d, 30, 330),
      y: clamp(c.girl.y + Math.sin(a) * d, 130, 590),
      life: c.fireflies.life,
    };
    this.fireflies.push(f);
    this.events.push({ type: 'firefly', time: this.time, id: f.id, x: f.x, y: f.y });
  }
}

export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
