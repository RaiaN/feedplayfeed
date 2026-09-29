// Hawk Shadow simulation: pure and deterministic (seeded RNG, simulated time only).
// Hold to run (and steer toward your thumb), release to freeze. A hawk circles overhead; each dive is telegraphed
// by its shadow closing in. Moving during the strike window = caught. Freezing at the last moment = close call
// (bonus + multiplier). Some later dives are feints that pull up. Reach the burrow when time runs out.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { HawkShadowConfig } from './config.ts';

export interface Dive {
  index: number;
  /** Strike moment (sim time). */
  at: number;
  warn: number;
  feint: boolean;
  resolved: boolean;
}

export interface Seed {
  id: number;
  x: number;
  /** World distance along the run. */
  d: number;
}

export type SimEvent =
  | { type: 'dive'; time: number; index: number; at: number; feint: boolean }
  | { type: 'strike'; time: number; index: number }
  | { type: 'feint'; time: number; index: number }
  | { type: 'close'; time: number; index: number; points: number }
  | { type: 'safe'; time: number; index: number }
  | { type: 'seed'; time: number; id: number; points: number; x: number }
  | { type: 'caught'; time: number; index: number }
  | { type: 'home'; time: number; points: number };

export const CAUGHT_HOLD = 1.0;

export class HawkShadowSim {
  time = 0;
  score = 0;
  multiplier = 1;
  /** World distance run (px). */
  distance = 0;
  x: number;
  moving = false;
  /** Sim time the mouse last moved. */
  lastMove = -Infinity;
  dive: Dive;
  seeds: Seed[] = [];
  caught = false;
  caughtFor = 0;
  survived = false;
  closeCalls = 0;
  collected = 0;
  dives = 0;
  readonly events: SimEvent[] = [];
  private pointsFromDistance = 0;
  private nextSeedAt: number;
  private seedId = 0;
  /** Independent streams: the hawk depends only on time and the seed trail only on distance, so every player
   *  on the same seed faces the same hawk and the same field regardless of how they move. */
  private readonly hawkRng: Rng;
  private readonly fieldRng: Rng;

  constructor(
    readonly config: HawkShadowConfig,
    readonly seed: string,
  ) {
    this.hawkRng = createRng(seed).fork('hawkshadow:hawk');
    this.fieldRng = createRng(seed).fork('hawkshadow:field');
    this.x = (config.mouse.minX + config.mouse.maxX) / 2;
    this.dive = this.makeDive(0, config.hawk.firstDive);
    this.nextSeedAt = 90;
    while (this.nextSeedAt < 700) this.spawnSeed();
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get over(): boolean {
    return this.caught && this.caughtFor >= CAUGHT_HOLD;
  }

  get meters(): number {
    return Math.floor(this.distance / 10);
  }

  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  /** 0 = hawk circling, 1 = strike moment. */
  get warning(): number {
    const d = this.dive;
    if (d.resolved) return 0;
    return clamp(1 - (d.at - this.time) / d.warn, 0, 1);
  }

  /** In the strike window of a real dive right now. */
  get striking(): boolean {
    const d = this.dive;
    return !d.feint && this.time >= d.at && this.time < d.at + this.config.hawk.strikeWindow;
  }

  step(dt: number, thumb: Thumb): void {
    if (this.caught) {
      this.caughtFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;
    this.moving = thumb.held;
    if (this.moving) {
      this.lastMove = this.time;
      this.distance += c.mouse.runSpeed * dt;
      const dx = clamp(thumb.x, c.mouse.minX, c.mouse.maxX) - this.x;
      this.x += clamp(dx, -c.mouse.steerSpeed * dt, c.mouse.steerSpeed * dt);
      const pts = Math.floor(this.distance / c.scoring.pxPerPoint);
      this.score += pts - this.pointsFromDistance;
      this.pointsFromDistance = pts;
    }

    // Seeds: collect on contact, keep a stream ahead.
    for (const s of this.seeds) {
      if (Math.abs(s.d - this.distance) < c.seeds.pickRadius && Math.abs(s.x - this.x) < c.seeds.pickRadius) {
        const points = c.scoring.seed * this.multiplier;
        this.score += points;
        this.collected++;
        this.events.push({ type: 'seed', time: this.time, id: s.id, points, x: s.x });
        s.d = -Infinity;
      }
    }
    this.seeds = this.seeds.filter((s) => s.d > this.distance - 200);
    while (this.nextSeedAt < this.distance + 700) this.spawnSeed();

    // Hawk.
    const d = this.dive;
    if (!d.resolved && this.time >= d.at) {
      if (d.feint) {
        d.resolved = true;
        this.events.push({ type: 'feint', time: this.time, index: d.index });
        this.nextDive();
      } else {
        if (this.time - dt < d.at) {
          this.events.push({ type: 'strike', time: this.time, index: d.index });
          if (!this.moving) this.judgeFreeze(d);
        }
        if (this.moving) {
          this.caught = true;
          this.events.push({ type: 'caught', time: this.time, index: d.index });
          return;
        }
        if (this.time >= d.at + c.hawk.strikeWindow) {
          d.resolved = true;
          this.nextDive();
        }
      }
    }

    if (!this.survived && this.time >= c.roundSeconds - 1e-9) {
      this.survived = true;
      this.score += c.scoring.homeBonus;
      this.events.push({ type: 'home', time: this.time, points: c.scoring.homeBonus });
    }
  }

  private judgeFreeze(d: Dive): void {
    const s = this.config.scoring;
    if (d.at - this.lastMove <= s.closeCallWindow) {
      const points = s.closeCall * this.multiplier;
      this.score += points;
      this.closeCalls++;
      this.multiplier = Math.min(s.maxMultiplier, this.multiplier + 1);
      this.events.push({ type: 'close', time: this.time, index: d.index, points });
    } else {
      this.events.push({ type: 'safe', time: this.time, index: d.index });
    }
  }

  private nextDive(): void {
    const h = this.config.hawk;
    const p = this.progress;
    const interval = lerp(h.intervalStart, h.intervalEnd, p) + this.hawkRng.range(-h.jitter, h.jitter);
    this.dive = this.makeDive(this.dive.index + 1, this.time + interval);
  }

  private makeDive(index: number, at: number): Dive {
    const h = this.config.hawk;
    const p = Math.min(1, at / this.config.roundSeconds);
    const feint = index > 1 && this.hawkRng.chance(h.feintChanceEnd * p);
    // The very first dive gets a longer telegraph so new players can learn "let go to hide".
    const warn = index === 0 ? h.firstWarn : lerp(h.warnStart, h.warnEnd, p);
    const dive = { index, at, warn, feint, resolved: false };
    this.dives++;
    this.events.push({ type: 'dive', time: this.time, index, at, feint });
    return dive;
  }

  private spawnSeed(): void {
    const c = this.config;
    this.seeds.push({
      id: this.seedId++,
      x: this.fieldRng.range(c.mouse.minX + 10, c.mouse.maxX - 10),
      d: this.nextSeedAt,
    });
    this.nextSeedAt += this.fieldRng.range(c.seeds.spacingMin, c.seeds.spacingMax);
  }
}
