// Flood Line drawing. The water level IS your heart rate. Visual-only state lives here, never in the sim.
import { clamp, drawText, drawVignette, Flash, FONT_STACK, lerp, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import { colors } from './palette.ts';
import type { FloodLineSim, Item, Kind, SimEvent } from './sim.ts';

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
  big: boolean;
}

interface Returned {
  x: number;
  y: number;
  born: number;
}

export class FloodLineRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private returned: Returned[] = [];
  private seenFlood = false;
  private readonly shake = new Shake();
  private readonly flash = new Flash();

  constructor(
    private readonly sim: FloodLineSim,
    private readonly strings: Strings,
  ) {}

  /** Screen y of the water surface for a heart rate. */
  private waterY(bpm: number): number {
    const h = this.sim.config.heart;
    return lerp(640, 170, clamp((bpm - 60) / (h.max - 60), 0, 1));
  }

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const you = sim.config.you;
    this.consumeEvents(v);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    const g = ctx.createLinearGradient(0, 0, 0, v.height);
    g.addColorStop(0, colors.wallTop);
    g.addColorStop(1, colors.wallBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, 0, v.width + 40, v.height);

    this.drawPerson(ctx, sim.config.partner.x, sim.config.partner.y, colors.partner, colors.skin2, v, false);
    this.drawPerson(ctx, you.x, you.y, colors.you, colors.skin, v, sim.overwhelmed);
    if (sim.breathing) this.drawBreath(ctx, v);

    this.drawWater(ctx, v);
    for (const it of sim.items) this.drawItem(ctx, it.kind, it.x, it.y, 20, v);
    this.drawReturned(ctx, v);

    if (sim.flooded || sim.overwhelmed) {
      // Tunnel vision: while flooded you can't take in the whole picture.
      drawVignette(ctx, v.width, v.height, sim.overwhelmed ? 0.95 : 0.8, '6,10,16', you.x, you.y - 60);
      if (!sim.breathing && !sim.overwhelmed) this.drawHoldHint(ctx, v);
    }
    this.drawPopups(ctx, v);
    if (v.idle) this.drawTapHint(ctx, v);
    ctx.restore();

    this.drawHud(ctx);
    this.flash.draw(ctx, v.width, v.height, v.time, v.reducedMotion);
  }

  private consumeEvents(v: RenderView): void {
    const { sim } = this;
    const you = sim.config.you;
    for (; this.seen < sim.events.length; this.seen++) {
      const e = sim.events[this.seen] as SimEvent;
      if (e.type === 'antidote') {
        this.popups.push({
          text: `${this.strings.t(`antidote.${e.kind}`)} +${e.points}`,
          x: e.x,
          y: e.y - 34,
          color: e.close ? colors.gold : colors.good,
          born: v.time,
          big: e.close,
        });
        this.returned.push({ x: e.x, y: e.y, born: v.time });
      } else if (e.type === 'repair') {
        this.popups.push({
          text: `${this.strings.t('fx.repair')} +${e.points}`,
          x: e.x,
          y: e.y - 34,
          color: colors.good,
          born: v.time,
          big: true,
        });
        this.returned.push({ x: e.x, y: e.y, born: v.time });
      } else if (e.type === 'hit') {
        this.shake.trigger(v.time, 7, 0.25);
      } else if (e.type === 'missedRepair') {
        this.popups.push({
          text: this.strings.t('fx.missedRepair'),
          x: you.x,
          y: you.y - 80,
          color: colors.miss,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'flooded') {
        this.popups.push({
          text: this.strings.t('fx.flooded'),
          x: 180,
          y: 300,
          color: colors.text,
          born: v.time,
          big: true,
        });
        this.seenFlood = true;
      } else if (e.type === 'calm') {
        this.popups.push({
          text: this.strings.t('fx.calm'),
          x: 180,
          y: 300,
          color: colors.good,
          born: v.time,
          big: false,
        });
      } else if (e.type === 'gentle') {
        this.popups.push({
          text: this.strings.t('fx.gentle'),
          x: 180,
          y: 250,
          color: colors.gold,
          born: v.time,
          big: true,
        });
        this.flash.trigger(v.time, '240,228,66', 0.3);
      } else if (e.type === 'overwhelmed') {
        this.flash.trigger(v.time, '200,215,230', 0.5);
      } else if (e.type === 'finish') {
        if (e.master)
          this.popups.push({
            text: this.strings.t('fx.master'),
            x: 180,
            y: 250,
            color: colors.gold,
            born: v.time,
            big: true,
          });
        this.flash.trigger(v.time, '255,240,200', 0.6);
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 1.1);
    this.returned = this.returned.filter((r) => v.time - r.born < 0.7);
  }

  private drawPerson(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    body: string,
    skin: string,
    v: RenderView,
    slumped: boolean,
  ): void {
    const bob = v.reducedMotion ? 0 : Math.sin(v.time * 2.2 + x) * 1.2;
    const sy = slumped ? 16 : 0;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y + 26 + sy, 26, 32 - sy / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x, y - 16 + bob + sy, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWater(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const h = sim.config.heart;
    const y = this.waterY(sim.bpm);
    const t = v.reducedMotion ? 0 : v.time;
    ctx.fillStyle = `rgba(${colors.water},${sim.flooded ? 0.55 : 0.4})`;
    ctx.beginPath();
    ctx.moveTo(-20, 660);
    for (let x = -20; x <= v.width + 20; x += 12)
      ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 2.4) * (sim.breathing ? 1.5 : 4));
    ctx.lineTo(v.width + 20, 660);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.waterTop;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -20; x <= v.width + 20; x += 12)
      ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 2.4) * (sim.breathing ? 1.5 : 4));
    ctx.stroke();
    // The flood line.
    const fy = this.waterY(h.flood);
    ctx.strokeStyle = colors.floodLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(v.width, fy);
    ctx.stroke();
    ctx.setLineDash([]);
    drawText(ctx, this.strings.t('hud.bpm', { bpm: h.flood }), v.width - 8, fy - 14, {
      size: 20,
      color: colors.floodLine,
      align: 'right',
      outline: 'rgba(10,16,24,0.8)',
    });
  }

  /** Breathing guide: a ring that grows and shrinks on a slow 4 s cycle around you. */
  private drawBreath(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const you = this.sim.config.you;
    const k = v.reducedMotion ? 0.5 : (Math.sin((v.time * Math.PI * 2) / 4) + 1) / 2;
    ctx.strokeStyle = 'rgba(232,244,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(you.x, you.y, 50 + k * 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(86,180,233,0.08)';
    ctx.fillRect(0, 0, 360, 640);
  }

  private drawItem(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, v: RenderView): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,16,24,0.9)';
    switch (kind) {
      case 'criticism': {
        // Thorn ball: pointed, aimed at the person.
        const spin = v.reducedMotion ? 0 : v.time * 3;
        ctx.fillStyle = colors.criticism;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const rr = i % 2 === 0 ? r : r * 0.55;
          const a = spin + (i * Math.PI) / 8;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'contempt': {
        // Rolling eye: pupil pinned to the top.
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.contempt;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = colors.contempt;
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'defensiveness': {
        // Shield.
        ctx.fillStyle = colors.defensiveness;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.9, -r * 0.6);
        ctx.quadraticCurveTo(r * 0.8, r * 0.5, 0, r);
        ctx.quadraticCurveTo(-r * 0.8, r * 0.5, -r * 0.9, -r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(0, r * 0.7);
        ctx.stroke();
        break;
      }
      case 'stonewalling': {
        // Brick wall block.
        ctx.fillStyle = colors.stonewalling;
        ctx.fillRect(-r, -r * 0.75, r * 2, r * 1.5);
        ctx.strokeRect(-r, -r * 0.75, r * 2, r * 1.5);
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r * 0.75);
        ctx.lineTo(0, 0);
        ctx.moveTo(-r * 0.5, 0);
        ctx.lineTo(-r * 0.5, r * 0.75);
        ctx.moveTo(r * 0.5, 0);
        ctx.lineTo(r * 0.5, r * 0.75);
        ctx.stroke();
        break;
      }
      default: {
        // Repair attempt: heart with a plaster.
        ctx.fillStyle = colors.repair;
        heartPath(ctx, 0, 2, r);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.rotate(-0.6);
        ctx.fillStyle = '#fff4e0';
        ctx.fillRect(-r * 0.6, -r * 0.18, r * 1.2, r * 0.36);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /** Answered barbs and accepted repairs float back to the partner as small hearts. */
  private drawReturned(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const p = this.sim.config.partner;
    for (const r of this.returned) {
      const t = (v.time - r.born) / 0.7;
      const k = v.reducedMotion ? 1 : t;
      ctx.globalAlpha = 1 - t * 0.7;
      ctx.fillStyle = colors.good;
      heartPath(ctx, lerp(r.x, p.x, k), lerp(r.y, p.y + 20, k), 9);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    this.popups.forEach((p, i) => {
      const stack = this.popups.slice(0, i).filter((q) => Math.abs(q.born - p.born) < 0.15).length;
      const t = (v.time - p.born) / 1.1;
      const size = p.big ? 22 : 20;
      ctx.font = `bold ${size}px ${FONT_STACK}`;
      const half = Math.min(170, ctx.measureText(p.text).width / 2 + 6);
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawText(
        ctx,
        p.text,
        clamp(p.x, half, v.width - half),
        clamp(p.y - stack * 28, 110, 580) - (v.reducedMotion ? 0 : t * 20),
        {
          size,
          color: p.color,
          outline: 'rgba(10,16,24,0.85)',
          maxWidth: v.width - 12,
        },
      );
    });
    ctx.globalAlpha = 1;
  }

  private drawTapHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    let target: Item | undefined;
    for (const it of this.sim.items) if (!target || it.y > target.y) target = it;
    if (!target) return;
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 6) + 1) / 2;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(target.x + 22, target.y + 30, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Wordless "press and hold" hint while flooded: a thumb dot with slow expanding rings. */
  private drawHoldHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const you = this.sim.config.you;
    const x = you.x;
    const y = you.y + 80;
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      const k = v.reducedMotion ? 0.5 + i * 0.3 : (v.time * 0.8 + i * 0.5) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(x, y, 16 + k * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!this.seenFlood) return;
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const { sim } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(8, 596, 344, 38);
    const hot = sim.bpm >= sim.config.heart.flood;
    ctx.fillStyle = hot ? '#d55e00' : '#ff8fa3';
    heartPath(ctx, 28, 616, 10);
    ctx.fill();
    drawText(ctx, this.strings.t('hud.bpm', { bpm: Math.round(sim.bpm) }), 46, 616, {
      size: 22,
      color: colors.text,
      align: 'left',
    });
    const ratio = sim.ratio;
    drawText(ctx, this.strings.t('hud.ratio', { ratio: ratio.toFixed(1) }), 344, 616, {
      size: 22,
      color: ratio >= sim.config.scoring.masterRatio ? colors.gold : colors.text,
      align: 'right',
    });
  }
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
