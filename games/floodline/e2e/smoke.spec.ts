import { expect, test } from '@playwright/test';
import {
  collectErrors,
  hook,
  scoreAttackSmoke,
  tapLogical,
  toPage,
  waitForGame,
} from '../../../tools/e2e/score-attack.ts';
import config from '../game.config.json' with { type: 'json' };
import { FloodLineSim } from '../src/sim.ts';

scoreAttackSmoke({ minRoundMs: 20_000, firstTap: { x: 180, y: 600 } });

test('tapping a barb answers it; holding takes a breather (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  const seed = 'e2e-argument';
  const sim = new FloodLineSim(config, seed);
  const barb = sim.items.reduce((a, b) => (a.y > b.y ? a : b));
  await page.goto(`/?adapter=mock&test=1&c=${seed}`);
  await waitForGame(page);
  await tapLogical(page, barb.x, barb.y);
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await expect.poll(async () => (await hook(page)).summary.antidotes).toBe(1);
  // Hold on empty floor to breathe.
  const p = await toPage(page, 180, 610);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  expect(errors).toEqual([]);
});
