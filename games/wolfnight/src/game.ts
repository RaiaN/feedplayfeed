import { Heartbeat, lerp, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type WolfNightConfig } from './config.ts';
import { colors } from './palette.ts';
import { WolfNightRenderer } from './render.ts';
import { WolfNightSim } from './sim.ts';

export class WolfNightRound implements ScoreAttackRound {
  readonly sim: WolfNightSim;
  private readonly view: WolfNightRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;

  constructor(
    config: WolfNightConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new WolfNightSim(config, seed);
    this.view = new WolfNightRenderer(this.sim, strings);
    this.heart = new Heartbeat(sound);
  }

  get score(): number {
    return this.sim.score;
  }

  get multiplier(): number {
    return this.sim.multiplier;
  }

  get over(): boolean {
    return this.sim.over;
  }

  get endTitleKey(): string {
    return this.sim.survived ? 'end.survived' : this.sim.caught ? 'end.caught' : 'end.title';
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    const d = this.sim.danger;
    this.heart.update(dt, this.sim.caught || this.sim.survived ? 0 : d > 0.2 ? lerp(80, 190, d) : 0);
    const s = this.sound;
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'flash') {
        s.noise(0.12, 0.06);
        if (e.close) s.blip({ freq: 660, slideTo: 1320, duration: 0.14, type: 'triangle', gain: 0.07 });
      } else if (e.type === 'miss') s.blip({ freq: 180, duration: 0.06, type: 'square', gain: 0.03 });
      else if (e.type === 'fizzle') s.blip({ freq: 90, duration: 0.05, type: 'square', gain: 0.04 });
      else if (e.type === 'collect') s.blip({ freq: 1200, slideTo: 1800, duration: 0.09, type: 'sine', gain: 0.06 });
      else if (e.type === 'spawn' && this.sim.time > 0)
        s.blip({ freq: 140, slideTo: 110, duration: 0.25, type: 'sawtooth', gain: 0.025 });
      else if (e.type === 'caught') {
        s.noise(0.4, 0.16);
        s.blip({ freq: 110, slideTo: 50, duration: 0.5, type: 'sawtooth', gain: 0.08 });
      } else if (e.type === 'dawn') {
        for (const [i, f] of [523, 659, 784].entries())
          s.blip({ freq: f, duration: 0.5, type: 'triangle', gain: 0.05, delay: i * 0.08 });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, view: RenderView): void {
    this.view.render(ctx, view);
  }

  summary(): Record<string, string | number> {
    return {
      seconds: this.sim.seconds,
      closeCalls: this.sim.closeCalls,
      pushes: this.sim.pushes,
      fireflies: this.sim.collected,
      survived: this.sim.survived ? 1 : 0,
    };
  }
}

export function createWolfNight(rawConfig: WolfNightConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'wolfnight',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.lantern,
      primaryText: colors.night,
      secondary: colors.back,
      secondaryText: colors.night,
      timer: colors.lantern,
    },
    createRound: (seed, services) => new WolfNightRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as WolfNightRound).sim);
    },
  };
}
