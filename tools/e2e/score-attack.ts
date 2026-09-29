// Shared Playwright smoke suite for score-attack games. Each game's e2e/smoke.spec.ts calls
// scoreAttackSmoke() and then adds one test for its own input verb.
import { expect, test, type Page } from '@playwright/test';

export interface Hook {
  phase: 'idle' | 'play' | 'end';
  score: number;
  seed: string;
  lastShare: { method: string; payload: { seed: string; score: number; kind: string; text: string } } | null;
  events: Array<{ name: string; props: Record<string, unknown> }>;
  calls: Array<{ method: string; args: unknown[] }>;
  fontScale: number;
  minFont: number;
  summary: Record<string, number>;
}

export const hook = (page: Page): Promise<Hook> =>
  page.evaluate(() => JSON.parse(JSON.stringify((window as never)['__feedplay'])) as Hook);

export const waitForGame = (page: Page) => page.waitForFunction(() => (window as never)['__feedplay'] !== undefined);

/** Convert logical 360×640 game coordinates into page coordinates. */
export async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('canvas').boundingBox())!;
  return { x: box.x + (x / 360) * box.width, y: box.y + (y / 640) * box.height };
}

export async function tapLogical(page: Page, x: number, y: number): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.locator('canvas').tap({ position: { x: (x / 360) * box.width, y: (y / 640) * box.height } });
}

export function collectErrors(page: Page): { errors: string[]; external: string[] } {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => !r.url().startsWith('http://localhost') && external.push(r.url()));
  return { errors, external };
}

export interface SmokeOptions {
  /** Shortest acceptable round (ms). Survival games can end early when the player is caught. */
  minRoundMs: number;
  /** Where the first human tap lands (logical units). */
  firstTap?: { x: number; y: number };
  speed?: number;
}

export function scoreAttackSmoke(opts: SmokeOptions): void {
  const speed = opts.speed ?? 10;

  test('loads, takes input, finishes a round, submits the score and shares', async ({ page }) => {
    const { errors, external } = collectErrors(page);
    const t0 = Date.now();
    await page.goto(`/?adapter=mock&test=1&autoplay=1&speed=${speed}`);
    await waitForGame(page);
    expect(Date.now() - t0).toBeLessThan(2000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(9 / 16, 1);
    const { minFont, fontScale } = await hook(page);
    expect(minFont * fontScale).toBeGreaterThanOrEqual(16);

    const first = opts.firstTap ?? { x: 180, y: 450 };
    await tapLogical(page, first.x, first.y);
    await expect.poll(async () => (await hook(page)).events.some((e) => e.name === 'first_input')).toBe(true);
    const firstInput = (await hook(page)).events.find((e) => e.name === 'first_input')!;
    expect(firstInput.props.ms).toBeLessThanOrEqual(3000);

    await expect.poll(async () => (await hook(page)).phase, { timeout: 30_000 }).toBe('end');
    const state = await hook(page);
    expect(state.seed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(state.events.map((e) => e.name)).toEqual(
      expect.arrayContaining(['session_start', 'first_input', 'round_start', 'round_end']),
    );
    const roundEnd = state.events.find((e) => e.name === 'round_end')!.props;
    expect(roundEnd).toMatchObject({ score: state.score, seed: state.seed });
    expect(roundEnd.duration_ms).toBeGreaterThanOrEqual(opts.minRoundMs);
    const submitted = state.calls.filter((c) => c.method === 'submitScore');
    expect(submitted).toHaveLength(1);
    expect(submitted[0]!.args[0]).toMatchObject({ score: state.score, seed: state.seed });
    expect(state.score).toBeGreaterThan(0);

    // End card buttons (template layout centres): share 180,461 · challenge 180,527 · again 180,388.
    await page.waitForTimeout(500);
    await tapLogical(page, 180, 461);
    await expect.poll(async () => (await hook(page)).lastShare?.method).toBe('mock');
    const shared = (await hook(page)).lastShare!.payload;
    expect(shared).toMatchObject({ kind: 'score', seed: state.seed, score: state.score });
    expect(shared.text).toContain(String(state.score));
    expect((await hook(page)).events.some((e) => e.name === 'share_click')).toBe(true);

    await tapLogical(page, 180, 527);
    await expect.poll(async () => (await hook(page)).lastShare?.payload.kind).toBe('challenge');

    await tapLogical(page, 180, 388);
    await expect.poll(async () => (await hook(page)).phase).toBe('play');

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });

  test('a challenge link replays the challenge seed', async ({ page }) => {
    await page.goto('/?adapter=mock&test=1&c=friend-seed-42&s=1234');
    await waitForGame(page);
    const state = await hook(page);
    expect(state.seed).toBe('friend-seed-42');
    expect(state.events.find((e) => e.name === 'challenge_open')?.props).toEqual({ seed: 'friend-seed-42' });
  });

  test.describe('small phone (320×568)', () => {
    test.use({ viewport: { width: 320, height: 568 } });
    test('keeps text ≥16 CSS px', async ({ page }) => {
      await page.goto('/?adapter=mock&test=1');
      await waitForGame(page);
      const { minFont, fontScale } = await hook(page);
      expect(minFont * fontScale).toBeGreaterThanOrEqual(16);
    });
  });
}
