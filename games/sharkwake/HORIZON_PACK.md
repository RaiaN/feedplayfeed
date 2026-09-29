# Shark Wake: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet.

## 1. Create prompt
```
Make a top-down 2D chase game called Shark Wake, portrait for phones. A surfer lies on a bright yellow board paddling up the screen toward a beach; a dark shark fin cuts a white wake just behind them. The sea scrolls down with rocks and floating logs in 3 lanes. Tap the left or right half of the screen to move one lane. Hitting an obstacle slows you down and lets the fin gain. Dodging out of a blocked lane at the last moment is a Near Miss: bonus points, a multiplier up to x5, and a little distance from the fin. White chevron wave pads give a boost that pushes the fin back. The sea gets faster and busier over 60 seconds; reach the beach to win. If the fin reaches you, you wipe out in a big splash (no bite or blood). A heartbeat speeds up as the fin closes in. End screen: meters, near misses, Paddle again, Share, Challenge a friend.
```

## 2. Refinement prompts
1. "Start with the fin already visible right behind the surfer and a rock row arriving in the first second."
2. "Add a slow-motion flash on every Near Miss."
3. "Make the fin surge forward briefly after every hit, with a camera shake."
4. "Add seagulls that swoop across as a moving obstacle after 30 seconds."
5. "Add 2–4 player races: surfers side by side in separate channels, the same seed, and the fin chases whoever is last."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Run length | 60 s |
| Lanes | 3 |
| Speed | 230 → 360 px/s |
| Fin start gap / cap | 130 / 145 px |
| Fin closing | 7 → 15 px/s |
| Hit penalty | −45 gap, 0.6 s at 55% speed, multiplier reset |
| Near miss | within 0.35 s of passing; +10 gap; 100 × multiplier |
| Wave pad | +24 gap, 25 × multiplier; appears in 50% of rows |
| Double-blocked rows | 0% → 55% |

## 4. Social variant (2–4 players after tapping a feed clip)
"Fin Race": 2–4 surfers paddle side by side in their own 3-lane channels on the same seed. A single fin patrols behind the pack and targets whoever is last; wave pads can be stolen by drifting into a neighbour's channel at the edges. First to the beach wins, and the last one caught gets a splash replay.

## 5. Clip script (5–10 s)
0.0 s: the fin right behind the surfer, with a rock row sliding in. 0.6 s: a late tap and the rock whips past: "Near miss! +100". 1–5 s: rapid left/right weaving through double rows, wave pads, ×5, the heartbeat racing. 6 s: a log hit gives "Bonk!", the fin surges and the screen shakes. 8 s: sand slides in: "Made it to shore!"

## 6. Evidence
None yet: web demo only.
