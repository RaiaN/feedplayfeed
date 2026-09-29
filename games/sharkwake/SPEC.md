# Shark Wake: SPEC

| Field | Value |
|---|---|
| Slug / working name | `sharkwake` / Shark Wake |
| Template | score-attack (chase: the round ends early on a wipeout) |
| Target channels, in order | devvit → fbinstant → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | A fin is closing in. Dodge, ride waves, reach shore. |
| First 3 seconds | A surfer on a yellow board with a dark fin cutting a white wake right behind. Rocks and logs ahead; pulsing left and right tap targets. A tap switches lanes and the first rock slides past. |
| Core loop (verbs) | read the row → tap left/right → near-miss or ride a wave → keep the fin back |
| Controls | One thumb: tap the left half or right half of the screen to move one lane |
| Round length | 60 s to shore, or until the fin reaches you |
| Seed use | Both: daily seed; challenge links replay the same sea |
| Share moment | "A fin chased me 1,762 m: 30 near misses." Distance plus near misses. |
| Retention hook | Daily sea, best per seed, the shore as the goal; Devvit leaderboard later |
| Difficulty curve | Speed 230 → 360 px/s; rows closer together (250 → 165 px); double-blocked rows 0% → 55%; the fin closes 7 → 15 px/s. Wave pads (+24 gap) and near misses (+10) keep you ahead; hits cost 45. |
| Monetization hooks (later) | Rewarded "second board" (one revive); cosmetic boards and wetsuits |
| Art direction | Bright, fast, readable. Sea blues `#0b4f7c` → `#1473a8`, yellow board `#f0e442`, grey rocks, brown logs, white chevron wave pads, a dark fin `#2d3440` with a white V wake. No bite imagery: a wipeout is a splash and a flash. |
| Audio | Procedural: lane-switch swish, near-miss chime, wave whoosh, hit thud, a heartbeat that speeds up as the fin closes, a shore chord. |
| Accessibility | Obstacles differ by shape (jagged rock vs long log) and all have a foam ring; boosts are chevrons; the fin's distance is its position on screen. Reduced motion removes sway, splash and shake. Text ≥20 logical px. |
| Likely age rating | PEGI 7 / ESRB E10+-ish ("mild frightening scenes": a chasing fin and a racing heartbeat). No gore; being caught is non-violent. Confirm during store/portal submission. |
| Name/IP check | Pending (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 5%, median session ≥ 120 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 60 | Seconds to shore |
| `surfer.lanes` / `laneSpeed` / `hitHalfWidth` | 80,180,280 / 1100 / 34 | Lane layout and switch speed |
| `speed.start` → `end` | 230 → 360 px/s | Scroll speed ramp |
| `speed.slowFactor` / `slowSeconds` | 0.55 / 0.6 s | Slowdown after a hit |
| `fin.startGap` / `maxGap` | 130 / 145 | Fin distance at the start and its cap |
| `fin.closeStart` → `closeEnd` | 7 → 15 px/s | Fin pressure ramp |
| `fin.hitPenalty` | 45 | Gap lost per hit |
| `rows.spacingStart` → `spacingEnd` | 250 → 165 px | Obstacle density |
| `rows.doubleChanceEnd` / `boostChance` | 0.55 / 0.5 | Two-lane blocks and wave pads |
| `scoring.nearMiss` / `nearMissWindow` / `nearMissGap` | 100 / 0.35 s / 10 | Late-dodge reward |
| `scoring.boost` / `boostGap` | 25 / 24 | Wave pad reward |
| `scoring.pxPerPoint` / `shoreBonus` / `maxMultiplier` | 10 / 300 / 5 | Distance points, finish bonus, multiplier cap |
