// Autoplay bot (e2e + clips): answers most barbs (often late = close calls), usually accepts repairs, and takes a
// breather when its pulse nears the flood line. Deterministic per seed.
import { createRng } from '@feedplay/engine';
import type { FloodLineSim } from './sim.ts';

export function createBot(seed: string): (sim: FloodLineSim) => { held: boolean; x: number; y: number } {
  const rng = createRng(seed).fork('bot');
  const react = new Map<number, number>(); // item id → distance-to-you at which to tap (0 = never)
  let tapped = false;
  let calming = false;
  const breathSpot = { x: 180, y: 610 };
  return (sim) => {
    const h = sim.config.heart;
    // Like a person: it notices it's flooded only once it is.
    if (sim.flooded) calming = true;
    if (calming && sim.bpm <= h.rest + 10) calming = false;
    if (calming) return { held: true, ...breathSpot };
    if (tapped) {
      tapped = false;
      return { held: false, ...breathSpot };
    }
    let target: { x: number; y: number } | null = null;
    let nearest = Infinity;
    for (const it of sim.items) {
      if (!react.has(it.id)) {
        const r = rng.next();
        const skip = it.kind === 'repair' ? r < 0.15 : r < 0.12;
        react.set(it.id, skip ? 0 : r < 0.6 ? rng.range(70, 140) : rng.range(170, 280));
      }
      const d = sim.distanceToYou(it);
      if (d <= (react.get(it.id) ?? 0) && d < nearest) {
        nearest = d;
        target = it;
      }
    }
    if (!target) return { held: false, ...breathSpot };
    tapped = true;
    return { held: true, x: target.x, y: target.y };
  };
}
