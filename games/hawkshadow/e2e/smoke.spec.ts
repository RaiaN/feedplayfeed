import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, toPage, waitForGame } from '../../../tools/e2e/score-attack.ts';

scoreAttackSmoke({ minRoundMs: 1_000, firstTap: { x: 180, y: 540 } });

test('holding runs the mouse forward; releasing freezes it (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  await page.goto('/?adapter=mock&test=1');
  await waitForGame(page);
  const p = await toPage(page, 180, 540);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await page.waitForTimeout(900);
  await page.mouse.up();
  const ran = (await hook(page)).summary.meters;
  expect(ran).toBeGreaterThan(5);
  await page.waitForTimeout(300);
  expect((await hook(page)).summary.meters).toBe(ran);
  expect(errors).toEqual([]);
});
