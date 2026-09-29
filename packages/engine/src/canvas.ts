// Small Canvas2D drawing helpers in logical units. No DOM access.
import type { Point } from './input.ts';

export interface TextStyle {
  size: number;
  color: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number | 'bold' | 'normal';
  font?: string;
  /** Shrink to fit this width (long localized strings). */
  maxWidth?: number;
}

export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: TextStyle): void {
  ctx.font = `${s.weight ?? 'bold'} ${s.size}px ${s.font ?? FONT_STACK}`;
  ctx.fillStyle = s.color;
  ctx.textAlign = s.align ?? 'center';
  ctx.textBaseline = s.baseline ?? 'middle';
  if (s.maxWidth !== undefined) ctx.fillText(text, x, y, s.maxWidth);
  else ctx.fillText(text, x, y);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const hit = (r: Rect, p: Point): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export interface ButtonStyle {
  fill: string;
  text: string;
  size: number;
  radius?: number;
  stroke?: string;
}

export function drawButton(ctx: CanvasRenderingContext2D, r: Rect, label: string, s: ButtonStyle): void {
  roundRect(ctx, r.x, r.y, r.w, r.h, s.radius ?? 14);
  ctx.fillStyle = s.fill;
  ctx.fill();
  if (s.stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = s.stroke;
    ctx.stroke();
  }
  drawText(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, { size: s.size, color: s.text });
}
