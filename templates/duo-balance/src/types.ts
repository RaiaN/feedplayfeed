// Duo-balance: the "Ari & Jo" couple series. One couple, many life situations; each situation is its own game.
// The player answers for both partners with quick left/right choices. Every option moves ONE partner's
// "feels loved" meter up or down. Keep both up and in balance until the situation ends.

export type Who = 'ari' | 'jo';

/** Research label shown after a choice (strings.json key `tag.<tag>`). */
export type Tag =
  | 'toward'
  | 'away'
  | 'criticism'
  | 'contempt'
  | 'defensiveness'
  | 'stonewalling'
  | 'responsibility'
  | 'gentle'
  | 'appreciation'
  | 'repair'
  | 'soothe'
  | 'flooding'
  | 'influence'
  | 'standoff'
  | 'dream'
  | 'shallows'
  | 'need';

export interface Option {
  /** Whose meter this choice moves. */
  who: Who;
  /** Signed change to that meter. */
  delta: number;
  tag: Tag;
}

export interface CardDef {
  /** Text keys: `card.<id>` (prompt), `card.<id>.l`, `card.<id>.r`. */
  id: string;
  speaker: Who;
  left: Option;
  right: Option;
}

export interface Situation {
  id: string;
  /** Renderer prop set: 'moving' | 'money' | 'baby'. */
  backdrop: string;
  cards: CardDef[];
  /** The emotional peak: shown once at `climaxAt` × round length, slower and spotlit. */
  climax: CardDef;
  climaxAt: number;
}

export interface DuoConfig {
  roundSeconds: number;
  meters: { start: number; max: number; drainStart: number; drainEnd: number; timeout: number };
  cards: { timerStart: number; timerEnd: number; gap: number; climaxTimer: number };
  /** |ari − jo| ≥ tipAt for tipSeconds in a row = the relationship tips over. */
  balance: { tipAt: number; tipSeconds: number; balancedWithin: number };
  scoring: {
    positive: number;
    justInTime: number;
    justInTimeFrac: number;
    balancedPerSecond: number;
    streakPerLevel: number;
    maxMultiplier: number;
    finishBonus: number;
    /** Points multiplier on the climax card. */
    climaxMultiplier: number;
  };
}

export type Outcome = 'playing' | 'best' | 'broke' | 'tipped';
