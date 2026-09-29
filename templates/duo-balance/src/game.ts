import { Heartbeat, lerp, type Sound, type Strings } from '@feedplay/engine';
import type { RenderView, ScoreAttackGame, ScoreAttackRound, Thumb } from '@feedplay/template-score-attack';
import { createDuoBot } from './bot.ts';
import { validateDuoConfig, validateSituation } from './config.ts';
import { DuoRenderer, type DuoPalette } from './render.ts';
import { DuoSim, END_HOLD } from './sim.ts';
import type { DuoConfig, Situation } from './types.ts';

export interface DuoGameOptions {
  slug: string;
  config: DuoConfig;
  situation: Situation;
  strings: Strings;
  palette: DuoPalette;
  /** Situation props drawn behind the couple (boxes, coins, crib…). */
  drawProps: (ctx: CanvasRenderingContext2D, v: RenderView) => void;
}

export class DuoRound implements ScoreAttackRound {
  readonly sim: DuoSim;
  private readonly view: DuoRenderer;
  private readonly heart: Heartbeat;
  private heard = 0;

  constructor(
    o: DuoGameOptions,
    seed: string,
    private readonly sound?: Sound,
  ) {
    this.sim = new DuoSim(o.config, o.situation, seed);
    this.view = new DuoRenderer(this.sim, o.strings, o.palette, o.drawProps);
    this.heart = new Heartbeat(sound);
    this.strings = o.strings;
  }

  private readonly strings: Strings;

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
    const o = this.sim.outcome;
    return o === 'best' ? 'end.survived' : o === 'broke' ? 'end.broke' : o === 'tipped' ? 'end.tipped' : 'end.title';
  }

  step(dt: number, thumb: Thumb): void {
    this.sim.step(dt, thumb);
    const low = Math.min(this.sim.meters.ren, this.sim.meters.jo) / this.sim.config.meters.max;
    this.heart.update(dt, this.sim.ended || low > 0.3 ? 0 : lerp(170, 90, low / 0.3));
    const s = this.sound;
    for (; this.heard < this.sim.events.length; this.heard++) {
      const e = this.sim.events[this.heard];
      if (!s || !e) continue;
      if (e.type === 'card') {
        if (e.climax) {
          s.blip({ freq: 392, duration: 0.8, type: 'sine', gain: 0.05 });
          s.blip({ freq: 494, duration: 0.8, type: 'sine', gain: 0.04, delay: 0.25 });
        } else if (e.n > 0) s.blip({ freq: 740, duration: 0.03, type: 'sine', gain: 0.02 });
      } else if (e.type === 'choice') {
        if (e.option.delta > 0) {
          const f = 520 * Math.pow(2, Math.min(12, this.sim.streak) / 12);
          s.blip({ freq: f, slideTo: f * 1.5, duration: 0.12, type: 'triangle', gain: 0.06 });
        } else s.blip({ freq: 180, slideTo: 120, duration: 0.18, type: 'square', gain: 0.045 });
      } else if (e.type === 'timeout') s.blip({ freq: 150, duration: 0.4, type: 'sine', gain: 0.04 });
      else if (e.type === 'end') {
        const notes = e.outcome === 'best' ? [523, 659, 784, 1047] : [392, 330, 262];
        for (const [i, f] of notes.entries())
          s.blip({ freq: f, duration: 0.5, type: 'triangle', gain: 0.045, delay: i * 0.12 });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, view: RenderView): void {
    this.view.render(ctx, view);
  }

  summary(): Record<string, string | number> {
    const who = this.sim.brokeWho;
    return {
      ren: Math.round(this.sim.meters.ren),
      jo: Math.round(this.sim.meters.jo),
      balanced: this.sim.balancedPct,
      good: this.sim.good,
      bad: this.sim.bad,
      timeouts: this.sim.timeouts,
      seconds: this.sim.seconds,
      who: who ? this.strings.t(`name.${who}`) : '',
      survived: this.sim.outcome === 'best' ? 1 : 0,
    };
  }
}

export function createDuoGame(o: DuoGameOptions): ScoreAttackGame {
  validateDuoConfig(o.config);
  validateSituation(o.situation);
  return {
    slug: o.slug,
    // The situation ends itself (best case at roundSeconds); leave room for the end scene before the card.
    roundSeconds: o.config.roundSeconds + END_HOLD + 0.1,
    palette: {
      background: o.palette.bgTop,
      text: '#ffffff',
      muted: '#e3e6ee',
      panel: o.palette.propDark,
      primary: '#f0e442',
      primaryText: '#1b1b2a',
      secondary: '#56b4e9',
      secondaryText: '#1b1b2a',
      timer: o.palette.accent,
    },
    createRound: (seed, services) => new DuoRound(o, seed, services.sound),
    createBot: (seed) => {
      const bot = createDuoBot(seed);
      return (round) => bot((round as DuoRound).sim);
    },
  };
}
