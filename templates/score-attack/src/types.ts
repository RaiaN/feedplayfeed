import type { Sound, Strings } from '@feedplay/engine';

/** The one-thumb input a game sees each fixed step. */
export interface Thumb {
  held: boolean;
  pressed: boolean;
  released: boolean;
  /** Thumb position in logical units (360×640); keeps the last position when released. */
  x: number;
  y: number;
}

/** What an autoplay bot returns each step: just "held", or a held flag plus a position (tap/drag games). */
export type BotOutput = boolean | { held: boolean; x: number; y: number };

export interface RenderView {
  width: number;
  height: number;
  reducedMotion: boolean;
  /** Seconds since the page loaded (for idle animations; never feed it back into the simulation). */
  time: number;
  /** True before the first press of a round: draw the wordless "how to play" hint. */
  idle: boolean;
}

/** One deterministic round. Same seed + same Thumb sequence ⇒ same score. */
export interface ScoreAttackRound {
  step(dt: number, thumb: Thumb): void;
  render(ctx: CanvasRenderingContext2D, view: RenderView): void;
  readonly score: number;
  /** Game-driven early end (e.g. out of lives). The template also ends the round when time runs out. */
  readonly over: boolean;
  /** Current score multiplier, shown in the HUD (1 = none). */
  readonly multiplier: number;
  /** strings.json key for the end-card title (e.g. 'end.caught' / 'end.survived'). Defaults to 'end.title'. */
  readonly endTitleKey?: string;
  /** Values for the end card / share text placeholders, e.g. { chain: 7 }. */
  summary(): Record<string, string | number>;
}

export interface RoundServices {
  sound: Sound;
  reducedMotion: () => boolean;
}

export interface Palette {
  background: string;
  text: string;
  muted: string;
  panel: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  timer: string;
}

export interface ScoreAttackGame {
  slug: string;
  roundSeconds: number;
  palette: Palette;
  createRound(seed: string, services: RoundServices): ScoreAttackRound;
  /** Autoplay bot for e2e tests and clip recording: returns whether the thumb is held this step. */
  createBot?(seed: string): (round: ScoreAttackRound) => BotOutput;
}

/** strings.json keys the template itself renders. Games must define all of them. */
export const TEMPLATE_STRING_KEYS = [
  'hud.beat',
  'end.title',
  'end.titleBeat',
  'end.best',
  'end.again',
  'end.share',
  'end.challenge',
  'share.score',
  'share.challenge',
  'toast.shared',
  'toast.copied',
  'toast.failed',
] as const;

export type TemplateStrings = Strings;
