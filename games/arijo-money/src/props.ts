// Money Talk props: a piggy bank, coin stacks and a stack of bills on a table.
import type { RenderView } from '@feedplay/template-score-attack';

export const palette = {
  bgTop: '#1f3a33',
  bgBottom: '#34574b',
  prop: '#f0e442',
  propDark: '#1a2e28',
  accent: '#d9cba3',
};

export function drawProps(ctx: CanvasRenderingContext2D, _v: RenderView): void {
  // Coin stacks.
  for (const [x, n] of [
    [28, 5],
    [50, 3],
    [318, 4],
  ] as const) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = palette.prop;
      ctx.beginPath();
      ctx.ellipse(x, 320 - i * 7, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a7f00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // Piggy bank.
  ctx.fillStyle = '#cc79a7';
  ctx.beginPath();
  ctx.ellipse(300, 178, 30, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(328, 176, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(284, 194, 7, 12);
  ctx.fillRect(308, 194, 7, 12);
  ctx.fillStyle = '#1a2e28';
  ctx.fillRect(292, 158, 16, 3);
  // Bills.
  ctx.fillStyle = '#8fc9a8';
  ctx.fillRect(18, 160, 54, 28);
  ctx.strokeStyle = '#1a2e28';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 160, 54, 28);
  ctx.beginPath();
  ctx.arc(45, 174, 7, 0, Math.PI * 2);
  ctx.stroke();
}
