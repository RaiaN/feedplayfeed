// Template-owned drawing: timer bar, score, multiplier, challenge target, a11y toggles, end card, toast.
import { drawButton, drawText, roundRect, type Rect, type Strings } from '@feedplay/engine';
import type { ScoreAttackController } from './controller.ts';
import { layout, MIN_FONT, W } from './layout.ts';
import type { Palette } from './types.ts';

export function drawHud(
  ctx: CanvasRenderingContext2D,
  c: ScoreAttackController,
  strings: Strings,
  p: Palette,
  roundSeconds: number,
): void {
  // Timer bar across the top edge.
  const frac = c.phase === 'idle' ? 1 : c.timeLeft / roundSeconds;
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = p.timer;
  ctx.fillRect(0, 0, W * frac, 8);

  drawText(ctx, String(c.round.score), 16, 40, { size: 32, color: p.text, align: 'left' });
  if (c.round.multiplier > 1) {
    drawText(ctx, `×${c.round.multiplier}`, 16, 74, { size: 22, color: p.primary, align: 'left' });
  }
  if (c.challenge?.score !== undefined) {
    drawText(ctx, strings.t('hud.beat', { score: c.challenge.score }), W / 2, 40, {
      size: MIN_FONT,
      color: p.muted,
    });
  }
  drawMotionToggle(ctx, layout.motionToggle, c.settings.reducedMotion, p);
  drawMuteToggle(ctx, layout.muteToggle, c.settings.muted, p);
}

export function drawEndCard(
  ctx: CanvasRenderingContext2D,
  c: ScoreAttackController,
  strings: Strings,
  p: Palette,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 640);
  const r = layout.panel;
  roundRect(ctx, r.x, r.y, r.w, r.h, 22);
  ctx.fillStyle = p.panel;
  ctx.fill();

  const beat = c.challenge?.score !== undefined && c.round.score > c.challenge.score;
  drawText(
    ctx,
    strings.t(beat ? 'end.titleBeat' : (c.round.endTitleKey ?? 'end.title'), c.round.summary()),
    W / 2,
    162,
    {
      size: 24,
      color: p.text,
    },
  );
  const score = String(c.round.score);
  drawText(ctx, score, W / 2, 230, { size: 72, color: p.primary });
  const scoreW = ctx.measureText(score).width;
  drawText(ctx, strings.t('end.best', { ...c.round.summary(), best: c.best }), W / 2, 290, {
    size: MIN_FONT,
    color: p.muted,
    weight: 'normal',
    maxWidth: 296,
  });
  if (c.newBest) drawText(ctx, '★', W / 2 + scoreW / 2 + 22, 206, { size: 32, color: p.primary });

  drawButton(ctx, layout.again, strings.t('end.again'), { fill: p.primary, text: p.primaryText, size: 24 });
  drawButton(ctx, layout.share, strings.t('end.share'), { fill: p.secondary, text: p.secondaryText, size: 20 });
  drawButton(ctx, layout.challenge, strings.t('end.challenge'), {
    fill: p.panel,
    text: p.text,
    size: 20,
    stroke: p.secondary,
  });
}

export function drawToast(ctx: CanvasRenderingContext2D, c: ScoreAttackController, p: Palette): void {
  if (!c.toast) return;
  roundRect(ctx, 60, 572, 240, 40, 20);
  ctx.fillStyle = p.text;
  ctx.fill();
  drawText(ctx, c.toast.text, W / 2, 593, { size: MIN_FONT, color: p.background, maxWidth: 230 });
}

function toggleBg(ctx: CanvasRenderingContext2D, r: Rect, p: Palette): void {
  roundRect(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
}

/** Speaker glyph; a slash when muted. */
function drawMuteToggle(ctx: CanvasRenderingContext2D, r: Rect, muted: boolean, p: Palette): void {
  toggleBg(ctx, r, p);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.fillStyle = p.text;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 5);
  ctx.lineTo(cx - 6, cy - 5);
  ctx.lineTo(cx + 2, cy - 12);
  ctx.lineTo(cx + 2, cy + 12);
  ctx.lineTo(cx - 6, cy + 5);
  ctx.lineTo(cx - 12, cy + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.text;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (muted) {
    ctx.moveTo(cx + 7, cy - 6);
    ctx.lineTo(cx + 15, cy + 6);
    ctx.moveTo(cx + 15, cy - 6);
    ctx.lineTo(cx + 7, cy + 6);
  } else {
    ctx.arc(cx + 3, cy, 10, -0.8, 0.8);
  }
  ctx.stroke();
}

/** Zig-zag glyph for full motion; a flat line for reduced motion. */
function drawMotionToggle(ctx: CanvasRenderingContext2D, r: Rect, reduced: boolean, p: Palette): void {
  toggleBg(ctx, r, p);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.strokeStyle = p.text;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (reduced) {
    ctx.moveTo(cx - 13, cy);
    ctx.lineTo(cx + 13, cy);
  } else {
    ctx.moveTo(cx - 13, cy + 6);
    ctx.lineTo(cx - 6, cy - 7);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx + 6, cy - 7);
    ctx.lineTo(cx + 13, cy + 6);
  }
  ctx.stroke();
}
