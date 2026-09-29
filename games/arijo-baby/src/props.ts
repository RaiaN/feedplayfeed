// First Baby props: night window with a moon and a crib with a mobile.
import type { RenderView } from '@feedplay/template-score-attack';

export const palette = {
  bgTop: '#18203d',
  bgBottom: '#2c355e',
  prop: '#d9cba3',
  propDark: '#141a31',
  accent: '#d9cba3',
};

export function drawProps(ctx: CanvasRenderingContext2D, v: RenderView): void {
  // Window, moon.
  ctx.fillStyle = '#0d1226';
  ctx.fillRect(24, 150, 74, 64);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 150, 74, 64);
  ctx.fillStyle = '#f0e442';
  ctx.beginPath();
  ctx.arc(70, 172, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d1226';
  ctx.beginPath();
  ctx.arc(76, 168, 11, 0, Math.PI * 2);
  ctx.fill();
  // Crib.
  ctx.strokeStyle = palette.prop;
  ctx.lineWidth = 4;
  ctx.strokeRect(268, 240, 76, 50);
  for (let x = 280; x < 344; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 240);
    ctx.lineTo(x, 290);
    ctx.stroke();
  }
  // Mobile, gently turning.
  const a = v.reducedMotion ? 0 : Math.sin(v.time * 0.8) * 0.4;
  ctx.strokeStyle = palette.prop;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(306, 190);
  ctx.lineTo(306, 206);
  ctx.moveTo(306 - 22 * Math.cos(a), 206 - 4 * Math.sin(a));
  ctx.lineTo(306 + 22 * Math.cos(a), 206 + 4 * Math.sin(a));
  ctx.stroke();
  ctx.fillStyle = '#f0e442';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(306 + s * 22 * Math.cos(a), 214 + s * 4 * Math.sin(a), 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
