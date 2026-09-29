export interface HawkShadowConfig {
  /** Seconds to reach the burrow (30–90). */
  roundSeconds: number;
  mouse: {
    /** Fixed screen row the mouse runs on; the field scrolls. */
    screenY: number;
    /** Forward speed while held (px/s). */
    runSpeed: number;
    /** Sideways speed toward the thumb's x while held (px/s). */
    steerSpeed: number;
    minX: number;
    maxX: number;
  };
  hawk: {
    firstDive: number;
    /** Telegraph length for the first dive only (teaches the freeze). */
    firstWarn: number;
    /** Seconds between dives at round start → end (± jitter). */
    intervalStart: number;
    intervalEnd: number;
    jitter: number;
    /** Warning time (shadow closing in) at start → end. */
    warnStart: number;
    warnEnd: number;
    /** Moving during this window after the strike moment = caught. */
    strikeWindow: number;
    /** Chance a dive is a feint (pulls up), ramping 0 → this by the end. */
    feintChanceEnd: number;
  };
  seeds: { spacingMin: number; spacingMax: number; pickRadius: number };
  scoring: {
    pxPerPoint: number;
    seed: number;
    closeCall: number;
    /** Freeze within this many seconds before a real strike = close call. */
    closeCallWindow: number;
    homeBonus: number;
    maxMultiplier: number;
  };
}

export function validateConfig(c: HawkShadowConfig): HawkShadowConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  const h = c.hawk;
  if (!(h.intervalEnd > h.warnEnd + h.strikeWindow)) errors.push('dive interval must exceed warn + strike window');
  if (!(h.intervalStart >= h.intervalEnd && h.warnStart >= h.warnEnd && h.warnEnd > 0)) errors.push('hawk ramps');
  if (!(h.jitter >= 0 && h.jitter < h.intervalEnd - h.warnEnd - h.strikeWindow)) errors.push('hawk jitter too large');
  if (!(h.firstWarn > 0 && h.firstWarn < h.firstDive)) errors.push('firstWarn must be < firstDive');
  if (!(c.mouse.runSpeed > 0 && c.mouse.minX < c.mouse.maxX)) errors.push('mouse');
  if (!(c.seeds.spacingMin > 0 && c.seeds.spacingMax >= c.seeds.spacingMin)) errors.push('seed spacing');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
