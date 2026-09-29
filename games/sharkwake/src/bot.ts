// Autoplay bot (e2e + clips): dodges late on purpose (near misses make better clips), hunts wave boosts, and
// occasionally reacts too late. Deterministic per seed. A "tap" is one step down, one step up.
import { createRng } from '@feedplay/engine';
import type { Row, SharkWakeSim } from './sim.ts';

const blocked = (row: Row, lane: number) => row.lanes[lane] === 'rock' || row.lanes[lane] === 'log';

export function createBot(seed: string): (sim: SharkWakeSim) => { held: boolean; x: number; y: number } {
  const rng = createRng(seed).fork('bot');
  const reactAt = new Map<number, number>();
  let tapped = false;
  let goal: number | null = null;
  return (sim) => {
    const y = 560;
    const idle = { held: false, x: 180, y };
    if (tapped) {
      tapped = false;
      return idle;
    }
    const tapToward = (lane: number) => {
      tapped = true;
      return { held: true, x: lane < sim.lane ? 60 : 300, y };
    };
    // Finish a multi-lane move first.
    if (goal !== null && goal !== sim.lane) return tapToward(goal);
    goal = null;

    const next = sim.rows.find((r) => !r.passed && r.d > sim.distance);
    if (!next) return idle;
    if (!reactAt.has(next.id)) {
      const r = rng.next();
      const late = next.id > 3 && r > 0.97;
      reactAt.set(next.id, late ? 8 : r < 0.6 ? rng.range(40, 75) : rng.range(120, 200));
    }
    const ahead = next.d - sim.distance;
    const lane = sim.lane;
    if (blocked(next, lane)) {
      const free = [0, 1, 2].filter((l) => !blocked(next, l));
      free.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || (next.lanes[b] === 'boost' ? 1 : -1));
      const target = free[0];
      // A two-lane move needs more room.
      if (target !== undefined && ahead <= reactAt.get(next.id)! * (Math.abs(target - lane) > 1 ? 1.8 : 1)) {
        goal = target;
        return tapToward(target);
      }
      return idle;
    }
    // Line up for a boost next door when there's time.
    if (next.lanes[lane] !== 'boost' && ahead > 110) {
      const b = [lane - 1, lane + 1].find((l) => l >= 0 && l <= 2 && next.lanes[l] === 'boost');
      if (b !== undefined) {
        goal = b;
        return tapToward(b);
      }
    }
    return idle;
  };
}
