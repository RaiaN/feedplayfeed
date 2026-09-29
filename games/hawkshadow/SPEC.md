# Hawk Shadow: SPEC

| Field | Value |
|---|---|
| Slug / working name | `hawkshadow` / Hawk Shadow |
| Template | score-attack (survival: the round ends early when caught) |
| Target channels, in order | devvit → fbinstant → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | A hawk is hunting you. Run. Freeze. Run again. |
| First 3 seconds | A field mouse in open grass with a big hawk shadow already circling. A pulsing thumb ring and an up-arrow sit under the mouse. Holding runs; at about 2 s the shadow dives, a reticle tightens on the mouse, and you let go. |
| Core loop (verbs) | hold (run and steer) → watch the shadow → release (freeze) at the last moment → run again |
| Controls | One thumb: hold to run, and the mouse drifts toward your thumb's x. Release to freeze and hide. |
| Round length | 60 s to the burrow, or until caught |
| Seed use | Both: daily seed; challenge links replay the same field and dive timings |
| Share moment | "I ran 665 m under a hunting hawk: 12 last-second freezes." Distance plus close calls. |
| Retention hook | Daily field, best per seed, reaching the burrow; Devvit leaderboard later |
| Difficulty curve | Dives every 3.0 s → 1.45 s (±0.35 s), with the warning shrinking from 1.3 s to 0.6 s. Feints (the hawk pulls up) ramp from 0% to 25%, which punishes panicked early freezes by costing distance. |
| Monetization hooks (later) | Rewarded "second burrow" (one revive); cosmetic mouse fur |
| Art direction | Bright, open and exposed. Field `#4e7f34`, grass tufts, gold seeds `#e69f00`, soft brown mouse with pink ears, and a dark bird silhouette as the shadow. When the hawk strikes it is a solid silhouette: no talons shown, no injury. |
| Audio | Procedural: a screech when a dive starts, a heartbeat that speeds up with the warning, a whoosh on the strike, a close-call chime, seed ticks, a home chord. |
| Accessibility | The warning shows as the shadow's position, size and darkness plus a shrinking reticle that turns dashed; red is only a secondary cue. Reduced motion removes shake, flap and bob. Text ≥20 logical px. |
| Likely age rating | PEGI 7 / ESRB E10+-ish ("mild frightening scenes": a diving predator and a racing heartbeat). No gore; being caught is non-violent. Confirm during store/portal submission. |
| Name/IP check | Pending (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 5%, median session ≥ 120 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 60 | Seconds to the burrow |
| `mouse.runSpeed` / `steerSpeed` | 140 / 420 px/s | Forward and sideways speed while held |
| `hawk.firstDive` | 2.4 s | The first strike, inside the first clip seconds |
| `hawk.intervalStart` → `intervalEnd` (± `jitter`) | 3.0 → 1.45 s (±0.35) | Dive rhythm |
| `hawk.warnStart` → `warnEnd` | 1.3 → 0.6 s | Telegraph length |
| `hawk.strikeWindow` | 0.22 s | Moving inside it means caught |
| `hawk.feintChanceEnd` | 0.25 | Share of dives that pull up by the end of the round |
| `seeds.spacingMin` / `spacingMax` / `pickRadius` | 70 / 150 / 26 | Seed trail |
| `scoring.pxPerPoint` / `seed` / `closeCall` / `homeBonus` | 10 / 30 / 100 / 300 | Points (seed and close call are × multiplier) |
| `scoring.closeCallWindow` | 0.3 s | Freezing this close to a real strike counts as a close call |
| `scoring.maxMultiplier` | 5 | +1 per close call |
