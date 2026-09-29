export interface SharkWakeConfig {
  /** Seconds to reach shore (30–90). */
  roundSeconds: number;
  surfer: {
    /** Fixed screen row; the sea scrolls. */
    screenY: number;
    /** Lane centre x positions (logical px). */
    lanes: number[];
    /** Sideways speed when switching lanes (px/s). */
    laneSpeed: number;
    /** Obstacles within this x distance of the surfer hit. */
    hitHalfWidth: number;
  };
  speed: { start: number; end: number; slowFactor: number; slowSeconds: number };
  fin: {
    startGap: number;
    maxGap: number;
    /** Gap lost per second at round start → end. */
    closeStart: number;
    closeEnd: number;
    hitPenalty: number;
  };
  rows: {
    firstAt: number;
    /** World px between obstacle rows at start → end. */
    spacingStart: number;
    spacingEnd: number;
    /** Chance a row blocks two lanes, ramping 0 → this. */
    doubleChanceEnd: number;
    boostChance: number;
  };
  scoring: {
    pxPerPoint: number;
    nearMiss: number;
    /** A lane switch this close before passing an obstacle in the lane you left = near miss. */
    nearMissWindow: number;
    nearMissGap: number;
    boost: number;
    boostGap: number;
    shoreBonus: number;
    maxMultiplier: number;
  };
}

export function validateConfig(c: SharkWakeConfig): SharkWakeConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  if (c.surfer.lanes.length !== 3) errors.push('exactly 3 lanes');
  if (!(c.speed.start > 0 && c.speed.end >= c.speed.start)) errors.push('speed ramp');
  if (!(c.fin.startGap > 0 && c.fin.maxGap >= c.fin.startGap)) errors.push('fin gap');
  if (!(c.rows.spacingEnd > 0 && c.rows.spacingStart >= c.rows.spacingEnd)) errors.push('row spacing');
  if (!(c.rows.doubleChanceEnd >= 0 && c.rows.doubleChanceEnd <= 1)) errors.push('doubleChanceEnd 0–1');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
