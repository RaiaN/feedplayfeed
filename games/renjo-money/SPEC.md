# Ren & Jo: Money Talk: SPEC

Part of the **Ren & Jo** series. Shared rules, characters and research are in `docs/series/ren-and-jo.md`. Card content is in `situation.json` (effects) and `strings.json` (text).

| Field | Value |
|---|---|
| Slug / working name | `renjo-money` / Ren & Jo: Money Talk |
| Template | duo-balance (on score-attack): the round ends early on the worst case |
| Target channels, in order | fbinstant (couples tag each other) → devvit → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | Two people, one hard day. Keep them both loved. |
| First 3 seconds | Ren and Jo on a seesaw with a speech card: "Jo: …" and two big answer buttons, each tagged with whose heart it touches. The first card's positive answer is on the left; a tap moves a meter and the seesaw levels. |
| Core loop (verbs) | read → pick left/right → watch who rises or falls → keep both up and level |
| Controls | One thumb: tap the left or right half (answer buttons) |
| Round length | 60 s, or earlier on the worst case |
| Seed use | Both: daily seed; challenge links replay the same cards in the same layout |
| Share moment | "I kept Ren & Jo 83% in balance through Money Talk." |
| Retention hook | A new situation each release (series), a daily deck order, best per seed |
| Difficulty curve | Card timer 4.2 → 2.2 s; meter drain 0.9 → 2.2 per second; mixed card kinds; the climax card at 62% |
| Monetization hooks (later) | Situation packs; cosmetic outfits for Ren & Jo |
| Art direction | Warm, readable, human. Stylised gender-neutral couple (blue Ren, orange Jo) on a seesaw, cream speech cards, situation props. All text ≥ 20 logical px. |
| Audio | Procedural: a card tick, a positive chime climbing with the streak, a dull thud on negatives, a low tone on silence, two soft notes for the climax, a heartbeat when a partner runs low, a best/worst chord |
| Accessibility | Each partner has a colour *and* a name label *and* a side; answers show a name chip; tipping shows a dashed wobbling plank. Reduced motion stops bob, wobble and drifting labels. |
| Likely age rating | PEGI 3–7 style: everyday relationship stress, no romance or sexual content |
| Name/IP check | Pending: "Ren & Jo" and the situation title (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 6%, median session ≥ 120 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Emotional arc
- **Climax:** Ren: "Money scares me. My family lost everything once."
- **Worst case:** Nobody wins; the card is cancelled, the silence isn't.
- **Best case:** Two jars on the shelf, TRIP and HOUSE.

## Known risk
Text-based cards bend the "playable in 3 s without reading" rule. Mitigations: short prompts (≤ 8 words), answers ≤ 4 words, name chips, a first card with an obvious warm answer, and generous early timers. Measure first-input time and early exits in the playtest.

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 60 | Situation length |
| `meters.start` / `max` | 60 / 100 | Starting "feels loved" |
| `meters.drainStart` → `drainEnd` | 0.9 → 2.2 per s | Situation stress |
| `meters.timeout` | −10 | Silence stonewalls the speaker |
| `cards.timerStart` → `timerEnd` / `gap` / `climaxTimer` | 4.2 → 2.2 s / 0.3 s / 4.5 s | Decision pressure |
| `balance.tipAt` / `tipSeconds` / `balancedWithin` | 45 / 2.5 s / 15 | One-sided rule and balance zone |
| `scoring.*` | see file | Positive answer 100 × streak multiplier (×2 on climax), just in time +50, 20/s while balanced, finish +300 |
