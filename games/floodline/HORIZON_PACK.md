# Flood Line: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet.

## 1. Create prompt
```
Make a fast 2D reflex game called Flood Line, portrait for phones. Two stylised people face each other in a room during an argument. Symbols fly from the partner at the top toward you at the bottom: a spiky thorn ball (criticism), a rolling eye (contempt), a shield (defensiveness), a brick (stonewalling), and sometimes a green heart with a plaster (a repair attempt). Tap a symbol before it reaches you to answer calmly: a caption shows the healthy response (Soft reply, Appreciation, Take responsibility, Self-soothe) and a small heart floats back. Tap green hearts to accept the repair. Every hit raises your heart rate, shown as water rising around you; at the dashed 100 bpm line you're flooded: vision narrows and taps stop working until you press and hold to breathe (the argument slows while you do). 60 seconds; show your positive-to-negative ratio versus 5:1 at the end.
```

## 2. Refinement prompts
1. "Have a thorn ball already flying at the player in the first frame, with a pulsing tap ring."
2. "Play the player's heartbeat at the real bpm and make the water rise with it."
3. "When flooded, blur the edges of the screen and show a big 'hold to breathe' thumb icon."
4. "Give a ×2 'gentle start-up' bonus if the first 8 seconds have no hits."
5. "2-player: each player defends the other; the shared ratio is the team score."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Argument length | 60 s |
| Pulse | rest 72, flood 100, calm at 90, out at 150; +16 per hit, −6 per repair |
| Breather | hold 0.25 s; −14 bpm/s; items at 30% speed |
| Spawns | 1.15 → 0.38 s; 105 → 240 px/s; repairs 28% → 18% |
| Gentle start-up | 8 s without a hit = ×2 |
| Master ratio | ≥ 5:1 → +300 |

## 4. Social variant (2–4 players after tapping a feed clip)
"Cool Heads": 2 players, one at each end. Each player's barbs go to the other, and answering converts them into hearts for your partner. The shared ratio is the score; if either floods, both must breathe. It becomes cooperative, not competitive.

## 5. Clip script (5–10 s)
0.0 s: the flood line, a thorn ball incoming. 0.5 s: rapid taps with "Gentle start-up", "Take responsibility", hearts floating back. 3 s: two hits and the water surges over the line: tunnel vision, "Flooded: hold to breathe". 5 s: the thumb holds, a breathing ring, the water drops, "Calm again". 8 s: a repair heart accepted, the end card "Talked it through · 5.8:1".

## 6. Evidence
None yet: web demo only.
