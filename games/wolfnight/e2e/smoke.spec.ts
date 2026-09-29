import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, tapLogical, waitForGame } from '../../../tools/e2e/score-attack.ts';
import config from '../game.config.json' with { type: 'json' };
import { WolfNightSim } from '../src/sim.ts';

scoreAttackSmoke({ minRoundMs: 1_000, firstTap: { x: 180, y: 250 } });

test('tapping a wolf flashes the lantern and drives it back (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  const seed = 'e2e-wolves';
  // The sim is deterministic, so the test knows where the first wolf stands for this seed.
  const sim = new WolfNightSim(config, seed);
  const wolf = sim.wolves.reduce((a, b) => (sim.distance(a) < sim.distance(b) ? a : b));
  await page.goto(`/?adapter=mock&test=1&c=${seed}`);
  await waitForGame(page);
  await tapLogical(page, wolf.x, wolf.y);
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await expect.poll(async () => (await hook(page)).summary.pushes).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
