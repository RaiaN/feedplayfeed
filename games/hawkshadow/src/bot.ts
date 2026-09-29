// Autoplay bot (e2e + clips): runs, steers toward seeds, and freezes late on purpose (close calls make better
// clips). Now and then it freezes too late. Deterministic per seed.
import { createRng } from '@feedplay/engine';
import type { HawkShadowSim } from './sim.ts';

export function createBot(seed: string): (sim: HawkShadowSim) => { held: boolean; x: number; y: number } {
  const rng = createRng(seed).fork('bot');
  const lead = new Map<number, number>();
  return (sim) => {
    const d = sim.dive;
    if (!lead.has(d.index)) {
      const r = rng.next();
      // Rarely too late (never on the opening dives, so clips start well).
      const late = d.index > 2 && r >= 0.985;
      lead.set(d.index, late ? -0.03 : r < 0.6 ? rng.range(0.05, 0.25) : rng.range(0.35, 0.8));
    }
    const y = sim.config.mouse.screenY;
    // Steer toward the next seed ahead, else drift to centre.
    const next = sim.seeds.find((s) => s.d > sim.distance + 20 && s.d < sim.distance + 260);
    const x = next ? next.x : 180;
    if (d.resolved) return { held: true, x, y };
    const toStrike = d.at - sim.time;
    const freeze = toStrike <= (lead.get(d.index) ?? 0.3) && sim.time < d.at + sim.config.hawk.strikeWindow;
    // Feints pull up at the strike moment; a frozen bot waits for the shadow to leave.
    return { held: !freeze, x, y };
  };
}
