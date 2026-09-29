import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, toPage, waitForGame } from '../../../tools/e2e/score-attack.ts';

scoreAttackSmoke({ minRoundMs: 30_000, firstTap: { x: 180, y: 450 } });

test('a human hold raises the wall (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  await page.goto('/?adapter=mock&test=1');
  await waitForGame(page);
  const p = await toPage(page, 180, 450);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await page.waitForTimeout(400);
  await page.mouse.up();
  const state = await hook(page);
  expect(state.events.map((e) => e.name)).toEqual(expect.arrayContaining(['first_input', 'round_start']));
  expect(state.summary.raises).toBe(1);
  expect(errors).toEqual([]);
});
