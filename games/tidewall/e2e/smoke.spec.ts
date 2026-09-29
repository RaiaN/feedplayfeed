import { expect, test, type Page } from '@playwright/test';

interface Hook {
  phase: 'idle' | 'play' | 'end';
  score: number;
  seed: string;
  lastShare: { method: string; payload: { seed: string; score: number; kind: string; text: string } } | null;
  events: Array<{ name: string; props: Record<string, unknown> }>;
  calls: Array<{ method: string; args: unknown[] }>;
  fontScale: number;
}

const hook = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as never)['__feedplay'])) as Hook);

test('loads, takes input, finishes a round, submits the score and shares', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const external: string[] = [];
  page.on('request', (r) => !r.url().startsWith('http://localhost') && external.push(r.url()));

  const t0 = Date.now();
  await page.goto('/?adapter=mock&test=1&autoplay=1&speed=10');
  await page.waitForFunction(() => (window as never)['__feedplay'] !== undefined);
  expect(Date.now() - t0).toBeLessThan(2000);

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  // 9:16 portrait, fitted to the 390×844 viewport.
  expect(box.width / box.height).toBeCloseTo(9 / 16, 1);
  // Text ≥16 CSS px: the template's 18-unit minimum font times the fit scale.
  expect(18 * (await hook(page)).fontScale).toBeGreaterThanOrEqual(16);

  // First input: a tap in the play field.
  await canvas.tap({ position: { x: box.width / 2, y: box.height * 0.7 } });
  await expect.poll(async () => (await hook(page)).events.some((e) => e.name === 'first_input')).toBe(true);

  // Autoplay (bot) finishes the round at 10× speed.
  await expect.poll(async () => (await hook(page)).phase, { timeout: 20_000 }).toBe('end');
  const state = await hook(page);
  expect(state.seed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const names = state.events.map((e) => e.name);
  expect(names).toEqual(expect.arrayContaining(['session_start', 'first_input', 'round_start', 'round_end']));
  const roundEnd = state.events.find((e) => e.name === 'round_end')!.props;
  expect(roundEnd).toMatchObject({ score: state.score, seed: state.seed });
  expect(roundEnd.duration_ms).toBeGreaterThanOrEqual(30_000);
  const submitted = state.calls.filter((c) => c.method === 'submitScore');
  expect(submitted).toHaveLength(1);
  expect(submitted[0]!.args[0]).toMatchObject({ score: state.score, seed: state.seed });
  expect(state.score).toBeGreaterThan(0);

  // Share: the "Share score" button (layout.share centre = 180,461 in 360×640 logical units).
  await page.waitForTimeout(100);
  await canvas.tap({ position: { x: (180 / 360) * box.width, y: (461 / 640) * box.height } });
  await expect.poll(async () => (await hook(page)).lastShare?.method).toBe('mock');
  const shared = (await hook(page)).lastShare!.payload;
  expect(shared).toMatchObject({ kind: 'score', seed: state.seed, score: state.score });
  expect(shared.text).toContain(String(state.score));
  expect((await hook(page)).events.some((e) => e.name === 'share_click')).toBe(true);

  // Challenge a friend (layout.challenge centre = 180,527).
  await canvas.tap({ position: { x: (180 / 360) * box.width, y: (527 / 640) * box.height } });
  await expect.poll(async () => (await hook(page)).lastShare?.payload.kind).toBe('challenge');

  // Instant restart (layout.again centre = 180,388).
  await canvas.tap({ position: { x: (180 / 360) * box.width, y: (388 / 640) * box.height } });
  await expect.poll(async () => (await hook(page)).phase).toBe('play');

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('a challenge link replays the challenge seed', async ({ page }) => {
  await page.goto('/?adapter=mock&test=1&c=friend-seed-42&s=1234');
  await page.waitForFunction(() => (window as never)['__feedplay'] !== undefined);
  const state = await hook(page);
  expect(state.seed).toBe('friend-seed-42');
  expect(state.events.find((e) => e.name === 'challenge_open')?.props).toEqual({ seed: 'friend-seed-42' });
});
