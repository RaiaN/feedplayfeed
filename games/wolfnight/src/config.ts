export interface WolfNightConfig {
  /** Seconds until dawn (30–90). Surviving that long ends the round with a bonus. */
  roundSeconds: number;
  /** dangerFalloff: distance beyond catchRadius over which the heartbeat/vignette danger ramps from 1 to 0. */
  girl: { x: number; y: number; catchRadius: number; dangerFalloff: number };
  lantern: {
    /** Light radius at empty / full oil. */
    minRadius: number;
    maxRadius: number;
    drainPerSecond: number;
    flashCost: number;
    flashRange: number;
    /** Full cone width of a lantern flash. */
    flashConeDeg: number;
    cooldown: number;
    /** A tap this close to a wolf always hits it, even at the cone's edge. */
    directTapRadius: number;
  };
  wolves: {
    startCount: number;
    /** Seconds between spawns at round start → end. */
    spawnStart: number;
    spawnEnd: number;
    /** Approach speed (px/s) at round start → end. */
    speedStart: number;
    speedEnd: number;
    spawnDistance: number;
    pushBack: number;
    retreatSpeed: number;
    stun: number;
    max: number;
    /** Opening wolves start at spawnDistance × (openingDistance + i × openingStep): visible in frame 1. */
    openingDistance: number;
    openingStep: number;
    /** Lowest spawn y (keeps wolves off the oil gauge). */
    spawnMaxY: number;
  };
  fireflies: {
    every: number;
    life: number;
    oil: number;
    tapRadius: number;
    firstAfter: number;
    minDistance: number;
    maxDistance: number;
  };
  scoring: {
    perSecond: number;
    push: number;
    closeCall: number;
    /** A wolf flashed back while closer than this is a close call (bonus + multiplier). */
    closeCallRadius: number;
    firefly: number;
    dawnBonus: number;
    maxMultiplier: number;
  };
}

export function validateConfig(c: WolfNightConfig): WolfNightConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  if (!(c.lantern.minRadius > 0 && c.lantern.minRadius < c.lantern.maxRadius)) errors.push('lantern radii');
  if (!(c.wolves.spawnEnd > 0 && c.wolves.spawnStart >= c.wolves.spawnEnd)) errors.push('wolf spawn interval');
  if (!(c.wolves.speedStart > 0 && c.wolves.speedEnd >= c.wolves.speedStart)) errors.push('wolf speed');
  if (!(c.scoring.closeCallRadius > c.girl.catchRadius)) errors.push('closeCallRadius must exceed catchRadius');
  if (c.wolves.max < 1 || c.wolves.startCount > c.wolves.max) errors.push('wolf counts');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}
