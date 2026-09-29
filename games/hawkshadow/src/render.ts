// Hawk Shadow drawing. Visual-only state (popups, swoops, grass cache) lives here, never in the sim.
import { clamp, createRng, drawText, drawVignette, ease, Flash, lerp, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { HawkShadowSim, SimEvent } from './sim.ts';

const ROW = 40;
const CIRCLE = { x: 180, y: 300, r: 115 };

interface Tuft {
  x: number;
  dy: number;
  s: number;
  kind: 0 | 1 | 2;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
  big: boolean;
}

export class HawkShadowRenderer {
  private seen = 0;
  private rows = new Map<number, Tuft[]>();
  private popups: Popup[] = [];
  private leave: { born: number; x: number; y: number; dir: number; strike: boolean } | null = null;
  private readonly shake = new Shake();
  private readonly flash = new Flash();

  constructor(
    private readonly sim: HawkShadowSim,
    private readonly strings: Strings,
  ) {}

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const my = sim.config.mouse.screenY;
    this.consumeEvents(v);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.fillStyle = colors.field;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    this.drawGrass(ctx);
    for (const s of sim.seeds) {
      const y = my - (s.d - sim.distance);
      if (y > -20 && y < v.height + 20) this.drawSeed(ctx, s.x, y);
    }
    if (sim.survived) this.drawBurrow(ctx, sim.x, my - 40);

    const warn = sim.warning;
    if (!sim.caught) this.drawMouse(ctx, v);
    this.drawShadow(ctx, v, warn);
    if (warn > 0 && !sim.caught) this.drawReticle(ctx, sim.x, my, warn);

    drawVignette(ctx, v.width, v.height, clamp((warn - 0.3) / 0.7, 0, 1) * 0.8, colors.danger, sim.x, my);
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
    const my = sim.config.mouse.screenY;
    for (; this.seen < sim.events.length; this.seen++) {
      const e = sim.events[this.seen] as SimEvent;
      if (e.type === 'close') {
        this.popups.push({
          text: `${this.strings.t('fx.close')} +${e.points}`,
          x: sim.x,
          y: my - 70,
          color: colors.close,
          born: v.time,
          big: true,
        });
        this.flash.trigger(v.time, '255,255,255', 0.2);
        this.shake.trigger(v.time, 5, 0.2);
      } else if (e.type === 'safe') {
        this.popups.push({
          text: this.strings.t('fx.safe'),
          x: sim.x,
          y: my - 70,
          color: colors.safe,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'feint') {
        this.popups.push({
          text: this.strings.t('fx.feint'),
          x: 180,
          y: 200,
          color: colors.feint,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'seed') {
        this.popups.push({ text: `+${e.points}`, x: e.x, y: my - 40, color: colors.close, born: v.time, big: false });
      } else if (e.type === 'caught') {
        this.flash.trigger(v.time, colors.danger, 0.45);
        this.shake.trigger(v.time, 14, 0.5);
      } else if (e.type === 'home') {
        this.popups.push({
          text: this.strings.t('fx.home'),
          x: 180,
          y: 260,
          color: colors.close,
          born: v.time,
          big: true,
        });
        this.flash.trigger(v.time, '255,240,200', 0.6);
      }
      if (e.type === 'strike' || e.type === 'feint') {
        this.leave = { born: v.time, x: sim.x, y: my, dir: e.index % 2 ? 1 : -1, strike: e.type === 'strike' };
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 0.9);
  }

  private tuftsFor(row: number): Tuft[] {
    let t = this.rows.get(row);
    if (!t) {
      const rng = createRng(`${this.sim.seed}:grass:${row}`);
      t = Array.from({ length: 5 }, () => ({
        x: rng.range(0, 360),
        dy: rng.range(0, ROW),
        s: rng.range(0.7, 1.4),
        kind: rng.int(0, 9) === 0 ? 2 : rng.int(0, 1) === 0 ? 0 : 1,
      })) as Tuft[];
      this.rows.set(row, t);
      if (this.rows.size > 64) this.rows.delete(this.rows.keys().next().value as number);
    }
    return t;
  }

  private drawGrass(ctx: CanvasRenderingContext2D): void {
    const { sim } = this;
    const my = sim.config.mouse.screenY;
    const first = Math.floor((sim.distance - 220) / ROW);
    const last = Math.floor((sim.distance + my + 40) / ROW);
    for (let row = first; row <= last; row++) {
      for (const t of this.tuftsFor(row)) {
        const y = my - (row * ROW + t.dy - sim.distance);
        if (t.kind === 2) {
          ctx.fillStyle = colors.flower;
          ctx.beginPath();
          ctx.arc(t.x, y, 3 * t.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colors.flowerY;
          ctx.beginPath();
          ctx.arc(t.x, y, 1.4 * t.s, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.strokeStyle = t.kind === 0 ? colors.tuftDark : colors.tuftLight;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (const dx of [-5, 0, 5]) {
          ctx.moveTo(t.x + dx * t.s, y);
          ctx.lineTo(t.x + dx * 1.8 * t.s, y - 12 * t.s);
        }
        ctx.stroke();
      }
    }
  }

  private drawSeed(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = colors.seed;
    ctx.strokeStyle = colors.seedEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 9, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawBurrow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = colors.burrow;
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMouse(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const x = sim.x;
    const y = sim.config.mouse.screenY;
    const running = sim.moving;
    const t = v.reducedMotion ? 0 : v.time;
    const stride = running ? Math.sin(t * 28) : 0;
    ctx.save();
    ctx.translate(x, y);
    // Tail.
    ctx.strokeStyle = colors.ear;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.quadraticCurveTo(10 * (running ? Math.sin(t * 14) : 0.4), 30, 4, 42);
    ctx.stroke();
    // Feet.
    ctx.fillStyle = colors.ear;
    for (const [fx, fy, ph] of [
      [-9, -6, 1],
      [9, -6, -1],
      [-9, 10, -1],
      [9, 10, 1],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(fx, fy + stride * 4 * ph, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body: long while running, round and low when frozen.
    ctx.fillStyle = colors.mouse;
    ctx.beginPath();
    ctx.ellipse(0, 2, running ? 11 : 13, running ? 18 : 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.mouseDark;
    ctx.beginPath();
    ctx.ellipse(0, -14, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears: up when running, flat when frozen.
    ctx.fillStyle = colors.ear;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (running) ctx.arc(s * 7, -19, 5.5, 0, Math.PI * 2);
      else ctx.ellipse(s * 9, -13, 6, 3, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors.eye;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 3.5, -18, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!running) {
      // Frozen: hunkered down in tall grass.
      ctx.strokeStyle = colors.tuftLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const dx of [-16, -9, -2, 5, 12, 18]) {
        ctx.moveTo(x + dx, y + 16);
        ctx.lineTo(x + dx * 1.3, y - 6);
      }
      ctx.stroke();
    }
  }

  private shadowPose(
    v: RenderView,
    warn: number,
  ): { x: number; y: number; scale: number; alpha: number; angle: number } | null {
    const { sim } = this;
    const my = sim.config.mouse.screenY;
    const orbit = sim.time * 0.9;
    const cx = CIRCLE.x + Math.cos(orbit) * CIRCLE.r;
    const cy = CIRCLE.y + Math.sin(orbit) * CIRCLE.r * 0.6;
    const angle = orbit + Math.PI / 2;
    if (this.leave) {
      const t = (v.time - this.leave.born) / 0.7;
      if (t < 1) {
        return {
          x: this.leave.x + this.leave.dir * t * 260,
          y: this.leave.y - t * 380,
          scale: lerp(1, 1.9, t),
          alpha: lerp(0.6, 0.1, t),
          angle: -Math.PI / 2 + this.leave.dir * 0.6,
        };
      }
      this.leave = null;
    }
    if (sim.caught) return { x: sim.x, y: my, scale: 1, alpha: 0.8, angle: -Math.PI / 2 };
    const k = ease.inQuad(warn);
    return {
      x: lerp(cx, sim.x, k),
      y: lerp(cy, my, k),
      scale: lerp(1.7, 1, k),
      alpha: lerp(0.34, 0.78, k),
      angle: lerp(angle, -Math.PI / 2, k),
    };
  }

  /** Bird silhouette (wings spread) as a ground shadow; solid when it has you. */
  private drawShadow(ctx: CanvasRenderingContext2D, v: RenderView, warn: number): void {
    const p = this.shadowPose(v, warn);
    if (!p) return;
    // A real strike: the hawk itself swoops through low and fast (solid), before its shadow climbs away.
    const swoop = this.leave?.strike ? (v.time - this.leave.born) / 0.22 : 2;
    const flap = v.reducedMotion ? 0 : Math.sin(v.time * (warn > 0 ? 10 : 4)) * 0.15;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);
    ctx.scale(p.scale * 1.4, p.scale * 1.4);
    ctx.fillStyle = this.sim.caught || swoop < 1 ? colors.hawk : `rgba(${colors.shadow},${p.alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -22); // beak
    ctx.quadraticCurveTo(7, -12, 6, -4);
    ctx.lineTo(44, -8 + flap * 30); // right wing tip
    ctx.quadraticCurveTo(26, 4, 8, 6);
    ctx.lineTo(10, 20); // tail
    ctx.lineTo(0, 16);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-8, 6);
    ctx.quadraticCurveTo(-26, 4, -44, -8 + flap * 30); // left wing tip
    ctx.lineTo(-6, -4);
    ctx.quadraticCurveTo(-7, -12, 0, -22);
    ctx.fill();
    ctx.restore();
  }

  /** Shrinking target ring on the mouse; dashed once the strike is imminent. */
  private drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, warn: number): void {
    const r = lerp(80, 24, warn);
    ctx.strokeStyle = warn > 0.65 ? `rgb(${colors.danger})` : colors.reticle;
    ctx.globalAlpha = 0.4 + 0.6 * warn;
    ctx.lineWidth = warn > 0.65 ? 4 : 3;
    ctx.setLineDash(warn > 0.65 ? [8, 6] : []);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    for (const p of this.popups) {
      const t = (v.time - p.born) / 0.9;
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawText(ctx, p.text, clamp(p.x, 90, 270), p.y - (v.reducedMotion ? 0 : t * 24), {
        size: p.big ? 24 : 20,
        color: p.color,
      });
    }
    ctx.globalAlpha = 1;
  }

  /** Wordless tutorial: press-and-hold ring on the mouse and an arrow pointing up the field. */
  private drawHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const x = this.sim.x;
    const y = this.sim.config.mouse.screenY;
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 5) + 1) / 2;
    ctx.strokeStyle = colors.text;
    ctx.fillStyle = colors.text;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y + 70, 18 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 70, 10, 0, Math.PI * 2);
    ctx.fill();
    const ay = y - 60 - pulse * 16;
    ctx.beginPath();
    ctx.moveTo(x, ay - 18);
    ctx.lineTo(x + 16, ay + 4);
    ctx.lineTo(x - 16, ay + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 5, ay + 4, 10, 18);
  }
}
