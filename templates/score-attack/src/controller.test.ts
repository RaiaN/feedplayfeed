import { createAnalytics, memorySink } from '@feedplay/analytics';
import { createStrings, Sound } from '@feedplay/engine';
import { createMockAdapter, type Challenge } from '@feedplay/platform';
import { describe, expect, it } from 'vitest';
import { ScoreAttackController } from './controller.ts';
import { layout } from './layout.ts';
import type { ScoreAttackGame, ScoreAttackRound, Thumb } from './types.ts';

const DT = 1 / 60;
const up: Thumb = { held: false, pressed: false, released: false, x: 0, y: 0 };
const press: Thumb = { held: true, pressed: true, released: false, x: 180, y: 400 };
const hold: Thumb = { held: true, pressed: false, released: false, x: 180, y: 400 };
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** A trivial game: +1 point per step while held. */
const fakeGame: ScoreAttackGame = {
  slug: 'fake',
  roundSeconds: 30,
  palette: {} as ScoreAttackGame['palette'],
  createRound(): ScoreAttackRound {
    let score = 0;
    return {
      step: (_dt, t) => void (t.held && score++),
      render: () => undefined,
      get score() {
        return score;
      },
      over: false,
      multiplier: 1,
      summary: () => ({ chain: 3 }),
    };
  },
  createBot: () => () => true,
};

function setup(opts: { challenge?: Challenge; autoplay?: boolean } = {}) {
  const adapter = createMockAdapter({ challenge: opts.challenge ?? null, now: new Date('2026-09-29T10:00:00Z') });
  const mem = memorySink();
  const analytics = createAnalytics({ sinks: [mem.sink], now: () => 0 });
  const strings = createStrings({ 'share.score': 'I got {score} (×{chain})', 'share.challenge': 'Beat {score}' });
  const c = new ScoreAttackController({
    game: fakeGame,
    adapter,
    analytics,
    strings,
    sound: new Sound(() => null),
    seed: opts.challenge?.seed ?? '2026-09-29',
    challenge: opts.challenge ?? null,
    settings: { muted: false, reducedMotion: false },
    best: 0,
    autoplay: opts.autoplay ?? false,
  });
  const run = (seconds: number, thumb: Thumb = up) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) c.step(DT, thumb, []);
  };
  return { c, adapter, mem, run };
}

describe('ScoreAttackController', () => {
  it('waits in idle for the first press, then runs a timed round and ends it', () => {
    const { c, adapter, mem, run } = setup();
    run(2);
    expect(c.phase).toBe('idle');
    c.step(DT, press, []);
    expect(c.phase).toBe('play');
    run(29.99, hold);
    expect(c.phase).toBe('end');
    expect(mem.named('round_start')).toHaveLength(1);
    const end = mem.named('round_end')[0]!.props;
    expect(end.seed).toBe('2026-09-29');
    expect(end.duration_ms).toBe(30000);
    expect(end.score).toBe(c.round.score);
    expect(adapter.callsTo('submitScore')[0]?.args[0]).toEqual({
      score: c.round.score,
      seed: '2026-09-29',
      durationMs: 30000,
    });
    expect(c.best).toBe(c.round.score);
  });

  it('shares score and challenge payloads through the adapter', async () => {
    const { c, adapter, mem, run } = setup();
    c.step(DT, press, []);
    run(31);
    const res = await c.share('challenge');
    expect(res?.payload).toMatchObject({ kind: 'challenge', seed: '2026-09-29', text: `Beat ${c.round.score}` });
    await c.share('score');
    expect(adapter.callsTo('share')[1]?.args[0]).toMatchObject({ kind: 'score', text: `I got ${c.round.score} (×3)` });
    expect(mem.named('share_click')).toHaveLength(2);
  });

  it('end-screen buttons: share, then play again restarts instantly on the same seed', () => {
    const { c, adapter, run } = setup();
    c.step(DT, press, []);
    run(31);
    c.step(DT, press, [center(layout.share)]);
    expect(adapter.callsTo('share')).toHaveLength(1);
    run(0.1);
    c.step(DT, press, [center(layout.again)]);
    expect(c.phase).toBe('play');
    expect(c.rounds).toBe(2);
    expect(c.round.score).toBe(0);
    // The press that hit "again" must not leak into the new round.
    run(0.5, hold);
    expect(c.round.score).toBe(0);
  });

  it('ignores end-screen input right after the round ends', () => {
    const { c, run } = setup();
    c.step(DT, press, []);
    run(30);
    c.step(DT, press, [center(layout.again)]);
    expect(c.phase).toBe('end');
  });

  it('toggles mute/reduced motion from the HUD without starting the round, and persists them', () => {
    const { c, adapter } = setup();
    c.step(DT, press, [center(layout.muteToggle)]);
    c.step(DT, press, [center(layout.motionToggle)]);
    expect(c.phase).toBe('idle');
    expect(c.settings).toEqual({ muted: true, reducedMotion: true });
    expect(adapter.callsTo('storage.set').map((x) => x.args)).toEqual([
      ['muted', '1'],
      ['reducedMotion', '1'],
    ]);
  });

  it('emits challenge_open and keeps the challenge seed', () => {
    const { c, mem } = setup({ challenge: { seed: 'abc', score: 50 } });
    expect(mem.named('challenge_open')[0]?.props).toEqual({ seed: 'abc' });
    expect(c.seed).toBe('abc');
  });

  it('autoplay starts and plays a round by itself', () => {
    const { c, run } = setup({ autoplay: true });
    run(31);
    expect(c.phase).toBe('end');
    expect(c.round.score).toBeGreaterThan(1000);
  });
});

describe('ScoreAttackController bot + end title', () => {
  it('passes bot positions through to the round and supports custom end titles', () => {
    const seen: Array<{ x: number; y: number; pressed: boolean }> = [];
    const game: ScoreAttackGame = {
      ...fakeGame,
      createRound: () => ({
        step: (_dt, t) => void seen.push({ x: t.x, y: t.y, pressed: t.pressed }),
        render: () => undefined,
        score: 0,
        over: seen.length > 3,
        multiplier: 1,
        endTitleKey: 'end.caught',
        summary: () => ({}),
      }),
      createBot: () => () => ({ held: true, x: 42, y: 99 }),
    };
    const adapter = createMockAdapter();
    const c = new ScoreAttackController({
      game,
      adapter,
      analytics: createAnalytics({ sinks: [], now: () => 0 }),
      strings: createStrings({}),
      sound: new Sound(() => null),
      seed: 's',
      challenge: null,
      settings: { muted: false, reducedMotion: false },
      best: 0,
      autoplay: true,
    });
    for (let i = 0; i < 30; i++) c.step(DT, up, []);
    expect(seen[0]).toEqual({ x: 42, y: 99, pressed: true });
    expect(seen[1]?.pressed).toBe(false);
    expect(c.round.endTitleKey).toBe('end.caught');
  });
});
