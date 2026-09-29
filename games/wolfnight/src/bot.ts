// Autoplay bot (e2e + clips): reacts to wolves late on purpose (close calls make better clips), refuels on
// fireflies, and sometimes hesitates. Deterministic per seed.
import { createRng } from '@feedplay/engine';
import type { WolfNightSim } from './sim.ts';

export interface BotTap {
  held: boolean;
  x: number;
  y: number;
}

export function createBot(seed: string): (sim: WolfNightSim) => BotTap {
  const rng = createRng(seed).fork('bot');
  const reactAt = new Map<number, number>();
  let tapped = false;
  let last = { x: 180, y: 390 };
  return (sim) => {
    // A tap is one step down, one step up.
    if (tapped) {
      tapped = false;
      return { held: false, ...last };
    }
    const tap = (x: number, y: number): BotTap => {
      tapped = true;
      last = { x, y };
      return { held: true, x, y };
    };
    if (sim.oil < 0.6) {
      const f = sim.fireflies.find((ff) => ff.life > 0.3);
      if (f) return tap(f.x, f.y);
    }
    if (sim.cooldown > 0) return { held: false, ...last };
    let target: { x: number; y: number } | null = null;
    let best = Infinity;
    for (const w of sim.wolves) {
      if (w.retreat > 0) continue;
      if (!reactAt.has(w.id)) {
        // Mostly flash inside the close-call ring; sometimes early; rarely dangerously late.
        const r = rng.next();
        reactAt.set(w.id, r < 0.6 ? rng.range(45, 75) : r < 0.95 ? rng.range(85, 150) : rng.range(26, 34));
      }
      const d = sim.distance(w);
      if (d <= (reactAt.get(w.id) ?? 80) && d < best) {
        best = d;
        target = w;
      }
    }
    // Human-ish aim: a little off target.
    return target ? tap(target.x + rng.range(-22, 22), target.y + rng.range(-22, 22)) : { held: false, ...last };
  };
}
