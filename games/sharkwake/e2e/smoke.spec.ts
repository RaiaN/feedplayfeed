import { expect, test } from '@playwright/test';
import { collectErrors, hook, scoreAttackSmoke, tapLogical, waitForGame } from '../../../tools/e2e/score-attack.ts';

scoreAttackSmoke({ minRoundMs: 1_000, firstTap: { x: 300, y: 540 } });

test('tapping the right then left half switches lanes (no autoplay)', async ({ page }) => {
  const { errors } = collectErrors(page);
  await page.goto('/?adapter=mock&test=1');
  await waitForGame(page);
  await tapLogical(page, 300, 540);
  await expect.poll(async () => (await hook(page)).phase).toBe('play');
  await tapLogical(page, 60, 540);
  await tapLogical(page, 60, 540);
  await expect.poll(async () => (await hook(page)).summary.switches).toBe(3);
  expect((await hook(page)).summary.meters).toBeGreaterThan(0);
  const events = (await hook(page)).events.map((e) => e.name);
  expect(events).toEqual(expect.arrayContaining(['first_input', 'round_start']));
  expect(errors).toEqual([]);
});
