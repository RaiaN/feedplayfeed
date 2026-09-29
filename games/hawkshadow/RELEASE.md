# Hawk Shadow: release steps

Everything here needs a human (logins, uploads). Build output is in `games/hawkshadow/dist/` after `npm run build`.

## Local play
```bash
npm ci
npm run dev -w games/hawkshadow        # http://localhost:5173 (also on your LAN IP for a phone)
# test flags: ?adapter=mock&test=1 · ?autoplay=1&speed=4 · challenge: ?c=<seed>&s=<score>
```

## Gameplay clip and screenshots
```bash
npm run clip -- hawkshadow                  # bot plays today's seed → out/clips/hawkshadow-<seed>.webm (+ .mp4 with ffmpeg)
npm run clip -- hawkshadow --manual         # scripted real pointer holds instead of the bot
npm run clip -- hawkshadow --seed my-seed   # any seed; same seed ⇒ same run
```
Screenshots go to `out/shots/hawkshadow-0{1,2,3}-*.png` (start / mid-round / end card).

## Web (any static host), available now
1. `npm run build -w games/hawkshadow`
2. Upload the contents of `games/hawkshadow/dist/` to any static host. Paths are relative, so a subfolder works.

## Reddit Devvit: after Session 3
The wrapper (`platforms/devvit`) and `npm run package:devvit -- hawkshadow` don't exist yet. Session 3 will add the exact `npm run login` / playtest / deploy / launch commands here.

## Facebook Instant Games: after Session 4
`npm run package:fbinstant -- hawkshadow` → `out/fbinstant/hawkshadow.zip` doesn't exist yet. Session 4 will add the App Dashboard upload steps here.

## Portals (CrazyGames, Poki): after Session 5
Adapters are pending. Poki docs are blocked from cloud sessions (see `docs/OPEN_QUESTIONS.md`).

## Before any public release
- [ ] Name/IP check for "Hawk Shadow" (see `docs/HUMAN_TASKS.md`)
