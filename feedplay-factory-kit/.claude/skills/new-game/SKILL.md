---
name: new-game
description: Create, implement, test and package a new small HTML5 social game in this repo from one of the templates. Use when asked to make, build or prototype a new game, or when running a factory session.
---

# New game workflow

Inputs:
- a concept (or pick the next unused seed in `docs/BACKLOG.md`)
- a template: `score-attack`, `daily-puzzle` or `party-async`
- target channel(s)

1. **Write the spec first.** Copy `docs/GAME_SPEC_TEMPLATE.md` to `games/<slug>/SPEC.md` and fill in every field. Keep the name original, and add "name/IP check: <name>" to `docs/HUMAN_TASKS.md`.
2. **Scaffold.** Run `npm run new-game -- <slug> --template <template>`.
3. **Build the first 3 seconds first.** The hook must be playable before any menus, polish or audio.
4. **Implement the loop** within the design constraints in `CLAUDE.md`: one thumb, 30–90 second rounds, deterministic seed, share and challenge. Put all tunables in `game.config.json` and all text in `strings.json`.
5. **Test.**
   - Write unit tests for scoring and seed determinism.
   - Extend the e2e smoke test so a test hook or autoplay seed finishes a full round.
   - `npm run check && npm run e2e` must pass.
6. **Review.** Run the `game-reviewer` subagent on `games/<slug>` and fix every blocking item.
7. **Distribution assets.**
   - Run `npm run clip -- <slug>` if `tools/clip` exists.
   - Write `games/<slug>/HORIZON_PACK.md` following the template's Horizon pack section.
8. **Package** for the target channel(s) if the packager exists. Write `games/<slug>/RELEASE.md` with the exact human steps.
9. **Wrap up.**
   - Tick the items in `docs/BACKLOG.md`.
   - Commit as `game(<slug>): …`.
   - Add a short entry to the session report.

If a step needs a login, a secret or a blocked domain: log it in `docs/HUMAN_TASKS.md` or `docs/OPEN_QUESTIONS.md`, then continue with the next step.
