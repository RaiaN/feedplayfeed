// Autoplay bot (e2e + clips): catches most bids, some just in time, sometimes misses one or taps a phone
// by mistake. Deterministic per seed. A tap is one step down, one step up.
import { createRng } from '@feedplay/engine';
import type { LittleMomentsSim } from './sim.ts';

export function createBot(seed: string): (sim: LittleMomentsSim) => { held: boolean; x: number; y: number } {
  const rng = createRng(seed).fork('bot');
  const plan = new Map<number, number>(); // id → age at which to tap (Infinity = let it go)
  let tapped = false;
  let last = { x: 180, y: 400 };
  return (sim) => {
    if (tapped) {
      tapped = false;
      return { held: false, ...last };
    }
    for (const m of sim.moments) {
      if (!plan.has(m.id)) {
        const r = rng.next();
        if (m.kind === 'phone') plan.set(m.id, r < 0.05 ? rng.range(0.3, 0.8) * m.life : Infinity);
        else
          plan.set(
            m.id,
            r < 0.08 ? Infinity : r < 0.35 ? rng.range(0.72, 0.9) * m.life : rng.range(0.2, 0.55) * m.life,
          );
      }
    }
    // Oldest due moment first.
    const due = sim.moments
      .filter((m) => m.age >= (plan.get(m.id) ?? Infinity))
      .sort((a, b) => b.age / b.life - a.age / a.life)[0];
    if (!due) return { held: false, ...last };
    tapped = true;
    last = { x: due.x, y: due.y };
    return { held: true, ...last };
  };
}
