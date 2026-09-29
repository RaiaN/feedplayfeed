import { Heartbeat, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type FloodLineConfig } from './config.ts';
import { colors } from './palette.ts';
import { FloodLineRenderer } from './render.ts';
import { FloodLineSim } from './sim.ts';

export class FloodLineRound implements ScoreAttackRound {
  readonly sim: FloodLineSim;
  private readonly view: FloodLineRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;

  constructor(
    config: FloodLineConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new FloodLineSim(config, seed);
    this.view = new FloodLineRenderer(this.sim, strings);
    this.heart = new Heartbeat(sound);
  }

  get score(): number {
    return this.sim.score;
  }

  get multiplier(): number {
    return this.sim.pointsMultiplier;
  }

  get over(): boolean {
    return this.sim.over;
  }

  get endTitleKey(): string {
    return this.sim.overwhelmed ? 'end.caught' : this.sim.finished ? 'end.survived' : 'end.title';
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    // You hear your own pulse, at its real rate.
    this.heart.update(dt, this.sim.overwhelmed || this.sim.finished ? 0 : this.sim.bpm);
    const s = this.sound;
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'antidote')
        s.blip({
          freq: e.close ? 880 : 660,
          slideTo: e.close ? 1320 : 990,
          duration: 0.1,
          type: 'triangle',
          gain: 0.06,
        });
      else if (e.type === 'repair') {
        s.blip({ freq: 523, duration: 0.2, type: 'triangle', gain: 0.05 });
        s.blip({ freq: 784, duration: 0.25, type: 'triangle', gain: 0.05, delay: 0.08 });
      } else if (e.type === 'hit') s.blip({ freq: 160, slideTo: 110, duration: 0.14, type: 'square', gain: 0.05 });
      else if (e.type === 'missedRepair') s.blip({ freq: 330, slideTo: 250, duration: 0.2, type: 'sine', gain: 0.04 });
      else if (e.type === 'fizzle') s.blip({ freq: 90, duration: 0.05, type: 'square', gain: 0.03 });
      else if (e.type === 'flooded') s.noise(0.5, 0.06);
      else if (e.type === 'breathe' && e.on)
        s.blip({ freq: 220, slideTo: 330, duration: 1.2, type: 'sine', gain: 0.03 });
      else if (e.type === 'gentle') s.blip({ freq: 988, slideTo: 1319, duration: 0.3, type: 'triangle', gain: 0.05 });
      else if (e.type === 'overwhelmed')
        s.blip({ freq: 330, slideTo: 140, duration: 0.8, type: 'triangle', gain: 0.05 });
      else if (e.type === 'finish') {
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
      ratio: this.sim.ratio.toFixed(1),
      positives: this.sim.positives,
      negatives: this.sim.negatives,
      antidotes: this.sim.antidotes,
      repairs: this.sim.repairs,
      floods: this.sim.floods,
      seconds: this.sim.seconds,
      survived: this.sim.finished ? 1 : 0,
    };
  }
}

export function createFloodLine(rawConfig: FloodLineConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'floodline',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.gold,
      primaryText: colors.night,
      secondary: colors.you,
      secondaryText: colors.night,
      timer: colors.partner,
    },
    createRound: (seed, services) => new FloodLineRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as FloodLineRound).sim);
    },
  };
}
