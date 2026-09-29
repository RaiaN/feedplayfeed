import { describe, expect, it } from 'vitest';
import { FixedLoop } from './loop.ts';

const make = (maxSteps = 8) => {
  const dts: number[] = [];
  const alphas: number[] = [];
  const loop = new FixedLoop({ step: (dt) => dts.push(dt), render: (a) => alphas.push(a), stepMs: 10, maxSteps });
  return { loop, dts, alphas };
};

describe('FixedLoop', () => {
  it('runs a whole number of fixed steps and carries the remainder', () => {
    const { loop, dts } = make();
    loop.frame(0);
    expect(loop.frame(25)).toBe(2);
    expect(loop.frame(30)).toBe(1); // 5 carried + 5
    expect(dts.every((d) => d === 0.01)).toBe(true);
    expect(loop.stepCount).toBe(3);
  });

  it('gives identical step counts for the same total time at different frame rates', () => {
    const a = make();
    const b = make();
    a.loop.frame(0);
    b.loop.frame(0);
    for (let t = 1; t <= 60; t++) a.loop.frame((t * 1000) / 60);
    for (let t = 1; t <= 144; t++) b.loop.frame((t * 1000) / 144);
    expect(Math.abs(a.loop.stepCount - b.loop.stepCount)).toBeLessThanOrEqual(1);
    expect(a.loop.stepCount).toBeGreaterThanOrEqual(99);
  });

  it('clamps long frames instead of spiralling', () => {
    const { loop } = make(4);
    loop.frame(0);
    expect(loop.frame(10_000)).toBe(4);
    expect(loop.frame(10_010)).toBe(1);
  });

  it('applies timeScale', () => {
    const { loop } = make();
    loop.timeScale = 4;
    loop.frame(0);
    expect(loop.frame(20)).toBe(8);
  });

  it('does not simulate while paused, and resetClock skips the gap', () => {
    const { loop } = make();
    loop.frame(0);
    loop.paused = true;
    expect(loop.frame(500)).toBe(0);
    loop.paused = false;
    loop.resetClock();
    expect(loop.frame(5000)).toBe(0);
    expect(loop.frame(5010)).toBe(1);
  });

  it('reports interpolation alpha in [0,1)', () => {
    const { loop, alphas } = make();
    loop.frame(0);
    loop.frame(15);
    expect(alphas.at(-1)).toBeCloseTo(0.5);
  });
});
