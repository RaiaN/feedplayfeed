# <Game name>: SPEC

> Copy this file to `games/<slug>/SPEC.md` and keep it to one page. Fill in every field; "n/a" is allowed, blank is not.

| Field | Value |
|---|---|
| Slug / working name | |
| Template | score-attack / daily-puzzle / party-async |
| Target channels, in order | e.g., devvit → fbinstant → portals |
| One-line hook (≤12 words) | |
| First 3 seconds | What the player sees and does before reading any text |
| Core loop (verbs) | e.g., hold → release → chain |
| Controls | One thumb: tap / hold / swipe |
| Round length | 30–90 seconds |
| Seed use | Daily / challenge / both |
| Share moment | What's on the share card, and why someone would send it |
| Retention hook | Streak / daily / leaderboard / unlock |
| Difficulty curve | How it ramps within a round and across days |
| Monetization hooks (later) | Rewarded continue / cosmetic / none |
| Art direction | 3 style words, palette (hex), shapes; no external assets |
| Audio | Procedural / none; muted by default? |
| Accessibility | Colorblind-safe? Reduced motion? |
| Name/IP check | Done by a human? (date) |
| Success metric (7 days) | D1 ≥ __%, share rate ≥ __%, median session ≥ __ s |
| Kill rule | e.g., D1 < 15% after 1,000 players |

## Tunables (`game.config.json`)
| Key | Default | Range | Effect |
|---|---|---|---|

## Horizon pack → `HORIZON_PACK.md`
Write this as a separate file containing:
1. **Create prompt** (≤1,000 characters) covering:
   - genre and camera (2D/3D)
   - core loop and mobile controls
   - round length, win/lose conditions and progression
   - art direction and audio mood
   - multiplayer mode (solo, or 2–4 players)
2. **Refinement prompts:** 5 of them, one change each (e.g., "make the first 3 seconds more obvious", "add a combo meter").
3. **Studio tuning table:** parameter → value, taken from our winning `game.config.json` settings.
4. **Social variant:** how the game works as a 2–4 player session after someone taps its clip in a feed.
5. **Clip script:** the 5–10 second moment to show in the feed.
6. **Evidence:** our metrics from other channels (D1, share rate), showing why this game deserves a Horizon rebuild.
