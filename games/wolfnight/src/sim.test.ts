import { describe, expect, it } from 'vitest';
import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type WolfNightConfig } from './config.ts';
import { angleDiff, WolfNightSim } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);
const idle: Thumb = { held: false, pressed: false, released: false, x: 0, y: 0 };

function playBot(seed: string): WolfNightSim {
  const sim = new WolfNightSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

describe('Wolf Night determinism', () => {
  it('same seed + same inputs ⇒ identical events and score', () => {
    const a = playBot('2026-09-29');
    const b = playBot('2026-09-29');
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
  });

  it('different seeds ⇒ different wolves', () => {
    const spawns = (s: string) => new WolfNightSim(config, s).wolves.map((w) => [w.x, w.y]);
    expect(spawns('2026-09-29')).not.toEqual(spawns('2026-09-30'));
  });
});

describe('Wolf Night rules', () => {
  it('doing nothing gets you caught well before dawn, and the round ends after the caught hold', () => {
    const sim = new WolfNightSim(config, 'idle');
    let steps = 0;
    while (!sim.over && steps < STEPS) {
      sim.step(DT, idle);
      steps++;
    }
    expect(sim.caught).not.toBeNull();
    expect(sim.over).toBe(true);
    expect(sim.time).toBeGreaterThan(3);
    expect(sim.time).toBeLessThan(15);
    expect(sim.survived).toBe(false);
  });

  it('a flash toward a close wolf is a close call: bonus, multiplier +1, wolf driven back', () => {
    const sim = new WolfNightSim(config, 'close');
    const w = sim.wolves[0]!;
    // Put the wolf just inside the close-call ring, directly right of the girl.
    w.x = config.girl.x + config.scoring.closeCallRadius - 10;
    w.y = config.girl.y;
    const before = sim.distance(w);
    sim.step(DT, { held: true, pressed: true, released: false, x: w.x, y: w.y });
    expect(sim.closeCalls).toBe(1);
    expect(sim.multiplier).toBe(2);
    expect(sim.score).toBe(config.scoring.closeCall);
    for (let i = 0; i < 30; i++) sim.step(DT, idle);
    expect(sim.distance(w)).toBeGreaterThan(before + config.wolves.pushBack * 0.9);
  });

  it('a flash that hits nothing resets the multiplier; empty oil fizzles', () => {
    const sim = new WolfNightSim(config, 'miss');
    sim.multiplier = 4;
    sim.wolves.length = 0;
    sim.step(DT, { held: true, pressed: true, released: false, x: 180, y: 120 });
    expect(sim.multiplier).toBe(1);
    sim.oil = 0;
    sim.cooldown = 0;
    sim.step(DT, { held: true, pressed: true, released: false, x: 180, y: 120 });
    expect(sim.events.at(-1)?.type).toBe('fizzle');
  });

  it('flash cone geometry', () => {
    expect(angleDiff(0.1, -0.1)).toBeCloseTo(0.2);
    expect(angleDiff(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1);
  });

  it('the bot plays long, tense rounds (good clips) and sometimes reaches dawn', () => {
    const seeds = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const runs = seeds.map(playBot);
    const survived = runs.filter((r) => r.survived).length;
    const median = runs.map((r) => r.time).sort((a, b) => a - b)[6]!;
    expect(median).toBeGreaterThan(25);
    expect(survived).toBeGreaterThanOrEqual(3);
    expect(runs.reduce((n, r) => n + r.closeCalls, 0)).toBeGreaterThan(12 * 5);
  });
});

describe('Wolf Night content files', () => {
  it('config validates and round length is 30–90 s', () => {
    expect(config.roundSeconds).toBeGreaterThanOrEqual(30);
    expect(config.roundSeconds).toBeLessThanOrEqual(90);
    expect(() => validateConfig({ ...config, roundSeconds: 5 } as WolfNightConfig)).toThrow();
  });

  it('strings.json has every template and game key', () => {
    const keys = [...TEMPLATE_STRING_KEYS, 'end.caught', 'end.survived', 'fx.close', 'fx.back', 'fx.dawn'];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });
});
