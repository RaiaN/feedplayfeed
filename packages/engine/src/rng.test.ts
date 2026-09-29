import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './rng.ts';

const draw = (seed: string, n = 50): number[] => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    expect(draw('2026-09-29')).toEqual(draw('2026-09-29'));
  });

  it('differs between seeds', () => {
    expect(draw('2026-09-29')).not.toEqual(draw('2026-09-30'));
  });

  it('matches a pinned sequence (guards against accidental algorithm changes)', () => {
    expect(hashSeed('feedplay')).toBe(hashSeed('feedplay'));
    const r = createRng(42);
    const first = [r.next(), r.next(), r.next()].map((v) => Math.round(v * 1e9));
    expect(first).toMatchInlineSnapshot(`
      [
        601103752,
        448290559,
        852465793,
      ]
    `);
  });

  it('keeps values in range', () => {
    const r = createRng('range');
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('forks independent, deterministic streams', () => {
    const a = createRng('seed').fork('waves');
    const b = createRng('seed');
    b.next();
    b.next();
    expect(b.fork('waves').next()).toBe(a.next());
    expect(createRng('seed').fork('waves').next()).not.toBe(createRng('seed').fork('fx').next());
  });
});
