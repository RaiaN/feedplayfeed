import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import rawConfig from '../game.config.json';
import strings from '../strings.json';
import { createBot } from './bot.ts';
import { validateConfig, type LittleMomentsConfig } from './config.ts';
import { LittleMomentsSim } from './sim.ts';

const config = validateConfig(rawConfig);
const DT = 1 / 60;
const STEPS = Math.round(config.roundSeconds / DT);
const idle: Thumb = { held: false, pressed: false, released: false, x: 0, y: 0 };
const tapAt = (x: number, y: number): Thumb => ({ held: true, pressed: true, released: false, x, y });

function playBot(seed: string): LittleMomentsSim {
  const sim = new LittleMomentsSim(config, seed);
  const bot = createBot(seed);
  let prev = false;
  for (let i = 0; i < STEPS && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

describe('Little Moments determinism and fairness', () => {
  it('same seed + same inputs ⇒ identical events and score', () => {
    const a = playBot('2026-09-29');
    const b = playBot('2026-09-29');
    expect(a.events).toEqual(b.events);
    expect(a.score).toBe(b.score);
  });

  it('the moments that appear do not depend on what the player taps', () => {
    const spawns = (s: LittleMomentsSim) =>
      s.events.flatMap((e) => (e.type === 'spawn' && e.time < 8 ? [[e.id, e.kind, e.x, e.y, e.time.toFixed(4)]] : []));
    const player = playBot('fair');
    const idleSim = new LittleMomentsSim(config, 'fair');
    for (let i = 0; i < 8 / DT && !idleSim.drifted; i++) idleSim.step(DT, idle);
    const n = Math.min(spawns(player).length, spawns(idleSim).length);
    expect(n).toBeGreaterThan(6);
    expect(spawns(player).slice(0, n)).toEqual(spawns(idleSim).slice(0, n));
  });

  it('different seeds ⇒ different moments', () => {
    const f = (s: string) => new LittleMomentsSim(config, s).moments.map((m) => [m.x, m.y]);
    expect(f('2026-09-29')).not.toEqual(f('2026-09-30'));
  });
});

describe('Little Moments rules', () => {
  it('tapping a bid turns toward it: points, streak, bank deposit', () => {
    const sim = new LittleMomentsSim(config, 'rules');
    const bid = sim.moments.find((m) => m.kind === 'bid')!;
    const bank = sim.bank;
    sim.step(DT, tapAt(bid.x, bid.y));
    expect(sim.toward).toBe(1);
    expect(sim.score).toBe(config.scoring.toward);
    expect(sim.bank).toBeCloseTo(bank + config.bank.toward, 0);
  });

  it('tapping a phone is turning away: penalty and streak reset', () => {
    const sim = new LittleMomentsSim(config, 'rules');
    const phone = sim.moments.find((m) => m.kind === 'phone')!;
    sim.streak = 7;
    sim.multiplier = 2;
    const bank = sim.bank;
    sim.step(DT, tapAt(phone.x, phone.y));
    expect(sim.away).toBe(1);
    expect(sim.multiplier).toBe(1);
    expect(sim.bank).toBeCloseTo(bank + config.bank.distracted, 0);
  });

  it('ignoring everything drains the bank until the couple drift apart, well before the end', () => {
    const sim = new LittleMomentsSim(config, 'idle');
    for (let i = 0; i < STEPS && !sim.over; i++) sim.step(DT, idle);
    expect(sim.drifted).toBe(true);
    expect(sim.towardPct).toBe(0);
    expect(sim.time).toBeLessThan(20);
  });

  it('the bot lands between the research benchmarks and usually finishes the day', () => {
    const runs = Array.from({ length: 12 }, (_, i) => playBot(`2026-10-${String(i + 1).padStart(2, '0')}`));
    const finished = runs.filter((r) => r.finished).length;
    const pct = runs.map((r) => r.towardPct).sort((a, b) => a - b)[6]!;
    expect(finished).toBeGreaterThanOrEqual(8);
    expect(pct).toBeGreaterThan(config.benchmarks.disasters);
    expect(pct).toBeLessThanOrEqual(100);
    expect(runs.reduce((n, r) => n + r.justInTime, 0)).toBeGreaterThan(12 * 5);
  });
});

describe('Little Moments content files', () => {
  it('config validates', () => {
    expect(() => validateConfig({ ...config, roundSeconds: 5 } as LittleMomentsConfig)).toThrow();
  });

  it('strings.json has every template and game key', () => {
    const keys = [
      ...TEMPLATE_STRING_KEYS,
      'end.caught',
      'end.survived',
      'fx.toward',
      'fx.jit',
      'fx.big',
      'fx.away',
      'fx.missed',
    ];
    for (const k of keys) expect(strings).toHaveProperty([k]);
  });
});
