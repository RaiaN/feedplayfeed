export interface TidewallConfig {
  /** Round length in seconds (30–90). */
  roundSeconds: number;
  /** Wall segments across the screen (visual lanes). */
  segments: number;
  /** Wall rise speed in heights per second (height 1 = top of the wall zone). */
  riseSpeed: number;
  waves: {
    /** Crest height range, 0–1. */
    minCrest: number;
    maxCrest: number;
    /** Seconds a wave takes to reach the wall, at the start and end of a round. */
    travelStart: number;
    travelEnd: number;
    /** Pause between waves, start → end of round. */
    gapStart: number;
    gapEnd: number;
  };
  scoring: {
    /** |wall − crest| within this is a perfect lock. */
    perfectWindow: number;
    /** Up to this much too high is a good lock; beyond it is "too high". Too low is a breach. */
    goodWindow: number;
    perfectPoints: number;
    goodPoints: number;
    overPoints: number;
    maxMultiplier: number;
  };
}

export function validateConfig(c: TidewallConfig): TidewallConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  if (c.segments < 1 || c.segments > 7) errors.push('segments must be 1–7');
  if (!(c.waves.minCrest > 0 && c.waves.minCrest < c.waves.maxCrest && c.waves.maxCrest <= 1))
    errors.push('waves crest range must be 0 < min < max ≤ 1');
  if (c.waves.maxCrest / c.riseSpeed > c.waves.travelEnd) errors.push('highest crest must be reachable in travelEnd');
  if (!(c.scoring.perfectWindow > 0 && c.scoring.perfectWindow < c.scoring.goodWindow))
    errors.push('scoring windows must be 0 < perfect < good');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
