import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, tapLogical, waitForGame } from '../../../tools/e2e/score-attack.ts';
import config from '../game.config.json' with { type: 'json' };
import { LittleMomentsSim } from '../src/sim.ts';

scoreAttackSmoke({ minRoundMs: 10_000, firstTap: { x: 180, y: 590 } });

test('tapping a bid turns toward it (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  const seed = 'e2e-moments';
  // Deterministic sim: the test knows where the first bid is for this seed.
  const bid = new LittleMomentsSim(config, seed).moments.find((m) => m.kind === 'bid')!;
  await page.goto(`/?adapter=mock&test=1&c=${seed}`);
  await waitForGame(page);
  await tapLogical(page, bid.x, bid.y);
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await expect.poll(async () => (await hook(page)).summary.toward).toBe(1);
  expect(errors).toEqual([]);
});
