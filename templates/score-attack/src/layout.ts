// Shared HUD / end-card layout in logical units (360×640). Controller hit-tests these, hud.ts draws them.
import type { Rect } from '@feedplay/engine';

export const W = 360;
export const H = 640;

export const layout = {
  motionToggle: { x: 250, y: 14, w: 46, h: 46 },
  muteToggle: { x: 302, y: 14, w: 46, h: 46 },
  panel: { x: 24, y: 118, w: 312, h: 486 },
  again: { x: 44, y: 356, w: 272, h: 64 },
  share: { x: 44, y: 434, w: 272, h: 54 },
  challenge: { x: 44, y: 500, w: 272, h: 54 },
} satisfies Record<string, Rect>;

/** Minimum logical font size. At the narrowest supported viewport (320 CSS px) this is still ≥16 CSS px. */
export const MIN_FONT = 18;
