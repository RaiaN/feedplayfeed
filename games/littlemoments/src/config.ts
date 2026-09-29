export interface LittleMomentsConfig {
  /** Round length in seconds (30–90). */
  roundSeconds: number;
  /** Emotional bank account: 0 = drifted apart (round ends). */
  bank: {
    start: number;
    max: number;
    toward: number;
    bigToward: number;
    missed: number;
    distracted: number;
    /** "Life gets busy": the bank drains per second (start → end); only turning toward keeps it up. */
    drainStart: number;
    drainEnd: number;
  };
  bids: {
    /** Seconds between spawns at round start → end. */
    intervalStart: number;
    intervalEnd: number;
    /** How long a bid waits for you, start → end. */
    lifeStart: number;
    lifeEnd: number;
    /** Share of bids that are big (vulnerable) bids. */
    bigChance: number;
    bigLifeScale: number;
    /** Tap radius (logical px). */
    radius: number;
  };
  /** Phone notifications: look-alike traps. Chance a spawn is a distraction, start → end. */
  distractions: { chanceStart: number; chanceEnd: number; lifeScale: number };
  /** Spawn grid (seeded slot order, independent of player actions). */
  area: {
    cols: number;
    rows: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    jitter: number;
    noRepeat: number;
  };
  scoring: {
    toward: number;
    big: number;
    justInTime: number;
    /** Catching a bid in its last fraction of life = just in time. */
    justInTimeFrac: number;
    ignoredPhone: number;
    streakPerLevel: number;
    maxMultiplier: number;
    finishBonus: number;
  };
  /** Research benchmarks shown on the gauge (% of bids turned toward). */
  benchmarks: { masters: number; disasters: number };
}

export function validateConfig(c: LittleMomentsConfig): LittleMomentsConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  if (!(c.bank.start > 0 && c.bank.start <= c.bank.max)) errors.push('bank.start');
  if (!(c.bids.intervalEnd > 0 && c.bids.intervalStart >= c.bids.intervalEnd)) errors.push('bid interval ramp');
  if (!(c.bids.lifeEnd > 0 && c.bids.lifeStart >= c.bids.lifeEnd)) errors.push('bid life ramp');
  if (c.area.cols * c.area.rows <= c.area.noRepeat) errors.push('spawn grid must have more slots than noRepeat');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
