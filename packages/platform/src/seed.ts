import type { Seed } from './types.ts';

/** Daily seed in UTC so every player worldwide gets the same run on the same day. */
export function dailySeed(date: Date): Seed {
  return date.toISOString().slice(0, 10);
}

const SEED_RE = /^[A-Za-z0-9_-]{1,40}$/;

/** Validate a seed from an untrusted source (URL, platform entry point). Returns null if invalid. */
export function parseSeed(value: unknown): Seed | null {
  return typeof value === 'string' && SEED_RE.test(value) ? value : null;
}

export function parseScore(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isInteger(n) && n >= 0 && n < 1e9 ? n : undefined;
}
