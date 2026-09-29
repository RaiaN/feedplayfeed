# Human tasks

Claude never logs in, handles secrets, uploads builds, accepts terms or pays for anything. Everything in this file waits for you. Claude adds new items at the bottom, with the date and the exact commands or steps.

## Today
- [ ] Set up the repo, the Claude GitHub App and the cloud environment (see `README.md`)
- [ ] Join the Horizon early-access waitlist at developers.meta.com/horizon-worlds
- [ ] Join the Meta Horizon Creator Program (requires age 18+ and a supported country)
- [ ] Message your Meta contact with the questions below

## This week
- [ ] Watch these Connect 2026 sessions and copy key facts into `docs/OPEN_QUESTIONS.md`:
  - "Introducing Horizon Create and Horizon Studio"
  - "From publish to players: discovery and growth on Horizon"
  - "Community spotlight: Meta Horizon Creator Program"
- [ ] Reddit: create a developer account and a test subreddit. After Session 3, run `npm run login` in `platforms/devvit` on your own machine.
- [ ] Facebook: create a developer account and an Instant Games app (after Session 4)
- [ ] Apply to the Poki and CrazyGames developer programs; approach a YouTube Playables publisher
- [ ] Before each release, check the game's name and IP: app stores, Steam, itch.io, trademark search

## Questions for your Meta contact
Ask for introductions and public-safe guidance, not confidential information.
1. **Early access:** how are early-access creators chosen, and can you refer me? Is there a launch-partner cohort?
2. **Tooling:**
   - Will Horizon Studio offer TypeScript editing, a CLI, API or MCP support, or code/asset import and export?
   - Is the Desktop Editor (TypeScript + VS Code) staying, and can its worlds reach Facebook/Instagram feeds?
3. **Distribution:**
   - Which surfaces exactly: feed, Reels, Stories, Messenger, Threads, WhatsApp?
   - What drives ranking: D1 retention, session length, shares, remixes?
   - Is there a discovery boost for new games?
4. **Monetization:**
   - How do in-app purchases and revenue share work inside Facebook/Instagram on iOS and Android?
   - What replaces the temporary stipend, and when?
   - Will creators get access to ads?
5. **Eligibility:** which countries get payouts, and can a company enroll?
6. **Analytics:** which creator analytics will exist (impressions, taps, retention cohorts), and is there an export or API?
7. **IP:** who owns AI-generated assets and designs, and can I reuse designs off-platform?
8. **Brands:** will brand-sponsored Horizon games or an agency program exist?

## Running a session's work on your machine
```bash
git fetch && git switch <session-branch>    # or: claude --teleport <session-id>
npm ci && npm run build
# Devvit:     cd platforms/devvit && npm run login && npm run deploy
# FB Instant: upload out/fbinstant/<slug>.zip in App Dashboard → Web Hosting
```

## Added by Claude
<!-- Format: - [ ] YYYY-MM-DD (area) task: exact steps/commands -->
- [ ] 2026-09-29 (IP) Name/IP check: "Tidewall". Search app stores (iOS/Google Play), Steam, itch.io, and a trademark search (USPTO TESS / EUIPO eSearch). Record the result and date in `games/tidewall/SPEC.md` ("Name/IP check").
- [ ] 2026-09-29 (Cloud env) Poki docs are blocked from cloud sessions. Add `developers.poki.com` to the environment's network allowlist (claude.ai/code → environment settings → Network access), next to `sdk.poki.com`, before Session 5.
- [ ] 2026-09-29 (GitHub) After reviewing branch `claude/sweet-pascal-ojhvp3`, open a PR to `main` and merge it. CI (`.github/workflows/ci.yml`) runs on every push.
- [ ] 2026-09-29 (IP) Name/IP checks: "Wolf Night", "Hawk Shadow", "Shark Wake". Same process as Tidewall: app stores, Steam, itch.io, and a trademark search (USPTO / EUIPO). Record the results in each `games/<slug>/SPEC.md`.
- [ ] 2026-09-29 (Playtest) Play the 3 primal demos on a real phone (`npm run dev -w games/<slug>`, then open the LAN URL). Check the sound (heartbeat, screech, chimes) and the feel of the input. Note which one you'd share.
- [ ] 2026-09-29 (IP) Name/IP checks: "Little Moments", "Flood Line". The games cite relationship research in docs only; no book title or author name appears in player-facing text. Keep it that way unless you get permission.
- [ ] 2026-09-29 (IP) Name/IP check: the series name "Ren & Jo" and the titles "Moving Day", "Money Talk", "First Baby". Check app stores, Steam, itch.io and trademarks.
- [ ] 2026-09-29 (Playtest) Couples series: play `renjo-moving`, `renjo-money` and `renjo-baby` with 3–5 people (ideally couples). Watch whether the text cards are readable in time, and whether players feel the dilemma cards (both kind, different partners) as the real challenge. Note which lines feel off.
