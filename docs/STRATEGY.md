# Strategy (condensed from the Sept 29, 2026 research)

## Situation
- **The announcement.** On Sept 24, 2026, Meta announced two AI game-creation tools, driven by prompts, for 2D/3D games including multiplayer:
  - **Horizon Create:** a mobile app.
  - **Horizon Studio:** a browser tool.

  Source: https://developers.meta.com/blog/meta-connect-recap-horizon-create-and-horizon-studio/
- **Distribution.** Published games become eligible for native distribution in Facebook, Instagram and Horizon. A player taps a clip in the feed and is in a session within seconds, with no install.
- **Ranking.** Meta says it rewards games that are engaging, stable, culturally relevant and keep players coming back. Games that don't fade from discovery.
- **Access.** Waitlist only, rolled out gradually. A press hands-on suggests wide rollout in early 2027: https://www.androidcentral.com/gaming/meta-horizon-create-horizon-studio-hands-on
- **Monetization.** Meta says in-game monetization and the Creator Fund are "coming soon". No revenue share or payout countries have been published.
- **No code path confirmed.** There is no public API, CLI, MCP support or code import, so Claude Code can't plug into Create/Studio today.

## Thesis
Meta's distribution is real, but Claude Code's advantage doesn't apply inside Horizon yet. So:
1. **You (human):** use the Meta contact for early access and for answers on tooling, ranking and payouts.
2. **This repo:**
   - Build a Claude Code game factory for channels that accept our own code.
   - Learn what keeps players and what spreads.
   - Write a Horizon pack for every game, so the winners can be rebuilt in Horizon Create on the first day of access.
3. **Revisit** if Meta ships an API, MCP support or code import. At that point, build Horizon tooling (research direction B).

## Target audience and genre thesis (2026-09-29)
Full brief with sources: `docs/research/2026-09-29-audience-genres.md`.
- **Audience:** 18–34 mobile short-video scrollers (Reels, Facebook feed, Reddit). They lean male but are near parity on Meta, so peril stays stylised and all-ages.
- **Genres:** primal-instinct thrill, in priority order:
  1. predators closing in
  2. chase with a visible pursuer
  3. freeze-or-flee from a hunter
  4. grow-or-be-eaten
  5. a daily seeded "survive the hunt" run for Devvit.
- **Every game:**
  - threat in frame 1, a close call by second 2, and it reads muted
  - frequent near misses
  - fast losses and instant retry
  - a shareable "seconds survived / close calls" stat.
- **Demos built on this thesis:** `wolfnight`, `hawkshadow`, `sharkwake`. `tidewall` (calm precision) is kept as the control.

## Channel priority
1. **Reddit Devvit.** In-feed web games written in TypeScript, with published developer-fund tiers.
   - The H2 2026 fund runs Aug 1–Dec 31. The first tier pays a one-time $4,000 at 5,000 Daily Qualified Engagers; recurring payouts reach $5K/month at 50K; at most 3 apps.
   - Terms: https://support.reddithelp.com/hc/en-us/articles/50860336905108-Reddit-Developer-Funds-H2-2026-Terms
2. **Facebook Instant Games.** HTML5 games in Meta's own feed.
   - New builds must follow "Zero Permissions" (SDK v8.0). Existing games had to migrate by Sept 30, 2026.
3. **Web portals (Poki, CrazyGames).** A mature channel paying a share of ad revenue.
4. **YouTube Playables.** Revenue sharing is only a pilot, and access goes through publishers.
5. **Meta Horizon Create/Studio.** Reached through Horizon packs (prompts only) once access arrives.

## Not doing, and why
- **A standalone vibe-coding platform.**
  - Meta's AI is free and comes with native distribution.
  - Roblox (with its "Build" tool) and Astrocade ($56M raised) already compete.
  - A Claude Max subscription can't legally power a product for other users, so every generation would cost API fees.
- **Horizon tooling (an MCP bridge or similar)**, until Meta confirms programmatic access.
- **Wiring subscription credentials into anything.**

## Success metrics and kill criteria
| Experiment | Success | Kill |
|---|---|---|
| HTML5 factory | ≥1 game at 1,000 daily engagers on Devvit (or equivalent) by day 60 | <100 daily players across all games by day 60 |
| Horizon early games | ≥1 game with sustained organic plays and D1 ≥25% within 30 days of access | No traction after 10 releases, or payout terms exclude us |
| Horizon tooling (B) | Meta confirms API/MCP/code import, plus a 20-creator waitlist | No programmatic access by Q1 2027 |

Track per game:
- D1 and D7 retention
- median session length
- share rate (`share_click` / `round_end`)
- challenge open rate

## Portfolio rules
- Keep games small. At full speed that's 1–3 prototypes a day; aim for 2–3 releases a week.
- After 7 days live, double down on the top 20% ranked by D1 × share rate, and freeze the rest.
- Reuse beats rewrite: every engine or template improvement benefits all games.
