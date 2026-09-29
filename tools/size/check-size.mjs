// Size budget: every game's initial JavaScript must be <= 300 KB gzipped (CLAUDE.md "Budgets").
// "Initial" = module scripts and modulepreload links referenced from dist/index.html.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUDGET_BYTES = 300 * 1024;

/** @param {string} html @returns {string[]} */
export function initialScripts(html) {
  const refs = new Set();
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) refs.add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*>/g)) {
    const href = /\bhref="([^"]+)"/.exec(m[0]);
    if (href) refs.add(href[1]);
  }
  return [...refs].filter((r) => !/^(https?:)?\/\//.test(r));
}

/** @param {string} distDir @returns {{ files: { file: string, gzip: number }[], total: number }} */
export function measureGame(distDir) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const files = initialScripts(html).map((ref) => {
    const file = join(distDir, ref.replace(/^\.?\//, ''));
    return { file, gzip: gzipSync(readFileSync(file), { level: 9 }).length };
  });
  return { files, total: files.reduce((sum, f) => sum + f.gzip, 0) };
}

function main() {
  const root = resolve(fileURLToPath(import.meta.url), '../../..');
  const gamesDir = join(root, 'games');
  const games = existsSync(gamesDir) ? readdirSync(gamesDir) : [];
  let failed = false;
  let measured = 0;
  for (const slug of games) {
    const dist = join(gamesDir, slug, 'dist');
    if (!existsSync(join(dist, 'index.html'))) {
      console.error(`size: games/${slug} has no dist/index.html (run npm run build)`);
      failed = true;
      continue;
    }
    const { total } = measureGame(dist);
    const ok = total <= BUDGET_BYTES;
    failed ||= !ok;
    measured++;
    console.log(
      `size: ${ok ? 'ok  ' : 'FAIL'} games/${slug} ${(total / 1024).toFixed(1)} KB gz / ${BUDGET_BYTES / 1024} KB`,
    );
  }
  if (measured === 0 && !failed) console.log('size: no games yet');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
