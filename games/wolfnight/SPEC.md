# Wolf Night: SPEC

| Field | Value |
|---|---|
| Slug / working name | `wolfnight` / Wolf Night |
| Template | score-attack (survival: the round ends early when caught) |
| Target channels, in order | devvit → fbinstant → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | Wolves close in on your lantern. Flash them back until dawn. |
| First 3 seconds | Dark woods, a girl in a blue cloak inside a small circle of lantern light, and three pairs of glowing eyes already creeping in. A pulsing tap ring sits on the nearest eyes. One tap flashes a cone of light and the wolf bolts back. |
| Core loop (verbs) | spot eyes → tap (flash) → wolf retreats → refuel on fireflies → survive |
| Controls | One thumb: tap toward a wolf (a cone of about 50°). Tap a firefly to collect it. |
| Round length | 60 s to dawn, or until caught (the bot median is about 50 s) |
| Seed use | Both: daily UTC seed; challenge links replay the same wolves |
| Share moment | "I lasted 57s … 38 close calls". Seconds survived plus close calls, and "Same night, same wolves. Beat me." |
| Retention hook | Daily night (new wolves every day), best per seed, dawn as a visible goal; Devvit leaderboard later |
| Difficulty curve | Wolves spawn every 1.9 s → 0.65 s, move 40 → 85 px/s, and number up to 9 at once. Oil drains, so light radius and flashes are scarce. |
| Monetization hooks (later) | Rewarded "second lantern" (one revive); cosmetic cloaks and lanterns |
| Art direction | Tense, moody, readable. Near-black woods `#05080d`, warm lantern light, amber eyes `#ffb000`, blue cloak `#0072b2`, yellow lantern and UI `#f0e442`. Top-down vector shapes with no assets. Wolves are stylised silhouettes: no teeth, no blood. |
| Audio | Procedural: a heartbeat that speeds up as wolves close in, a flash whoosh, a rising close-call chime, a firefly twinkle, a low growl on spawn, a dawn chord. Sound starts after the first tap; mute persists. |
| Accessibility | The danger cue is shape and motion (eyes, closing dark, pulsing heartbeat), not colour alone. Reduced motion removes shake, bobbing and blinking, and softens flashes. Text ≥20 logical px. |
| Name/IP check | Pending (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 5%, median session ≥ 120 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 60 | Seconds to dawn (30–90) |
| `girl.catchRadius` | 24 | A wolf this close catches her |
| `lantern.minRadius` / `maxRadius` | 64 / 150 | Light radius at empty / full oil |
| `lantern.drainPerSecond` / `flashCost` | 0.01 / 0.05 | Oil economy |
| `lantern.flashConeDeg` / `flashRange` / `cooldown` | 50 / 360 / 0.2 | Flash shape and spam limit |
| `wolves.startCount` | 3 | Wolves visible in the first frame |
| `wolves.spawnStart` → `spawnEnd` | 1.9 → 0.65 s | Spawn interval ramp |
| `wolves.speedStart` → `speedEnd` | 40 → 85 px/s | Approach speed ramp |
| `wolves.pushBack` / `stun` / `max` | 170 / 0.6 s / 9 | Flash effect and crowding |
| `fireflies.every` / `life` / `oil` | 4 s / 4.5 s / 0.28 | Refuel economy |
| `scoring.closeCallRadius` | 80 | Flashing a wolf inside this is a close call |
| `scoring.push` / `closeCall` / `firefly` / `perSecond` / `dawnBonus` | 10 / 50 / 20 / 10 / 300 | Points (push, close call and firefly are × multiplier) |
| `scoring.maxMultiplier` | 5 | +1 per close call; reset by a flash that hits nothing |
