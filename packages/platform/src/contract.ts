// Adapter contract: every PlatformAdapter must pass this suite (packages/platform/src/*.test.ts).
// Channel adapters added later (devvit, fbinstant, ...) run it against their fakes.
import { describe, expect, it } from 'vitest';
import { dailySeed } from './seed.ts';
import type { Challenge, PlatformAdapter } from './types.ts';

export interface ContractHarness {
  adapter: PlatformAdapter;
  /** Make the platform report pause/resume the way it really would (visibility change, SDK callback, ...). */
  triggerPause(): void;
  triggerResume(): void;
}

export interface ContractOptions {
  now: Date;
  challenge?: Challenge;
}

export function runAdapterContract(name: string, make: (opts: ContractOptions) => ContractHarness): void {
  const now = new Date('2026-09-29T12:34:56Z');

  describe(`PlatformAdapter contract: ${name}`, () => {
    it('initialises, reports loading progress (clamped) and starts', async () => {
      const { adapter } = make({ now });
      await adapter.init();
      expect(() => {
        adapter.setLoadingProgress(-5);
        adapter.setLoadingProgress(50);
        adapter.setLoadingProgress(150);
      }).not.toThrow();
      await expect(adapter.start()).resolves.toBeUndefined();
      expect(adapter.name).toBeTruthy();
    });

    it('returns the UTC daily seed when there is no challenge', async () => {
      const { adapter } = make({ now });
      await adapter.init();
      expect(await adapter.getSeed()).toBe(dailySeed(now));
      expect(await adapter.getSeed()).toBe('2026-09-29');
      expect(await adapter.getChallenge()).toBeNull();
    });

    it('returns the challenge seed and score when opened from a challenge', async () => {
      const { adapter } = make({ now, challenge: { seed: 'abc-123', score: 4200 } });
      await adapter.init();
      expect(await adapter.getChallenge()).toEqual({ seed: 'abc-123', score: 4200 });
      expect(await adapter.getSeed()).toBe('abc-123');
    });

    it('round-trips storage and returns null for missing keys', async () => {
      const { adapter } = make({ now });
      await adapter.init();
      expect(await adapter.storage.get('missing')).toBeNull();
      await adapter.storage.set('muted', '1');
      expect(await adapter.storage.get('muted')).toBe('1');
    });

    it('accepts scores', async () => {
      const { adapter } = make({ now });
      await adapter.init();
      await expect(adapter.submitScore({ score: 10, seed: '2026-09-29', durationMs: 60000 })).resolves.toBeUndefined();
    });

    it('shares a payload that carries the seed and score', async () => {
      const { adapter } = make({ now });
      await adapter.init();
      const payload = { kind: 'challenge' as const, text: 'Beat 99', seed: 'xyz', score: 99 };
      const res = await adapter.share(payload);
      expect(res.payload).toEqual(payload);
      expect(['native', 'clipboard', 'platform', 'mock', 'none']).toContain(res.method);
      if (res.url) {
        expect(res.url).toContain('xyz');
        expect(res.url).toContain('99');
      }
    });

    it('emits pause/resume and supports unsubscribe', async () => {
      const h = make({ now });
      await h.adapter.init();
      const log: string[] = [];
      const off = h.adapter.on('pause', () => log.push('pause'));
      h.adapter.on('resume', () => log.push('resume'));
      h.triggerPause();
      h.triggerResume();
      off();
      h.triggerPause();
      expect(log).toEqual(['pause', 'resume']);
    });
  });
}
