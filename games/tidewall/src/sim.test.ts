import { createStrings } from '@feedplay/engine';
import { TEMPLATE_STRING_KEYS, type Thumb } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type TidewallConfig } from './config.ts';
import { createTidewall } from './game.ts';
import { TidewallSim } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);

/** Play a full round with the bot, returning the sim. */
function playBot(seed: string): TidewallSim {
  const sim = new TidewallSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS; i++) {
    const held = bot(sim);
    sim.step(DT, { held, pressed: held && !prev, released: !held && prev });
    prev = held;
  }
  return sim;
}

/** Scripted input tape: hold for `holdSteps` starting `delaySteps` after each spawn. */
function playTape(seed: string, delaySteps: number, holdSteps: number): TidewallSim {
  const sim = new TidewallSim(config, seed);
  let since = 0;
  let wave = -1;
  let prev = false;
  for (let i = 0; i < STEPS; i++) {
    const idx = sim.wave?.index ?? -1;
    if (idx !== wave) {
      wave = idx;
      since = 0;
    }
    const held = idx >= 0 && since >= delaySteps && since < delaySteps + holdSteps;
    since++;
    sim.step(DT, { held, pressed: held && !prev, released: !held && prev });
    prev = held;
  }
  return sim;
}

describe('Tidewall determinism', () => {
  it('same seed + same inputs ⇒ identical event log and score', () => {
    const a = playTape('2026-09-29', 10, 40);
    const b = playTape('2026-09-29', 10, 40);
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
    const c = playBot('challenge-x');
    const d = playBot('challenge-x');
    expect(c.events).toEqual(d.events);
    expect(c.score).toBe(d.score);
  });

  it('different seeds ⇒ different wave schedules', () => {
    const spawns = (seed: string) =>
      new TidewallSim(config, seed).events.filter((e) => e.type === 'spawn').map((e) => JSON.stringify(e));
    expect(spawns('2026-09-29')).not.toEqual(spawns('2026-09-30'));
  });

  it('the bot scores well and the round has a sensible number of waves', () => {
    const sim = playBot('2026-09-29');
    const impacts = sim.events.filter((e) => e.type === 'impact');
    expect(impacts.length).toBeGreaterThanOrEqual(10);
    expect(impacts.length).toBeLessThanOrEqual(40);
    expect(sim.perfects).toBeGreaterThan(impacts.length / 3);
    expect(sim.score).toBeGreaterThan(0);
  });
});

describe('Tidewall scoring', () => {
  const s = config.scoring;
  const sim = new TidewallSim(config, 'grading');

  it('grades lock height against the crest', () => {
    expect(sim.grade(0.5, 0.5)).toBe('perfect');
    expect(sim.grade(0.5 + s.perfectWindow * 0.9, 0.5)).toBe('perfect');
    expect(sim.grade(0.5 - s.perfectWindow * 0.9, 0.5)).toBe('perfect');
    expect(sim.grade(0.5 + s.goodWindow * 0.9, 0.5)).toBe('good');
    expect(sim.grade(0.5 + s.goodWindow * 1.1, 0.5)).toBe('over');
    expect(sim.grade(0.5 - s.perfectWindow * 1.1, 0.5)).toBe('breach');
  });

  it('a perfect lock scores perfectPoints × multiplier and raises the multiplier', () => {
    const t = new TidewallSim(config, 'perfect');
    const wave = t.wave!;
    let prev = false;
    // Hold exactly long enough to reach the crest, then release.
    const holdSteps = Math.round(wave.crest / config.riseSpeed / DT);
    for (let i = 0; i < 400 && t.events.every((e) => e.type !== 'impact'); i++) {
      const held = i < holdSteps;
      t.step(DT, { held, pressed: held && !prev, released: !held && prev });
      prev = held;
    }
    const impact = t.events.find((e) => e.type === 'impact');
    expect(impact).toMatchObject({ grade: 'perfect', points: s.perfectPoints, multiplier: 2 });
  });

  it('no input is a breach and resets the multiplier', () => {
    const t = new TidewallSim(config, 'idle');
    const none: Thumb = { held: false, pressed: false, released: false };
    for (let i = 0; i < 400; i++) t.step(DT, none);
    const impacts = t.events.filter((e) => e.type === 'impact');
    expect(impacts.length).toBeGreaterThan(0);
    expect(impacts.every((e) => e.type === 'impact' && e.grade === 'breach' && e.points === 0)).toBe(true);
    expect(t.multiplier).toBe(1);
  });
});

describe('Tidewall content files', () => {
  it('config round length is within 30–90 s and validates', () => {
    expect(config.roundSeconds).toBeGreaterThanOrEqual(30);
    expect(config.roundSeconds).toBeLessThanOrEqual(90);
    expect(() => validateConfig({ ...config, roundSeconds: 10 } as TidewallConfig)).toThrow();
  });

  it('strings.json defines every template and grade key', () => {
    const keys = [...TEMPLATE_STRING_KEYS, 'grade.perfect', 'grade.good', 'grade.over', 'grade.breach'];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });

  it('game wiring builds rounds that expose score and summary', () => {
    const game = createTidewall(config, createStrings(strings));
    const round = game.createRound('x', { sound: undefined as never, reducedMotion: () => false });
    expect(round.score).toBe(0);
    expect(round.summary()).toHaveProperty('chain', 0);
  });
});
