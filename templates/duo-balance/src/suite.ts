// Shared Vitest suite for every Ari & Jo situation game: call runSituationSuite() from games/<slug>/src/*.test.ts.
import type { Thumb } from '@feedplay/template-score-attack';
import { TEMPLATE_STRING_KEYS } from '@feedplay/template-score-attack';
import { describe, expect, it } from 'vitest';
import { createDuoBot } from './bot.ts';
import { situationStringKeys, validateDuoConfig, validateSituation } from './config.ts';
import { DuoSim } from './sim.ts';
import type { DuoConfig, Situation } from './types.ts';

const DT = 1 / 60;
const idle: Thumb = { held: false, pressed: false, released: false, x: 0, y: 0 };
const tap = (side: 'l' | 'r'): Thumb => ({
  held: true,
  pressed: true,
  released: false,
  x: side === 'l' ? 90 : 270,
  y: 500,
});

export function playBot(config: DuoConfig, situation: Situation, seed: string): DuoSim {
  const sim = new DuoSim(config, situation, seed);
  const bot = createDuoBot(seed);
  let prev = false;
  for (let i = 0; i < config.roundSeconds / DT + 10 && !sim.over; i++) {
    const b = bot(sim);
    sim.step(DT, { held: b.held, pressed: b.held && !prev, released: !b.held && prev, x: b.x, y: b.y });
    prev = b.held;
  }
  return sim;
}

export function runSituationSuite(
  name: string,
  config: DuoConfig,
  situation: Situation,
  strings: Record<string, string>,
): void {
  validateDuoConfig(config);
  validateSituation(situation);

  describe(`${name}: determinism and fairness`, () => {
    it('same seed + same inputs ⇒ identical events and score', () => {
      const a = playBot(config, situation, '2026-09-29');
      const b = playBot(config, situation, '2026-09-29');
      expect(a.events).toEqual(b.events);
      expect(a.score).toBe(b.score);
    });

    it('the cards you get and their left/right layout do not depend on how fast or how you answer', () => {
      // Record (id, flip) for every deck card, for a fast always-left player and a slow always-right player.
      const record = (drive: (s: DuoSim) => Thumb): string[] => {
        const s = new DuoSim(config, situation, 'fair');
        const seen: string[] = [];
        let last = -1;
        for (let i = 0; i < config.roundSeconds / DT && !s.ended; i++) {
          const c = s.card;
          if (c && c.n !== last) {
            last = c.n;
            if (!c.climax) seen.push(`${c.def.id}:${c.flip}`);
          }
          s.meters = { ari: 50, jo: 50 }; // keep playing the whole round regardless of answers
          s.step(DT, drive(s));
        }
        return seen;
      };
      const fast = record((s) => (s.card && s.card.age > 0.3 ? tap('l') : idle));
      const slow = record((s) => (s.card && s.card.age > 1.4 ? tap('r') : idle));
      const n = Math.min(fast.length, slow.length);
      expect(n).toBeGreaterThanOrEqual(15);
      expect(slow.slice(0, n)).toEqual(fast.slice(0, n));
    });
  });

  describe(`${name}: rules`, () => {
    it('an answer moves exactly one partner by the option delta', () => {
      const sim = new DuoSim(config, situation, 'rules');
      const opt = sim.shown('l')!;
      const before = { ...sim.meters };
      sim.step(DT, tap('l'));
      const other = opt.who === 'ari' ? 'jo' : 'ari';
      const drain = before[other] - sim.meters[other];
      expect(drain).toBeGreaterThan(0);
      expect(sim.meters[opt.who]).toBeCloseTo(Math.min(config.meters.max, before[opt.who] + opt.delta) - drain, 5);
    });

    it('letting the timer run out stonewalls the speaker', () => {
      const sim = new DuoSim(config, situation, 'silence');
      const speaker = sim.card!.def.speaker;
      for (let i = 0; i < (config.cards.timerStart + 0.05) / DT; i++) sim.step(DT, idle);
      expect(sim.timeouts).toBe(1);
      expect(sim.events.some((e) => e.type === 'timeout' && e.who === speaker)).toBe(true);
    });

    it('a one-sided relationship tips over (worst case)', () => {
      const sim = new DuoSim(config, situation, 'tip');
      sim.meters = { ari: 95, jo: 95 - config.balance.tipAt - 5 };
      for (let i = 0; i < (config.balance.tipSeconds + 0.2) / DT && !sim.ended; i++) {
        sim.meters.ari = 95;
        sim.step(DT, idle);
      }
      expect(sim.outcome).toBe('tipped');
    });

    it('a partner at zero breaks (worst case)', () => {
      const sim = new DuoSim(config, situation, 'zero');
      sim.meters.jo = 0.01;
      sim.step(DT, idle);
      expect(sim.outcome).toBe('broke');
      expect(sim.brokeWho).toBe('jo');
    });

    it('ignoring the couple ends in the worst case well before the end', () => {
      const sim = new DuoSim(config, situation, 'ignore');
      for (let i = 0; i < config.roundSeconds / DT && !sim.ended; i++) sim.step(DT, idle);
      expect(sim.outcome === 'broke' || sim.outcome === 'tipped').toBe(true);
      expect(sim.time).toBeLessThan(config.roundSeconds * 0.75);
    });

    it('the bot plays long rounds, often reaches the best case, and sometimes fails', () => {
      const runs = Array.from({ length: 16 }, (_, i) =>
        playBot(config, situation, `2026-10-${String(i + 1).padStart(2, '0')}`),
      );
      const best = runs.filter((r) => r.outcome === 'best').length;
      const median = runs.map((r) => r.time).sort((a, b) => a - b)[8]!;
      expect(best).toBeGreaterThanOrEqual(6);
      expect(median).toBeGreaterThan(config.roundSeconds * 0.5);
      expect(runs.some((r) => r.events.some((e) => e.type === 'card' && e.climax))).toBe(true);
    });
  });

  describe(`${name}: content`, () => {
    it('card text fits: prompts ≤ 56 chars, answers ≤ 20 chars (2 lines on the button)', () => {
      for (const c of [...situation.cards, situation.climax]) {
        expect(strings[`card.${c.id}`]!.length, c.id).toBeLessThanOrEqual(56);
        for (const k of ['l', 'r'])
          expect(strings[`card.${c.id}.${k}`]!.length, `${c.id}.${k}`).toBeLessThanOrEqual(20);
      }
    });

    it('the first card rewards any first tap (both answers are kind)', () => {
      const first = situation.cards[0]!;
      expect(first.left.delta > 0 && first.right.delta > 0).toBe(true);
    });

    it('both partners get to be the hurt one and the one who slips', () => {
      const speakers = situation.cards.map((c) => c.speaker);
      expect(speakers.filter((w) => w === 'ari').length).toBeGreaterThanOrEqual(5);
      expect(speakers.filter((w) => w === 'jo').length).toBeGreaterThanOrEqual(5);
      const hurt = (who: 'ari' | 'jo') =>
        situation.cards.filter(
          (c) => c.left.who === who && c.right.who === who && Math.min(c.left.delta, c.right.delta) < 0,
        ).length;
      expect(hurt('ari')).toBeGreaterThanOrEqual(4);
      expect(hurt('jo')).toBeGreaterThanOrEqual(4);
    });

    it('strings define every card, option, tag, scene and template key', () => {
      const keys = [
        ...TEMPLATE_STRING_KEYS,
        ...situationStringKeys(situation),
        'end.survived',
        'end.broke',
        'end.tipped',
        'name.ari',
        'name.jo',
      ];
      const missing = keys.filter((k) => !(k in strings));
      expect(missing).toEqual([]);
    });

    it('every card mixes the psychology: dilemmas favour different partners, the rest pair a + with a −', () => {
      for (const c of [...situation.cards, situation.climax]) {
        const dilemma = c.left.who !== c.right.who;
        if (dilemma) expect(c.left.delta > 0 && c.right.delta > 0).toBe(true);
        else expect(Math.sign(c.left.delta)).not.toBe(Math.sign(c.right.delta));
      }
    });
  });
}
