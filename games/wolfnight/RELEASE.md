# Wolf Night: release steps

Everything here needs a human (logins, uploads). Build output is in `games/wolfnight/dist/` after `npm run build`.

## Local play
```bash
npm ci
npm run dev -w games/wolfnight        # http://localhost:5173 (also on your LAN IP for a phone)
# test flags: ?adapter=mock&test=1 · ?autoplay=1&speed=4 · challenge: ?c=<seed>&s=<score>
```

## Gameplay clip and screenshots
```bash
npm run clip -- wolfnight                  # bot plays today's seed → out/clips/wolfnight-<seed>.webm (+ .mp4 with ffmpeg)
npm run clip -- wolfnight --manual         # scripted real pointer holds instead of the bot
npm run clip -- wolfnight --seed my-seed   # any seed; same seed ⇒ same run
```
Screenshots go to `out/shots/wolfnight-0{1,2,3}-*.png` (start / mid-round / end card).

## Web (any static host), available now
1. `npm run build -w games/wolfnight`
2. Upload the contents of `games/wolfnight/dist/` to any static host. Paths are relative, so a subfolder works.

## Reddit Devvit: after Session 3
The wrapper (`platforms/devvit`) and `npm run package:devvit -- wolfnight` don't exist yet. Session 3 will add the exact `npm run login` / playtest / deploy / launch commands here.

## Facebook Instant Games: after Session 4
`npm run package:fbinstant -- wolfnight` → `out/fbinstant/wolfnight.zip` doesn't exist yet. Session 4 will add the App Dashboard upload steps here.

## Portals (CrazyGames, Poki): after Session 5
Adapters are pending. Poki docs are blocked from cloud sessions (see `docs/OPEN_QUESTIONS.md`).

## Before any public release
- [ ] Name/IP check for "Wolf Night" (see `docs/HUMAN_TASKS.md`)
