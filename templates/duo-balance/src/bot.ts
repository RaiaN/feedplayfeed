// Autoplay bot (e2e + clips): reads the card, prefers the option that keeps both partners up and level, answers
// with human-ish delays (sometimes at the last moment), and sometimes gets it wrong. Deterministic per seed.
import { createRng } from '@feedplay/engine';
import type { DuoSim } from './sim.ts';
import type { Option } from './types.ts';

export function createDuoBot(seed: string): (sim: DuoSim) => { held: boolean; x: number; y: number } {
  const rng = createRng(seed).fork('duo-bot');
  const plan = new Map<number, { at: number; mistake: boolean }>();
  let tapped = false;
  const idle = { held: false, x: 180, y: 560 };
  const value = (sim: DuoSim, o: Option | null): number => {
    if (!o) return -Infinity;
    const m = { ...sim.meters };
    m[o.who] += o.delta;
    return Math.min(m.ari, m.jo) - Math.abs(m.ari - m.jo) * 0.35;
  };
  return (sim) => {
    if (tapped) {
      tapped = false;
      return idle;
    }
    const card = sim.card;
    if (!card) return idle;
    if (!plan.has(card.n)) {
      const r = rng.next();
      const at = r < 0.3 ? rng.range(0.78, 0.92) * card.timer : rng.range(0.3, 0.65) * card.timer;
      plan.set(card.n, { at, mistake: rng.chance(0.1) });
    }
    const p = plan.get(card.n)!;
    if (card.age < p.at) return idle;
    const l = value(sim, sim.shown('l'));
    const r = value(sim, sim.shown('r'));
    let side: 'l' | 'r' = l >= r ? 'l' : 'r';
    if (p.mistake) side = side === 'l' ? 'r' : 'l';
    tapped = true;
    return { held: true, x: side === 'l' ? 90 : 270, y: 555 };
  };
}
