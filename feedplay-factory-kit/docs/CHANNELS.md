# Channel integration notes

Nothing here is final until it has been verified against the official docs during a session. Mark each item ✅ (verified, with date and URL) or ❓ (unverified). For anything unverified, code against mocks and mark it with `// VERIFY(<channel>)`.

## Common adapter contract (`packages/platform`)
- **Lifecycle:** `init` → `setLoadingProgress(0–100)` → `start` → rounds → `submitScore` → `share`/challenge.
- **Also required:** pause/resume on visibility changes, storage, and seed handling.
- Every adapter must pass the contract tests.
- A channel's SDK is loaded only in that channel's build.

## Reddit Devvit Web (priority 1)
- **Docs:** https://developers.reddit.com/docs ❓
- **Known from Reddit's public starter templates on github.com/reddit (July 2026), not yet verified in-session:**
  - Node 22.
  - Scaffolding: `npm create devvit@latest --template=<name>`. This runs an interactive wizard with a Reddit login, so it's a human task.
  - Scripts: `dev` (playtest on a test subreddit), `build`, `deploy`, `launch` (submit for review), `login`.
  - Packages: `@devvit/web` and `devvit` (0.13.x in July 2026).
  - Templates exist for hello-world/bare, Phaser, Unity and GameMaker.
- **Our design:** `platforms/devvit` serves one built game per app as its client. Its server provides the daily seed and a leaderboard (Redis).
- **To verify:**
  - the client↔server call pattern
  - post creation and menu actions
  - webview size and asset limits
  - the Redis API
  - content policy for games
- **Money:** the H2 2026 Developer Funds tiers are in `STRATEGY.md`. Re-check the terms before relying on them.
- **Human tasks:** Reddit account, developer registration, a test subreddit, `npm run login`, deploy and launch.

## Facebook Instant Games (priority 2)
- **Docs:** https://developers.facebook.com/docs/games/instant-games ❓
- **Known from the research:** all Instant and Web Games must follow Zero Permissions (SDK v8.0); the deadline for existing games was Sept 30, 2026. New games should assume no access to player name or photo from day one.
- **Our design:**
  - The SDK is loaded with a `<script>` tag from Facebook's CDN, only in the Facebook build. The exact v8 URL is unverified ❓.
  - The init sequence was historically `initializeAsync` → `setLoadingProgress` → `startGameAsync`; unverified for v8 ❓.
  - The sharing and context APIs under Zero Permissions are unverified ❓.
  - The bundle is a zip with `index.html` at its root, uploaded by a human in App Dashboard → Web Hosting.
- **Types:** check whether DefinitelyTyped's `@types/facebook-instant-games` matches v8 ❓. If not, hand-write minimal types for the calls we use.
- **Human tasks:** Facebook developer account, an Instant Games app, bundle upload, testers, submission.

## Web portals: Poki and CrazyGames (priority 3)
- **Poki:** developer access is by application. The SDK has events for loading finished, gameplay start/stop, and commercial or rewarded breaks; exact API unverified ❓. Docs: https://sdk.poki.com ❓
- **CrazyGames:** SDK v3 ❓, covering gameplay start/stop, midgame and rewarded ads, and a data module. Docs: https://docs.crazygames.com ❓
- **Our rule:** show ads only at natural breaks (round end). Rewarded ads are only an optional continue or a cosmetic.
- **Human tasks:** apply and submit.

## YouTube Playables (priority 4)
- **Docs:** https://developers.google.com/youtube/gaming/playables ❓
- The SDK is expected to cover: lifecycle signals (first frame ready, game ready), save/load data, audio state and score reporting. Exact names are unverified ❓.
- Expect strict rules: no external network, bundle size limits ❓.
- Revenue sharing is a pilot, and access goes through publishers such as Playgama or Mediacube (their claims, unverified).
- **Human tasks:** find a publisher and get access.

## Meta Horizon Create / Studio (no code path)
- As of 2026-09-29, creation is prompt-driven, with no public API, CLI, MCP support or code import. What we deliver for each game is its `HORIZON_PACK.md`.
- **Watch for:**
  - the Connect 2026 session "From publish to players: discovery and growth on Horizon", for ranking signals and surfaces
  - Meta's creator forum thread asking about MCP and custom code.
