// Shark Wake drawing. Visual-only state (popups, splash, streak cache) lives here, never in the sim.
import { clamp, createRng, drawText, drawVignette, Flash, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { Kind, SharkWakeSim, SimEvent } from './sim.ts';

const ROW = 60;

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
  big: boolean;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
}

export class SharkWakeRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private drops: Drop[] = [];
  private streaks = new Map<number, Array<{ x: number; dy: number; w: number }>>();
  private readonly shake = new Shake();
  private readonly flash = new Flash();

  constructor(
    private readonly sim: SharkWakeSim,
    private readonly strings: Strings,
  ) {}

  private screenY(d: number): number {
    return this.sim.config.surfer.screenY - (d - this.sim.distance);
  }

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const sy = sim.config.surfer.screenY;
    this.consumeEvents(v);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    const g = ctx.createLinearGradient(0, 0, 0, v.height);
    g.addColorStop(0, colors.seaTop);
    g.addColorStop(1, colors.seaBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    this.drawStreaks(ctx, v);
    this.drawShore(ctx, v);

    for (const row of sim.rows) {
      const y = this.screenY(row.d);
      if (y < -40 || y > v.height + 40) continue;
      row.lanes.forEach((k, i) => k && this.drawThing(ctx, k, sim.config.surfer.lanes[i]!, y, v));
    }

    const finY = sy + 34 + sim.gap * 1.15;
    this.drawWake(ctx, sim.x, sy, v);
    this.drawFin(ctx, sim.x, finY, v);
    if (!sim.wiped) this.drawSurfer(ctx, sim.x, sy, v);
    this.drawDrops(ctx, v);

    drawVignette(ctx, v.width, v.height, clamp((sim.danger - 0.4) / 0.6, 0, 1) * 0.8, colors.danger, sim.x, sy);
    this.drawPopups(ctx, v);
    if (v.idle) this.drawHint(ctx, v);
    ctx.restore();

    drawText(ctx, this.strings.t('hud.meters', { m: sim.meters }), 16, 616, {
      size: 22,
      color: colors.text,
      align: 'left',
    });
    this.flash.draw(ctx, v.width, v.height, v.time, v.reducedMotion);
  }

  private consumeEvents(v: RenderView): void {
    const { sim } = this;
    const sy = sim.config.surfer.screenY;
    for (; this.seen < sim.events.length; this.seen++) {
      const e = sim.events[this.seen] as SimEvent;
      const lx = e.type === 'near' || e.type === 'boost' || e.type === 'hit' ? sim.config.surfer.lanes[e.lane]! : 180;
      if (e.type === 'near') {
        this.popups.push({
          text: `${this.strings.t('fx.near')} +${e.points}`,
          x: lx,
          y: sy - 50,
          color: colors.near,
          born: v.time,
          big: true,
        });
        this.shake.trigger(v.time, 3, 0.12);
      } else if (e.type === 'boost') {
        this.popups.push({
          text: `${this.strings.t('fx.boost')} +${e.points}`,
          x: lx,
          y: sy - 50,
          color: colors.good,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'hit') {
        this.popups.push({
          text: this.strings.t('fx.hit'),
          x: lx,
          y: sy - 50,
          color: colors.hit,
          born: v.time,
          big: true,
        });
        this.shake.trigger(v.time, 9, 0.3);
        this.splash(sim.x, sy, v, 10);
      } else if (e.type === 'wipeout') {
        this.flash.trigger(v.time, colors.danger, 0.5);
        this.shake.trigger(v.time, 14, 0.5);
        this.splash(sim.x, sy, v, 22);
      } else if (e.type === 'shore') {
        this.popups.push({
          text: this.strings.t('fx.shore'),
          x: 180,
          y: 240,
          color: colors.near,
          born: v.time,
          big: true,
        });
        this.flash.trigger(v.time, '255,240,200', 0.6);
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 0.9);
    this.drops = this.drops.filter((d) => v.time - d.born < 0.7);
  }

  private splash(x: number, y: number, v: RenderView, n: number): void {
    if (v.reducedMotion) return;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const sp = 80 + ((k * 37) % 50) * 2;
      this.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, born: v.time });
    }
  }

  private drawStreaks(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const sy = sim.config.surfer.screenY;
    const first = Math.floor((sim.distance - (v.height - sy) - 20) / ROW);
    const last = Math.floor((sim.distance + sy + 20) / ROW);
    ctx.strokeStyle = colors.streak;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let r = first; r <= last; r++) {
      let s = this.streaks.get(r);
      if (!s) {
        const rng = createRng(`${sim.seed}:sea:${r}`);
        s = Array.from({ length: 3 }, () => ({ x: rng.range(0, 360), dy: rng.range(0, ROW), w: rng.range(12, 40) }));
        this.streaks.set(r, s);
        if (this.streaks.size > 64) this.streaks.delete(this.streaks.keys().next().value as number);
      }
      for (const k of s) {
        const y = this.screenY(r * ROW + k.dy);
        ctx.beginPath();
        ctx.moveTo(k.x, y);
        ctx.lineTo(k.x, y + k.w);
        ctx.stroke();
      }
    }
  }

  /** Beach sliding in from the top during the last seconds. */
  private drawShore(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const left = sim.config.roundSeconds - sim.time;
    if (left > 5 && !sim.survived) return;
    const y = clamp(left, 0, 5) * -40 + 130;
    ctx.fillStyle = colors.sandWet;
    ctx.fillRect(-20, 0, v.width + 40, y + 14);
    ctx.fillStyle = colors.sand;
    ctx.fillRect(-20, 0, v.width + 40, y);
    ctx.strokeStyle = colors.foam;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -20; x <= v.width + 20; x += 20) ctx.lineTo(x, y + 14 + Math.sin(x * 0.2 + v.time * 3) * 3);
    ctx.stroke();
  }

  private drawThing(ctx: CanvasRenderingContext2D, k: Kind, x: number, y: number, v: RenderView): void {
    const bob = v.reducedMotion ? 0 : Math.sin(v.time * 3 + x) * 2;
    if (k === 'boost') {
      ctx.strokeStyle = colors.boost;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      for (const dy of [-10, 6]) {
        ctx.beginPath();
        ctx.moveTo(x - 22, y + dy + 10);
        ctx.lineTo(x, y + dy - 6);
        ctx.lineTo(x + 22, y + dy + 10);
        ctx.stroke();
      }
      ctx.strokeStyle = colors.boostEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 30, y - 22, 60, 44);
      return;
    }
    // Foam ring so obstacles read against the water.
    ctx.strokeStyle = colors.foam;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + bob, 34, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (k === 'rock') {
      ctx.fillStyle = colors.rockDark;
      ctx.beginPath();
      ctx.moveTo(x - 26, y + 8);
      ctx.lineTo(x - 18, y - 14);
      ctx.lineTo(x + 2, y - 20);
      ctx.lineTo(x + 22, y - 10);
      ctx.lineTo(x + 26, y + 10);
      ctx.lineTo(x + 4, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colors.rock;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 8);
      ctx.lineTo(x + 2, y - 16);
      ctx.lineTo(x + 16, y - 6);
      ctx.lineTo(x, y + 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = colors.logDark;
      ctx.fillRect(x - 30, y - 9 + bob, 60, 18);
      ctx.fillStyle = colors.log;
      ctx.fillRect(x - 30, y - 9 + bob, 60, 9);
      ctx.fillStyle = colors.logDark;
      ctx.beginPath();
      ctx.arc(x + 30, y + bob, 9, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
  }

  private drawSurfer(ctx: CanvasRenderingContext2D, x: number, y: number, v: RenderView): void {
    const paddle = v.reducedMotion ? 0 : Math.sin(v.time * 12);
    const tilt = clamp((this.sim.config.surfer.lanes[this.sim.lane]! - x) / 200, -0.35, 0.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = colors.board;
    ctx.strokeStyle = colors.boardEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Arms paddling.
    ctx.strokeStyle = colors.skin;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-20, -14 + paddle * 10);
    ctx.moveTo(8, -6);
    ctx.lineTo(20, -14 - paddle * 10);
    ctx.stroke();
    ctx.fillStyle = colors.suit;
    ctx.beginPath();
    ctx.ellipse(0, 6, 8, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(0, -12, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWake(ctx: CanvasRenderingContext2D, x: number, y: number, v: RenderView): void {
    ctx.strokeStyle = 'rgba(232,244,255,0.5)';
    ctx.lineWidth = 3;
    const w = v.reducedMotion ? 0 : Math.sin(v.time * 6) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 36);
    ctx.lineTo(x - 26 + w, y + 90);
    ctx.moveTo(x + 10, y + 36);
    ctx.lineTo(x + 26 - w, y + 90);
    ctx.stroke();
  }

  /** The fin: dark triangle with a white V wake; a shadow of the body shows when it's close. */
  private drawFin(ctx: CanvasRenderingContext2D, x: number, y: number, v: RenderView): void {
    const sway = v.reducedMotion ? 0 : Math.sin(v.time * 5) * 8;
    const fx = x + sway;
    if (this.sim.danger > 0.5) {
      ctx.fillStyle = `rgba(10,20,30,${0.25 + 0.35 * this.sim.danger})`;
      ctx.beginPath();
      ctx.ellipse(fx, y + 20, 16, 48, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = colors.foam;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx - 4, y - 6);
    ctx.lineTo(fx - 26, y + 34);
    ctx.moveTo(fx + 4, y - 6);
    ctx.lineTo(fx + 26, y + 34);
    ctx.stroke();
    ctx.fillStyle = colors.fin;
    ctx.beginPath();
    ctx.moveTo(fx - 12, y + 10);
    ctx.quadraticCurveTo(fx - 4, y - 18, fx + 8, y - 30);
    ctx.quadraticCurveTo(fx + 6, y - 6, fx + 14, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.finDark;
    ctx.fillRect(fx - 12, y + 8, 26, 4);
  }

  private drawDrops(ctx: CanvasRenderingContext2D, v: RenderView): void {
    ctx.fillStyle = colors.foam;
    for (const d of this.drops) {
      const t = v.time - d.born;
      ctx.globalAlpha = 1 - t / 0.7;
      ctx.beginPath();
      ctx.arc(d.x + d.vx * t, d.y + d.vy * t + 300 * t * t, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    for (const p of this.popups) {
      const t = (v.time - p.born) / 0.9;
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawText(ctx, p.text, clamp(p.x, 100, 260), p.y - (v.reducedMotion ? 0 : t * 24), {
        size: p.big ? 24 : 20,
        color: p.color,
      });
    }
    ctx.globalAlpha = 1;
  }

  /** Wordless tutorial: left/right tap targets pulsing either side of the surfer. */
  private drawHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 5) + 1) / 2;
    const y = 540;
    ctx.fillStyle = colors.text;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 4;
    for (const [x, dir] of [
      [70, -1],
      [290, 1],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 20 + pulse * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + dir * 12, y);
      ctx.lineTo(x - dir * 6, y - 11);
      ctx.lineTo(x - dir * 6, y + 11);
      ctx.closePath();
      ctx.fill();
    }
  }
}
