// Tidewall drawing. Visual-only state (particles, shake, fading lanes) lives here, never in the sim.
import { drawText, ease, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { Grade, SimEvent, TidewallSim } from './sim.ts';

export const GROUND_Y = 596;
export const WALL_MAX_PX = 380;
const SEA_TOP = 96;

interface Popup {
  grade: Grade;
  lane: number;
  points: number;
  born: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
}

export class TidewallRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private drops: Drop[] = [];
  private shakeUntil = 0;
  private laneFade: number[];

  constructor(
    private readonly sim: TidewallSim,
    private readonly strings: Strings,
  ) {
    this.laneFade = sim.lanes.map(() => 0);
  }

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const laneW = v.width / sim.config.segments;
    this.consumeEvents(v, laneW);

    ctx.save();
    if (!v.reducedMotion && v.time < this.shakeUntil) {
      const k = (this.shakeUntil - v.time) * 20;
      ctx.translate(Math.sin(v.time * 90) * k, Math.cos(v.time * 70) * k * 0.5);
    }

    // Sea.
    const grad = ctx.createLinearGradient(0, SEA_TOP, 0, GROUND_Y);
    grad.addColorStop(0, colors.seaDeep);
    grad.addColorStop(1, colors.sea);
    ctx.fillStyle = grad;
    ctx.fillRect(0, SEA_TOP, v.width, GROUND_Y - SEA_TOP);

    // Active lane highlight + target crest line.
    const wave = sim.wave;
    if (wave) {
      const x = wave.lane * laneW;
      ctx.fillStyle = 'rgba(240,228,66,0.08)';
      ctx.fillRect(x, SEA_TOP, laneW, GROUND_Y - SEA_TOP);
    }

    // Wall segments.
    for (let i = 0; i < sim.config.segments; i++) {
      const active = wave?.lane === i;
      const h = active && (sim.rising || sim.locked) ? sim.wall : (this.laneFade[i] ?? 0);
      const color = active && sim.rising ? colors.wallRising : colors.wallLocked;
      this.drawSegment(ctx, i * laneW + 4, laneW - 8, h, color);
    }

    // Target crest line, on top of the wall so it stays visible while the wall passes it.
    if (wave) this.drawTarget(ctx, wave.lane * laneW, laneW, GROUND_Y - wave.crest * WALL_MAX_PX);

    // Wave.
    if (wave) this.drawWave(ctx, wave.lane * laneW, laneW, wave.t / wave.travel, wave.crest, v);

    // Ground.
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, GROUND_Y, v.width, v.height - GROUND_Y);

    this.drawDrops(ctx, v);
    this.drawPopups(ctx, v, laneW);
    if (v.idle && wave) this.drawHint(ctx, wave.lane * laneW + laneW / 2, v);
    ctx.restore();
  }

  private consumeEvents(v: RenderView, laneW: number): void {
    const events = this.sim.events;
    for (; this.seen < events.length; this.seen++) {
      const e = events[this.seen] as SimEvent;
      if (e.type === 'spawn') {
        // Older walls sink back as each new wave comes in.
        this.laneFade = this.laneFade.map((h) => h * 0.6);
      } else if (e.type === 'lock') {
        const lane = this.sim.wave?.lane;
        if (lane !== undefined) this.laneFade[lane] = e.height;
      } else if (e.type === 'impact') {
        this.popups.push({ grade: e.grade, lane: e.lane, points: e.points, born: v.time });
        if (e.grade === 'breach') this.shakeUntil = v.time + 0.35;
        if (!v.reducedMotion) {
          const cx = e.lane * laneW + laneW / 2;
          const y = GROUND_Y - (this.sim.lanes[e.lane] ?? 0) * WALL_MAX_PX;
          for (let k = 0; k < 14; k++) {
            const a = -Math.PI * (0.1 + (0.8 * ((k * 7) % 14)) / 14);
            const sp = 90 + ((k * 37) % 60) * 2;
            this.drops.push({ x: cx, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, born: v.time });
          }
        }
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 0.9);
    this.drops = this.drops.filter((d) => v.time - d.born < 0.7);
  }

  private drawTarget(ctx: CanvasRenderingContext2D, x: number, w: number, y: number): void {
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + w - 2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Side notches, so the line reads without relying on color.
    ctx.fillStyle = colors.target;
    for (const [px, dir] of [
      [x + 2, 1],
      [x + w - 2, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(px, y - 9);
      ctx.lineTo(px + 11 * dir, y);
      ctx.lineTo(px, y + 9);
      ctx.fill();
    }
  }

  private drawSegment(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, color: string): void {
    const px = Math.max(0, h) * WALL_MAX_PX;
    if (px < 1) return;
    const top = GROUND_Y - px;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, px);
    // Brick rows for texture.
    ctx.fillStyle = colors.wallShade;
    for (let y = GROUND_Y - 22; y > top; y -= 22) ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = colors.foam;
    ctx.fillRect(x, top, w, 4);
  }

  private drawWave(ctx: CanvasRenderingContext2D, x: number, w: number, p: number, crest: number, v: RenderView) {
    const targetY = GROUND_Y - crest * WALL_MAX_PX;
    const front = SEA_TOP + (targetY - SEA_TOP) * ease.inQuad(Math.min(1, p));
    const bob = v.reducedMotion ? 0 : Math.sin(v.time * 8) * 3;
    ctx.fillStyle = colors.wave;
    ctx.beginPath();
    ctx.moveTo(x, SEA_TOP);
    ctx.lineTo(x + w, SEA_TOP);
    ctx.lineTo(x + w, front - 10 + bob);
    ctx.quadraticCurveTo(x + w * 0.75, front + 14 - bob, x + w / 2, front + bob);
    ctx.quadraticCurveTo(x + w * 0.25, front - 14 + bob, x, front + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.foam;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + w, front - 10 + bob);
    ctx.quadraticCurveTo(x + w * 0.75, front + 14 - bob, x + w / 2, front + bob);
    ctx.quadraticCurveTo(x + w * 0.25, front - 14 + bob, x, front + 6);
    ctx.stroke();
  }

  private drawDrops(ctx: CanvasRenderingContext2D, v: RenderView): void {
    ctx.fillStyle = colors.foam;
    for (const d of this.drops) {
      const t = v.time - d.born;
      ctx.globalAlpha = 1 - t / 0.7;
      ctx.beginPath();
      ctx.arc(d.x + d.vx * t, d.y + d.vy * t + 400 * t * t, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView, laneW: number): void {
    for (const p of this.popups) {
      const t = (v.time - p.born) / 0.9;
      const cx = Math.min(v.width - 60, Math.max(60, p.lane * laneW + laneW / 2));
      const y = 150 - (v.reducedMotion ? 0 : t * 30);
      const color = colors[p.grade];
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawGradeIcon(ctx, p.grade, cx, y - 34, color);
      drawText(ctx, this.strings.t(`grade.${p.grade}`), cx, y, { size: 22, color });
      if (p.points > 0) drawText(ctx, `+${p.points}`, cx, y + 26, { size: 18, color: colors.text });
    }
    ctx.globalAlpha = 1;
  }

  /** Wordless tutorial: a thumb circle pulsing on the lane with an up arrow ("hold → rises"). */
  private drawHint(ctx: CanvasRenderingContext2D, cx: number, v: RenderView): void {
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 5) + 1) / 2;
    const y = GROUND_Y - 60;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, y, 20 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(cx, y, 12, 0, Math.PI * 2);
    ctx.fill();
    const ay = y - 60 - pulse * 20;
    ctx.beginPath();
    ctx.moveTo(cx, ay - 18);
    ctx.lineTo(cx + 16, ay + 4);
    ctx.lineTo(cx - 16, ay + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 5, ay + 4, 10, 22);
    ctx.globalAlpha = 1;
  }
}

function drawGradeIcon(ctx: CanvasRenderingContext2D, grade: Grade, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (grade === 'perfect') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 14 : 6;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (grade === 'good') {
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 3, y + 8);
    ctx.lineTo(x + 11, y - 8);
    ctx.stroke();
  } else if (grade === 'over') {
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, y - 10);
    ctx.moveTo(x - 8, y - 2);
    ctx.lineTo(x, y - 10);
    ctx.lineTo(x + 8, y - 2);
    ctx.stroke();
  } else {
    ctx.moveTo(x - 9, y - 9);
    ctx.lineTo(x + 9, y + 9);
    ctx.moveTo(x + 9, y - 9);
    ctx.lineTo(x - 9, y + 9);
    ctx.stroke();
  }
}
