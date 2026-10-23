# Fixture: Stickman Blade Fight

A 60–90 second, five-scene fight script (`script.md`) used to test sequence mode end to end. `brief.json` is the sequence brief made from it. `harness/sequence.test.mjs` compiles it and checks the result against the script.

```
node harness/sequence.js tests/fixtures/stickman-blade-fight/brief.json
node harness/voice.js films/stickman-blade-fight/scenes/s1-encounter   # and s3, s4
```

That writes `films/stickman-blade-fight/`, ready for the crew to draw.

## How the script maps onto the sheet rules

| Script | Sequence |
| --- | --- |
| 60–90 s | 84 s: 12 + 20 + 20 + 20 + 12 |
| Scene 1, The Encounter | `s1-encounter`, 12 s. Sakuga: Phantom appears in blue lightning and draws both blades. Shadow's line on the approach shot, Phantom's on the button. |
| Scene 2, First Clash (moves 1–3) | `s2-first-clash`, 20 s. Sakuga: the cross-blade counter (move 2). Move 1 is the approach and turn; move 3 is compressed into the aftermath. No lines. |
| Scene 3, Blades of the Storm (moves 4–5) | `s3-blades-of-the-storm`, 20 s. Sakuga: the crimson spiral (move 5). The afterimage rush is the turn. Phantom's line on the turn shot. |
| Scene 4, Ultimate Techniques (moves 6–7) | `s4-ultimate-techniques`, 20 s. Sakuga: the two ultimates colliding. Shadow's line on the approach, Phantom's on the turn. |
| Scene 5, The Final Frame | `s5-final-frame`, 12 s. Sakuga: the final pass and the red line. The closing text is the title card. |

## What changed to fit

- **One sakuga per scene.** The script has seven named moves. The one that carries each scene's verb gets the 8 drawings; the others get 3-drawing shots or are compressed (move 3's three strikes, the six midair clashes).
- **Line order in scene 1.** Shadow's taunt lands on the approach, before Phantom's draw, because the 12 s plan has its sakuga before the button.
- **Palette.** `indigo`: `accent` is the crimson, `moon` the lightning, `ink` Shadow, `line` Phantom. Phantom's electric blue is the one design color, `volt #38b6ff`.
- **Faces.** Stickmen have no mouths, so the voice is off screen (`onScreen: false`): no mouth track.
- **Voices.** Two male voices, fixed per character across scenes (Shadow first in cast order, Phantom second).
- **Sound effects and music.** The script's thunder, SHING, KRAAANG, taiko, and DOOOOOOM are not generated: html-anime voices lines only. Add them as `<audio>` clips by hand, or with the HyperFrames `media-use` skill (`npx hyperframes skills update media-use`).
- **Camera.** The orbit, the whip-pan, and the descending aerial shot aren't in the cameraman's move set (push, pan, locked, shake). The cameraman draws them as cuts between layouts instead.
