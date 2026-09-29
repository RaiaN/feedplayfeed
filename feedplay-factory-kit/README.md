# Feedplay Factory: Claude Code cloud starter kit

"Feedplay Factory" is a working name; rename it freely. This repo turns the Meta Horizon research (Sept 29, 2026) into work that a Claude Code cloud session can run on its own. The work is split two ways:

- **What Claude builds:**
  - an HTML5 game factory for channels that accept your own code: Reddit Devvit, Facebook Instant Games, web portals and YouTube Playables
  - a Horizon Create prompt pack for every game, so the best games can be rebuilt in Meta's tools as soon as you get access.
- **What you handle:** accounts, logins, uploads, the Horizon waitlist and your Meta contact. These are listed in `docs/HUMAN_TASKS.md`.

| Research direction | Where it lives here |
|---|---|
| F: HTML5 game factory | The whole repo (Sessions 1–5, then repeat factory sessions) |
| A/E: early Horizon creator, via your Meta contact | `docs/HUMAN_TASKS.md`, plus a `HORIZON_PACK.md` for each game |
| B: tools for Horizon creators | Parked until Meta confirms an API, MCP support or code import |
| C: your own vibe-coding platform | Not being built (see `docs/STRATEGY.md`) |

## Setup (about 10 minutes)

1. **Push this kit to a new private GitHub repo.** Git is the most reliable way to include the dot-folders (`.claude/`, `.gitignore`):
   ```bash
   cd feedplay-factory-kit
   git init -b main && git add -A && git commit -m "Starter kit"
   gh repo create feedplay-factory --private --source=. --push
   ```
2. **Give Claude access to the repo.** Install the Claude GitHub App on the repo when claude.ai/code asks. The app also enables Auto-fix on pull requests.
3. **Create a cloud environment.** At claude.ai/code, click the cloud icon above the message box, then **Add cloud environment**, and fill in:
   - **Name:** `feedplay`
   - **Network access:** choose **Custom**. Paste the contents of `cloud-env/allowed-domains.txt` and tick **Also include default list of common package managers**. The default "Trusted" allowlist doesn't include Playwright's browser download servers, so without this the end-to-end tests can't install Chromium.
   - **Environment variables:** paste `cloud-env/env-vars.txt`. Don't put secrets here: anyone who uses the environment can read these values.
   - **Setup script:** paste `cloud-env/setup.sh`.
4. **Start Session 1.**
   1. Select the repo and the `feedplay` environment.
   2. Set the permission mode to **Auto**, or **Plan** if you want to approve the plan first.
   3. Type `/model opus`, then send:
      `Run Session 1 from docs/SESSION_PROMPTS.md`

   To start from a terminal inside the repo instead, first pick the environment with `/remote-env`, then run:
   `claude --cloud "Run Session 1 from docs/SESSION_PROMPTS.md"`
5. **When the session finishes.**
   1. Review the diff and click **Create PR**.
   2. Turn on **Auto-fix** so Claude handles CI failures and review comments.
   3. To play the game on your own machine, run `claude --teleport <session-id>` (or `git fetch && git switch <branch>`), then `npm ci && npm run dev -w games/<slug>`.

## Usage budget

Cloud sessions share your Max 5x limits with all your other Claude usage.
- Run one session at a time until the factory pattern works.
- Each "Session" block in `docs/SESSION_PROMPTS.md` is meant to fit roughly one 5-hour usage window.
- Start a new session for each block. A fresh context costs less than a long one.

Optional: save the full research report as `docs/research/2026-09-29-horizon.md`. Claude only reads it if asked.
