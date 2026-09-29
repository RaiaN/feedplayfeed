import type { CardDef, DuoConfig, Situation } from './types.ts';

export function validateDuoConfig(c: DuoConfig): DuoConfig {
  const errors: string[] = [];
  if (c.roundSeconds < 30 || c.roundSeconds > 90) errors.push('roundSeconds must be 30–90');
  if (!(c.meters.start > 0 && c.meters.start <= c.meters.max)) errors.push('meters.start');
  if (!(c.cards.timerEnd > 0 && c.cards.timerStart >= c.cards.timerEnd)) errors.push('card timer ramp');
  if (!(c.balance.tipAt > c.balance.balancedWithin)) errors.push('balance.tipAt must exceed balancedWithin');
  if (errors.length) throw new Error(`game.config.json: ${errors.join('; ')}`);
  return c;
}

/** Every text key a situation needs. Games test that strings.json defines all of them. */
export function situationStringKeys(s: Situation): string[] {
  const all: CardDef[] = [...s.cards, s.climax];
  const tags = new Set(all.flatMap((c) => [c.left.tag, c.right.tag]));
  return [
    ...all.flatMap((c) => [`card.${c.id}`, `card.${c.id}.l`, `card.${c.id}.r`]),
    ...[...tags].map((t) => `tag.${t}`),
    'scene.best',
    'scene.worst',
    'situation.title',
  ];
}

export function validateSituation(s: Situation): Situation {
  const errors: string[] = [];
  if (s.cards.length < 8) errors.push('at least 8 cards');
  if (!(s.climaxAt > 0.2 && s.climaxAt < 0.95)) errors.push('climaxAt 0.2–0.95');
  const ids = new Set<string>();
  for (const c of [...s.cards, s.climax]) {
    if (ids.has(c.id)) errors.push(`duplicate card id ${c.id}`);
    ids.add(c.id);
    for (const o of [c.left, c.right]) if (o.delta === 0 || Math.abs(o.delta) > 30) errors.push(`${c.id}: delta 1–30`);
  }
  if (errors.length) throw new Error(`situation ${s.id}: ${errors.join('; ')}`);
  return s;
}
