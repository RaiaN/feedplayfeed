// Little Moments drawing. Visual-only state (popups, hearts, lean) lives here, never in the sim.
import { clamp, drawText, Flash, FONT_STACK, lerp, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { LittleMomentsSim, Moment, SimEvent } from './sim.ts';

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
  big: boolean;
}

interface Heart {
  x: number;
  y: number;
  born: number;
}

const COUCH_Y = 560;

export class LittleMomentsRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private hearts: Heart[] = [];
  private glowAt = -10;
  private lean = 0.55;
  private readonly shake = new Shake();
  private readonly flash = new Flash();

  constructor(
    private readonly sim: LittleMomentsSim,
    private readonly strings: Strings,
  ) {}

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    this.consumeEvents(v);
    // Ease the couple's closeness toward the bank level so it reads as body language, not a meter.
    this.lean = lerp(this.lean, sim.closeness, v.reducedMotion ? 1 : 0.08);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    const g = ctx.createLinearGradient(0, 0, 0, v.height);
    g.addColorStop(0, colors.roomTop);
    g.addColorStop(1, colors.roomBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    const lamp = ctx.createRadialGradient(180, COUCH_Y - 40, 10, 180, COUCH_Y - 40, 260);
    lamp.addColorStop(0, `rgba(${colors.lamp},${0.1 + 0.25 * this.lean})`);
    lamp.addColorStop(1, `rgba(${colors.lamp},0)`);
    ctx.fillStyle = lamp;
    ctx.fillRect(-20, 0, v.width + 40, v.height);

    this.drawCouple(ctx, v);
    for (const m of sim.moments) {
      if (m.kind === 'phone') this.drawPhone(ctx, m, v);
      else this.drawBid(ctx, m, v);
    }
    this.drawHearts(ctx, v);
    this.drawPopups(ctx, v);
    if (v.idle) this.drawHint(ctx, v);
    ctx.restore();

    this.drawGauge(ctx);
    this.flash.draw(ctx, v.width, v.height, v.time, v.reducedMotion);
  }

  private consumeEvents(v: RenderView): void {
    const { sim } = this;
    for (; this.seen < sim.events.length; this.seen++) {
      const e = sim.events[this.seen] as SimEvent;
      if (e.type === 'toward') {
        const label = e.big
          ? this.strings.t('fx.big')
          : e.justInTime
            ? this.strings.t('fx.jit')
            : this.strings.t('fx.toward');
        this.popups.push({
          text: `${label} +${e.points}`,
          x: e.x,
          y: e.y - 40,
          color: e.justInTime || e.big ? colors.jit : colors.toward,
          born: v.time,
          big: e.big || e.justInTime,
        });
        for (let i = 0; i < (e.big ? 5 : 2); i++)
          this.hearts.push({ x: e.x + (i - 1) * 10, y: e.y, born: v.time + i * 0.06 });
      } else if (e.type === 'missed') {
        this.popups.push({
          text: this.strings.t('fx.missed'),
          x: e.x,
          y: e.y - 30,
          color: colors.missed,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'away') {
        this.popups.push({
          text: this.strings.t('fx.away'),
          x: e.x,
          y: e.y - 40,
          color: colors.away,
          born: v.time,
          big: true,
        });
        this.glowAt = v.time;
        this.shake.trigger(v.time, 5, 0.2);
      } else if (e.type === 'drifted') {
        this.popups.push({
          text: this.strings.t('fx.drift'),
          x: 180,
          y: 300,
          color: colors.missed,
          born: v.time,
          big: true,
        });
        this.flash.trigger(v.time, '200,190,220', 0.5);
      } else if (e.type === 'finish') {
        this.flash.trigger(v.time, '255,230,190', 0.6);
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 0.9);
    this.hearts = this.hearts.filter((h) => v.time - h.born < 1.1);
  }

  /** Two figures on a couch: the gap between them is the emotional bank account. */
  private drawCouple(ctx: CanvasRenderingContext2D, v: RenderView): void {
    ctx.fillStyle = colors.couchDark;
    ctx.fillRect(60, COUCH_Y - 10, 240, 50);
    ctx.fillStyle = colors.couch;
    ctx.fillRect(50, COUCH_Y + 10, 260, 34);
    ctx.fillRect(44, COUCH_Y - 4, 22, 50);
    ctx.fillRect(294, COUCH_Y - 4, 22, 50);

    const gap = lerp(92, 14, clamp(this.lean, 0, 1));
    const drifted = this.sim.drifted;
    const tilt = drifted ? -0.35 : lerp(0, 0.28, this.lean);
    const breathe = v.reducedMotion ? 0 : Math.sin(v.time * 2) * 1.5;
    const glow = clamp(1 - (v.time - this.glowAt) / 0.8, 0, 1);
    this.drawPerson(ctx, 180 - gap / 2 - 18, COUCH_Y - 30 + breathe, colors.you, colors.skin, tilt, glow);
    this.drawPerson(ctx, 180 + gap / 2 + 18, COUCH_Y - 30 - breathe, colors.partner, colors.skin2, -tilt, 0);
    // Shared heart above them fills with the bank.
    const hx = 180;
    const hy = COUCH_Y - 110;
    this.heartPath(ctx, hx, hy, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.save();
    this.heartPath(ctx, hx, hy, 18);
    ctx.clip();
    const fill = clamp(this.sim.closeness, 0, 1);
    ctx.fillStyle = colors.heart;
    ctx.fillRect(hx - 20, hy + 16 - 36 * fill, 40, 36 * fill);
    ctx.restore();
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    this.heartPath(ctx, hx, hy, 18);
    ctx.stroke();
  }

  private drawPerson(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    body: string,
    skin: string,
    tilt: number,
    glow: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 18, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -18, 15, 0, Math.PI * 2);
    ctx.fill();
    if (glow > 0) {
      // Phone glow on the face: turned away.
      ctx.fillStyle = `rgba(143,179,255,${0.7 * glow})`;
      ctx.beginPath();
      ctx.arc(0, -18, 17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.closePath();
  }

  private drawBid(ctx: CanvasRenderingContext2D, m: Moment, v: RenderView): void {
    const big = m.kind === 'big';
    const r = big ? 32 : 26;
    const k = m.age / m.life;
    const late = k >= 1 - this.sim.config.scoring.justInTimeFrac;
    const pop = v.reducedMotion || v.idle ? 1 : Math.min(1, m.age / 0.12);
    const pulse = late && !v.reducedMotion ? 1 + Math.sin(v.time * 24) * 0.05 : 1;
    const rr = r * pop * pulse;
    // Tail toward the partner (a bid comes from them).
    const px = 220;
    const py = COUCH_Y - 60;
    const a = Math.atan2(py - m.y, px - m.x);
    ctx.fillStyle = colors.bubble;
    ctx.beginPath();
    ctx.moveTo(m.x + Math.cos(a - 0.35) * rr, m.y + Math.sin(a - 0.35) * rr);
    ctx.lineTo(m.x + Math.cos(a) * (rr + 12), m.y + Math.sin(a) * (rr + 12));
    ctx.lineTo(m.x + Math.cos(a + 0.35) * rr, m.y + Math.sin(a + 0.35) * rr);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x, m.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.bubbleEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Countdown ring: solid while early, dashed + orange in the just-in-time window.
    ctx.strokeStyle = late ? colors.ringLate : colors.ring;
    ctx.lineWidth = big ? 6 : 5;
    ctx.setLineDash(late ? [7, 5] : []);
    ctx.beginPath();
    ctx.arc(m.x, m.y, rr + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k));
    ctx.stroke();
    ctx.setLineDash([]);
    if (big) {
      ctx.strokeStyle = colors.jit;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, rr + 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.drawIcon(ctx, m.icon, m.x, m.y, rr * 0.55);
  }

  /** Six bid icons: heart, sun, cup, question, note, star. */
  private drawIcon(ctx: CanvasRenderingContext2D, icon: number, x: number, y: number, s: number): void {
    ctx.fillStyle = colors.icon;
    ctx.strokeStyle = colors.icon;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    switch (icon) {
      case 0:
        this.heartPath(ctx, x, y + 2, s * 0.8);
        ctx.fill();
        break;
      case 1:
        ctx.beginPath();
        ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * s * 0.65, y + Math.sin(a) * s * 0.65);
          ctx.lineTo(x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95);
          ctx.stroke();
        }
        break;
      case 2:
        ctx.fillRect(x - s * 0.55, y - s * 0.4, s * 0.9, s * 0.9);
        ctx.beginPath();
        ctx.arc(x + s * 0.45, y + s * 0.05, s * 0.28, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        break;
      case 3:
        ctx.font = `bold ${Math.round(s * 1.7)}px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x, y + 1);
        break;
      case 4:
        ctx.beginPath();
        ctx.ellipse(x - s * 0.25, y + s * 0.45, s * 0.3, s * 0.22, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.03, y + s * 0.45);
        ctx.lineTo(x + s * 0.03, y - s * 0.7);
        ctx.lineTo(x + s * 0.55, y - s * 0.45);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? s : s * 0.45;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
    }
  }

  private drawPhone(ctx: CanvasRenderingContext2D, m: Moment, v: RenderView): void {
    const buzz = v.reducedMotion ? 0 : Math.sin(v.time * 60) * 2;
    const x = m.x + buzz;
    const y = m.y;
    ctx.fillStyle = colors.phone;
    ctx.beginPath();
    ctx.roundRect(x - 22, y - 30, 44, 60, 7);
    ctx.fill();
    ctx.fillStyle = colors.phoneGlow;
    ctx.fillRect(x - 17, y - 23, 34, 42);
    // Notification badge icon (bell / envelope / play).
    ctx.fillStyle = colors.phone;
    if (m.icon % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 6);
      ctx.quadraticCurveTo(x - 9, y - 12, x, y - 12);
      ctx.quadraticCurveTo(x + 9, y - 12, x + 9, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 3, y + 7, 6, 4);
    } else if (m.icon % 3 === 1) {
      ctx.fillRect(x - 11, y - 8, 22, 15);
      ctx.strokeStyle = colors.phoneGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 8);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + 11, y - 8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 10);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x - 7, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    if (!v.reducedMotion) {
      ctx.strokeStyle = colors.phoneGlow;
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 28, y - 8);
        ctx.lineTo(x + s * 32, y);
        ctx.lineTo(x + s * 28, y + 8);
        ctx.stroke();
      }
    }
  }

  private drawHearts(ctx: CanvasRenderingContext2D, v: RenderView): void {
    for (const h of this.hearts) {
      const t = (v.time - h.born) / 1.1;
      if (t < 0) continue;
      const k = v.reducedMotion ? 1 : t;
      const x = lerp(h.x, 180, k);
      const y = lerp(h.y, COUCH_Y - 110, k);
      ctx.globalAlpha = 1 - t * 0.6;
      ctx.fillStyle = colors.heart;
      this.heartPath(ctx, x, y, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    for (const p of this.popups) {
      const t = (v.time - p.born) / 0.9;
      const size = p.big ? 22 : 20;
      ctx.font = `bold ${size}px ${FONT_STACK}`;
      const half = Math.min(170, ctx.measureText(p.text).width / 2 + 6);
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawText(ctx, p.text, clamp(p.x, half, v.width - half), clamp(p.y, 110, 600) - (v.reducedMotion ? 0 : t * 24), {
        size,
        color: p.color,
        outline: 'rgba(30,18,44,0.85)',
        maxWidth: v.width - 12,
      });
    }
    ctx.globalAlpha = 1;
  }

  /** Wordless tutorial: pulsing ring + fingertip on the first bid. */
  private drawHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const bid = this.sim.moments.find((m) => m.kind !== 'phone');
    if (!bid) return;
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 6) + 1) / 2;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bid.x, bid.y, 44 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(bid.x + 26, bid.y + 36, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  /** "Turned toward" gauge with research markers at 33% and 86%. */
  private drawGauge(ctx: CanvasRenderingContext2D): void {
    const { sim } = this;
    const pct = sim.towardPct;
    const x = 110;
    const y = 610;
    const w = 230;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(8, 596, 344, 38);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle =
      pct >= sim.config.benchmarks.masters
        ? colors.toward
        : pct <= sim.config.benchmarks.disasters
          ? colors.missed
          : colors.ringLate;
    ctx.fillRect(x, y, (w * pct) / 100, 12);
    for (const [b, shape] of [
      [sim.config.benchmarks.disasters, 'x'],
      [sim.config.benchmarks.masters, 'heart'],
    ] as const) {
      const bx = x + (w * b) / 100;
      ctx.fillStyle = colors.text;
      ctx.fillRect(bx - 1, y - 6, 2, 24);
      if (shape === 'heart') {
        this.heartPath(ctx, bx, y - 12, 6);
        ctx.fillStyle = colors.heart;
        ctx.fill();
      } else {
        ctx.strokeStyle = colors.missed;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 4, y - 16);
        ctx.lineTo(bx + 4, y - 8);
        ctx.moveTo(bx + 4, y - 16);
        ctx.lineTo(bx - 4, y - 8);
        ctx.stroke();
      }
    }
    drawText(ctx, this.strings.t('hud.toward', { pct }), 16, 616, { size: 22, color: colors.text, align: 'left' });
  }
}
