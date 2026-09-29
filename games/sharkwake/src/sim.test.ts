import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type SharkWakeConfig } from './config.ts';
import { SharkWakeSim } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);
const idle: Thumb = { held: false, pressed: false, released: false, x: 180, y: 560 };
const tapSide = (x: number): Thumb => ({ held: true, pressed: true, released: false, x, y: 560 });

function playBot(seed: string): SharkWakeSim {
  const sim = new SharkWakeSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

describe('Shark Wake determinism', () => {
  it('same seed + same inputs ⇒ identical events and score', () => {
    const a = playBot('2026-09-29');
    const b = playBot('2026-09-29');
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
  });

  it('different seeds ⇒ different obstacle layouts', () => {
    const rows = (s: string) => new SharkWakeSim(config, s).rows.map((r) => r.lanes.join());
    expect(rows('2026-09-29')).not.toEqual(rows('2026-09-30'));
  });
});

describe('Shark Wake rules', () => {
  it('taps switch lanes left and right, clamped to the edges', () => {
    const sim = new SharkWakeSim(config, 'lanes');
    sim.step(DT, tapSide(40));
    expect(sim.lane).toBe(0);
    sim.step(DT, idle);
    sim.step(DT, tapSide(40));
    expect(sim.lane).toBe(0);
    sim.step(DT, idle);
    sim.step(DT, tapSide(320));
    expect(sim.lane).toBe(1);
  });

  it('hitting an obstacle slows you, resets the multiplier and lets the fin gain', () => {
    const sim = new SharkWakeSim(config, 'hit');
    sim.rows = [{ id: 99, d: 20, lanes: [null, 'rock', null], passed: false }];
    sim.multiplier = 3;
    const gap = sim.gap;
    for (let i = 0; i < 10; i++) sim.step(DT, idle);
    expect(sim.hits).toBe(1);
    expect(sim.multiplier).toBe(1);
    expect(sim.slow).toBeGreaterThan(0);
    expect(sim.gap).toBeLessThan(gap - config.fin.hitPenalty + 1);
  });

  it('a last-moment dodge out of a blocked lane is a near miss', () => {
    const sim = new SharkWakeSim(config, 'near');
    sim.rows = [{ id: 99, d: 30, lanes: [null, 'log', null], passed: false }];
    sim.step(DT, idle);
    sim.step(DT, tapSide(320));
    for (let i = 0; i < 20; i++) sim.step(DT, idle);
    expect(sim.hits).toBe(0);
    expect(sim.nearMisses).toBe(1);
    expect(sim.multiplier).toBe(2);
  });

  it('never steering gets you wiped out well before shore', () => {
    const sim = new SharkWakeSim(config, 'idle');
    let i = 0;
    while (!sim.over && i++ < STEPS) sim.step(DT, idle);
    expect(sim.wiped).toBe(true);
    expect(sim.time).toBeLessThan(40);
  });

  it('the bot plays long, tense rounds and often makes shore', () => {
    const runs = Array.from({ length: 12 }, (_, i) => playBot(`2026-10-${String(i + 1).padStart(2, '0')}`));
    const shore = runs.filter((r) => r.survived).length;
    const median = runs.map((r) => r.time).sort((a, b) => a - b)[6]!;
    expect(median).toBeGreaterThan(25);
    expect(shore).toBeGreaterThanOrEqual(3);
    expect(runs.reduce((n, r) => n + r.nearMisses, 0)).toBeGreaterThan(12 * 8);
  });
});

describe('Shark Wake content files', () => {
  it('config validates', () => {
    expect(() => validateConfig({ ...config, roundSeconds: 5 } as SharkWakeConfig)).toThrow();
  });

  it('strings.json has every template and game key', () => {
    const keys = [...TEMPLATE_STRING_KEYS, 'end.caught', 'end.survived', 'fx.near', 'fx.boost', 'fx.hit', 'fx.shore'];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });
});
