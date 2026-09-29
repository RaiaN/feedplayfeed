// Tidewall simulation: pure and deterministic (no DOM, no Math.random, no wall-clock time).
// One wave at a time rolls down a lane toward the seawall. Hold to raise that lane's wall, release to lock it.
// Lock at the wave's crest line for a perfect (multiplier +1); too high scores less and resets the multiplier;
// too low is a breach.
import { createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { TidewallConfig } from './config.ts';

export type Grade = 'perfect' | 'good' | 'over' | 'breach';

export interface Wave {
  index: number;
  lane: number;
  /** Crest height 0–1: the line the wall should reach. */
  crest: number;
  /** Seconds from spawn to impact. */
  travel: number;
  /** Seconds since spawn. */
  t: number;
}

export type SimEvent =
  | { type: 'spawn'; time: number; wave: number; lane: number; crest: number }
  | { type: 'raise'; time: number; wave: number }
  | { type: 'lock'; time: number; wave: number; height: number }
  | { type: 'impact'; time: number; wave: number; lane: number; grade: Grade; points: number; multiplier: number };

export class TidewallSim {
  time = 0;
  score = 0;
  multiplier = 1;
  chain = 0;
  bestChain = 0;
  perfects = 0;
  breaches = 0;
  wave: Wave | null = null;
  /** Current wall height of the active lane, 0–1. */
  wall = 0;
  rising = false;
  locked = false;
  /** Last locked height per lane (display). */
  readonly lanes: number[];
  readonly events: SimEvent[] = [];
  private gapLeft = 0;
  private waveCount = 0;
  private readonly rng: Rng;

  constructor(
    readonly config: TidewallConfig,
    readonly seed: string,
  ) {
    this.rng = createRng(seed).fork('tidewall');
    this.lanes = new Array<number>(config.segments).fill(0);
    this.spawn();
  }

  /** Round progress 0–1, drives difficulty. */
  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  step(dt: number, thumb: Thumb): void {
    this.time += dt;
    const wave = this.wave;
    if (!wave) {
      this.gapLeft -= dt;
      if (this.gapLeft <= 0) this.spawn();
      return;
    }
    if (!this.locked) {
      if (thumb.pressed && !this.rising) {
        this.rising = true;
        this.wall = 0;
        this.events.push({ type: 'raise', time: this.time, wave: wave.index });
      }
      if (this.rising) {
        this.wall = Math.min(1, this.wall + this.config.riseSpeed * dt);
        if (!thumb.held) this.lock();
      }
    }
    wave.t += dt;
    if (wave.t >= wave.travel) this.impact(wave);
  }

  /** Grade a lock height against a crest (exported logic for tests and the bot). */
  grade(height: number, crest: number): Grade {
    const diff = height - crest;
    const { perfectWindow, goodWindow } = this.config.scoring;
    if (Math.abs(diff) <= perfectWindow) return 'perfect';
    if (diff < 0) return 'breach';
    return diff <= goodWindow ? 'good' : 'over';
  }

  private spawn(): void {
    const w = this.config.waves;
    const p = this.progress;
    this.wave = {
      index: this.waveCount++,
      lane: this.rng.int(0, this.config.segments - 1),
      crest: round3(this.rng.range(w.minCrest, w.maxCrest)),
      travel: lerp(w.travelStart, w.travelEnd, p),
      t: 0,
    };
    this.wall = 0;
    this.rising = false;
    this.locked = false;
    this.events.push({
      type: 'spawn',
      time: this.time,
      wave: this.wave.index,
      lane: this.wave.lane,
      crest: this.wave.crest,
    });
  }

  private lock(): void {
    this.rising = false;
    this.locked = true;
    if (this.wave) {
      this.lanes[this.wave.lane] = this.wall;
      this.events.push({ type: 'lock', time: this.time, wave: this.wave.index, height: this.wall });
    }
  }

  private impact(wave: Wave): void {
    if (!this.locked) this.lock();
    const s = this.config.scoring;
    const grade = this.grade(this.wall, wave.crest);
    let points = 0;
    switch (grade) {
      case 'perfect':
        points = s.perfectPoints * this.multiplier;
        this.multiplier = Math.min(s.maxMultiplier, this.multiplier + 1);
        this.chain++;
        this.perfects++;
        this.bestChain = Math.max(this.bestChain, this.chain);
        break;
      case 'good':
        points = s.goodPoints * this.multiplier;
        break;
      case 'over':
        points = s.overPoints;
        this.multiplier = 1;
        this.chain = 0;
        break;
      case 'breach':
        this.multiplier = 1;
        this.chain = 0;
        this.breaches++;
        break;
    }
    this.score += points;
    this.events.push({
      type: 'impact',
      time: this.time,
      wave: wave.index,
      lane: wave.lane,
      grade,
      points,
      multiplier: this.multiplier,
    });
    this.wave = null;
    this.gapLeft = lerp(this.config.waves.gapStart, this.config.waves.gapEnd, this.progress);
  }
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000;
