import { describe, expect, it } from 'vitest';
import { runAdapterContract } from './contract.ts';
import { createWebAdapter, memoryStore, type WebEnv } from './web.ts';

function env(over: Partial<WebEnv> = {}): WebEnv & { fire(hidden: boolean): void } {
  const subs: Array<(h: boolean) => void> = [];
  return {
    url: 'https://play.example.test/tidewall/?adapter=web',
    now: () => new Date('2026-09-29T00:00:00Z'),
    store: memoryStore(),
    share: null,
    copy: null,
    onVisibility: (cb) => subs.push(cb),
    fire: (h) => subs.forEach((cb) => cb(h)),
    ...over,
  };
}

runAdapterContract('web', ({ now, challenge }) => {
  const url = new URL('https://play.example.test/g/');
  if (challenge) {
    url.searchParams.set('c', challenge.seed);
    if (challenge.score !== undefined) url.searchParams.set('s', String(challenge.score));
  }
  const e = env({ url: url.toString(), now: () => now });
  return { adapter: createWebAdapter(e), triggerPause: () => e.fire(true), triggerResume: () => e.fire(false) };
});

describe('web adapter specifics', () => {
  const payload = { kind: 'challenge' as const, text: 'Beat me', seed: 'abc', score: 12 };

  it('prefers native share and builds a challenge link that keeps other params', async () => {
    const shared: unknown[] = [];
    const a = createWebAdapter(env({ share: async (d) => void shared.push(d) }));
    const res = await a.share(payload);
    expect(res.method).toBe('native');
    expect(res.url).toBe('https://play.example.test/tidewall/?adapter=web&c=abc&s=12');
    expect(shared).toEqual([{ text: 'Beat me', url: res.url }]);
  });

  it('reports none (no clipboard copy) when the user cancels the share sheet', async () => {
    let copied = '';
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const a = createWebAdapter(
      env({
        share: async () => {
          throw abort;
        },
        copy: async (t) => void (copied = t),
      }),
    );
    expect((await a.share(payload)).method).toBe('none');
    expect(copied).toBe('');
  });

  it('falls back to clipboard when native share fails', async () => {
    let copied = '';
    const a = createWebAdapter(
      env({
        share: async () => {
          throw new Error('AbortError');
        },
        copy: async (t) => void (copied = t),
      }),
    );
    expect((await a.share(payload)).method).toBe('clipboard');
    expect(copied).toContain('c=abc');
  });

  it('ignores malformed challenge seeds', async () => {
    const a = createWebAdapter(env({ url: 'https://x.test/?c=%3Cscript%3E&s=-1' }));
    expect(await a.getChallenge()).toBeNull();
    expect(await a.getSeed()).toBe('2026-09-29');
  });

  it('survives blocked storage', async () => {
    const a = createWebAdapter(
      env({
        store: {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => {
            throw new Error('SecurityError');
          },
        },
      }),
    );
    await a.storage.set('k', 'v');
    expect(await a.storage.get('k')).toBe('v');
  });

  it('keeps the best score per seed', async () => {
    const a = createWebAdapter(env());
    await a.submitScore({ score: 30, seed: 's', durationMs: 1 });
    await a.submitScore({ score: 10, seed: 's', durationMs: 1 });
    expect(await a.storage.get('best:s')).toBe('30');
  });
});
