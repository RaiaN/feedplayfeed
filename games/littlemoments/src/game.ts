import { Heartbeat, lerp, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createBot } from './bot.ts';
import { validateConfig, type LittleMomentsConfig } from './config.ts';
import { colors } from './palette.ts';
import { LittleMomentsRenderer } from './render.ts';
import { LittleMomentsSim } from './sim.ts';

export class LittleMomentsRound implements ScoreAttackRound {
  readonly sim: LittleMomentsSim;
  private readonly view: LittleMomentsRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;

  constructor(
    config: LittleMomentsConfig,
    seed: string,
    strings: Strings,
    private readonly sound?: Sound,
  ) {
    this.sim = new LittleMomentsSim(config, seed);
    this.view = new LittleMomentsRenderer(this.sim, strings);
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
    return this.sim.drifted ? 'end.caught' : this.sim.finished ? 'end.survived' : 'end.title';
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    // The heart only races when the bank runs low.
    const low = 1 - this.sim.closeness / 0.35;
    this.heart.update(dt, this.sim.drifted || this.sim.finished || low <= 0 ? 0 : lerp(90, 160, low));
    const s = this.sound;
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'spawn' && this.sim.time > 0) {
        if (e.kind === 'phone') s.blip({ freq: 150, duration: 0.05, type: 'square', gain: 0.02 });
        else s.blip({ freq: 880, duration: 0.04, type: 'sine', gain: 0.02 });
      } else if (e.type === 'toward') {
        const f = 520 * Math.pow(2, Math.min(12, this.sim.streak) / 12);
        s.blip({ freq: f, slideTo: f * 1.5, duration: 0.1, type: 'triangle', gain: 0.06 });
        if (e.big) s.blip({ freq: f * 1.25, duration: 0.25, type: 'triangle', gain: 0.05, delay: 0.08 });
      } else if (e.type === 'missed') s.blip({ freq: 330, slideTo: 220, duration: 0.18, type: 'sine', gain: 0.04 });
      else if (e.type === 'away') {
        s.blip({ freq: 120, duration: 0.06, type: 'square', gain: 0.05 });
        s.blip({ freq: 120, duration: 0.06, type: 'square', gain: 0.05, delay: 0.1 });
      } else if (e.type === 'drifted') s.blip({ freq: 392, slideTo: 196, duration: 0.7, type: 'triangle', gain: 0.05 });
      else if (e.type === 'finish') {
        for (const [i, f] of [523, 659, 784, 1047].entries())
          s.blip({ freq: f, duration: 0.45, type: 'triangle', gain: 0.045, delay: i * 0.07 });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, view: RenderView): void {
    this.view.render(ctx, view);
  }

  summary(): Record<string, string | number> {
    return {
      pct: this.sim.towardPct,
      toward: this.sim.toward,
      missed: this.sim.missed,
      away: this.sim.away,
      justInTime: this.sim.justInTime,
      streak: this.sim.bestStreak,
      seconds: this.sim.seconds,
      survived: this.sim.finished ? 1 : 0,
    };
  }
}

export function createLittleMoments(rawConfig: LittleMomentsConfig, strings: Strings): ScoreAttackGame {
  const config = validateConfig(rawConfig);
  return {
    slug: 'littlemoments',
    roundSeconds: config.roundSeconds,
    palette: {
      background: colors.night,
      text: colors.text,
      muted: colors.muted,
      panel: colors.panel,
      primary: colors.jit,
      primaryText: colors.night,
      secondary: colors.you,
      secondaryText: colors.night,
      timer: colors.partner,
    },
    createRound: (seed, services) => new LittleMomentsRound(config, seed, strings, services.sound),
    createBot: (seed) => {
      const bot = createBot(seed);
      return (round) => bot((round as LittleMomentsRound).sim);
    },
  };
}
