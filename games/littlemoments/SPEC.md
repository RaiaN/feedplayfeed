# Little Moments: SPEC

Research basis: `docs/research/2026-09-29-couples-conflict.md` (bids for connection; turning toward 86% vs 33%).

| Field | Value |
|---|---|
| Slug / working name | `littlemoments` / Little Moments |
| Template | score-attack (the round ends early if the couple drift apart) |
| Target channels, in order | fbinstant (couples and friends share) → devvit → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | Your partner keeps reaching out. Catch every moment, not your phone. |
| First 3 seconds | Two people on a couch under a warm lamp. A round speech bubble pops up (with a pulsing tap ring) next to a buzzing square phone. Tap the bubble: hearts fly to the couple and they lean in. |
| Core loop (verbs) | spot the bid → tap it (turn toward) → ignore the phone → keep the streak |
| Controls | One thumb: tap round bubbles. Leave square phones alone. |
| Round length | 45 s ("a day"), or until the bank empties |
| Seed use | Both: daily seed; challenge links replay the same moments (the spawn schedule depends only on seed and time) |
| Share moment | "I turned toward 91% of the little moments. Couples who last do 86%." A research benchmark people want to compare themselves against. |
| Retention hook | A new day of moments daily, best per seed, the 86% "couples who last" line; a partner-vs-partner challenge |
| Difficulty curve | Spawns every 0.85 s → 0.36 s; bid life 1.9 s → 1.0 s; phone share 15% → 38%; bank drain 3 → 6 per second |
| Monetization hooks (later) | Cosmetic couch and room themes; no pay-to-win |
| Art direction | Warm, intimate, frantic. Dusk room `#2a1d3d` → `#4b2f4f`, a lamp glow, two gender-neutral figures (blue `#56b4e9` and orange `#e69f00`), cream bubbles with pink icons, dark phones with a blue glow |
| Audio | Procedural: soft bubble pop, a toward chime that climbs in pitch with the streak, a big-moment chord, a soft falling tone on a miss, a double buzz on a phone tap, a heartbeat when the bank runs low |
| Accessibility | Round bubbles vs square phones (shape, not colour); the countdown ring becomes dashed in the just-in-time window. Reduced motion removes buzz, pulse and floating hearts. Text ≥20 logical px. |
| Likely age rating | PEGI 3-style: everyday affection only (hearts, a lean-in), no romance or sexual content |
| Name/IP check | Pending (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 6% (the % stat is built to be shared), median session ≥ 90 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Psychology → mechanic
| Finding | Mechanic |
|---|---|
| Bids are small, frequent attempts at connection | A rapid stream of small bubbles with everyday icons (heart, sunset, coffee, question, song, star) |
| Turning toward vs away; 86% (couples still married at 6 years) vs 33% (divorced) | Tap = turn toward; a missed bid counts against. A live gauge with 33% (✕) and 86% (♥) markers |
| Distraction as turning away | Square phone notifications: tapping one is turning away (penalty, streak reset). Ignoring it earns a little |
| Emotional bank account | The bank drains as life gets busy; turning toward refills it. The couple lean in or drift apart and a shared heart fills or empties |
| Vulnerable bids matter most | Big bids (double ring) are worth more and fade faster |

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 45 | Length of the "day" |
| `bank.start` / `max` | 55 / 100 | Starting closeness |
| `bank.toward` / `bigToward` / `missed` / `distracted` | +5 / +10 / −9 / −12 | Deposits and withdrawals |
| `bank.drainStart` → `drainEnd` | 3 → 6 per s | Life gets busy |
| `bids.intervalStart` → `intervalEnd` | 0.85 → 0.36 s | Spawn rate ramp |
| `bids.lifeStart` → `lifeEnd` | 1.9 → 1.0 s | How long a moment waits |
| `bids.bigChance` / `bigLifeScale` | 0.15 / 0.75 | Big (vulnerable) bids |
| `distractions.chanceStart` → `chanceEnd` | 0.15 → 0.38 | Phone traps |
| `scoring.toward` / `big` / `justInTime` / `justInTimeFrac` | 50 / 120 / +50 / last 30% | Points (× multiplier) |
| `scoring.streakPerLevel` / `maxMultiplier` | 4 / 5 | Multiplier +1 every 4 toward in a row |
| `benchmarks.masters` / `disasters` | 86 / 33 | Research markers on the gauge |
