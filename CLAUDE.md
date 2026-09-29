# CLAUDE.md: Feedplay Factory

Project memory for Claude Code, both cloud and local. Keep this file short. Details live in `docs/`; read them only when a task needs them.

## Mission
Ship small, original HTML5 social games fast, measure them, drop the losers and double down on the winners.
- Channels, in order: Reddit Devvit → Facebook Instant Games → web portals (Poki, CrazyGames) → YouTube Playables.
- Every game also gets a `HORIZON_PACK.md`: a prompt and design brief for rebuilding it in Meta Horizon Create/Studio. As of 2026-09-29, Horizon has no confirmed code or API path.
- Why we're doing this, and what not to build: `docs/STRATEGY.md`. Work queue: `docs/BACKLOG.md`.

## Hard rules
1. **No secrets, no logins, no uploads.** Never request, store, print or commit tokens, passwords, app secrets or `.env` values. Account, login, deploy, payment and submission steps go in `docs/HUMAN_TASKS.md` with exact commands.
2. **No subscription credentials in code.** Never wire Claude subscription/OAuth credentials into scripts, CI, tools or games. Runtime AI features are out of scope. If one is ever proposed, it must use an Anthropic API key kept in a server-side secret store. Ask first.
3. **Original IP only.**
   - No clones of named games, and no third-party characters, logos, fonts, music or brand names.
   - Content must suit all ages: no gambling or loot-box mechanics, and no user-written text without moderation.
4. **Don't invent platform APIs.**
   - Code against `packages/platform`.
   - Check channel SDK details in the official docs (listed in `docs/CHANNELS.md`) and cite the URL in a code comment.
   - If you can't verify something: build against a mock, mark it `// VERIFY(<channel>): <what>`, and log it in `docs/OPEN_QUESTIONS.md`.
5. **Blocked network means stop, not bypass.** Record the exact domain you need in `docs/OPEN_QUESTIONS.md` and move on.
6. **Git hygiene.**
   - Make small commits (Conventional Commits format) on the session branch.
   - Never force-push, and never touch `main`'s history.
   - `npm run check` must pass before every commit, and `npm run e2e` must pass before a game is marked done.

## Stack
TypeScript (strict), Vite, Vitest, Playwright (Chromium), ESLint + Prettier, npm workspaces, Node 22.
Rendering uses a small Canvas2D engine in `packages/engine`. Add a third-party engine only if a template truly needs it; pin the exact version and note the bundle-size cost.

## Layout (milestone M0 creates it)
```
packages/engine      loop, scenes, unified input, seeded RNG, tweens, audio, strings
packages/platform    PlatformAdapter + adapters: web (dev), mock (tests), devvit, fbinstant, portal, playables
packages/analytics   typed events + sinks
templates/           score-attack, daily-puzzle, party-async
games/<slug>/        src/, game.config.json, strings.json, SPEC.md, HORIZON_PACK.md, RELEASE.md
platforms/devvit/    Devvit Web wrapper app (serves a built game; its server provides seed + leaderboard)
tools/               new-game scaffolder, clip recorder, size check, report
docs/                STRATEGY, BACKLOG, CHANNELS, HUMAN_TASKS, OPEN_QUESTIONS, GAME_SPEC_TEMPLATE, SESSION_PROMPTS, reports/
out/                 build output, clips, zips (gitignored)
```

## Commands (keep these names working)
```
npm run dev -w games/<slug>        local dev server
npm run build                      build everything
npm run check                      typecheck + lint + unit tests + build + size budget
npm run e2e                        Playwright smoke tests, mock adapter, mobile viewport
npm run new-game -- <slug> --template <name>
npm run clip -- <slug>             9:16 gameplay clip + screenshots → out/
```

## Game design constraints (every game)
- **Format and input:** portrait 9:16 first, one-thumb input, playable within 3 seconds without a text tutorial.
- **Rounds:** 30–90 seconds, with instant restart.
- **Seeds:** deterministic daily and/or challenge seeds; the same seed always produces the same run.
- **End screen:** score card, a share button and "challenge a friend". The seed travels through the adapter.
- **Budgets:**
  - interactive within 2 seconds on a mid-range phone
  - initial JavaScript ≤300 KB gzipped, not counting the platform SDK
  - 60 fps
  - no network calls except through the adapter.
- **Accessibility:** mute, reduced motion, a colorblind-safe palette, text ≥16 px.
- **Content files:** all player-facing text in `strings.json`; all tunable values in `game.config.json`.

## Analytics events
`session_start`, `first_input{ms}`, `round_start{seed}`, `round_end{score,duration_ms,seed}`, `share_click`, `challenge_open{seed}`, `error{message}`.
Collect no personal data. This also fits Facebook's Zero Permissions rules.

## Definition of done (per game)
- `SPEC.md` and `HORIZON_PACK.md` are complete.
- `npm run check` and `npm run e2e` pass.
- Budgets are met.
- A clip and 3 screenshots are in `out/`.
- `RELEASE.md` lists the human steps for each channel.
- The game-reviewer subagent reports no blocking findings.

## Session protocol
- **Start:** read the current section of `docs/BACKLOG.md` and the newest file in `docs/reports/`, then run `git log --oneline -15`.
- **During:**
  - Plan in 15 lines or fewer, then execute without narrating.
  - Read only the files you need; search with `rg` first.
  - Tail long logs (`| tail -50`).
  - Use subagents only for independent chunks of work or for the game-reviewer.
- **End:**
  - Write `docs/reports/<YYYY-MM-DD>-session-<n>.md`, covering: what's done, what's verified vs mocked, human steps, open questions, and the next prompt.
  - Tick the BACKLOG boxes, commit and push.

## Cloud notes
- Each session starts on a fresh VM. Dependencies are installed by `scripts/session-setup.sh`, which runs as a SessionStart hook. Playwright browsers live at `$PLAYWRIGHT_BROWSERS_PATH`.
- `git push` works only for this session's branch.
- `/clear` isn't available in cloud sessions; use `/compact` with focus instructions instead.
- A long command that hits its timeout keeps running in the background. Poll it instead of restarting it.
