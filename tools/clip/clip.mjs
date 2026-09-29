// Gameplay clip recorder: npm run clip -- <slug> [--seed <seed>] [--speed <n>] [--manual]
// Serves games/<slug>/dist, records a 1080×1920 (9:16) round with Playwright, and saves 3 screenshots.
//   out/clips/<slug>-<seed>[-manual].webm  (+ .mp4 when ffmpeg is on PATH)
//   out/shots/<slug>-01-start.png, -02-play.png, -03-end.png
// Default: the game's autoplay bot plays (?autoplay=1). --manual drives real pointer holds instead.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const W = 1080;
const H = 1920;

function parseArgs(argv) {
  const args = { slug: undefined, seed: new Date().toISOString().slice(0, 10), speed: 1, manual: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') args.seed = argv[++i];
    else if (a === '--speed') args.speed = Number(argv[++i]);
    else if (a === '--manual') args.manual = true;
    else if (!a.startsWith('--')) args.slug = a;
  }
  if (!args.slug) throw new Error('Usage: npm run clip -- <slug> [--seed <seed>] [--speed <n>] [--manual]');
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(args.seed)) throw new Error(`Invalid seed: ${args.seed}`);
  return args;
}

const freePort = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

async function waitForUrl(url, ms = 30_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__feedplay)));
const waitForHook = (page) => page.waitForFunction(() => window.__feedplay !== undefined);

/** Scripted "human" play: varied hold lengths, one per wave-ish interval, until the round ends. */
async function playManually(page) {
  const lengths = [520, 700, 380, 610, 820, 450, 560, 300, 680, 500];
  await page.mouse.move(W / 2, H * 0.7);
  for (let i = 0; (await state(page)).phase !== 'end' && i < 200; i++) {
    await page.mouse.down();
    await page.waitForTimeout(lengths[i % lengths.length]);
    await page.mouse.up();
    await page.waitForTimeout(1500 - Math.min(700, i * 25));
  }
}

async function main() {
  const { slug, seed, speed, manual } = parseArgs(process.argv.slice(2));
  const gameDir = join(root, 'games', slug);
  if (!existsSync(gameDir)) throw new Error(`No game at games/${slug}`);
  if (!existsSync(join(gameDir, 'dist', 'index.html'))) {
    const b = spawnSync('npm', ['run', 'build', '-w', `games/${slug}`], { cwd: root, stdio: 'inherit' });
    if (b.status !== 0) throw new Error('build failed');
  }

  const clipsDir = join(root, 'out', 'clips');
  const shotsDir = join(root, 'out', 'shots');
  const tmpDir = join(root, 'out', '.clip-tmp');
  mkdirSync(clipsDir, { recursive: true });
  mkdirSync(shotsDir, { recursive: true });
  const shot = (n) => join(shotsDir, `${slug}${manual ? '-manual' : ''}-${n}.png`);

  const port = await freePort();
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: gameDir,
    stdio: 'ignore',
    detached: true,
  });
  const base = `http://localhost:${port}/`;
  const errors = [];
  const browser = await chromium.launch();
  try {
    await waitForUrl(base);
    const ctxOpts = { viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true };

    // 1. Start frame (idle, wordless hint), without recording.
    const still = await browser.newContext(ctxOpts);
    const p0 = await still.newPage();
    await p0.goto(`${base}?adapter=mock&test=1&c=${seed}`);
    await waitForHook(p0);
    await p0.waitForTimeout(700);
    await p0.screenshot({ path: shot('01-start') });
    await still.close();

    // 2. Recorded round.
    const ctx = await browser.newContext({ ...ctxOpts, recordVideo: { dir: tmpDir, size: { width: W, height: H } } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const flags = manual ? '' : `&autoplay=1&speed=${speed}`;
    await page.goto(`${base}?adapter=mock&test=1&c=${seed}${flags}`);
    await waitForHook(page);
    await page.waitForTimeout(manual ? 1200 : 900);

    const midShot = page
      .waitForTimeout(Math.round(20_000 / (manual ? 1 : speed)))
      .then(() => page.screenshot({ path: shot('02-play') }));
    if (manual) await playManually(page);
    await page.waitForFunction(() => window.__feedplay.phase === 'end', null, { timeout: 180_000 });
    await midShot;
    await page.waitForTimeout(2500);
    await page.screenshot({ path: shot('03-end') });
    const final = await state(page);

    const video = page.video();
    await ctx.close();
    const name = `${slug}-${seed}${manual ? '-manual' : ''}`;
    const webm = join(clipsDir, `${name}.webm`);
    await video.saveAs(webm);
    rmSync(tmpDir, { recursive: true, force: true });

    let mp4 = null;
    if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) {
      mp4 = join(clipsDir, `${name}.mp4`);
      const f = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-i',
          webm,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          mp4,
        ],
        { stdio: 'inherit' },
      );
      if (f.status !== 0) mp4 = null;
    }

    console.log(`clip: ${slug} seed=${final.seed} score=${final.score} summary=${JSON.stringify(final.summary)}`);
    console.log(`clip: video ${webm}${mp4 ? ` and ${mp4}` : ' (no ffmpeg on PATH: mp4 skipped)'}`);
    console.log(`clip: shots ${shot('01-start')}, 02-play, 03-end`);
    if (errors.length) throw new Error(`page errors during recording:\n${errors.join('\n')}`);
  } finally {
    await browser.close();
    try {
      process.kill(-server.pid);
    } catch {
      server.kill();
    }
  }
}

main().catch((e) => {
  console.error(`clip: ${e.message}`);
  process.exit(1);
});
