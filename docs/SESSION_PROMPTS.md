# Session prompts

To use a block, start a new cloud session and send `Run Session N from docs/SESSION_PROMPTS.md`, or paste the block itself. Use one session per block: `/clear` doesn't work in cloud sessions, and a fresh context costs less.

- **Model:** `/model opus` for Session 1 (the architecture every game will reuse); `/model sonnet` for factory sessions.
- **Permission mode:** **Auto** to run hands-off, or **Plan** to approve the plan first.

## Session 1: foundation
1. Read CLAUDE.md, then the "Session 1" section of docs/BACKLOG.md. Skim docs/STRATEGY.md. Open other docs only when a task needs them.
2. Reply first with:
   - a plan of at most 15 lines
   - 3 original concepts for game #1 (from the BACKLOG seeds or your own), which one you pick, and why.

   Then continue without waiting for me.
3. Complete M0 → M1 → M2. Commit after each milestone and push to this session's branch.
4. Early in the session, check whether developers.reddit.com and developers.facebook.com can be fetched from here, and record the result in docs/OPEN_QUESTIONS.md.
5. If anything needs a login, a secret, a purchase or a blocked domain, don't work around it. Log it in docs/HUMAN_TASKS.md or docs/OPEN_QUESTIONS.md and continue with a mock.
6. Finish by writing docs/reports/<today>-session-1.md, covering:
   - what's done
   - what's verified and what's mocked
   - how I run game #1 locally
   - open questions
   - the prompt for Session 2, adjusted to what actually happened.

   Then give me the same summary here.

## Session 2: templates and factory tooling
1. Read CLAUDE.md, the "Session 2" section of docs/BACKLOG.md, and the newest report in docs/reports/.
2. Do M3–M4.
3. Working rules are the same as Session 1:
   - plan in ≤15 lines, then execute
   - commit after each milestone
   - put login, secret and blocked-domain items in HUMAN_TASKS / OPEN_QUESTIONS.
4. Finish with the session report and the Session 3 prompt.

## Session 3: Reddit Devvit
1. Read CLAUDE.md, the "Session 3" section of docs/BACKLOG.md, docs/CHANNELS.md (Devvit) and the newest report.
2. **Verify before coding:**
   - Fetch the Devvit docs.
   - If they're unreachable, read the official starter templates at github.com/reddit (for example devvit-template-bare) through git or raw.githubusercontent.com.
   - Record every verified fact with its URL in CHANNELS.md.
3. Build platforms/devvit so that `npm run build` works there without a Reddit login.
4. Put everything that needs a login (npm run login, dev/playtest, deploy, launch) in HUMAN_TASKS.md and games/<slug>/RELEASE.md, with exact commands.
5. Finish with the session report and the Session 4 prompt.

## Session 4: Facebook Instant Games
1. Read CLAUDE.md, the "Session 4" section of docs/BACKLOG.md, docs/CHANNELS.md (FB Instant) and the newest report.
2. **Verify first:** check SDK v8.0 and the Zero Permissions constraints in the official docs, and record facts and URLs in CHANNELS.md. If the docs are unreachable, build against a typed mock of only the calls we use and mark each one VERIFY(fbinstant).
3. Deliver:
   - the fbinstant adapter
   - `npm run package:fbinstant -- <slug>`
   - upload steps in RELEASE.md.
4. Finish with the session report and the Session 5 prompt.

## Session 5: clips, analytics, Horizon packs
1. Read CLAUDE.md, the "Session 5" section of docs/BACKLOG.md and the newest report.
2. Build tools/clip and tools/report.
3. Write a HORIZON_PACK.md for every game that has shipped.
4. Verify or stub the portal adapters.
5. Finish with the session report and a factory-session prompt that names the next two concepts.

## Factory session (repeat)
1. Use the new-game skill for concept: <concept, or "the next unused seed in docs/BACKLOG.md">, targeting <channel>.
2. Run the game-reviewer subagent on the game and fix every blocking finding.
3. Package the game for the channel.
4. Update BACKLOG.md and write docs/reports/<today>-<slug>.md covering what shipped, what's mocked and the human steps.

## Weekly review (no game code this session)
1. This week's data is at <path, or pasted below>. Run `npm run report`.
2. For each game, recommend double down / iterate / kill, using the kill rules in docs/STRATEGY.md.
3. Update the priorities in docs/BACKLOG.md.
4. List the 3 highest-value human tasks for next week.

## Recovery
- **Context getting long:** `/compact keep: current milestone, failing tests, decisions made`
- **Blocked by a login, secret or domain:** log it in HUMAN_TASKS/OPEN_QUESTIONS and move to the next unblocked backlog item.
- **Setup broke:** run `bash scripts/session-setup.sh` and read `/tmp/session-npm.log` and `/tmp/session-pw.log`. If Chromium is missing, confirm that the environment allowlist includes the Playwright domains in `cloud-env/allowed-domains.txt`.
