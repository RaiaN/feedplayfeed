import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type HawkShadowConfig } from './config.ts';
import { HawkShadowSim } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);
const run: Thumb = { held: true, pressed: false, released: false, x: 180, y: 470 };
const freeze: Thumb = { held: false, pressed: false, released: false, x: 180, y: 470 };

function playBot(seed: string): HawkShadowSim {
  const sim = new HawkShadowSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

describe('Hawk Shadow determinism', () => {
  it('same seed + same inputs ⇒ identical events and score', () => {
    const a = playBot('2026-09-29');
    const b = playBot('2026-09-29');
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
  });

  it('different seeds ⇒ different seeds on the field and dive timings', () => {
    const f = (s: string) => {
      const sim = new HawkShadowSim(config, s);
      return sim.seeds.map((x) => Math.round(x.x));
    };
    expect(f('2026-09-29')).not.toEqual(f('2026-09-30'));
  });
});

describe('Hawk Shadow rules', () => {
  it('running through a real strike gets you caught; the round ends after the hold', () => {
    const sim = new HawkShadowSim(config, 'run');
    let i = 0;
    while (!sim.over && i++ < STEPS) sim.step(DT, run);
    expect(sim.caught).toBe(true);
    expect(sim.time).toBeGreaterThanOrEqual(config.hawk.firstDive - 1e-9);
    expect(sim.time).toBeLessThan(config.hawk.firstDive + 0.5);
  });

  it('freezing just before the strike is a close call; freezing early is merely safe', () => {
    const late = new HawkShadowSim(config, 'x');
    const at = late.dive.at; // the first dive is always real
    while (late.time < at - 0.1) late.step(DT, run);
    while (late.time < at + config.hawk.strikeWindow + 0.05) late.step(DT, freeze);
    expect(late.caught).toBe(false);
    expect(late.closeCalls).toBe(1);
    expect(late.multiplier).toBe(2);

    const early = new HawkShadowSim(config, 'x');
    while (early.time < at - 1) early.step(DT, run);
    while (early.time < at + config.hawk.strikeWindow + 0.05) early.step(DT, freeze);
    expect(early.caught).toBe(false);
    expect(early.closeCalls).toBe(0);
    expect(early.events.some((e) => e.type === 'safe')).toBe(true);
  });

  it('standing still forever is safe but scores nothing from distance', () => {
    const sim = new HawkShadowSim(config, 'still');
    for (let i = 0; i < STEPS; i++) sim.step(DT, freeze);
    expect(sim.caught).toBe(false);
    expect(sim.survived).toBe(true);
    expect(sim.distance).toBe(0);
    expect(sim.score).toBe(config.scoring.homeBonus);
  });

  it('the bot plays long, tense rounds and often gets home', () => {
    const runs = Array.from({ length: 12 }, (_, i) => playBot(`2026-10-${String(i + 1).padStart(2, '0')}`));
    const home = runs.filter((r) => r.survived).length;
    const median = runs.map((r) => r.time).sort((a, b) => a - b)[6]!;
    expect(median).toBeGreaterThan(25);
    expect(home).toBeGreaterThanOrEqual(3);
    expect(runs.reduce((n, r) => n + r.closeCalls, 0)).toBeGreaterThan(12 * 4);
  });
});

describe('Hawk Shadow content files', () => {
  it('config validates', () => {
    expect(() => validateConfig({ ...config, roundSeconds: 5 } as HawkShadowConfig)).toThrow();
  });

  it('strings.json has every template and game key', () => {
    const keys = [...TEMPLATE_STRING_KEYS, 'end.caught', 'end.survived', 'fx.close', 'fx.safe', 'fx.feint', 'fx.home'];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });
});
