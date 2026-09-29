# Backlog

Each "Session" block is roughly one cloud session, meant to fit a Max 5x 5-hour window if the work stays focused. Tick boxes as you go. Acceptance criteria ("Accept") must stay true.

## Session 1: foundation (M0–M2)

### M0 Scaffold
- [x] npm workspaces (`packages/*`, `templates/*`, `games/*`, `tools/*`), Node 22, strict TypeScript via a shared `tsconfig.base.json`
- [x] Vite (per game), Vitest, ESLint + Prettier
- [x] Playwright: pin `@playwright/test` to an exact version, then run `npx playwright install chromium`
- [x] Root scripts named in `CLAUDE.md`: `dev`, `build`, `check`, `e2e`, `new-game` (a stub is fine until M4), `size`
- [x] Size check: fails if any game's initial JavaScript is over 300 KB gzipped
- [x] GitHub Actions CI at `.github/workflows/ci.yml`: `npm ci` → `npx playwright install --with-deps chromium` → `npm run check` → `npm run e2e`
- **Accept:** a fresh clone passes `npm ci && npm run check`, and CI is green on the session branch.

### M1 Engine, platform and analytics
- [x] `packages/engine`:
  - fixed-timestep loop and scene stack
  - unified pointer, touch and keyboard input
  - seeded RNG (seed from the date or a challenge)
  - tweens with easing
  - WebAudio with mute
  - device-pixel-ratio-aware canvas that fits 9:16 and handles resizes
  - strings loader
- [x] `packages/platform`: a `PlatformAdapter` interface with these methods:
  - `init()`, `setLoadingProgress(pct)`, `start()`
  - pause/resume handling
  - `getSeed()`, `getChallenge()`, `submitScore()`, `share(payload)`
  - `storage.get/set`
  - an events hook

  Plus two adapters: `web` (for dev) and `mock` (records calls, for tests).
- [x] `packages/analytics`: the typed events listed in `CLAUDE.md`, with console and in-memory sinks
- [x] Unit tests:
  - RNG determinism and loop timing
  - adapter contract tests that run against every adapter
- **Accept:** contract tests pass for `web` and `mock`, and the engine touches the DOM only through one thin renderer module.

### M2 First template and game #1
- [x] `templates/score-attack`:
  - one-thumb controls and 30–90 second rounds
  - instant restart
  - end screen with score, share and challenge
- [x] `games/tidewall` (game #1) built from that template, with `SPEC.md` filled in from `docs/GAME_SPEC_TEMPLATE.md`
- [x] e2e smoke test (Playwright, mock adapter, 390×844 mobile viewport). It must confirm that:
  - the game loads with 0 console errors
  - the first input works
  - a round ends (use a test hook or autoplay seed)
  - the score is submitted
  - a share payload is produced
- **Accept:** `npm run check && npm run e2e` pass, and `npm run dev -w games/<slug-1>` is playable.

## Session 2: more templates and factory tooling (M3–M4)
- [ ] `templates/daily-puzzle`:
  - date seed
  - one attempt per day, stored through the adapter
  - a shareable result card rendered to PNG
- [ ] `templates/party-async`: challenge seed passed through the adapter, plus a beat-my-score flow. Real-time multiplayer is out of scope.
- [ ] `games/<slug-2>` built from `daily-puzzle`
- [ ] `tools/new-game`: `npm run new-game -- <slug> --template <name>` copies the template, renames things, creates `SPEC.md` and `HORIZON_PACK.md` stubs, and registers the game's e2e test
- [ ] Prove the `new-game` skill (`.claude/skills/new-game`) works end to end by creating `games/<slug-3>`
- **Accept:** one command plus implementation takes a new game from nothing to passing e2e.

## Session 3: Reddit Devvit (M5)
- [ ] Verify the Devvit docs and record facts with URLs in `docs/CHANNELS.md`
- [ ] `platforms/devvit`: a Devvit Web wrapper that serves a built game as its client. Its server provides the daily seed and a leaderboard (Redis).
- [ ] `devvit` adapter in `packages/platform`, with contract tests against a fake
- [ ] `npm run package:devvit -- <slug>` builds the game into the wrapper
- [ ] `games/<slug>/RELEASE.md` with the exact human steps: login, playtest, deploy, launch
- **Accept:** the wrapper builds without a Reddit login, and every step that needs a login is listed in `HUMAN_TASKS.md`.

## Session 4: Facebook Instant Games (M6)
- [ ] Verify SDK v8.0 and the Zero Permissions constraints; record facts with URLs in `docs/CHANNELS.md`
- [ ] `fbinstant` adapter. The SDK script is loaded only in the Facebook build, and a mocked `FBInstant` is used in tests.
- [ ] `npm run package:fbinstant -- <slug>` → `out/fbinstant/<slug>.zip` (with `index.html` at the zip root, plus any config file the docs require)
- [ ] `RELEASE.md` steps for the App Dashboard upload and testing
- **Accept:** the zip is produced, and e2e passes with the mocked SDK.

## Session 5: clips, analytics and Horizon packs (M7–M9)
- [x] `tools/clip`: Playwright autoplay recording at 1080×1920 (webm), converted to mp4 if ffmpeg is present, plus 3 screenshots, saved to `out/clips` and `out/shots` (done early, in Session 1)
- [ ] Analytics sinks for each channel where supported, plus `tools/report` (`npm run report`):
  - input: exported CSV/JSON
  - output per game: D1, D7, session length and share rate
  - written to `docs/reports/<date>-metrics.md`
- [ ] A `HORIZON_PACK.md` for every shipped game
- [ ] Poki and CrazyGames adapters, either verified or stubbed with `VERIFY` notes

## Factory cadence (after Session 5)
- **Each session:** 1–2 new games made with the `new-game` skill, each followed by a game-reviewer pass.
- **Weekly:** run the review prompt in `SESSION_PROMPTS.md`, make kill/double-down decisions, and update this backlog.

## Primal-instinct pivot (2026-09-29)
- [x] Audience and genre brief: `docs/research/2026-09-29-audience-genres.md`
- [x] Template and engine: Thumb x/y, bot positions, `endTitleKey`, `engine/fx` (vignette, shake, flash, time warp), `Heartbeat`
- [x] `tools/e2e/score-attack.ts` shared smoke suite
- [x] Demos: `games/wolfnight` (tap to flash wolves back), `games/hawkshadow` (hold to run, release to freeze), `games/sharkwake` (tap left/right to dodge a chasing fin)
- [ ] Put the 3 demos in front of real players (a Devvit playtest after Session 3) and compare D1 × share rate against `tidewall`

## Couples track (2026-09-29)
- [x] Couples research brief with sources: `docs/research/2026-09-29-couples-conflict.md`
- [x] `games/littlemoments` (bids for connection, 86% vs 33%) and `games/floodline` (flooding, horsemen and antidotes, repair, 5:1)
- [x] `templates/duo-balance` plus the Ari & Jo series bible `docs/series/ari-and-jo.md`
- [x] Situations: `arijo-moving`, `arijo-money`, `arijo-baby`
- [ ] Next situations: `arijo-holiday` (in-laws, the Chasm), `arijo-busy` (the Shallows), `arijo-job`, `arijo-sick`, `arijo-aftermath`
- [ ] Playtest the text-card readability vs the 3-second rule; tune timers

## Concept seeds
These are original starting points. Do a name/IP check before any release.
1. ~~**Tidewall**~~ (score-attack, used: `games/tidewall`, Session 1): hold to raise a seawall segment, release to lock it. Waves arrive in seeded patterns, and perfect locks chain multipliers.
2. **Glyph Turn** (daily-puzzle): rotate the rows and columns of a 5×5 glyph grid to match the day's target in the fewest moves. The share card shows moves and streak.
3. **Relay Sketch** (party-async): trace a path through moving gates in 10 seconds, then send your seed and time as a challenge.
4. **Signal Drift** (score-attack): tap left or right to steer a signal between walls that pulse to a procedurally generated beat.
5. **Warmer** (daily-puzzle): find a hidden spot on a generated map in at most 6 taps, using warmer/colder hints.
6. **Blob Route** (party-async): plan a 3-move route for a sneaky blob; friends try to beat it on the same seed.

### Primal-instinct seeds (priority after the pivot)
7. ~~**Wolf Night**~~ (built): tap toward glowing eyes to flash wolves back; survive until dawn.
8. ~~**Hawk Shadow**~~ (built): hold to run, release to freeze under a diving hawk's shadow.
9. ~~**Shark Wake**~~ (built): tap left/right to dodge rocks while a fin closes in.
10. **Small Fry** (score-attack): drag a tiny fish around a pond. Pike lunge along telegraphed lines and a heron's shadow strikes. Eat eggs to grow, but a bigger fish is easier to hit.
11. **Cave Dash** (score-attack): hold to sprint through a collapsing tunnel while a rockslide rumbles behind you. Timed ducks under falling slabs are near misses.
12. **Lights Out** (daily-puzzle): in a dark house, you have 6 moves to reach the door while something shuffles closer each turn. Daily seed, with a share card of the path.
