# Hawk Shadow: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet.

## 1. Create prompt
```
Make a top-down 2D arcade game called Hawk Shadow, portrait for phones. A small field mouse runs up an endless grassy meadow scattered with golden seeds. Hold anywhere to run (the mouse drifts toward your finger left or right); let go to freeze and crouch in the grass. A hawk circles overhead; you only see its big dark shadow sweeping over the field. Every few seconds the shadow dives: it slides onto the mouse, shrinks and darkens, a ring tightens around the mouse, and a screech plays. If the mouse is moving when the hawk strikes, it's caught (flash, round over; no gore). Freezing at the very last moment is a Close Call: bonus and multiplier up to x5. Some later dives are feints where the hawk pulls up. Dives get faster through the 60-second run; reach the burrow to win. Score = distance + seeds + close calls. End screen: meters, close calls, Run again, Share, Challenge a friend.
```

## 2. Refinement prompts
1. "Make the hawk shadow visible and circling in the very first frame, and dive for the first time at about 2 seconds."
2. "Add a heartbeat and red edge glow that ramp up during each dive warning."
3. "Add a 'double dive' after 40 seconds: the hawk strikes, climbs and strikes again within a second."
4. "Add patches of tall grass: freezing inside one gives a bigger close-call bonus."
5. "Add 2–4 players as mice in the same field; the hawk hunts whoever is moving most."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Run length | 60 s |
| Run speed | 140 px/s forward, 420 px/s sideways |
| First dive | 2.4 s |
| Dive interval | 3.0 s → 1.45 s (±0.35 s) |
| Warning | 1.3 s → 0.6 s |
| Strike window | 0.22 s |
| Feints | 0% → 25% |
| Close-call window | 0.3 s before the strike |
| Points | 1 per 10 px; seed 30; close call 100; home 300; multiplier cap ×5 |

## 4. Social variant (2–4 players after tapping a feed clip)
"Same Sky": 2–4 mice share one meadow and one hawk. Each dive targets the mouse that has run furthest since the last dive, so leaders take the most risk. Seeds are contested. The last mouse standing, or the furthest at the burrow, wins; rematch on a new field.

## 5. Clip script (5–10 s)
0.0 s: the mouse in open grass with a huge shadow gliding past. 0.5 s: the mouse sprints, grabbing seeds (+30). 1.6 s: screech; the shadow slides in and the ring tightens. 2.3 s: the thumb lifts, the mouse crouches, the hawk swoops through: "Close call! +100", white flash. 3–8 s: faster dives, near misses, ×5. 9 s: end card "Safe in the burrow!" or "Caught in the open · 280m".

## 6. Evidence
None yet: web demo only.
