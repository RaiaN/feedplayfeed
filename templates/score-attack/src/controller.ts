// Score-attack round flow, with no DOM: idle → play → end → (again) play. Owns the timer, analytics,
// submitScore, share/challenge and the accessibility toggles. boot.ts wires it to the engine host.
import type { Analytics } from '@feedplay/analytics';
import type { Point, Sound, Strings } from '@feedplay/engine';
import { hit } from '@feedplay/engine';
import type { Challenge, PlatformAdapter, ShareKind, ShareResult } from '@feedplay/platform';
import { layout } from './layout.ts';
import type { ScoreAttackGame, ScoreAttackRound, Thumb } from './types.ts';

export type Phase = 'idle' | 'play' | 'end';

export interface Settings {
  muted: boolean;
  reducedMotion: boolean;
}

export interface ControllerDeps {
  game: ScoreAttackGame;
  adapter: PlatformAdapter;
  analytics: Analytics;
  strings: Strings;
  sound: Sound;
  seed: string;
  challenge: Challenge | null;
  settings: Settings;
  best: number;
  autoplay?: boolean;
}

/** Ignore end-screen input briefly so a held thumb doesn't hit a button by accident. */
const END_INPUT_DELAY = 0.45;
/** Autoplay starts the round by itself after this idle time. */
const AUTOPLAY_START_DELAY = 0.3;

export class ScoreAttackController {
  phase: Phase = 'idle';
  round: ScoreAttackRound;
  /** Simulated seconds in the current round. */
  elapsed = 0;
  best: number;
  rounds = 0;
  lastShare: ShareResult | null = null;
  toast: { text: string; ttl: number } | null = null;
  newBest = false;
  readonly settings: Settings;
  private endTime = 0;
  private idleTime = 0;
  /** A press that landed on a UI button: hide it from the game until it's released. */
  private suppress = false;
  private bot: ((round: ScoreAttackRound) => boolean) | null = null;
  private botHeld = false;

  constructor(private readonly d: ControllerDeps) {
    this.settings = { ...d.settings };
    this.best = d.best;
    this.round = this.newRound();
    if (d.challenge) d.analytics.track('challenge_open', { seed: d.challenge.seed });
  }

  get seed(): string {
    return this.d.seed;
  }

  get challenge(): Challenge | null {
    return this.d.challenge;
  }

  get timeLeft(): number {
    return Math.max(0, this.d.game.roundSeconds - this.elapsed);
  }

  step(dt: number, raw: Thumb, taps: readonly Point[]): void {
    if (this.toast && (this.toast.ttl -= dt) <= 0) this.toast = null;
    for (const p of taps) if (this.handleToggleTap(p)) this.suppress = true;

    if (this.phase === 'end') {
      this.endTime += dt;
      if (this.endTime >= END_INPUT_DELAY) this.handleEndInput(raw, taps);
      if (!raw.held) this.suppress = false;
      return;
    }

    const thumb = this.effectiveThumb(raw);
    if (this.phase === 'idle') {
      this.idleTime += dt;
      const autoStart = this.d.autoplay && this.idleTime >= AUTOPLAY_START_DELAY;
      if (!thumb.pressed && !autoStart) return;
      this.startRound();
    }

    const t = this.d.autoplay ? this.botThumb() : thumb;
    this.round.step(dt, t);
    this.elapsed += dt;
    if (this.elapsed >= this.d.game.roundSeconds - 1e-9 || this.round.over) this.endRound();
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.d.sound.muted = this.settings.muted;
    void this.d.adapter.storage.set('muted', this.settings.muted ? '1' : '0').catch(this.onError);
  }

  toggleMotion(): void {
    this.settings.reducedMotion = !this.settings.reducedMotion;
    void this.d.adapter.storage.set('reducedMotion', this.settings.reducedMotion ? '1' : '0').catch(this.onError);
  }

  /** Start the next round on the same seed (instant restart). */
  again(): void {
    this.round = this.newRound();
    this.startRound();
  }

  async share(kind: ShareKind): Promise<ShareResult | null> {
    const { strings, analytics, adapter } = this.d;
    analytics.track('share_click');
    const vars = { score: this.round.score, seed: this.d.seed, ...this.round.summary() };
    const payload = {
      kind,
      text: strings.t(kind === 'challenge' ? 'share.challenge' : 'share.score', vars),
      seed: this.d.seed,
      score: this.round.score,
    };
    try {
      const res = await adapter.share(payload);
      this.lastShare = res;
      const key = res.method === 'clipboard' ? 'toast.copied' : res.method === 'none' ? 'toast.failed' : 'toast.shared';
      this.toast = { text: strings.t(key), ttl: 2 };
      return res;
    } catch (e) {
      this.onError(e);
      this.toast = { text: strings.t('toast.failed'), ttl: 2 };
      return null;
    }
  }

  private newRound(): ScoreAttackRound {
    this.phase = 'idle';
    this.elapsed = 0;
    this.idleTime = 0;
    this.botHeld = false;
    this.bot = this.d.autoplay ? (this.d.game.createBot?.(this.d.seed) ?? null) : null;
    return this.d.game.createRound(this.d.seed, {
      sound: this.d.sound,
      reducedMotion: () => this.settings.reducedMotion,
    });
  }

  private startRound(): void {
    this.phase = 'play';
    this.rounds++;
    this.d.analytics.track('round_start', { seed: this.d.seed });
  }

  private endRound(): void {
    this.phase = 'end';
    this.endTime = 0;
    const score = this.round.score;
    const durationMs = Math.round(this.elapsed * 1000);
    this.newBest = score > this.best;
    if (this.newBest) {
      this.best = score;
      void this.d.adapter.storage.set(`best:${this.d.seed}`, String(score)).catch(this.onError);
    }
    this.d.analytics.track('round_end', { score, duration_ms: durationMs, seed: this.d.seed });
    void this.d.adapter.submitScore({ score, seed: this.d.seed, durationMs }).catch(this.onError);
  }

  private handleToggleTap(p: Point): boolean {
    if (hit(layout.muteToggle, p)) {
      this.toggleMute();
      return true;
    }
    if (hit(layout.motionToggle, p)) {
      this.toggleMotion();
      return true;
    }
    return false;
  }

  private handleEndInput(raw: Thumb, taps: readonly Point[]): void {
    for (const p of taps) {
      if (hit(layout.again, p)) return this.pressAgain();
      if (hit(layout.share, p)) return void this.share('score');
      if (hit(layout.challenge, p)) return void this.share('challenge');
    }
    // Keyboard (Space/Enter) press with no pointer tap = play again.
    if (raw.pressed && taps.length === 0 && !this.suppress) this.pressAgain();
  }

  private pressAgain(): void {
    this.suppress = true;
    this.again();
  }

  private effectiveThumb(raw: Thumb): Thumb {
    if (this.suppress) {
      if (!raw.held) this.suppress = false;
      return { held: false, pressed: false, released: false };
    }
    return raw;
  }

  private botThumb(): Thumb {
    const held = this.bot ? this.bot(this.round) : false;
    const t = { held, pressed: held && !this.botHeld, released: !held && this.botHeld };
    this.botHeld = held;
    return t;
  }

  private onError = (e: unknown): void => {
    this.d.analytics.track('error', { message: e instanceof Error ? e.message : String(e) });
  };
}
