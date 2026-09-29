// Mock adapter for tests and e2e: records every call, never touches the network.
import { Emitter } from './emitter.ts';
import { dailySeed } from './seed.ts';
import type { Challenge, PlatformAdapter, PlatformEvent, ShareResult } from './types.ts';

export interface MockCall {
  method: string;
  args: unknown[];
}

export interface MockAdapter extends PlatformAdapter {
  readonly calls: MockCall[];
  /** Simulate a platform pause/resume. */
  emit(event: PlatformEvent): void;
  callsTo(method: string): MockCall[];
}

export interface MockOptions {
  now?: Date;
  challenge?: Challenge | null;
}

export function createMockAdapter(opts: MockOptions = {}): MockAdapter {
  const emitter = new Emitter();
  const calls: MockCall[] = [];
  const data = new Map<string, string>();
  const now = opts.now ?? new Date();
  const challenge = opts.challenge ?? null;
  const rec = (method: string, ...args: unknown[]): void => {
    // Store plain JSON copies so tests (and Playwright's evaluate) can read them.
    calls.push({ method, args: JSON.parse(JSON.stringify(args)) as unknown[] });
  };

  return {
    name: 'mock',
    calls,
    callsTo: (method) => calls.filter((c) => c.method === method),
    emit: (event) => emitter.emit(event),
    storage: {
      async get(k) {
        rec('storage.get', k);
        return data.get(k) ?? null;
      },
      async set(k, v) {
        rec('storage.set', k, v);
        data.set(k, v);
      },
    },
    async init() {
      rec('init');
    },
    setLoadingProgress(pct) {
      rec('setLoadingProgress', Math.max(0, Math.min(100, pct)));
    },
    async start() {
      rec('start');
    },
    async getSeed() {
      rec('getSeed');
      return challenge?.seed ?? dailySeed(now);
    },
    async getChallenge() {
      rec('getChallenge');
      return challenge;
    },
    async submitScore(entry) {
      rec('submitScore', entry);
    },
    async share(payload): Promise<ShareResult> {
      rec('share', payload);
      return { method: 'mock', payload, url: `mock://challenge?c=${payload.seed}&s=${payload.score}` };
    },
    on: (event, cb) => emitter.on(event, cb),
  };
}
