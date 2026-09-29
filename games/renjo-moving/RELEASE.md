# Ren & Jo: Moving Day: release steps

Everything here needs a human (logins, uploads). Build output is in `games/renjo-moving/dist/` after `npm run build`.

## Local play
```bash
npm ci
npm run dev -w games/renjo-moving        # http://localhost:5173 (also on your LAN IP for a phone)
# test flags: ?adapter=mock&test=1 · ?autoplay=1&speed=4 · challenge: ?c=<seed>&s=<score>
```

## Gameplay clip and screenshots
```bash
npm run clip -- renjo-moving                  # bot plays today's seed → out/clips/renjo-moving-<seed>.webm (+ .mp4 with ffmpeg)
npm run clip -- renjo-moving --manual         # scripted real pointer holds instead of the bot
npm run clip -- renjo-moving --seed my-seed   # any seed; same seed ⇒ same run
```
Screenshots go to `out/shots/renjo-moving-0{1,2,3}-*.png` (start / mid-round / end card).

## Web (any static host), available now
1. `npm run build -w games/renjo-moving`
2. Upload the contents of `games/renjo-moving/dist/` to any static host. Paths are relative, so a subfolder works.

## Reddit Devvit: after Session 3
The wrapper (`platforms/devvit`) and `npm run package:devvit -- renjo-moving` don't exist yet. Session 3 will add the exact `npm run login` / playtest / deploy / launch commands here.

## Facebook Instant Games: after Session 4
`npm run package:fbinstant -- renjo-moving` → `out/fbinstant/renjo-moving.zip` doesn't exist yet. Session 4 will add the App Dashboard upload steps here.

## Portals (CrazyGames, Poki): after Session 5
Adapters are pending. Poki docs are blocked from cloud sessions (see `docs/OPEN_QUESTIONS.md`).

## Before any public release
- [ ] Name/IP check for "Ren & Jo: Moving Day" (see `docs/HUMAN_TASKS.md`)
