# Ren & Jo: Money Talk: release steps

Everything here needs a human (logins, uploads). Build output is in `games/renjo-money/dist/` after `npm run build`.

## Local play
```bash
npm ci
npm run dev -w games/renjo-money        # http://localhost:5173 (also on your LAN IP for a phone)
# test flags: ?adapter=mock&test=1 · ?autoplay=1&speed=4 · challenge: ?c=<seed>&s=<score>
```

## Gameplay clip and screenshots
```bash
npm run clip -- renjo-money                  # bot plays today's seed → out/clips/renjo-money-<seed>.webm (+ .mp4 with ffmpeg)
npm run clip -- renjo-money --manual         # scripted real pointer holds instead of the bot
npm run clip -- renjo-money --seed my-seed   # any seed; same seed ⇒ same run
```
Screenshots go to `out/shots/renjo-money-0{1,2,3}-*.png` (start / mid-round / end card).

## Web (any static host), available now
1. `npm run build -w games/renjo-money`
2. Upload the contents of `games/renjo-money/dist/` to any static host. Paths are relative, so a subfolder works.

## Reddit Devvit: after Session 3
The wrapper (`platforms/devvit`) and `npm run package:devvit -- renjo-money` don't exist yet. Session 3 will add the exact `npm run login` / playtest / deploy / launch commands here.

## Facebook Instant Games: after Session 4
`npm run package:fbinstant -- renjo-money` → `out/fbinstant/renjo-money.zip` doesn't exist yet. Session 4 will add the App Dashboard upload steps here.

## Portals (CrazyGames, Poki): after Session 5
Adapters are pending. Poki docs are blocked from cloud sessions (see `docs/OPEN_QUESTIONS.md`).

## Before any public release
- [ ] Name/IP check for "Ren & Jo: Money Talk" (see `docs/HUMAN_TASKS.md`)
