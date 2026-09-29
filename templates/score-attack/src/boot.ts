// Browser entry for score-attack games: host + loop + input + adapter + analytics + controller.
// URL flags: ?adapter=mock|web, ?c=<seed>&s=<score> (challenge), ?test=1 (window.__feedplay hook),
// ?autoplay=1 (bot plays), ?speed=N (simulation speed, autoplay/test only).
import { consoleSink, createAnalytics, memorySink, type Sink } from '@feedplay/analytics';
import { createHost, createStrings, FixedLoop, Input, Sound, type StringTable } from '@feedplay/engine';
import {
  createMockAdapter,
  createWebAdapter,
  parseScore,
  parseSeed,
  type MockAdapter,
  type PlatformAdapter,
} from '@feedplay/platform';
import { ScoreAttackController } from './controller.ts';
import { drawEndCard, drawHud, drawToast } from './hud.ts';
import { H, W } from './layout.ts';
import type { ScoreAttackGame } from './types.ts';

export interface BootOptions {
  game: ScoreAttackGame;
  strings: StringTable;
  /** Build-time default adapter; `?adapter=` overrides it. */
  adapter?: 'web' | 'mock';
  /** Extra analytics sinks (channel sinks, M8). */
  sinks?: Sink[];
}

export function pickAdapter(params: URLSearchParams, fallback: 'web' | 'mock' = 'web'): PlatformAdapter {
  const kind = params.get('adapter') ?? fallback;
  if (kind === 'mock') {
    const seed = parseSeed(params.get('c'));
    const score = parseScore(params.get('s'));
    return createMockAdapter({ challenge: seed ? { seed, ...(score !== undefined ? { score } : {}) } : null });
  }
  return createWebAdapter();
}

export async function bootScoreAttack(opts: BootOptions): Promise<ScoreAttackController> {
  const { game } = opts;
  const host = createHost({ width: W, height: H });
  const params = host.params();
  const test = params.get('test') === '1';
  const autoplay = params.get('autoplay') === '1';
  const speed = Math.min(20, Math.max(1, Number(params.get('speed')) || 1));

  const mem = memorySink();
  const sinks: Sink[] = [mem.sink, ...(opts.sinks ?? [])];
  if (import.meta.env.DEV) sinks.push(consoleSink());
  const analytics = createAnalytics({ sinks, now: () => host.now() });
  host.onError((message) => analytics.track('error', { message }));

  const strings = createStrings(opts.strings);
  const adapter = pickAdapter(params, opts.adapter);
  await adapter.init();
  adapter.setLoadingProgress(50);
  const [seed, challenge, muted, motion] = await Promise.all([
    adapter.getSeed(),
    adapter.getChallenge(),
    adapter.storage.get('muted'),
    adapter.storage.get('reducedMotion'),
  ]);
  const best = Number((await adapter.storage.get(`best:${seed}`)) ?? '0') || 0;
  adapter.setLoadingProgress(100);

  const sound = new Sound(host.audioContext, muted === '1');
  const input = new Input();
  host.bindInput(input);
  input.onFirstPress(() => analytics.firstInput());
  // The AudioContext is created/resumed inside a user gesture, as mobile browsers require.
  input.onPress(() => sound.unlock());

  const controller = new ScoreAttackController({
    game,
    adapter,
    analytics,
    strings,
    sound,
    seed,
    challenge,
    settings: { muted: muted === '1', reducedMotion: motion === null ? host.prefersReducedMotion() : motion === '1' },
    best,
    autoplay,
  });

  const loop = new FixedLoop({
    step: (dt) => {
      controller.step(dt, input, input.taps);
      input.endStep();
    },
    render: () => {
      const ctx = host.ctx;
      host.beginFrame(game.palette.background);
      const view = {
        width: W,
        height: H,
        reducedMotion: controller.settings.reducedMotion,
        time: host.now() / 1000,
        idle: controller.phase === 'idle',
      };
      controller.round.render(ctx, view);
      drawHud(ctx, controller, strings, game.palette, game.roundSeconds);
      if (controller.phase === 'end') drawEndCard(ctx, controller, strings, game.palette);
      drawToast(ctx, controller, game.palette);
    },
  });
  if (autoplay || test) loop.timeScale = speed;

  adapter.on('pause', () => {
    loop.paused = true;
    input.cancel();
  });
  adapter.on('resume', () => {
    loop.paused = false;
    loop.resetClock();
  });

  if (test) {
    host.expose('__feedplay', {
      get phase() {
        return controller.phase;
      },
      get score() {
        return controller.round.score;
      },
      get seed() {
        return controller.seed;
      },
      get rounds() {
        return controller.rounds;
      },
      get lastShare() {
        return controller.lastShare;
      },
      get events() {
        return mem.events;
      },
      get calls() {
        return (adapter as Partial<MockAdapter>).calls ?? [];
      },
      get settings() {
        return controller.settings;
      },
      get fontScale() {
        return host.scale;
      },
    });
  }

  await adapter.start();
  host.onFrame((t) => loop.frame(t));
  return controller;
}
