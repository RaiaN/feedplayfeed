# Ari & Jo: Money Talk: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet. Series context: `docs/series/ari-and-jo.md`.

## 1. Create prompt
```
Make a fast 2D decision game, portrait for phones: "Ari & Jo: Money Talk". Two friendly stylised partners, Ari (blue) and Jo (orange), stand on the ends of a seesaw; the seesaw tilts toward whoever feels more loved, and each has a heart meter that slowly drains. Every couple of seconds one partner says something in a speech card (for example Ari: "Money scares me. My family lost everything once."), and the player picks one of two short answers by tapping the left or right half of the screen. Each answer raises or lowers ONE partner's meter; buttons show whose heart they touch but not which way. Some answers are healthy (take responsibility, turn toward, gentle start-up) and some are harmful (criticism, contempt, defensiveness, stonewalling), and some are dilemmas where both answers are kind but favour different partners. Cards speed up over 60 seconds. If a meter empties, or the seesaw stays tipped too long, show the worst case: "Nobody wins; the card is cancelled, the silence isn't". Survive for the best case: "Two jars on the shelf, TRIP and HOUSE". Show "in balance %" at the end.
```

## 2. Refinement prompts
1. "Show the first card immediately, as a dilemma where both answers are kind, with pulsing tap rings."
2. "After each answer, flash a short label naming the pattern (e.g. 'Defensiveness ▼') above the affected partner."
3. "Add one spotlit 'big moment' card at 60% of the round with double points."
4. "Make the seesaw wobble with a dashed plank when it's close to tipping."
5. "2-player: each player answers for one partner; the shared balance % is the team score."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Length | 60 s |
| Meters | start 60/100; drain 0.9 → 2.2 per s |
| Card timer | 4.2 → 2.8 s (climax 4.5 s) |
| Answer effects | ±10 to ±18 (climax ±18 to ±24) |
| Silence | −10 to the speaker |
| One-sided | gap ≥ 45 for 2.5 s |
| Balanced | gap ≤ 15 |

## 4. Social variant (2–4 players after tapping a feed clip)
"Be Ari, Be Jo": two real people each answer for one partner (as couples or friends). The other player's card appears on your side. You win together by keeping balance, so each player learns what lands for the other.

## 5. Clip script (5–10 s)
0.0 s: the seesaw and a speech card already up. 0.5 s: quick answers with green ▲ labels, the seesaw levelling, ×3. 3 s: a wrong answer: "Contempt ▼", the seesaw lurches and a partner frowns. 5 s: the spotlit big moment: Ari: "Money scares me. My family lost everything once." → the warm answer, hearts. 8 s: the best-case scene "Two jars on the shelf, TRIP and HOUSE".

## 6. Evidence
None yet: web demo only.
