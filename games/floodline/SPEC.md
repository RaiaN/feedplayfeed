# Flood Line: SPEC

Research basis: `docs/research/2026-09-29-couples-conflict.md` ("The Flood" fight, flooding above ~100 bpm, the four horsemen and their antidotes, repair attempts, gentle start-up, 5:1).

| Field | Value |
|---|---|
| Slug / working name | `floodline` / Flood Line |
| Template | score-attack (the round ends early if you're flooded out) |
| Target channels, in order | fbinstant → devvit → portals; Horizon rebuild candidate |
| One-line hook (≤12 words) | Keep your cool: answer every barb before your heart floods. |
| First 3 seconds | Two people facing off across a room. A spiky barb and a shield are already flying at you, with a pulsing tap ring on the nearest. A dashed yellow "100 bpm" flood line sits above the water at your feet. Tap: "Soft reply +40" and a small heart floats back to your partner. |
| Core loop (verbs) | tap barbs (answer with the antidote) → accept repairs → notice flooding → hold to breathe → back in |
| Controls | One thumb: tap to answer or accept; press and hold anywhere empty to take a breather |
| Round length | 60 s, or until your pulse hits 150 (flooded out) |
| Seed use | Both: daily seed; challenge links replay the same argument (spawns depend only on seed and time) |
| Share moment | "I kept my cool at 5.8:1. Stable couples hit 5:1." A research ratio people want to compare |
| Retention hook | Daily argument, best per seed, the 5:1 target, the gentle start-up bonus |
| Difficulty curve | Spawns every 1.15 s → 0.38 s; speed 105 → 240 px/s; repair share 28% → 18%; each hit +16 bpm |
| Monetization hooks (later) | Cosmetic rooms; no pay-to-win |
| Art direction | Tense, clear, humane. Slate room, two gender-neutral figures (orange partner, blue you), rising blue water = your pulse, a yellow dashed flood line. Horsemen are symbols, not words: thorn ball, rolling eye, shield, brick. Repair = a green heart with a plaster. |
| Audio | Your own heartbeat at your real simulated bpm; bright answer chimes; a two-note repair chord; a dull thud on a hit; a rush of noise on flooding; a long rising tone when you breathe |
| Accessibility | Each horseman has a distinct shape. Flooding shows as tunnel vision, a text cue and a hold hint. Reduced motion stops spin, waves and bob. Text ≥20 logical px. |
| Likely age rating | PEGI 3–7 style: an argument shown as symbols, no insults, no violence |
| Name/IP check | Pending (logged in `docs/HUMAN_TASKS.md`) |
| Success metric (7 days) | D1 ≥ 25%, share rate ≥ 5%, median session ≥ 120 s |
| Kill rule | D1 < 15% or share rate < 2% after 1,000 players |

## Psychology → mechanic
| Finding | Mechanic |
|---|---|
| The Flood: attack, defend, withdraw escalate | Barbs = criticism (thorn), contempt (rolling eye), defensiveness (shield), stonewalling (brick). Each hit is +16 bpm |
| Antidotes | Tapping a barb answers it with its antidote; the caption names it |
| Repair attempts | Green heart-with-plaster items: accept (tap) to score big and lower your pulse; ignoring one counts as a negative |
| Flooding ≈100 bpm: can't think or hear | At the flood line your taps fizzle and vision tunnels |
| Take a break and self-soothe | Hold to breathe: −14 bpm/s and the fight slows to 30%, but the clock runs |
| The first 3 minutes predict 96% of outcomes | No hits in the first 8 s = gentle start-up ×2 for the rest of the round |
| 5:1 during conflict | The live ratio in the HUD; a finish bonus for ≥5:1; ratio on the end card |

## Tunables (`game.config.json`)
| Key | Default | Effect |
|---|---|---|
| `roundSeconds` | 60 | Argument length |
| `heart.rest` / `recover` / `flood` / `max` | 72 / 90 / 100 / 150 | Pulse model |
| `heart.perHit` / `repairRelief` / `antidoteRelief` | +16 / −6 / −0.5 | Pulse changes |
| `heart.restDrift` / `breatheDrop` | 0.8 / 14 bpm/s | Natural recovery vs a breather |
| `barbs.intervalStart` → `intervalEnd` | 1.15 → 0.38 s | Spawn ramp |
| `barbs.speedStart` → `speedEnd` | 105 → 240 px/s | Speed ramp |
| `barbs.repairChanceStart` → `repairChanceEnd` | 0.28 → 0.18 | Repair share |
| `breathe.holdDelay` / `slowFactor` | 0.25 s / 0.3 | Hold-to-breathe |
| `startup.seconds` / `multiplier` | 8 / ×2 | Gentle start-up |
| `scoring.*` | see file | Answer 40, close-call +40, repair 80, finish 300, ≥5:1 bonus 300 |
