// Moving Day props: stacked cardboard boxes and a window.
import type { RenderView } from '@feedplay/template-score-attack';

export const palette = {
  bgTop: '#2b2a3a',
  bgBottom: '#453a52',
  prop: '#b98a55',
  propDark: '#6e5234',
  accent: '#d9cba3',
};

export function drawProps(ctx: CanvasRenderingContext2D, _v: RenderView): void {
  // Window with evening sky.
  ctx.fillStyle = '#5b6b8c';
  ctx.fillRect(250, 150, 80, 70);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(250, 150, 80, 70);
  ctx.beginPath();
  ctx.moveTo(290, 150);
  ctx.lineTo(290, 220);
  ctx.stroke();
  // Box stacks.
  const box = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = palette.prop;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = palette.propDark;
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.strokeStyle = palette.propDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };
  box(18, 250, 44, 36);
  box(26, 214, 36, 36);
  box(300, 256, 42, 30);
  box(12, 286, 58, 44);
  box(292, 286, 56, 44);
}
