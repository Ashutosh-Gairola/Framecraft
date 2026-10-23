---
name: html-anime-editor
description: Edit a code-drawn anime like a film editor — the cut list, shot rhythm, cutting on action, continuity (screen direction, eyelines, the 180° line), transitions with a cause, speed ramps, audio edits (J and L cuts, ducking, silence), and a review pass on the render (stutter, frozen runs, flash frames, loudness) with harness/edit.js, then mastering for delivery. Use after a draft render, when a film feels choppy, slow, confusing, or abrupt, or before delivering an MP4.
---

# Editor

The edit decides what the audience sees and for how long. Draw less, cut better.

## The review pass

Every draft render gets a review before anything else changes:

```
node harness/edit.js review renders/<film>.mp4
```

It reports, and writes `<film>-review.json` and a contact sheet:

| Reading | Means | Fix |
| --- | --- | --- |
| **Stutter** over 10% | Moving frames that repeat the last drawing: the film reads as a slideshow | Inbetween on ones (kit `act()` default), animate effects every frame, check for held keys |
| **Frozen runs** inside action | Half a second or more where nothing moves | Give the world constant motion (drifting clouds, rain, embers), let holds breathe, move the camera |
| **Shots** shorter than 0.5s that aren't impact frames | Cuts the eye can't read | Merge, or hold the shot longer |
| **Shots** longer than 6s with one framing | Dead air | Cut closer, or move the camera |
| **Flash frames** longer than 4 frames | Impact frames that became a white or black screen | Impact flashes are 1–3 frames |
| **Colour** hazy, pastel, washed out, or flat | Black point over 40, mid-tone saturation under 0.32, colourfulness under 25, or contrast under 40: the picture reads dull | Send it back to Art (art skill, Colour grade): true darks, fog only in the distance, key-to-fill 4:1, colours from references, one grade pass |
| **Loudness** outside -16 to -12 LUFS | Too quiet or too loud for players and platforms | `edit.js master` |

Look at the contact sheet: one frame every 2 seconds. If you can't tell what's happening from it, neither can the audience.

## Rhythm

- **Contrast lengths.** Wides 2.5–4s, action cuts 0.5–1.5s, the payoff held. Three equal-length shots in a row read as a slideshow even when each moves.
- **Cut on the action.** The cut lands at the fastest frame of a move, with the direction and speed matching on both sides. The settle belongs to the next shot.
- **Hold the reaction.** After the big hit, the next shot holds longer than the hit took.
- **Stillness before the climax.** About half a second where motion and sound stop, then the impact.

## Continuity

- **Screen direction holds.** A character moving right keeps moving right after the cut; one on the left stays on the left (the 180° line). Cross the line only on screen, with a move the audience sees.
- **Eyelines match.** In a two-shot cut into close-ups, each looks toward where the other was.
- **Props stay in their hands.** The blade in the right hand stays in the right hand across the cut.
- **The light holds.** The light direction and the color of the scene don't jump between shots of the same moment.

## Transitions

Every transition has a cause: a color dip on a cut (the render skill), a flash on an impact, a match cut where a shape carries over (a moon into an eye, a blade into a horizon), a whip with motion blur drawn as a smear. Never a crossfade between two worlds. In a sequence, scenes join on a cut or a dip; the last 8 frames of a scene fade to ink.

## Speed ramps

Slow motion is a key timing, not a playback rate: spread the keys of the slow part far apart on a linear ease (`ease: "lin"`), then snap into the next key on ones. Ramp in over a few frames, never jump. Keep rain, sparks, and debris slowed by the same factor.

## Audio edits

- **J cut**: the next shot's sound starts before its picture (a voice, a roar). **L cut**: the sound runs past the cut.
- **Duck** the score under a boom or a line; cut it for the silence before the climax.
- **Ambience never drops to zero at a cut** unless the silence is the point.
- Every voice and effect is placed by the sound and voice skills; the editor checks they land on the right frames in the render.

## Mastering

```
node harness/edit.js master renders/<film>.mp4 --out renders/<film>-master.mp4
```

Loudness to -14 LUFS (-1 dBTP), H.264, yuv420p, faststart, the film's frame rate. Deliver the master; keep the render.

## Done

The review shows stutter under 10%, no frozen runs inside action, no long flash frames, and loudness near -14 LUFS after mastering; the contact sheet tells the story; continuity holds across every cut.
