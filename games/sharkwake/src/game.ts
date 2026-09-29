import { Heartbeat, lerp, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type SharkWakeConfig } from './config.ts';
import { colors } from './palette.ts';
import { SharkWakeRenderer } from './render.ts';
import { SharkWakeSim } from './sim.ts';

export class SharkWakeRound implements ScoreAttackRound {
  readonly sim: SharkWakeSim;
  private readonly view: SharkWakeRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;

  constructor(
    config: SharkWakeConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new SharkWakeSim(config, seed);
    this.view = new SharkWakeRenderer(this.sim, strings);
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
    return this.sim.survived ? 'end.survived' : this.sim.wiped ? 'end.caught' : 'end.title';
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    const d = this.sim.danger;
    this.heart.update(dt, this.sim.wiped || this.sim.survived ? 0 : d > 0.3 ? lerp(80, 200, d) : 0);
    const s = this.sound;
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'switch') s.blip({ freq: 320, slideTo: 480, duration: 0.05, type: 'sine', gain: 0.03 });
      else if (e.type === 'near') s.blip({ freq: 700, slideTo: 1400, duration: 0.14, type: 'triangle', gain: 0.07 });
      else if (e.type === 'boost') s.blip({ freq: 500, slideTo: 900, duration: 0.18, type: 'sine', gain: 0.05 });
      else if (e.type === 'hit') {
        s.noise(0.2, 0.12);
        s.blip({ freq: 140, duration: 0.12, type: 'square', gain: 0.06 });
      } else if (e.type === 'wipeout') {
        s.noise(0.5, 0.16);
        s.blip({ freq: 180, slideTo: 50, duration: 0.5, type: 'sawtooth', gain: 0.07 });
      } else if (e.type === 'shore') {
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
      nearMisses: this.sim.nearMisses,
      boosts: this.sim.boosts,
      hits: this.sim.hits,
      switches: this.sim.switches,
      seconds: this.sim.seconds,
      survived: this.sim.survived ? 1 : 0,
    };
  }
}

export function createSharkWake(rawConfig: SharkWakeConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'sharkwake',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.board,
      primaryText: colors.night,
      secondary: colors.good,
      secondaryText: colors.night,
      timer: colors.board,
    },
    createRound: (seed, services) => new SharkWakeRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as SharkWakeRound).sim);
    },
  };
}
