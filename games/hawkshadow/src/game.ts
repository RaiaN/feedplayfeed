import { Heartbeat, lerp, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type HawkShadowConfig } from './config.ts';
import { colors } from './palette.ts';
import { HawkShadowRenderer } from './render.ts';
import { HawkShadowSim } from './sim.ts';

export class HawkShadowRound implements ScoreAttackRound {
  readonly sim: HawkShadowSim;
  private readonly view: HawkShadowRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;
  private screeched = -1;

  constructor(
    config: HawkShadowConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new HawkShadowSim(config, seed);
    this.view = new HawkShadowRenderer(this.sim, strings);
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
    const warn = this.sim.warning;
    const s = this.sound;
    this.heart.update(dt, this.sim.caught || this.sim.survived ? 0 : warn > 0 ? lerp(90, 200, warn) : 0);
    if (warn > 0 && this.screeched !== this.sim.dive.index) {
      this.screeched = this.sim.dive.index;
      s?.blip({ freq: 1500, slideTo: 900, duration: 0.4, type: 'sawtooth', gain: 0.035 });
    }
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'strike' || e.type === 'feint') s.noise(0.3, 0.09);
      else if (e.type === 'close') s.blip({ freq: 700, slideTo: 1400, duration: 0.16, type: 'triangle', gain: 0.07 });
      else if (e.type === 'seed') s.blip({ freq: 1100, duration: 0.05, type: 'sine', gain: 0.05 });
      else if (e.type === 'caught') {
        // Whoosh past and a cartoon "bonk": dazed, not hurt.
        s.noise(0.35, 0.1);
        s.blip({ freq: 520, slideTo: 260, duration: 0.3, type: 'triangle', gain: 0.06 });
      } else if (e.type === 'home') {
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
      meters: this.sim.meters,
      closeCalls: this.sim.closeCalls,
      seeds: this.sim.collected,
      seconds: this.sim.seconds,
      survived: this.sim.survived ? 1 : 0,
    };
  }
}

export function createHawkShadow(rawConfig: HawkShadowConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'hawkshadow',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.close,
      primaryText: colors.night,
      secondary: colors.safe,
      secondaryText: colors.night,
      timer: colors.close,
    },
    createRound: (seed, services) => new HawkShadowRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as HawkShadowRound).sim);
    },
  };
}
