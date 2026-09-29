export interface FloodLineConfig {
  /** Length of the argument in seconds (30–90). */
  roundSeconds: number;
  partner: { x: number; y: number };
  you: { x: number; y: number; hitRadius: number };
  /** Your heart rate model (bpm). Flooding starts at `flood`; you calm down below `recover`; `max` = flooded out. */
  heart: {
    rest: number;
    flood: number;
    recover: number;
    max: number;
    perHit: number;
    repairRelief: number;
    antidoteRelief: number;
    /** Natural drift back toward rest (bpm/s) when not breathing. */
    restDrift: number;
    /** Drop while holding to breathe (bpm/s). */
    breatheDrop: number;
  };
  barbs: {
    startCount: number;
    intervalStart: number;
    intervalEnd: number;
    speedStart: number;
    speedEnd: number;
    /** Share of incoming items that are the partner's repair attempts (start → end). */
    repairChanceStart: number;
    repairChanceEnd: number;
    spread: number;
    tapRadius: number;
  };
  /** Hold longer than holdDelay to take a breather; items slow to slowFactor while you breathe. */
  breathe: { holdDelay: number; slowFactor: number };
  /** No hits during the first `seconds` = gentle start-up: points × multiplier for the rest of the round. */
  startup: { seconds: number; multiplier: number };
  scoring: {
    antidote: number;
    repair: number;
    closeCall: number;
    closeCallDistance: number;
    streakPerLevel: number;
    maxMultiplier: number;
    finishBonus: number;
    /** Positive:negative ratio for the "master" bonus (research: stable couples ≥ 5:1 during conflict). */
    masterRatio: number;
    masterBonus: number;
  };
}

export function validateConfig(c: FloodLineConfig): FloodLineConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  const h = c.heart;
  if (!(h.rest < h.recover && h.recover < h.flood && h.flood < h.max))
    errors.push('heart: rest < recover < flood < max');
  if (!(c.barbs.intervalEnd > 0 && c.barbs.intervalStart >= c.barbs.intervalEnd)) errors.push('barb interval ramp');
  if (!(c.breathe.slowFactor > 0 && c.breathe.slowFactor <= 1)) errors.push('breathe.slowFactor 0–1');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
