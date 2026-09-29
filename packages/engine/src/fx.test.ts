import { describe, expect, it } from 'vitest';
import { Heartbeat } from './audio.ts';
import { Shake, TimeWarp } from './fx.ts';

describe('fx', () => {
  it('TimeWarp slows dt for a fixed amount of simulated time, deterministically', () => {
    const w = new TimeWarp();
    w.trigger(0.1, 0.25);
    const dts = Array.from({ length: 10 }, () => w.apply(1 / 60));
    expect(dts.slice(0, 6).every((d) => Math.abs(d - 0.25 / 60) < 1e-12)).toBe(true);
    expect(dts.at(-1)).toBeCloseTo(1 / 60);
    expect(w.active).toBe(false);
  });

  it('Shake decays to zero and is off under reduced motion', () => {
    const s = new Shake();
    s.trigger(1, 10, 0.3);
    expect(Math.abs(s.offset(1.05, false).x) + Math.abs(s.offset(1.05, false).y)).toBeGreaterThan(0);
    expect(s.offset(1.05, true)).toEqual({ x: 0, y: 0 });
    expect(s.offset(2, false)).toEqual({ x: 0, y: 0 });
  });

  it('Heartbeat fires at the requested rate in simulated time', () => {
    const hb = new Heartbeat(undefined);
    for (let i = 0; i < 600; i++) hb.update(1 / 60, 120); // 10 s at 120 bpm
    expect(hb.beats).toBeGreaterThanOrEqual(19); // float accumulation may land the 20th beat one step late
    expect(hb.beats).toBeLessThanOrEqual(20);
    const before = hb.beats;
    for (let i = 0; i < 60; i++) hb.update(1 / 60, 0);
    expect(hb.beats).toBe(before);
  });
});
