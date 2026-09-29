// Duo-balance simulation: pure and deterministic (seeded RNG, simulated time only).
// Cards come one at a time. Tap the LEFT or RIGHT half to pick that option. Each option moves one partner's
// meter. Both meters drain as the situation wears on. If a meter hits 0 (someone breaks) or the seesaw stays
// tipped too long (one partner keeps "winning"), the worst case plays. Survive the situation for the best case.
// The card sequence and left/right placement depend only on the seed (fair challenges); only timing depends
// on how fast the player answers.
import { clamp, createRng, lerp, type Rng } from '@feedplay/engine';
import type { Thumb } from '@feedplay/template-score-attack';
import type { CardDef, DuoConfig, Option, Outcome, Situation, Who } from './types.ts';

export interface LiveCard {
  n: number;
  def: CardDef;
  /** Swap sides on screen (seeded) so answers can't be memorised by position. */
  flip: boolean;
  climax: boolean;
  timer: number;
  age: number;
}

export type SimEvent =
  | { type: 'card'; time: number; n: number; id: string; climax: boolean }
  | {
      type: 'choice';
      time: number;
      n: number;
      id: string;
      side: 'l' | 'r';
      option: Option;
      points: number;
      justInTime: boolean;
    }
  | { type: 'timeout'; time: number; n: number; id: string; who: Who; delta: number }
  | { type: 'end'; time: number; outcome: Exclude<Outcome, 'playing'>; who?: Who; points: number };

export const END_HOLD = 1.6;

export class DuoSim {
  time = 0;
  score = 0;
  multiplier = 1;
  streak = 0;
  meters: Record<Who, number>;
  card: LiveCard | null = null;
  outcome: Outcome = 'playing';
  endedFor = 0;
  brokeWho: Who | null = null;
  tipFor = 0;
  balancedTime = 0;
  good = 0;
  bad = 0;
  timeouts = 0;
  readonly events: SimEvent[] = [];
  private gapLeft = 0.25;
  private cardCount = 0;
  private deck: CardDef[] = [];
  private lastDeckId = '';
  private deckDrawn = 0;
  private climaxDone = false;
  private balancePoints = 0;
  /** Independent streams so the deck order and layouts never depend on answer speed or the climax timing. */
  private readonly deckRng: Rng;
  private readonly flipRng: Rng;

  constructor(
    readonly config: DuoConfig,
    readonly situation: Situation,
    readonly seed: string,
  ) {
    const root = createRng(seed).fork(`duo:${situation.id}`);
    this.deckRng = root.fork('deck');
    this.flipRng = root.fork('flip');
    this.meters = { ari: config.meters.start, jo: config.meters.start };
    this.nextCard(); // frame 1 already shows the first moment
  }

  get progress(): number {
    return Math.min(1, this.time / this.config.roundSeconds);
  }

  get ended(): boolean {
    return this.outcome !== 'playing';
  }

  get over(): boolean {
    return this.ended && this.endedFor >= END_HOLD;
  }

  get seconds(): number {
    return Math.floor(this.time + 1e-9);
  }

  /** ari − jo. Positive = Ari is up, Jo is down. */
  get diff(): number {
    return this.meters.ari - this.meters.jo;
  }

  get balancedPct(): number {
    return this.time <= 0 ? 100 : Math.round((this.balancedTime / this.time) * 100);
  }

  /** The option drawn on the left / right of the screen right now. */
  shown(side: 'l' | 'r'): Option | null {
    const c = this.card;
    if (!c) return null;
    const leftIsLeft = !c.flip;
    return side === 'l' ? (leftIsLeft ? c.def.left : c.def.right) : leftIsLeft ? c.def.right : c.def.left;
  }

  /** Text key for the option on a screen side. */
  shownKey(side: 'l' | 'r'): string {
    const c = this.card!;
    const useLeft = side === 'l' ? !c.flip : c.flip;
    return `card.${c.def.id}.${useLeft ? 'l' : 'r'}`;
  }

  step(dt: number, thumb: Thumb): void {
    if (this.ended) {
      this.endedFor += dt;
      return;
    }
    const c = this.config;
    this.time += dt;

    const drain = lerp(c.meters.drainStart, c.meters.drainEnd, this.progress) * dt;
    this.meters.ari -= drain;
    this.meters.jo -= drain;

    if (this.card) {
      this.card.age += dt;
      if (thumb.pressed) this.choose(thumb.x < 180 ? 'l' : 'r');
      else if (this.card.age >= this.card.timer) this.timeout();
    } else {
      this.gapLeft -= dt;
      if (this.gapLeft <= 0) this.nextCard();
    }

    // Balance.
    const d = Math.abs(this.diff);
    if (d <= c.balance.balancedWithin) {
      this.balancedTime += dt;
      this.balancePoints += c.scoring.balancedPerSecond * this.multiplier * dt;
      const whole = Math.floor(this.balancePoints);
      this.score += whole;
      this.balancePoints -= whole;
    }
    this.tipFor = d >= c.balance.tipAt ? this.tipFor + dt : 0;

    for (const who of ['ari', 'jo'] as const) this.meters[who] = clamp(this.meters[who], 0, c.meters.max);
    if (this.meters.ari <= 0 || this.meters.jo <= 0) {
      this.brokeWho = this.meters.ari <= 0 ? 'ari' : 'jo';
      return this.finish('broke');
    }
    if (this.tipFor >= c.balance.tipSeconds) return this.finish('tipped');
    if (this.time >= c.roundSeconds - 1e-9) this.finish('best');
  }

  private choose(side: 'l' | 'r'): void {
    const card = this.card!;
    const option = this.shown(side)!;
    const s = this.config.scoring;
    const justInTime = card.age >= card.timer * (1 - s.justInTimeFrac);
    let points = 0;
    if (option.delta > 0) {
      this.good++;
      this.streak++;
      this.multiplier = Math.min(s.maxMultiplier, 1 + Math.floor(this.streak / s.streakPerLevel));
      points =
        (s.positive + (justInTime ? s.justInTime : 0)) * this.multiplier * (card.climax ? s.climaxMultiplier : 1);
      this.score += points;
    } else {
      this.bad++;
      this.streak = 0;
      this.multiplier = 1;
    }
    this.meters[option.who] += option.delta;
    this.events.push({ type: 'choice', time: this.time, n: card.n, id: card.def.id, side, option, points, justInTime });
    this.clearCard();
  }

  private timeout(): void {
    const card = this.card!;
    // Silence is an answer too: the speaker feels stonewalled.
    const delta = this.config.meters.timeout;
    this.meters[card.def.speaker] += delta;
    this.timeouts++;
    this.streak = 0;
    this.multiplier = 1;
    this.events.push({ type: 'timeout', time: this.time, n: card.n, id: card.def.id, who: card.def.speaker, delta });
    this.clearCard();
  }

  private clearCard(): void {
    this.card = null;
    this.gapLeft = this.config.cards.gap;
  }

  private nextCard(): void {
    const c = this.config;
    const s = this.situation;
    let def: CardDef;
    let climax = false;
    if (!this.climaxDone && this.time >= s.climaxAt * c.roundSeconds) {
      def = s.climax;
      climax = true;
      this.climaxDone = true;
    } else {
      if (this.deck.length === 0) this.deck = this.shuffle();
      def = this.deck.shift()!;
    }
    const n = this.cardCount++;
    const timer = climax ? c.cards.climaxTimer : lerp(c.cards.timerStart, c.cards.timerEnd, this.progress);
    // Layout: the first card and the climax keep their authored layout; the k-th deck card always gets the
    // k-th flip from its own stream, so every challenger sees identical cards in identical positions.
    let flip = false;
    if (!climax) {
      const k = this.deckDrawn++;
      const f = this.flipRng.chance(0.5);
      flip = k === 0 ? false : f;
      this.lastDeckId = def.id;
    }
    this.card = { n, def, flip, climax, timer, age: 0 };
    this.events.push({ type: 'card', time: this.time, n, id: def.id, climax });
  }

  /** Seeded shuffle; the first card of a new deck never repeats the last one shown. The first deck keeps card 0 first. */
  private shuffle(): CardDef[] {
    const first = this.deckDrawn === 0 ? this.situation.cards[0] : undefined;
    const rest = this.situation.cards.filter((c) => c !== first);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = this.deckRng.int(0, i);
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    if (rest[0]?.id === this.lastDeckId && rest.length > 1) [rest[0], rest[1]] = [rest[1]!, rest[0]!];
    return first ? [first, ...rest] : rest;
  }

  private finish(outcome: Exclude<Outcome, 'playing'>): void {
    this.outcome = outcome;
    this.card = null;
    const points = outcome === 'best' ? this.config.scoring.finishBonus : 0;
    this.score += points;
    this.events.push({
      type: 'end',
      time: this.time,
      outcome,
      ...(this.brokeWho ? { who: this.brokeWho } : {}),
      points,
    });
  }
}
