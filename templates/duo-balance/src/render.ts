// Duo-balance drawing: the couple on a seesaw (tilt = imbalance), their meters, the moment card and the two
// answers, plus the best-case / worst-case end scenes. Visual-only state lives here, never in the sim.
import { clamp, drawText, drawVignette, Flash, FONT_STACK, lerp, Shake, type Strings } from '@feedplay/engine';
import type { RenderView } from '@feedplay/template-score-attack';
import type { DuoSim, SimEvent } from './sim.ts';
import type { Who } from './types.ts';

export interface DuoPalette {
  bgTop: string;
  bgBottom: string;
  prop: string;
  propDark: string;
  accent: string;
}

export const PEOPLE: Record<Who, { body: string; skin: string; x: number }> = {
  ari: { body: '#56b4e9', skin: '#f1d3b3', x: 0 },
  jo: { body: '#e69f00', skin: '#c68b59', x: 0 },
};

const GOOD = '#009e73';
const BAD = '#d55e00';
const PIVOT = { x: 180, y: 300 };
const PLANK = 250;
const CARD_Y = 340;
const BTN_Y = 452;
const BTN_H = 104;

interface Popup {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  maxWidth: number,
  maxLines = 3,
): string[] {
  ctx.font = `bold ${size}px ${FONT_STACK}`;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

export class DuoRenderer {
  private seen = 0;
  private popups: Popup[] = [];
  private tilt = 0;
  private lastChoice: { side: 'l' | 'r'; good: boolean; born: number } | null = null;
  private readonly shake = new Shake();
  private readonly flash = new Flash();

  constructor(
    private readonly sim: DuoSim,
    private readonly strings: Strings,
    private readonly palette: DuoPalette,
    private readonly drawProps: (ctx: CanvasRenderingContext2D, v: RenderView) => void,
  ) {}

  private name(who: Who): string {
    return this.strings.t(`name.${who}`);
  }

  private endsOf(tilt: number): Record<Who, { x: number; y: number }> {
    const a = tilt;
    const dx = (Math.cos(a) * PLANK) / 2;
    const dy = (Math.sin(a) * PLANK) / 2;
    // Ari on the left rises when the tilt is positive.
    return { ari: { x: PIVOT.x - dx, y: PIVOT.y - dy }, jo: { x: PIVOT.x + dx, y: PIVOT.y + dy } };
  }

  render(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    this.consumeEvents(v);
    const target = clamp(sim.diff / 100, -1, 1) * 0.34;
    this.tilt = v.reducedMotion ? target : lerp(this.tilt, target, 0.12);
    const off = this.shake.offset(v.time, v.reducedMotion);
    ctx.save();
    ctx.translate(off.x, off.y);

    const g = ctx.createLinearGradient(0, 0, 0, v.height);
    g.addColorStop(0, this.palette.bgTop);
    g.addColorStop(1, this.palette.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, 0, v.width + 40, v.height);
    this.drawProps(ctx, v);

    if (sim.ended) {
      this.drawEndScene(ctx, v);
    } else {
      this.drawMeters(ctx, v);
      this.drawSeesaw(ctx, v);
      if (sim.card?.climax) drawVignette(ctx, v.width, v.height, 0.6, '0,0,0', 180, 260);
      this.drawCard(ctx, v);
      if (v.idle) this.drawHint(ctx, v);
      this.drawHud(ctx);
    }
    this.drawPopups(ctx, v);
    ctx.restore();
    this.flash.draw(ctx, v.width, v.height, v.time, v.reducedMotion);
  }

  private consumeEvents(v: RenderView): void {
    const { sim } = this;
    for (; this.seen < sim.events.length; this.seen++) {
      const e = sim.events[this.seen] as SimEvent;
      const ends = this.endsOf(this.tilt);
      if (e.type === 'choice') {
        const good = e.option.delta > 0;
        const p = ends[e.option.who];
        this.popups.push({
          text: `${this.strings.t(`tag.${e.option.tag}`)} ${good ? '▲' : '▼'}`,
          x: p.x,
          y: p.y - 110,
          color: good ? GOOD : BAD,
          born: v.time,
        });
        this.lastChoice = { side: e.side, good, born: v.time };
        if (!good) this.shake.trigger(v.time, 5, 0.2);
      } else if (e.type === 'timeout') {
        const p = ends[e.who];
        this.popups.push({ text: this.strings.t('fx.silence'), x: p.x, y: p.y - 110, color: BAD, born: v.time });
      } else if (e.type === 'end') {
        this.flash.trigger(v.time, e.outcome === 'best' ? '255,236,200' : '160,170,190', 0.6);
        if (e.outcome !== 'best') this.shake.trigger(v.time, 8, 0.4);
      }
    }
    this.popups = this.popups.filter((p) => v.time - p.born < 1.1);
  }

  private drawMeters(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const max = sim.config.meters.max;
    for (const who of ['ari', 'jo'] as const) {
      const left = who === 'ari';
      const val = sim.meters[who] / max;
      const x0 = left ? 58 : 190;
      const w = 112;
      const y = 104;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x0, y, w, 16);
      const low = val < 0.25;
      const blink = low && !v.reducedMotion && Math.sin(v.time * 14) < 0;
      ctx.fillStyle = blink ? BAD : PEOPLE[who].body;
      // Ari's bar grows toward the middle from the left; Jo's from the right.
      if (left) ctx.fillRect(x0 + w * (1 - val), y, w * val, 16);
      else ctx.fillRect(x0, y, w * val, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, y, w, 16);
      this.drawFace(ctx, left ? 34 : 326, 112, 16, who, val, v);
    }
    // Balance pivot between the bars.
    const d = clamp(this.sim.diff / 100, -1, 1);
    const warn = Math.abs(this.sim.diff) >= this.sim.config.balance.tipAt;
    ctx.strokeStyle = warn ? BAD : '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180 - 9 * Math.cos(d * 0.6), 112 + 9 * Math.sin(d * 0.6));
    ctx.lineTo(180 + 9 * Math.cos(d * 0.6), 112 - 9 * Math.sin(d * 0.6));
    ctx.stroke();
  }

  private drawFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    who: Who,
    level: number,
    v: RenderView,
  ): void {
    ctx.fillStyle = PEOPLE[who].skin;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PEOPLE[who].body;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Mouth: smile when feeling loved, flat in the middle, frown when low.
    const curve = clamp((level - 0.45) * 2, -1, 1) * r * 0.35;
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.35);
    ctx.quadraticCurveTo(x, y + r * 0.35 + curve, x + r * 0.4, y + r * 0.35);
    ctx.stroke();
    if (level < 0.25) {
      // Tear / sweat drop.
      const drop = v.reducedMotion ? 0 : (v.time * 0.8) % 1;
      ctx.fillStyle = '#8fd3ff';
      ctx.beginPath();
      ctx.arc(x + r * 0.55, y + r * 0.1 + drop * r * 0.6, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSeesaw(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const warn = Math.abs(sim.diff) >= sim.config.balance.tipAt;
    const wobble = warn && !v.reducedMotion ? Math.sin(v.time * 30) * 0.02 : 0;
    const t = this.tilt + wobble;
    const ends = this.endsOf(t);
    // Pivot.
    ctx.fillStyle = this.palette.propDark;
    ctx.beginPath();
    ctx.moveTo(PIVOT.x, PIVOT.y);
    ctx.lineTo(PIVOT.x - 26, PIVOT.y + 34);
    ctx.lineTo(PIVOT.x + 26, PIVOT.y + 34);
    ctx.closePath();
    ctx.fill();
    // Plank.
    ctx.strokeStyle = warn ? BAD : this.palette.accent;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.setLineDash(warn ? [18, 10] : []);
    ctx.beginPath();
    ctx.moveTo(ends.ari.x, ends.ari.y);
    ctx.lineTo(ends.jo.x, ends.jo.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const who of ['ari', 'jo'] as const) {
      const p = ends[who];
      // Stand a little inboard of the plank end.
      const x = lerp(p.x, PIVOT.x, 0.12);
      const y = lerp(p.y, PIVOT.y, 0.12);
      const speaking = sim.card?.def.speaker === who;
      this.drawPerson(ctx, x, y, who, sim.meters[who] / sim.config.meters.max, speaking, v);
    }
  }

  private drawPerson(
    ctx: CanvasRenderingContext2D,
    x: number,
    footY: number,
    who: Who,
    level: number,
    speaking: boolean,
    v: RenderView,
  ): void {
    const bob = v.reducedMotion ? 0 : Math.sin(v.time * 2.5 + (who === 'ari' ? 0 : 1.7)) * 1.5;
    const slump = level < 0.25 ? 8 : 0;
    ctx.fillStyle = PEOPLE[who].body;
    ctx.beginPath();
    ctx.ellipse(x, footY - 34 + slump / 2, 22, 30 - slump / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    this.drawFace(ctx, x, footY - 80 + bob + slump, 19, who, level, v);
    drawText(ctx, this.name(who), x, footY - 34, { size: 20, color: '#10151c' });
    if (speaking) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const up = v.reducedMotion ? 0 : Math.max(0, Math.sin(v.time * 8 - i)) * 3;
        ctx.beginPath();
        ctx.arc(x - 10 + i * 10, footY - 118 - up, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCard(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const card = sim.card;
    if (!card) return;
    const speaker = card.def.speaker;
    const ends = this.endsOf(this.tilt);
    const climax = card.climax;
    // Speech card with a tail toward the speaker.
    ctx.fillStyle = '#fff8ec';
    ctx.strokeStyle = climax ? '#f0e442' : PEOPLE[speaker].body;
    ctx.lineWidth = climax ? 5 : 4;
    ctx.beginPath();
    ctx.roundRect(14, CARD_Y, 332, 92, 16);
    ctx.fill();
    ctx.stroke();
    const tx = clamp(ends[speaker].x, 60, 300);
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.moveTo(tx - 12, CARD_Y + 2);
    ctx.lineTo(tx, CARD_Y - 16);
    ctx.lineTo(tx + 12, CARD_Y + 2);
    ctx.fill();
    const prompt = `${this.name(speaker)}: ${this.strings.t(`card.${card.def.id}`)}`;
    const lines = wrapText(ctx, prompt, 21, 308, 3);
    const top = CARD_Y + 46 - ((lines.length - 1) * 25) / 2;
    lines.forEach((l, i) => drawText(ctx, l, 180, top + i * 25, { size: 21, color: '#1b1b2a' }));

    // Timer bar: solid, then dashed and orange in the just-in-time window.
    const k = clamp(card.age / card.timer, 0, 1);
    const late = k >= 1 - sim.config.scoring.justInTimeFrac;
    ctx.strokeStyle = late ? '#e69f00' : '#009e73';
    ctx.lineWidth = 6;
    ctx.setLineDash(late ? [10, 6] : []);
    ctx.beginPath();
    ctx.moveTo(20, CARD_Y + 100);
    ctx.lineTo(20 + 320 * (1 - k), CARD_Y + 100);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const side of ['l', 'r'] as const) {
      const o = sim.shown(side)!;
      const x = side === 'l' ? 10 : 184;
      const w = 166;
      const pressed = this.lastChoice && this.lastChoice.side === side && v.time - this.lastChoice.born < 0.15;
      ctx.fillStyle = pressed ? '#ffffff' : 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = PEOPLE[o.who].body;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x, BTN_Y, w, BTN_H, 14);
      ctx.fill();
      ctx.stroke();
      // Who this answer affects (not which way: that's the skill).
      ctx.fillStyle = PEOPLE[o.who].body;
      ctx.beginPath();
      ctx.roundRect(x + 8, BTN_Y + 7, 64, 28, 14);
      ctx.fill();
      drawText(ctx, this.name(o.who), x + 40, BTN_Y + 22, { size: 20, color: '#10151c' });
      const text = this.strings.t(sim.shownKey(side));
      const tl = wrapText(ctx, text, 20, w - 16, 2);
      tl.forEach((l, i) =>
        drawText(ctx, l, x + w / 2, BTN_Y + 58 + i * 24 - (tl.length - 1) * 6, { size: 20, color: '#1b1b2a' }),
      );
    }
  }

  private drawHint(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const pulse = v.reducedMotion ? 0.5 : (Math.sin(v.time * 6) + 1) / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (const x of [93, 267]) {
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      ctx.beginPath();
      ctx.arc(x, BTN_Y + BTN_H + 26, 12 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawText(ctx, this.strings.t('situation.title'), 180, 80, {
      size: 24,
      color: '#ffffff',
      outline: 'rgba(0,0,0,0.6)',
    });
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(8, 598, 344, 36);
    drawText(ctx, this.strings.t('hud.balanced', { pct: this.sim.balancedPct }), 180, 616, {
      size: 20,
      color: '#ffffff',
    });
  }

  /** Best case: together, warm. Worst case: apart, grey, a closed door between them. */
  private drawEndScene(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const { sim } = this;
    const best = sim.outcome === 'best';
    const t = clamp(sim.endedFor / 0.8, 0, 1);
    const k = v.reducedMotion ? 1 : t;
    if (best) {
      const glow = ctx.createRadialGradient(180, 300, 10, 180, 300, 240);
      glow.addColorStop(0, 'rgba(255,214,150,0.45)');
      glow.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 360, 640);
      this.drawPerson(ctx, lerp(110, 158, k), 380, 'ari', 0.9, false, v);
      this.drawPerson(ctx, lerp(250, 202, k), 380, 'jo', 0.9, false, v);
      ctx.fillStyle = BAD;
      for (let i = 0; i < 3; i++) {
        const y = 250 - (v.reducedMotion ? 0 : (v.time * 30 + i * 20) % 50);
        heart(ctx, 160 + i * 20, y, 8);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(20,24,32,0.55)';
      ctx.fillRect(0, 0, 360, 640);
      // A closed door between them.
      ctx.fillStyle = '#4b4f58';
      ctx.fillRect(160, 190, 40, 200);
      ctx.fillStyle = '#9aa0aa';
      ctx.beginPath();
      ctx.arc(192, 295, 4, 0, Math.PI * 2);
      ctx.fill();
      this.drawPerson(ctx, lerp(120, 70, k), 380, 'ari', sim.meters.ari / sim.config.meters.max, false, v);
      this.drawPerson(ctx, lerp(240, 290, k), 380, 'jo', sim.meters.jo / sim.config.meters.max, false, v);
    }
    const lines = wrapText(ctx, this.strings.t(best ? 'scene.best' : 'scene.worst'), 22, 320, 3);
    lines.forEach((l, i) =>
      drawText(ctx, l, 180, 450 + i * 28, { size: 22, color: '#ffffff', outline: 'rgba(0,0,0,0.7)' }),
    );
  }

  private drawPopups(ctx: CanvasRenderingContext2D, v: RenderView): void {
    this.popups.forEach((p, i) => {
      // Stack labels that would overlap (quick answers in a row).
      const stack = this.popups.slice(0, i).filter((q) => Math.abs(q.x - p.x) < 140 && p.born - q.born < 0.8).length;
      const t = (v.time - p.born) / 1.1;
      ctx.font = `bold 20px ${FONT_STACK}`;
      const half = Math.min(170, ctx.measureText(p.text).width / 2 + 6);
      ctx.globalAlpha = v.reducedMotion ? 1 : 1 - t * t;
      drawText(
        ctx,
        p.text,
        clamp(p.x, half, 360 - half),
        clamp(p.y + stack * 26, 150, 330) - (v.reducedMotion ? 0 : t * 18),
        {
          size: 20,
          color: p.color,
          outline: 'rgba(255,255,255,0.9)',
        },
      );
    });
    ctx.globalAlpha = 1;
  }
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
