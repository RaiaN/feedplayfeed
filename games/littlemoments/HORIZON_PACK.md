# Little Moments: Horizon pack

Status: draft from the web demo (2026-09-29). No live metrics yet.

## 1. Create prompt
```
Make a fast 2D tapping game called Little Moments, portrait for phones. Two friendly stylised people sit on a couch in a warm living room at dusk. One partner keeps making little attempts to connect: round cream speech bubbles pop up around the room with simple icons (a heart, a sunset, a coffee cup, a question mark, a music note, a star), each with a shrinking timer ring. Tap a bubble before it fades to 'turn toward' it: hearts float to the couple and they lean closer. Square glowing phone notifications also pop up and buzz. Tapping one means you turned away (penalty). A shared heart meter drains as life gets busy and refills when you catch moments; if it empties, the couple drift apart and the round ends. Bubbles come faster over 45 seconds. A gauge shows the % of moments you turned toward, with a marker at 86% ('couples who last'). End screen: your %, Again, Share, Challenge a friend or your partner.
```

## 2. Refinement prompts
1. "Show a bubble and a buzzing phone in the first frame, with a pulsing tap ring on the bubble."
2. "Make the couple's body language react instantly: lean in on a catch, turn away on a phone tap."
3. "Add rare big moments (double ring, 'can we talk?') worth triple points that fade faster."
4. "Add a 2-player couch co-op: each player catches their partner's bubbles; the shared heart is the team score."
5. "At the end, show a one-line fact: couples who stayed together turned toward 86% of bids."

## 3. Studio tuning table
| Parameter | Value |
|---|---|
| Day length | 45 s |
| Spawn interval | 0.85 → 0.36 s |
| Bubble life | 1.9 → 1.0 s |
| Phone share | 15% → 38% |
| Heart bank | starts 55/100; drains 3 → 6 per s; +5 per catch, +10 big, −9 per miss, −12 per phone tap |
| Multiplier | +1 every 4 catches in a row, cap ×5 |

## 4. Social variant (2–4 players after tapping a feed clip)
"Couch Co-op": 2 players, one per partner, each sees the other's bubbles and must catch them. The shared heart is the team score; phones tempt both of them. Friends can play as a pair, and a leaderboard ranks pairs by their joint %.

## 5. Clip script (5–10 s)
0.0 s: a cosy couch with the couple apart, a bubble popping up and a phone buzzing. 0.5 s: rapid taps, hearts flying, the couple sliding together, the streak climbing to ×5. 3 s: a big moment caught "Just in time!". 5 s: a phone tap: blue glow, "Turned away", the heart drops. 8 s: end card "You turned toward 91% · couples who last: 86%".

## 6. Evidence
None yet: web demo only.
