// Autoplay bot (e2e + clips): good but imperfect, deterministic per seed.
import { createRng } from '@feedplay/engine';
import type { TidewallSim } from './sim.ts';

export function createBot(seed: string): (sim: TidewallSim) => boolean {
  const rng = createRng(seed).fork('bot');
  let waveIndex = -1;
  let target = 0;
  let delay = 0;
  return (sim) => {
    const wave = sim.wave;
    if (!wave || sim.locked) return false;
    if (wave.index !== waveIndex) {
      waveIndex = wave.index;
      // Mostly perfect locks, sometimes a bit high, occasionally short (a breach).
      const roll = rng.next();
      const err = roll < 0.7 ? rng.range(-0.03, 0.03) : roll < 0.92 ? rng.range(0.07, 0.14) : -0.12;
      target = wave.crest + err;
      // Never wait so long that the wall can't reach the target before impact.
      const latest = wave.travel - target / sim.config.riseSpeed - 0.1;
      delay = Math.max(0, Math.min(rng.range(0.15, 0.5), latest));
    }
    if (wave.t < delay) return false;
    return !sim.rising || sim.wall < target;
  };
}
