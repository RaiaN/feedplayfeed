// Shark Wake simulation: pure and deterministic (seeded RNG, simulated time only).
// A surfer paddles for shore across 3 lanes; a fin closes in from behind. Tap left/right to switch lanes.
// Rocks and driftwood hit = slowed + the fin gains. Dodging at the last moment = near miss (bonus, multiplier,
// a little distance from the fin). Wave pads give a boost. Fin reaches you = wiped out. Survive to shore.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { SharkWakeConfig } from './config.ts';

export type Kind = 'rock' | 'log' | 'boost';

export interface Row {
  id: number;
  /** World distance of the row. */
  d: number;
  /** Per lane: what sits there (null = open water). */
  lanes: Array<Kind | null>;
  passed: boolean;
}

export type SimEvent =
  | { type: 'row'; time: number; id: number; lanes: Array<Kind | null> }
  | { type: 'switch'; time: number; from: number; to: number }
  | { type: 'hit'; time: number; lane: number; kind: Kind }
  | { type: 'near'; time: number; lane: number; points: number }
  | { type: 'boost'; time: number; lane: number; points: number }
  | { type: 'wipeout'; time: number }
  | { type: 'shore'; time: number; points: number };

export const WIPEOUT_HOLD = 1.0;

export class SharkWakeSim {
  time = 0;
  score = 0;
  multiplier = 1;
  distance = 0;
  lane = 1;
  x: number;
  gap: number;
  slow = 0;
  rows: Row[] = [];
  wiped = false;
  wipedFor = 0;
  survived = false;
  nearMisses = 0;
  hits = 0;
  boosts = 0;
  switches = 0;
  readonly events: SimEvent[] = [];
  private lastSwitch = -Infinity;
  private prevLane = 1;
  private nextRowAt: number;
  private rowId = 0;
  private pointsFromDistance = 0;
  private readonly rng: Rng;

  constructor(
    readonly config: SharkWakeConfig,
    readonly seed: string,
  ) {
    this.rng = createRng(seed).fork('sharkwake');
    this.x = config.surfer.lanes[1]!;
    this.gap = config.fin.startGap;
    this.nextRowAt = config.rows.firstAt;
    while (this.nextRowAt < 900) this.spawnRow();
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get over(): boolean {
    return this.wiped && this.wipedFor >= WIPEOUT_HOLD;
  }

  get meters(): number {
    return Math.floor(this.distance / 10);
  }

  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  /** 0 = fin far, 1 = fin on your tail. */
  get danger(): number {
    return 1 - clamp(this.gap / this.config.fin.startGap, 0, 1);
  }

  get speed(): number {
    const s = lerp(this.config.speed.start, this.config.speed.end, this.progress);
    return this.slow > 0 ? s * this.config.speed.slowFactor : s;
  }

  step(dt: number, thumb: Thumb): void {
    if (this.wiped) {
      this.wipedFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;
    if (thumb.pressed) this.switchLane(thumb.x < 180 ? -1 : 1);

    const target = c.surfer.lanes[this.lane]!;
    this.x += clamp(target - this.x, -c.surfer.laneSpeed * dt, c.surfer.laneSpeed * dt);

    const before = this.distance;
    this.distance += this.speed * dt;
    this.slow = Math.max(0, this.slow - dt);
    const pts = Math.floor(this.distance / c.scoring.pxPerPoint);
    this.score += pts - this.pointsFromDistance;
    this.pointsFromDistance = pts;

    for (const row of this.rows) {
      if (row.passed || row.d > this.distance) continue;
      if (row.d <= before - 1e-9) continue;
      row.passed = true;
      this.resolveRow(row);
      if (this.wiped) return;
    }
    this.rows = this.rows.filter((r) => r.d > this.distance - 400);
    while (this.nextRowAt < this.distance + 900) this.spawnRow();

    this.gap = Math.min(c.fin.maxGap, this.gap - lerp(c.fin.closeStart, c.fin.closeEnd, this.progress) * dt);
    if (this.gap <= 0) {
      this.gap = 0;
      this.wiped = true;
      this.events.push({ type: 'wipeout', time: this.time });
      return;
    }

    if (!this.survived && this.time >= c.roundSeconds - 1e-9) {
      this.survived = true;
      this.score += c.scoring.shoreBonus;
      this.events.push({ type: 'shore', time: this.time, points: c.scoring.shoreBonus });
    }
  }

  /** Which lane the surfer's x currently overlaps (for collisions mid-switch). */
  lanesUnderSurfer(): number[] {
    const { lanes, hitHalfWidth } = this.config.surfer;
    return lanes.flatMap((lx, i) => (Math.abs(lx - this.x) < hitHalfWidth ? [i] : []));
  }

  private switchLane(dir: -1 | 1): void {
    const to = clamp(this.lane + dir, 0, 2);
    if (to === this.lane) return;
    this.prevLane = this.lane;
    this.lane = to;
    this.lastSwitch = this.time;
    this.switches++;
    this.events.push({ type: 'switch', time: this.time, from: this.prevLane, to });
  }

  private resolveRow(row: Row): void {
    const c = this.config;
    const under = this.lanesUnderSurfer();
    const obstacle = under.find((i) => row.lanes[i] === 'rock' || row.lanes[i] === 'log');
    if (obstacle !== undefined) {
      const kind = row.lanes[obstacle]!;
      this.hits++;
      this.multiplier = 1;
      this.slow = c.speed.slowSeconds;
      this.gap -= c.fin.hitPenalty;
      this.events.push({ type: 'hit', time: this.time, lane: obstacle, kind });
      if (this.gap <= 0) {
        this.gap = 0;
        this.wiped = true;
        this.events.push({ type: 'wipeout', time: this.time });
      }
      return;
    }
    const boost = under.find((i) => row.lanes[i] === 'boost');
    if (boost !== undefined) {
      const points = c.scoring.boost * this.multiplier;
      this.score += points;
      this.boosts++;
      this.gap = Math.min(c.fin.maxGap, this.gap + c.scoring.boostGap);
      this.events.push({ type: 'boost', time: this.time, lane: boost, points });
    }
    const left = row.lanes[this.prevLane];
    if (
      this.time - this.lastSwitch <= c.scoring.nearMissWindow &&
      this.prevLane !== this.lane &&
      (left === 'rock' || left === 'log')
    ) {
      const points = c.scoring.nearMiss * this.multiplier;
      this.score += points;
      this.nearMisses++;
      this.multiplier = Math.min(c.scoring.maxMultiplier, this.multiplier + 1);
      this.gap = Math.min(c.fin.maxGap, this.gap + c.scoring.nearMissGap);
      this.events.push({ type: 'near', time: this.time, lane: this.prevLane, points });
    }
  }

  private spawnRow(): void {
    const c = this.config;
    const p = clamp(this.nextRowAt / (c.speed.end * c.roundSeconds * 0.8), 0, 1);
    const lanes: Array<Kind | null> = [null, null, null];
    const count = this.rng.chance(c.rows.doubleChanceEnd * p) ? 2 : 1;
    const free = [0, 1, 2];
    for (let i = 0; i < count; i++) {
      const at = free.splice(this.rng.int(0, free.length - 1), 1)[0]!;
      lanes[at] = this.rng.chance(0.65) ? 'rock' : 'log';
    }
    if (this.rng.chance(c.rows.boostChance)) lanes[this.rng.pick(free)] = 'boost';
    const row: Row = { id: this.rowId++, d: this.nextRowAt, lanes, passed: false };
    this.rows.push(row);
    this.events.push({ type: 'row', time: this.time, id: row.id, lanes: [...lanes] });
    this.nextRowAt += lerp(c.rows.spacingStart, c.rows.spacingEnd, p) * this.rng.range(0.85, 1.2);
  }
}
