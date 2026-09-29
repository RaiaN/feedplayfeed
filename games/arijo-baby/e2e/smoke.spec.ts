import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, tapLogical, waitForGame } from '../../../tools/e2e/score-attack.ts';

scoreAttackSmoke({ minRoundMs: 10_000, firstTap: { x: 90, y: 500 } });

test('tapping an answer on the first moment moves a partner (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  await page.goto('/?adapter=mock&test=1');
  await waitForGame(page);
  // The first card always keeps its authored layout: left is the authored positive answer.
  await tapLogical(page, 90, 500);
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await expect.poll(async () => (await hook(page)).summary.good).toBe(1);
  expect(errors).toEqual([]);
});
