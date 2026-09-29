import type { Sound, Strings } from '@feedplay/engine';
import type { ScoreAttackGame, ScoreAttackRound, Thumb, RenderView } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type TidewallConfig } from './config.ts';
import { colors } from './palette.ts';
import { TidewallRenderer } from './render.ts';
import { TidewallSim, type Grade } from './sim.ts';

const SFX: Record<Grade, (s: Sound) => void> = {
  perfect: (s) => s.blip({ freq: 880, slideTo: 1320, duration: 0.12, type: 'triangle' }),
  good: (s) => s.blip({ freq: 660, duration: 0.08, type: 'triangle' }),
  over: (s) => s.blip({ freq: 330, slideTo: 260, duration: 0.12, type: 'square', gain: 0.05 }),
  breach: (s) => s.noise(0.3, 0.12),
};

export class TidewallRound implements ScoreAttackRound {
  readonly sim: TidewallSim;
  private readonly view: TidewallRenderer;
  private heard = 0;

  constructor(
    config: TidewallConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new TidewallSim(config, seed);
    this.view = new TidewallRenderer(this.sim, strings);
  }

  get score(): number {
    return this.sim.score;
  }

  get multiplier(): number {
    return this.sim.multiplier;
  }

  get over(): boolean {
    return false; // Tidewall always runs the full timer.
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    const events = this.sim.events;
    for (; this.heard < events.length; this.heard++) {
      const e = events[this.heard];
      if (!this.sound || !e) continue;
      if (e.type === 'impact') SFX[e.grade](this.sound);
      else if (e.type === 'raise') this.sound.blip({ freq: 220, duration: 0.05, type: 'sine', gain: 0.05 });
    }
  }

  render(ctx: CanvasRenderingContext2D, view: RenderView): void {
    this.view.render(ctx, view);
  }

  summary(): Record<string, string | number> {
    return { chain: this.sim.bestChain, perfects: this.sim.perfects, breaches: this.sim.breaches };
  }
}

export function createTidewall(rawConfig: TidewallConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'tidewall',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.target,
      primaryText: colors.night,
      secondary: colors.wave,
      secondaryText: colors.night,
      timer: colors.wave,
    },
    createRound: (seed, services) => new TidewallRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as TidewallRound).sim);
    },
  };
}
