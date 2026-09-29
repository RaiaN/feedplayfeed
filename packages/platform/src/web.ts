// Web adapter for local dev and plain web hosting. Challenge links: `?c=<seed>&s=<score>`.
// Browser APIs are injected (with global defaults) so contract tests run in Node.
import { Emitter } from './emitter.ts';
import { dailySeed, parseScore, parseSeed } from './seed.ts';
import type { Challenge, PlatformAdapter, PlatformStorage, ScoreEntry, SharePayload, ShareResult } from './types.ts';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WebEnv {
  /** Current page URL. */
  url: string;
  now: () => Date;
  store: KeyValueStore | null;
  /** navigator.share, when available. */
  share: ((data: { title?: string; text?: string; url?: string }) => Promise<void>) | null;
  /** navigator.clipboard.writeText, when available. */
  copy: ((text: string) => Promise<void>) | null;
  /** Subscribe to page visibility changes. */
  onVisibility: (cb: (hidden: boolean) => void) => void;
}

export function browserEnv(): WebEnv {
  const g = globalThis as typeof globalThis & { window?: Window };
  const hasWindow = typeof g.window !== 'undefined';
  let store: KeyValueStore | null;
  try {
    store = hasWindow ? g.window!.localStorage : null;
  } catch {
    store = null; // Blocked storage (private mode, sandboxed iframe).
  }
  const nav = hasWindow ? g.window!.navigator : undefined;
  return {
    url: hasWindow ? g.window!.location.href : 'http://localhost/',
    now: () => new Date(),
    store,
    share: nav && typeof nav.share === 'function' ? (d) => nav.share(d) : null,
    copy: nav?.clipboard ? (t) => nav.clipboard.writeText(t) : null,
    onVisibility: (cb) => {
      if (hasWindow) g.window!.document.addEventListener('visibilitychange', () => cb(g.window!.document.hidden));
    },
  };
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

export function createWebAdapter(env: WebEnv = browserEnv(), namespace = 'feedplay'): PlatformAdapter {
  const emitter = new Emitter();
  const url = new URL(env.url);
  const challengeSeed = parseSeed(url.searchParams.get('c'));
  const challenge: Challenge | null = challengeSeed
    ? { seed: challengeSeed, ...optional('score', parseScore(url.searchParams.get('s'))) }
    : null;
  const fallback = memoryStore();
  const store = (): KeyValueStore => env.store ?? fallback;
  const key = (k: string): string => `${namespace}:${k}`;

  const storage: PlatformStorage = {
    async get(k) {
      try {
        return store().getItem(key(k));
      } catch {
        return fallback.getItem(key(k));
      }
    },
    async set(k, v) {
      try {
        store().setItem(key(k), v);
      } catch {
        fallback.setItem(key(k), v);
      }
    },
  };

  const challengeUrl = (p: SharePayload): string => {
    const u = new URL(url.origin + url.pathname);
    for (const [k, v] of url.searchParams) if (k !== 'c' && k !== 's') u.searchParams.set(k, v);
    u.searchParams.set('c', p.seed);
    if (p.kind === 'challenge' || p.score > 0) u.searchParams.set('s', String(p.score));
    return u.toString();
  };

  return {
    name: 'web',
    storage,
    async init() {
      env.onVisibility((hidden) => emitter.emit(hidden ? 'pause' : 'resume'));
    },
    setLoadingProgress() {
      // The web build has no platform loading screen.
    },
    async start() {},
    async getSeed() {
      return challenge?.seed ?? dailySeed(env.now());
    },
    async getChallenge() {
      return challenge;
    },
    async submitScore(entry: ScoreEntry) {
      const best = Number((await storage.get(`best:${entry.seed}`)) ?? '0');
      if (entry.score > best) await storage.set(`best:${entry.seed}`, String(entry.score));
    },
    async share(payload): Promise<ShareResult> {
      const link = challengeUrl(payload);
      if (env.share) {
        try {
          await env.share({ text: payload.text, url: link });
          return { method: 'native', payload, url: link };
        } catch (e) {
          // User closed the share sheet: respect that. Any other failure falls through to clipboard.
          if ((e as { name?: string })?.name === 'AbortError') return { method: 'none', payload, url: link };
        }
      }
      if (env.copy) {
        try {
          await env.copy(`${payload.text} ${link}`);
          return { method: 'clipboard', payload, url: link };
        } catch {
          // Clipboard blocked.
        }
      }
      return { method: 'none', payload, url: link };
    },
    on: (event, cb) => emitter.on(event, cb),
  };
}

function optional<K extends string, V>(k: K, v: V | undefined): Partial<Record<K, V>> {
  return v === undefined ? {} : ({ [k]: v } as Record<K, V>);
}
