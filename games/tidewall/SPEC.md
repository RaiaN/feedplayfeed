# Tidewall: SPEC

| Field | Value |
|---|---|
| Slug / working name | `tidewall` / Tidewall |
| Template | score-attack |
| Target channels, in order | devvit → fbinstant → portals (CrazyGames, Poki) → playables |
| One-line hook (≤12 words) | Hold to raise the seawall; release exactly on the wave's line. |
| First 3 seconds | A wave rolls down one lit lane toward a dashed yellow line; a pulsing thumb circle with an up-arrow sits in that lane. Pressing anywhere raises the wall; releasing locks it. No text needed. |
| Core loop (verbs) | watch → hold → release → chain |
| Controls | One thumb: press-and-hold anywhere, release to lock (Space/Enter on desktop) |
| Round length | 45 s fixed (tunable 30–90); ~15–20 waves |
| Seed use | Both: daily UTC seed by default; challenge seed from a shared link (`?c=<seed>&s=<score>`) |
| Share moment | End card: score, perfect streak. Share text brags score + streak; "Challenge a friend" sends the same waves with the score to beat. |
| Retention hook | Daily seed (new waves every day, same for everyone) + best score per seed; leaderboard on Devvit (Session 3) |
| Difficulty curve | Within a round, waves travel faster (2.6 s → 1.4 s) with shorter gaps (0.7 s → 0.25 s). Across days: seed varies crest heights and lanes; no meta-progression yet. |
| Monetization hooks (later) | Rewarded "second chance" on one breach; cosmetic wall skins. None in v1. |
| Art direction | Calm, chunky, tactile. Palette (Okabe–Ito based): night `#0b2239`, sea `#12406a`, wave `#56b4e9`, target `#f0e442`, wall `#d9cba3` / rising `#e69f00`, perfect `#009e73`, over `#cc79a7`, breach `#d55e00`. Flat rectangles, brick lines, curved foam crest; no external assets. |
| Audio | Procedural WebAudio: rising tick, perfect chime, good blip, low "too high" buzz, breach noise splash. Sound on after first tap; mute toggle persists. |
| Accessibility | Colorblind-safe palette, and every grade has a shape (★ perfect, ✓ good, ↑ too high, ✕ breach) plus a word. Reduced-motion toggle (defaults to OS setting): no shake, particles or bobbing. Min text 20 logical px (≥16 CSS px down to a 320×568 viewport). |
| Name/IP check | Not yet: logged in `docs/HUMAN_TASKS.md` (2026-09-29) |
| Success metric (7 days) | D1 ≥ 20%, share rate ≥ 5%, median session ≥ 90 s |
| Kill rule | D1 < 12% or share rate < 1.5% after 1,000 players |

## Tunables (`game.config.json`)
| Key | Default | Range | Effect |
|---|---|---|---|
| `roundSeconds` | 45 | 30–90 | Round length |
| `segments` | 5 | 3–7 | Lanes / wall segments across the screen |
| `riseSpeed` | 0.85 | 0.65–1.2 (must reach `maxCrest` within `travelEnd`) | Wall heights per second while holding; higher = harder to be precise |
| `waves.minCrest` / `maxCrest` | 0.2 / 0.9 | 0.1–1 | Crest line height range |
| `waves.travelStart` / `travelEnd` | 2.6 / 1.4 s | 1.1–3.5 | Wave travel time at round start / end (ramp) |
| `waves.gapStart` / `gapEnd` | 0.7 / 0.25 s | 0–1.5 | Pause between waves (ramp) |
| `scoring.perfectWindow` | 0.05 | 0.02–0.1 | ± tolerance for a perfect lock |
| `scoring.goodWindow` | 0.16 | > perfect | Max overshoot that still counts as good |
| `scoring.perfectPoints` / `goodPoints` / `overPoints` | 100 / 40 / 10 | — | Base points (perfect and good are × multiplier) |
| `scoring.maxMultiplier` | 8 | 2–10 | Multiplier cap; +1 per perfect, reset on too-high or breach |

## Horizon pack
See `HORIZON_PACK.md`.
