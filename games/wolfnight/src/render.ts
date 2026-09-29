// Wolf Night drawing. Visual-only state (popups, flash cone, shake) lives here, never in the sim.
import { clamp, createRng, drawText, drawVignette, Flash, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { SimEvent, WolfNightSim } from './sim.ts';

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
  big: boolean;
}

interface Tree {
  x: number;
  y: number;
  r: number;
}

export class WolfNightRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private cone: { angle: number; born: number; hit: boolean } | null = null;
  private readonly shake = new Shake();
  private readonly flash = new Flash();
  private readonly trees: Tree[];

  constructor(
    private readonly sim: WolfNightSim,
    private readonly strings: Strings,
  ) {
    // Scenery comes from its own RNG stream so it never shifts the gameplay sequence.
    const rng = createRng(sim.seed).fork('trees');
    this.trees = [];
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-20, 380);
      const y = rng.range(90, 660);
      if (Math.hypot(x - sim.config.girl.x, y - sim.config.girl.y) < 120) continue;
      this.trees.push({ x, y, r: rng.range(18, 42) });
    }
  }

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const g = sim.config.girl;
    this.consumeEvents(v);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    const R = sim.lightRadius;
    const dawn = clamp((sim.time - (sim.config.roundSeconds - 12)) / 12, 0, 1);

    // Ground and trees (hidden by the darkness overlay except inside the lantern light).
    ctx.fillStyle = colors.floor;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    const lit = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, R * 1.2);
    lit.addColorStop(0, colors.floorLit);
    lit.addColorStop(1, colors.floor);
    ctx.fillStyle = lit;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    for (const t of this.trees) {
      ctx.fillStyle = Math.hypot(t.x - g.x, t.y - g.y) < R + t.r ? colors.canopyLit : colors.canopy;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wolf bodies: only readable inside the light.
    for (const w of sim.wolves) this.drawWolfBody(ctx, w.x, w.y);
    this.drawGirl(ctx, v);

    // Darkness with a hole of lantern light; it thins out at dawn.
    const dark = 0.94 - 0.4 * dawn;
    const gd = ctx.createRadialGradient(g.x, g.y, R * 0.55, g.x, g.y, R * 1.25);
    gd.addColorStop(0, `rgba(3,5,10,0)`);
    gd.addColorStop(1, `rgba(3,5,10,${dark})`);
    ctx.fillStyle = gd;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    const warm = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, R);
    warm.addColorStop(0, `rgba(${colors.light},0.22)`);
    warm.addColorStop(1, `rgba(${colors.light},0)`);
    ctx.fillStyle = warm;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    if (dawn > 0) {
      ctx.fillStyle = `rgba(255,170,110,${0.12 * dawn})`;
      ctx.fillRect(-20, 0, v.width + 40, v.height);
    }

    this.drawCone(ctx, v);
    for (const f of sim.fireflies) this.drawFirefly(ctx, f.x, f.y, f.life, v);
    for (const w of sim.wolves) this.drawEyes(ctx, w, v);

    // Danger: red-tinted edges tighten as the nearest wolf closes in.
    const threat = clamp((sim.danger - 0.45) / 0.55, 0, 1);
    drawVignette(ctx, v.width, v.height, threat * 0.85, colors.danger, g.x, g.y);
    this.drawPopups(ctx, v);
    if (v.idle) this.drawHint(ctx, v);
    ctx.restore();

    this.drawOil(ctx, v);
    this.flash.draw(ctx, v.width, v.height, v.time, v.reducedMotion);
  }

  private consumeEvents(v: RenderView): void {
    const ev = this.sim.events;
    for (; this.seen < ev.length; this.seen++) {
      const e = ev[this.seen] as SimEvent;
      if (e.type === 'flash') this.cone = { angle: e.angle, born: v.time, hit: true };
      else if (e.type === 'miss') this.cone = { angle: e.angle, born: v.time, hit: false };
      else if (e.type === 'push') {
        const text = e.close ? `${this.strings.t('fx.close')} +${e.points}` : `+${e.points}`;
        this.popups.push({
          text,
          x: e.x,
          y: e.y - 24,
          color: e.close ? colors.close : colors.back,
          born: v.time,
          big: e.close,
        });
        if (e.close) this.shake.trigger(v.time, 4, 0.15);
      } else if (e.type === 'collect') {
        this.popups.push({
          text: `+${e.points}`,
          x: e.x,
          y: e.y - 20,
          color: colors.firefly,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'caught') {
        this.shake.trigger(v.time, 14, 0.5);
        this.flash.trigger(v.time, colors.danger, 0.5);
      } else if (e.type === 'dawn') {
        this.flash.trigger(v.time, '255,220,170', 0.8);
        this.popups.push({
          text: this.strings.t('fx.dawn'),
          x: 180,
          y: 250,
          color: colors.close,
          born: v.time,
          big: true,
        });
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 0.9);
  }

  private drawWolfBody(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const g = this.sim.config.girl;
    const a = Math.atan2(g.y - y, g.x - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = colors.wolfLit;
    // Legs (mid-stride), drawn under the body.
    for (const [lx, ly] of [
      [-4, -11],
      [-4, 11],
      [-26, -10],
      [-26, 10],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(lx + (ly > 0 ? 3 : -3), ly * 1.25, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(-15, 0, 21, 11, 0, 0, Math.PI * 2); // body
    ctx.fill();
    ctx.beginPath(); // bushy tail
    ctx.moveTo(-33, -4);
    ctx.quadraticCurveTo(-52, -9, -58, 0);
    ctx.quadraticCurveTo(-52, 9, -33, 4);
    ctx.fill();
    ctx.fillStyle = colors.wolf;
    ctx.beginPath(); // ruff / mane
    ctx.ellipse(-2, 0, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.wolfLit;
    ctx.beginPath(); // head + long snout
    ctx.moveTo(-2, -8);
    ctx.lineTo(8, -7);
    ctx.lineTo(20, -2);
    ctx.lineTo(20, 2);
    ctx.lineTo(8, 7);
    ctx.lineTo(-2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // pointed ears
    ctx.moveTo(0, -6);
    ctx.lineTo(-6, -15);
    ctx.lineTo(5, -8);
    ctx.moveTo(0, 6);
    ctx.lineTo(-6, 15);
    ctx.lineTo(5, 8);
    ctx.fill();
    ctx.restore();
  }

  private drawEyes(
    ctx: CanvasRenderingContext2D,
    w: { x: number; y: number; stun: number; retreat: number },
    v: RenderView,
  ): void {
    const g = this.sim.config.girl;
    const a = Math.atan2(g.y - w.y, g.x - w.x);
    // Eyes sit on the head, facing the girl.
    const hx = w.x + Math.cos(a) * 8;
    const hy = w.y + Math.sin(a) * 8;
    const px = -Math.sin(a) * 4.5;
    const py = Math.cos(a) * 4.5;
    const stunned = w.stun > 0 || w.retreat > 0;
    ctx.save();
    if (!v.reducedMotion) {
      ctx.shadowColor = stunned ? colors.eyesStun : colors.eyes;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = stunned ? colors.eyesStun : colors.eyes;
    ctx.strokeStyle = colors.eyesStun;
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      const ex = hx + px * s;
      const ey = hy + py * s;
      if (stunned) {
        ctx.beginPath(); // squint: a short line
        ctx.moveTo(ex - Math.cos(a) * 3, ey - Math.sin(a) * 3);
        ctx.lineTo(ex + Math.cos(a) * 3, ey + Math.sin(a) * 3);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(ex, ey, 3.2, 2.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawGirl(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const g = this.sim.config.girl;
    const caught = this.sim.caught !== null;
    const bob = v.reducedMotion || caught ? 0 : Math.sin(v.time * 3) * 1.2;
    ctx.fillStyle = colors.cloakDark;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 6, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.cloak;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 4 + bob, 11, 0, Math.PI * 2); // hood
    ctx.fill();
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 2 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Lantern, held toward the last flash.
    const a = this.cone?.angle ?? -Math.PI / 2;
    ctx.fillStyle = colors.lantern;
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(a) * 16, g.y + Math.sin(a) * 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCone(ctx: CanvasRenderingContext2D, v: RenderView): void {
    if (!this.cone) return;
    const age = v.time - this.cone.born;
    const life = v.reducedMotion ? 0.12 : 0.22;
    if (age > life) return;
    const g = this.sim.config.girl;
    const half = ((this.sim.config.lantern.flashConeDeg / 2) * Math.PI) / 180;
    const len = this.sim.config.lantern.flashRange;
    const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, len);
    const alpha = (this.cone.hit ? 0.75 : 0.35) * (1 - age / life);
    grad.addColorStop(0, `rgba(255,248,210,${alpha})`);
    grad.addColorStop(1, 'rgba(255,248,210,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, len, this.cone.angle - half, this.cone.angle + half);
    ctx.closePath();
    ctx.fill();
  }

  private drawFirefly(ctx: CanvasRenderingContext2D, x: number, y: number, life: number, v: RenderView): void {
    const blink = life < 1 && !v.reducedMotion ? (Math.sin(v.time * 20) + 1) / 2 : 1;
    const bob = v.reducedMotion ? 0 : Math.sin(v.time * 4 + x) * 3;
    ctx.globalAlpha = 0.35 + 0.65 * blink;
    ctx.strokeStyle = colors.firefly;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + bob, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.firefly;
    ctx.beginPath();
    ctx.arc(x, y + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    for (const p of this.popups) {
      const t = (v.time - p.born) / 0.9;
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      const y = p.y - (v.reducedMotion ? 0 : t * 24);
      drawText(ctx, p.text, clamp(p.x, 80, 280), clamp(y, 110, 590), {
        size: p.big ? 22 : 20,
        color: p.color,
      });
    }
    ctx.globalAlpha = 1;
  }

  /** Wordless tutorial: a pulsing tap ring on the nearest pair of eyes. */
  private drawHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    let target = this.sim.wolves[0];
    for (const w of this.sim.wolves) if (target && this.sim.distance(w) < this.sim.distance(target)) target = w;
    if (!target) return;
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 6) + 1) / 2;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 26 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(target.x + 22, target.y + 30, 9, 0, Math.PI * 2); // fingertip
    ctx.fill();
  }

  /** Oil gauge at the bottom: lantern glyph + bar (blinks when low). */
  private drawOil(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const oil = this.sim.oil;
    const low = oil < 0.25;
    const on = !low || v.reducedMotion || Math.sin(v.time * 12) > 0;
    const x = 70;
    const y = 612;
    const w = 250;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, 14);
    if (on) {
      ctx.fillStyle = low ? colors.oilLow : colors.oil;
      ctx.fillRect(x, y, w * oil, 14);
    }
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 14);
    // Lantern glyph.
    ctx.fillStyle = colors.lantern;
    ctx.fillRect(34, 604, 16, 20);
    ctx.strokeStyle = colors.muted;
    ctx.strokeRect(34, 604, 16, 20);
    ctx.beginPath();
    ctx.arc(42, 603, 6, Math.PI, 0);
    ctx.stroke();
  }
}
