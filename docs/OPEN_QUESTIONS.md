# Open questions

Entry format: `- [date] (area) question: why it matters. Who can answer: docs / Meta contact / test.`
When a question is answered, move it to "Answered" with its source.

## Open
- [2026-09-29] (Horizon) Is there any programmatic path into Horizon Studio: API, CLI, MCP, or TypeScript/code import? Why it matters: decides direction B. Who can answer: Meta contact, creator forum.
- [2026-09-29] (Horizon) What are the monetization terms, revenue share and payout countries for Create/Studio games? Why it matters: decides whether direction A pays. Who can answer: Meta contact.
- [2026-09-29] (Horizon) Which ranking signals and surfaces apply (feed, Reels, Stories, Messenger)? Why it matters: shapes game design. Who can answer: Connect session "From publish to players".
- [2026-09-29] (Devvit) What are the current client↔server API and webview limits? Why it matters: Session 3. Who can answer: developers.reddit.com.
- [2026-09-29] (FB Instant) What are the exact v8.0 SDK URL, the init sequence, and sharing under Zero Permissions? Why it matters: Session 4. Who can answer: developers.facebook.com.
- [2026-09-29] (Poki) Poki docs/SDK hosts are blocked from the cloud session: `sdk.poki.com` and `developers.poki.com` return proxy `403 CONNECT tunnel failed`. Why it matters: Session 5 portal adapter. Who can answer: human adds `developers.poki.com` (and keeps `sdk.poki.com`) to the environment allowlist, or builds the Poki adapter from docs locally.

- [2026-09-29] (Cloud) The environment setup script's `apt-get install ffmpeg` didn't land in the cached image: `ffmpeg` was missing at session start, but a manual `apt-get install -y ffmpeg` in-session worked. Why it matters: `npm run clip` produces mp4 only when ffmpeg is present, and falls back to webm otherwise. Who can answer: human checks `/tmp/setup-ffmpeg.log` in a fresh session, or re-saves the environment so the setup cache rebuilds.

## Answered
- [2026-09-29] (Cloud) Can the session reach the docs domains? Mostly yes, tested with `curl -L` through the session proxy in Session 1:
  - `https://developers.reddit.com/docs/` and `.../docs/capabilities/devvit-web/devvit_web_overview` → 200 (HTML).
  - `https://developers.facebook.com/docs/games/` and `.../docs/games/instant-games/` → 301 → `https://developers.facebook.com/documentation/games` → 200 (Markdown-like text, readable).
  - `https://raw.githubusercontent.com/reddit/devvit/main/README.md` → 200.
  - `https://docs.crazygames.com/` → 200; `https://developers.google.com/youtube/gaming/playables` → 200.
  - `https://sdk.poki.com/` → redirects to `developers.poki.com`, which is **blocked** (403 from proxy). See the Poki item in Open.
