// Little Moments simulation: pure and deterministic (seeded RNG, simulated time only).
// Your partner makes bids for connection (round bubbles). Tap to turn toward them before they fade.
// Phone notifications (square cards) are traps: tapping one is turning away. Turning toward deposits into the
// emotional bank account; missed bids withdraw. At 0 the couple drift apart. The spawn schedule and positions
// depend only on the seed and time, so challengers get the same moments.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { LittleMomentsConfig } from './config.ts';

export type Kind = 'bid' | 'big' | 'phone';

export interface Moment {
  id: number;
  kind: Kind;
  /** Visual icon index (seeded). */
  icon: number;
  x: number;
  y: number;
  life: number;
  age: number;
}

export type SimEvent =
  | { type: 'spawn'; time: number; id: number; kind: Kind; x: number; y: number }
  | {
      type: 'toward';
      time: number;
      id: number;
      big: boolean;
      justInTime: boolean;
      points: number;
      x: number;
      y: number;
    }
  | { type: 'missed'; time: number; id: number; x: number; y: number }
  | { type: 'away'; time: number; id: number; x: number; y: number }
  | { type: 'ignored'; time: number; id: number }
  | { type: 'drifted'; time: number }
  | { type: 'finish'; time: number; points: number };

export const DRIFT_HOLD = 0.9;

export class LittleMomentsSim {
  time = 0;
  score = 0;
  multiplier = 1;
  streak = 0;
  bestStreak = 0;
  bank: number;
  moments: Moment[] = [];
  toward = 0;
  missed = 0;
  away = 0;
  justInTime = 0;
  drifted = false;
  driftedFor = 0;
  finished = false;
  readonly events: SimEvent[] = [];
  private nextId = 0;
  private spawnLeft = 0.35;
  private recentSlots: number[] = [];
  private readonly rng: Rng;

  constructor(
    readonly config: LittleMomentsConfig,
    readonly seed: string,
  ) {
    this.rng = createRng(seed).fork('littlemoments');
    this.bank = config.bank.start;
    // Frame 1 already has moments waiting: one bid and one phone buzz.
    this.spawn('bid');
    this.spawn('phone');
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get over(): boolean {
    return this.drifted && this.driftedFor >= DRIFT_HOLD;
  }

  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  /** % of resolved bids turned toward (the research metric). 100 before any bid resolves. */
  get towardPct(): number {
    const n = this.toward + this.missed;
    return n === 0 ? 100 : Math.round((this.toward / n) * 100);
  }

  /** 0–1 closeness for the visuals. */
  get closeness(): number {
    return this.bank / this.config.bank.max;
  }

  step(dt: number, thumb: Thumb): void {
    if (this.drifted) {
      this.driftedFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;
    if (thumb.pressed) this.tap(thumb.x, thumb.y);
    this.deposit(-lerp(c.bank.drainStart, c.bank.drainEnd, this.progress) * dt);

    for (const m of this.moments) m.age += dt;
    for (const m of this.moments.filter((mm) => mm.age >= mm.life)) {
      if (m.kind === 'phone') {
        this.score += c.scoring.ignoredPhone;
        this.events.push({ type: 'ignored', time: this.time, id: m.id });
      } else {
        this.missed++;
        this.breakStreak();
        this.deposit(c.bank.missed);
        this.events.push({ type: 'missed', time: this.time, id: m.id, x: m.x, y: m.y });
      }
    }
    this.moments = this.moments.filter((m) => m.age < m.life);
    if (this.checkDrift()) return;

    this.spawnLeft -= dt;
    while (this.spawnLeft <= 0) {
      const phoneChance = lerp(c.distractions.chanceStart, c.distractions.chanceEnd, this.progress);
      const roll = this.rng.next();
      this.spawn(roll < phoneChance ? 'phone' : this.rng.chance(c.bids.bigChance) ? 'big' : 'bid');
      this.spawnLeft += lerp(c.bids.intervalStart, c.bids.intervalEnd, this.progress);
    }

    if (!this.finished && this.time >= c.roundSeconds - 1e-9) {
      this.finished = true;
      this.score += c.scoring.finishBonus;
      this.events.push({ type: 'finish', time: this.time, points: c.scoring.finishBonus });
    }
  }

  private tap(x: number, y: number): void {
    const c = this.config;
    let best: Moment | null = null;
    let bestD = Infinity;
    for (const m of this.moments) {
      const r = c.bids.radius * (m.kind === 'big' ? 1.25 : 1);
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= r && d < bestD) {
        best = m;
        bestD = d;
      }
    }
    if (!best) return;
    this.moments = this.moments.filter((m) => m !== best);
    if (best.kind === 'phone') {
      this.away++;
      this.breakStreak();
      this.deposit(c.bank.distracted);
      this.events.push({ type: 'away', time: this.time, id: best.id, x: best.x, y: best.y });
      this.checkDrift();
      return;
    }
    const big = best.kind === 'big';
    const jit = best.age >= best.life * (1 - c.scoring.justInTimeFrac);
    this.toward++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (jit) this.justInTime++;
    this.multiplier = Math.min(c.scoring.maxMultiplier, 1 + Math.floor(this.streak / c.scoring.streakPerLevel));
    const points = ((big ? c.scoring.big : c.scoring.toward) + (jit ? c.scoring.justInTime : 0)) * this.multiplier;
    this.score += points;
    this.deposit(big ? c.bank.bigToward : c.bank.toward);
    this.events.push({
      type: 'toward',
      time: this.time,
      id: best.id,
      big,
      justInTime: jit,
      points,
      x: best.x,
      y: best.y,
    });
  }

  private breakStreak(): void {
    this.streak = 0;
    this.multiplier = 1;
  }

  private deposit(amount: number): void {
    this.bank = clamp(this.bank + amount, 0, this.config.bank.max);
  }

  private checkDrift(): boolean {
    if (this.bank > 0 || this.drifted) return this.drifted;
    this.drifted = true;
    this.events.push({ type: 'drifted', time: this.time });
    return true;
  }

  private spawn(kind: Kind): void {
    const { area, bids, distractions } = this.config;
    const slots = area.cols * area.rows;
    let slot = this.rng.int(0, slots - 1);
    for (let i = 0; i < slots && this.recentSlots.includes(slot); i++) slot = (slot + 1) % slots;
    this.recentSlots.push(slot);
    if (this.recentSlots.length > area.noRepeat) this.recentSlots.shift();
    const col = slot % area.cols;
    const row = Math.floor(slot / area.cols);
    const x =
      lerp(area.minX, area.maxX, area.cols === 1 ? 0.5 : col / (area.cols - 1)) +
      this.rng.range(-area.jitter, area.jitter);
    const y =
      lerp(area.minY, area.maxY, area.rows === 1 ? 0.5 : row / (area.rows - 1)) +
      this.rng.range(-area.jitter, area.jitter);
    const base = lerp(bids.lifeStart, bids.lifeEnd, this.progress);
    const life = kind === 'big' ? base * bids.bigLifeScale : kind === 'phone' ? base * distractions.lifeScale : base;
    const m: Moment = { id: this.nextId++, kind, icon: this.rng.int(0, 5), x, y, life, age: 0 };
    this.moments.push(m);
    this.events.push({ type: 'spawn', time: this.time, id: m.id, kind, x, y });
  }
}
