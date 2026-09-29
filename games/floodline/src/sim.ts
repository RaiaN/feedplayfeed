// Flood Line simulation: pure and deterministic (seeded RNG, simulated time only).
// An argument: your partner's barbs (the four horsemen) fly at you. Tap one to answer it with its antidote.
// Tap the partner's repair attempts to accept them. Hits raise your heart rate. At the flood line (≈100 bpm) you
// are flooded: taps fail until you hold to breathe (a break: the fight slows, your pulse drops, the clock runs).
// No hits in the opening seconds = gentle start-up bonus. The end card scores your positive:negative ratio.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { FloodLineConfig } from './config.ts';

export type Horseman = 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling';
export type Kind = Horseman | 'repair';
export const HORSEMEN: readonly Horseman[] = ['criticism', 'contempt', 'defensiveness', 'stonewalling'];

export interface Item {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  /** Unit direction toward you. */
  dx: number;
  dy: number;
  speed: number;
}

export type SimEvent =
  | { type: 'spawn'; time: number; id: number; kind: Kind }
  | { type: 'antidote'; time: number; id: number; kind: Horseman; points: number; close: boolean; x: number; y: number }
  | { type: 'repair'; time: number; id: number; points: number; x: number; y: number }
  | { type: 'hit'; time: number; id: number; kind: Horseman }
  | { type: 'missedRepair'; time: number; id: number }
  | { type: 'fizzle'; time: number }
  | { type: 'flooded'; time: number }
  | { type: 'calm'; time: number }
  | { type: 'breathe'; time: number; on: boolean }
  | { type: 'gentle'; time: number }
  | { type: 'overwhelmed'; time: number }
  | { type: 'finish'; time: number; points: number; master: boolean };

export const OVERWHELM_HOLD = 0.9;

export class FloodLineSim {
  time = 0;
  score = 0;
  multiplier = 1;
  streak = 0;
  bpm: number;
  items: Item[] = [];
  flooded = false;
  breathing = false;
  positives = 0;
  negatives = 0;
  antidotes = 0;
  repairs = 0;
  hits = 0;
  floods = 0;
  gentle = true;
  gentleAwarded = false;
  overwhelmed = false;
  overwhelmedFor = 0;
  finished = false;
  readonly events: SimEvent[] = [];
  private heldFor = 0;
  private nextId = 0;
  private spawnLeft: number;
  private readonly rng: Rng;

  constructor(
    readonly config: FloodLineConfig,
    readonly seed: string,
  ) {
    this.rng = createRng(seed).fork('floodline');
    this.bpm = config.heart.rest + 6;
    // Frame 1: barbs already in the air.
    for (let i = 0; i < config.barbs.startCount; i++) this.spawn(0.35 - i * 0.2, i === 0 ? 'criticism' : undefined);
    this.spawnLeft = config.barbs.intervalStart;
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get over(): boolean {
    return this.overwhelmed && this.overwhelmedFor >= OVERWHELM_HOLD;
  }

  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  /** Positive:negative ratio (negatives floored at 1 so a clean round reads as N:1). */
  get ratio(): number {
    return this.positives / Math.max(1, this.negatives);
  }

  get pointsMultiplier(): number {
    return this.multiplier * (this.gentleAwarded ? this.config.startup.multiplier : 1);
  }

  step(dt: number, thumb: Thumb): void {
    if (this.overwhelmed) {
      this.overwhelmedFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;

    // Input: a press taps; a hold that outlasts holdDelay becomes a breather.
    if (thumb.pressed) this.tap(thumb.x, thumb.y);
    this.heldFor = thumb.held ? this.heldFor + dt : 0;
    const breathing = this.heldFor >= c.breathe.holdDelay;
    if (breathing !== this.breathing) {
      this.breathing = breathing;
      this.events.push({ type: 'breathe', time: this.time, on: breathing });
    }

    // Heart rate.
    if (this.breathing) this.bpm -= c.heart.breatheDrop * dt;
    else if (this.bpm > c.heart.rest) this.bpm -= c.heart.restDrift * dt;
    this.bpm = Math.max(c.heart.rest - 4, this.bpm);
    this.updateFlood();

    // Items move toward you (slowed while you take a breather).
    const slow = this.breathing ? c.breathe.slowFactor : 1;
    for (const it of this.items) {
      it.x += it.dx * it.speed * slow * dt;
      it.y += it.dy * it.speed * slow * dt;
    }
    for (const it of this.items.filter((i) => this.distanceToYou(i) <= c.you.hitRadius)) {
      this.items = this.items.filter((i) => i !== it);
      this.breakStreak();
      this.negatives++;
      if (it.kind === 'repair') {
        this.events.push({ type: 'missedRepair', time: this.time, id: it.id });
      } else {
        this.hits++;
        this.bpm += c.heart.perHit;
        if (this.time <= c.startup.seconds) this.gentle = false;
        this.events.push({ type: 'hit', time: this.time, id: it.id, kind: it.kind });
      }
    }
    this.updateFlood();
    if (this.bpm >= c.heart.max) {
      this.overwhelmed = true;
      this.events.push({ type: 'overwhelmed', time: this.time });
      return;
    }

    // Spawns run on the clock only (same argument for every player on the seed).
    this.spawnLeft -= dt;
    while (this.spawnLeft <= 0) {
      this.spawn(0);
      this.spawnLeft += lerp(c.barbs.intervalStart, c.barbs.intervalEnd, this.progress);
    }

    if (this.gentle && !this.gentleAwarded && this.time >= c.startup.seconds) {
      this.gentleAwarded = true;
      this.events.push({ type: 'gentle', time: this.time });
    }

    if (!this.finished && this.time >= c.roundSeconds - 1e-9) {
      this.finished = true;
      const master = this.ratio >= c.scoring.masterRatio;
      const points = c.scoring.finishBonus + (master ? c.scoring.masterBonus : 0);
      this.score += points;
      this.events.push({ type: 'finish', time: this.time, points, master });
    }
  }

  distanceToYou(p: { x: number; y: number }): number {
    return Math.hypot(p.x - this.config.you.x, p.y - this.config.you.y);
  }

  private tap(x: number, y: number): void {
    const c = this.config;
    let best: Item | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      const d = Math.hypot(it.x - x, it.y - y);
      if (d <= c.barbs.tapRadius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    if (!best) return;
    if (this.flooded) {
      // Flooded: you can't think straight or hear well. Nothing lands until you calm down.
      this.events.push({ type: 'fizzle', time: this.time });
      return;
    }
    this.items = this.items.filter((i) => i !== best);
    this.positives++;
    this.streak++;
    this.multiplier = Math.min(c.scoring.maxMultiplier, 1 + Math.floor(this.streak / c.scoring.streakPerLevel));
    if (best.kind === 'repair') {
      const points = c.scoring.repair * this.pointsMultiplier;
      this.score += points;
      this.repairs++;
      this.bpm -= c.heart.repairRelief;
      this.events.push({ type: 'repair', time: this.time, id: best.id, points, x: best.x, y: best.y });
    } else {
      const close = this.distanceToYou(best) < c.scoring.closeCallDistance;
      const points = (c.scoring.antidote + (close ? c.scoring.closeCall : 0)) * this.pointsMultiplier;
      this.score += points;
      this.antidotes++;
      this.bpm -= c.heart.antidoteRelief;
      this.events.push({
        type: 'antidote',
        time: this.time,
        id: best.id,
        kind: best.kind,
        points,
        close,
        x: best.x,
        y: best.y,
      });
    }
    this.updateFlood();
  }

  private updateFlood(): void {
    const h = this.config.heart;
    if (!this.flooded && this.bpm >= h.flood) {
      this.flooded = true;
      this.floods++;
      this.events.push({ type: 'flooded', time: this.time });
    } else if (this.flooded && this.bpm <= h.recover) {
      this.flooded = false;
      this.events.push({ type: 'calm', time: this.time });
    }
  }

  private breakStreak(): void {
    this.streak = 0;
    this.multiplier = 1;
  }

  /** `head` = fraction of the path already travelled (frame-1 items start part-way). */
  private spawn(head: number, force?: Kind): void {
    const c = this.config;
    const repairChance = lerp(c.barbs.repairChanceStart, c.barbs.repairChanceEnd, this.progress);
    const kind: Kind = force ?? (this.rng.chance(repairChance) ? 'repair' : this.rng.pick(HORSEMEN));
    const sx = clamp(c.partner.x + this.rng.range(-c.barbs.spread, c.barbs.spread), 30, 330);
    const sy = c.partner.y + 40;
    const tx = c.you.x + this.rng.range(-20, 20);
    const ty = c.you.y;
    const len = Math.hypot(tx - sx, ty - sy);
    const dx = (tx - sx) / len;
    const dy = (ty - sy) / len;
    const speed = lerp(c.barbs.speedStart, c.barbs.speedEnd, this.progress) * this.rng.range(0.9, 1.1);
    const it: Item = {
      id: this.nextId++,
      kind,
      x: sx + dx * len * Math.max(0, head),
      y: sy + dy * len * Math.max(0, head),
      dx,
      dy,
      speed,
    };
    this.items.push(it);
    this.events.push({ type: 'spawn', time: this.time, id: it.id, kind });
  }
}
