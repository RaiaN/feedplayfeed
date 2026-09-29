import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type FloodLineConfig } from './config.ts';
import { FloodLineSim, HORSEMEN } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);
const idle: Thumb = { held: false, pressed: false, released: false, x: 0, y: 0 };
const tapAt = (x: number, y: number): Thumb => ({ held: true, pressed: true, released: false, x, y });
const hold: Thumb = { held: true, pressed: false, released: false, x: 180, y: 610 };

function playBot(seed: string): FloodLineSim {
  const sim = new FloodLineSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

describe('Flood Line determinism and fairness', () => {
  it('same seed + same inputs ⇒ identical events and score', () => {
    const a = playBot('2026-09-29');
    const b = playBot('2026-09-29');
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
  });

  it('the argument (what is thrown, and when) does not depend on how the player responds', () => {
    const spawns = (s: FloodLineSim) =>
      s.events.flatMap((e) => (e.type === 'spawn' && e.time < 10 ? [[e.id, e.kind, e.time.toFixed(4)]] : []));
    const player = playBot('fair');
    const still = new FloodLineSim(config, 'fair');
    for (let i = 0; i < 10 / DT && !still.overwhelmed; i++) still.step(DT, idle);
    const n = Math.min(spawns(player).length, spawns(still).length);
    expect(n).toBeGreaterThan(6);
    expect(spawns(player).slice(0, n)).toEqual(spawns(still).slice(0, n));
  });

  it('different seeds ⇒ different arguments', () => {
    const f = (s: string) => new FloodLineSim(config, s).items.map((i) => [Math.round(i.x), i.kind]);
    expect(f('2026-09-29')).not.toEqual(f('2026-09-30'));
  });
});

describe('Flood Line rules', () => {
  it('tapping a barb answers it with its antidote; tapping a repair accepts it and lowers your pulse', () => {
    const sim = new FloodLineSim(config, 'rules');
    const barb = sim.items.find((i) => i.kind !== 'repair')!;
    sim.step(DT, tapAt(barb.x, barb.y));
    expect(sim.antidotes).toBe(1);
    expect(sim.positives).toBe(1);
    sim.items.push({ id: 999, kind: 'repair', x: 100, y: 300, dx: 0, dy: 1, speed: 0 });
    const bpm = sim.bpm;
    sim.step(DT, idle);
    sim.step(DT, tapAt(100, 300));
    expect(sim.repairs).toBe(1);
    expect(sim.bpm).toBeLessThan(bpm - config.heart.repairRelief + 1);
  });

  it('while flooded, taps fizzle; holding to breathe brings you back below the flood line', () => {
    const sim = new FloodLineSim(config, 'flood');
    sim.bpm = config.heart.flood + 5;
    sim.step(DT, idle);
    expect(sim.flooded).toBe(true);
    const barb = sim.items[0]!;
    sim.step(DT, tapAt(barb.x, barb.y));
    expect(sim.events.some((e) => e.type === 'fizzle')).toBe(true);
    expect(sim.antidotes).toBe(0);
    for (let i = 0; i < 90; i++) sim.step(DT, hold);
    expect(sim.breathing).toBe(true);
    expect(sim.flooded).toBe(false);
  });

  it('breathing slows the fight down', () => {
    const a = new FloodLineSim(config, 'slow');
    const b = new FloodLineSim(config, 'slow');
    for (let i = 0; i < 60; i++) {
      a.step(DT, idle);
      b.step(DT, hold);
    }
    const da = a.distanceToYou(a.items[0]!);
    const db = b.distanceToYou(b.items[0]!);
    expect(db).toBeGreaterThan(da);
  });

  it('no hits in the opening seconds awards the gentle start-up multiplier', () => {
    const sim = new FloodLineSim(config, 'gentle');
    for (let i = 0; i < (config.startup.seconds + 0.1) / DT; i++) {
      sim.items = []; // nothing reaches you
      sim.step(DT, idle);
    }
    expect(sim.gentleAwarded).toBe(true);
    expect(sim.pointsMultiplier).toBe(config.startup.multiplier);
  });

  it('ignoring the argument floods you out early', () => {
    const sim = new FloodLineSim(config, 'idle');
    for (let i = 0; i < STEPS && !sim.over; i++) sim.step(DT, idle);
    expect(sim.overwhelmed).toBe(true);
    expect(sim.time).toBeLessThan(30);
  });

  it('the bot finishes and lands around the 5:1 benchmark, flooding sometimes', () => {
    const runs = Array.from({ length: 12 }, (_, i) => playBot(`2026-10-${String(i + 1).padStart(2, '0')}`));
    const ratios = runs.map((r) => r.ratio).sort((a, b) => a - b);
    expect(runs.filter((r) => r.finished).length).toBeGreaterThanOrEqual(8);
    expect(ratios[0]!).toBeLessThan(config.scoring.masterRatio);
    expect(ratios[11]!).toBeGreaterThan(config.scoring.masterRatio);
    expect(runs.reduce((n, r) => n + r.floods, 0)).toBeGreaterThan(6);
  });
});

describe('Flood Line content files', () => {
  it('config validates', () => {
    expect(() => validateConfig({ ...config, roundSeconds: 5 } as FloodLineConfig)).toThrow();
  });

  it('strings.json has every template, antidote and fx key', () => {
    const keys = [
      ...TEMPLATE_STRING_KEYS,
      'end.caught',
      'end.survived',
      ...HORSEMEN.map((h) => `antidote.${h}`),
      'fx.repair',
      'fx.flooded',
      'fx.gentle',
    ];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });
});
