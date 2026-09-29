# Wolf Night: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet.

## 1. Create prompt
```
Make a top-down 2D survival game called Wolf Night, portrait for phones. A girl in a blue hooded cloak stands in a small circle of lantern light in a dark forest. Pairs of glowing amber eyes appear in the darkness and creep toward her; inside the light you can see stylised grey wolf silhouettes (no teeth, no blood). The player taps toward a wolf to flash the lantern in a cone. Wolves hit by the flash leap back into the dark. Flashing a wolf that is already very close is a Close Call: big bonus and the score multiplier goes up (max x5). Flashing at nothing resets the multiplier. The lantern's oil drains over time and with every flash, and the light circle shrinks as it runs low. Tap drifting fireflies to refill it. Wolves come faster and in bigger numbers as the night goes on. Survive 60 seconds until dawn, when the sky warms and the wolves flee. If a wolf reaches her, the screen flashes and the round ends. A heartbeat speeds up as wolves get close. End screen: seconds survived, close calls, Try again, Share, Challenge a friend.
```

## 2. Refinement prompts
1. "Show three pairs of glowing eyes already moving in the very first frame, with a pulsing tap ring on the closest pair."
2. "Make the heartbeat and a red vignette ramp up when any wolf is within two body lengths."
3. "Add a slow-motion half-second on every Close Call, with a white flash."
4. "At 45 seconds, add an 'alpha' wolf that needs two flashes."
5. "Add 2–4 player co-op: each player holds a lantern on the same clearing and covers a side."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Night length | 60 s |
| Wolves in first frame | 3 |
| Spawn interval | 1.9 s → 0.65 s |
| Wolf speed | 40 → 85 px/s (girl radius 24 px, light 64–150 px) |
| Max wolves | 9 |
| Flash cone / cooldown | 50° / 0.2 s |
| Oil | 1.0 full; −0.01/s; −0.05 per flash; +0.28 per firefly (one every 4 s) |
| Close-call distance | 80 px |
| Multiplier | +1 per close call, cap ×5, reset on a flash that hits nothing |

## 4. Social variant (2–4 players after tapping a feed clip)
"Campfire": 2–4 players stand back to back around one fire. Each lantern covers the arc its player faces. Wolves target whoever's light is weakest, and fireflies are shared, so players must pass oil or cover each other's side. Everyone survives dawn together or is caught one by one. Rematch on a new night.

## 5. Clip script (5–10 s)
0.0 s: black screen, then three pairs of amber eyes blink on around a tiny circle of light. 0.8 s: a wolf lunges in, and at the last moment a tap sends a white cone and the wolf bolts: "Close call! +50" ×2. 2–6 s: rapid flashes in all directions while the eyes multiply and the heartbeat races. 7 s: the oil bar blinks orange; a firefly grab refills it. 9 s: cut to "You saw the dawn!" or "Caught in the dark · 57s".

## 6. Evidence
None yet: web demo only. Fill in D1, share rate and median session after 7 days on Devvit/FB.
