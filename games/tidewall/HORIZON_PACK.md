# Tidewall: Horizon pack

Status: draft from the v1 web build (2026-09-29). No live metrics yet; update "Evidence" after 7 days on Devvit.

## 1. Create prompt
```
Make a 2D portrait arcade game called Tidewall. The screen shows a calm night sea above a stone seawall split into 5 columns. One wave at a time rolls down a highlighted column toward a dashed yellow line. The player presses and holds anywhere to raise that column's wall, and releases to lock it. Locking the wall right at the yellow line is a Perfect: +100 points times a multiplier that grows by 1 per Perfect, up to x8. A little too high is Good (+40 x multiplier); far too high resets the multiplier; too low is a Breach: water crashes over, the screen shakes, and the multiplier resets. Rounds last 45 seconds; waves get faster and closer together. End screen: big score, perfect streak, Play again, Share, Challenge a friend. Everyone gets the same waves each day. Flat chunky shapes, navy/sky-blue/yellow/sand palette, soft chimes and splashes. Solo, with async friend challenges.
```

## 2. Refinement prompts
1. "Make the first 3 seconds more obvious: pulse a thumb icon in the lit column and an up-arrow until the first press."
2. "Add a streak meter under the score that fills with each Perfect and flashes at x8."
3. "When a Breach happens, show the water spilling over the wall for half a second, then clear it."
4. "Add a 'double wave' after 20 seconds: two columns light up and must be locked one after the other."
5. "Add a reduced-motion setting that removes shake, bobbing and splash particles."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Round length | 45 s |
| Columns | 5 |
| Wall rise speed | 0.85 of max height per second |
| Wave crest height range | 20–90% of max wall height |
| Wave travel time | 2.6 s → 1.4 s over the round |
| Gap between waves | 0.7 s → 0.25 s |
| Perfect window | ±5% of max height |
| Good window | up to 16% too high |
| Points | Perfect 100, Good 40, Too high 10 |
| Multiplier | +1 per Perfect, cap x8, reset on Too high / Breach |

## 4. Social variant (2–4 players after tapping a feed clip)
"Same Tide": every player gets the same seeded waves at the same time, each on their own wall, side by side in mini-view. Each wave, the closest lock to the line wins a bonus splash on the others' screens. After 45 s, the highest score wins and the lobby offers an instant rematch on a new seed.

## 5. Clip script (5–10 s)
0.0 s: the lit column and dashed line, with the thumb icon pulsing. 0.5 s: hold; the wall rises. 1.3 s: release exactly on the line: PERFECT ★, chime, x2. 2–6 s: three more fast Perfects, x5, with the waves speeding up. 6.5 s: a deliberate breach splash with shake. 8 s: cut to the end card score with "Challenge a friend".

## 6. Evidence
None yet: web v1 only, not launched. Fill in D1, share rate and median session from Devvit/FB after 7 days.
