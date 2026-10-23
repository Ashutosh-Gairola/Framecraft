---
name: html-anime-timing
description: Time code-drawn anime — keys and inbetweens on twos and ones, easing (slow in, slow out), arcs, breathing holds, anticipation, smears, and contact frames, in full animation (smooth, the default) or limited animation (held drawings). Use when animating an html-anime shot, when motion looks like a slideshow or a UI tween, or deciding how many keys a beat gets.
---

# Timing

24 fps. The sheet says `full` (the default) or `limited`.

- **Full animation**: key poses, and every frame between them drawn. Smooth.
- **Limited animation**: the classic held-drawing look. Only when the user asks for it.

In both, motion is drawings changing, not a CSS ease on a whole figure.

## Keys

The sheet's count is keys: 3 per shot, 8 in the sakuga shot. A key is a whole pose from the motion card: anticipation, contact, extreme, settle. Keys carry the acting; inbetweens only carry the path between them.

## Inbetweens (full animation)

Every frame is a new drawing (24 a second). Never jump from key to key, and never hold a drawing while the body is moving.

- **Ones everywhere.** A new drawing every frame, for acting and action alike. Twos (a drawing held 2 frames) read as stutter in code-drawn work; `node harness/edit.js review` flags it above 10%.
- **Flow through keys.** Motion keeps its speed through a key that isn't a stop: the path is a spline through the keys (Catmull-Rom on every angle and the hip), so a run, a turn, or an exchange of blows never stops on each pose. Pose-to-pose easing into every key (slow in, slow out, zero speed at each key) is what makes code animation look robotic.
- **Snap only on purpose.** An impact arrives fast and stops dead (`ease: "in"`: speed rising into the contact frame). A recoil or a launch leaves fast (`"out"`). A settle stops (`"stop"`). Constant drift — slow motion, a float, a slide — is `"lin"`.
- **Arcs.** Interpolate joint angles, not hand positions, so hands, heads, and blade tips travel on curves. A rig does this for free.
- **Overlap.** The body arrives, then the cloth and hair a few frames later, swing past, and settle (actor skill: spring chains). If nothing moves after the body stops, the action has no weight.
- **One move into each key.** Two keys closer than 3 frames read as a pop. Give an acting move at least 8 frames, a strike at least 3.

How to make inbetweens in code: pose a rig (joint angles per limb, pivots at the joints), write the keys as `[time, pose, {ease}]`, and let `act()` in `harness/draw/kit.js` draw every frame: spline motion through the keys, snaps where the ease says, breathing holds, and a persistent `state` for the cloth and hair springs. `films/sky-city-duel/build/` is the worked example.

## Holds

- **Full**: a hold is never a frozen frame. The pose breathes (a slow sine through the torso and arms, about 1.7 seconds a breath), the eyes blink every 3–5 seconds, the cloth keeps moving in the wind, and the world keeps moving behind it (drifting clouds, rain, embers). Freeze only on purpose: the silence before an impact, slow-motion stillness, the last beat of a film.
- **Limited**: after an action settles, hold the drawing at least 12 frames. Inside a hold, a 2-frame blink or a hair follow-through is allowed.

## The expensive shot

1. Anticipation: 4 to 8 frames the other way, on the silhouette.
2. The action from the motion card's keys, inbetweened on ones (full) or as drawing swaps (limited). Never one long ease on the whole figure.
3. One or two smear frames over the fastest inbetweens: a stretched shape along the travel. Not a CSS blur.
4. The contact drawing holds 2 frames. An impact flash or a camera shake lands on it.
5. Follow-through past the target, then the settle, then the hold.

## Effects and the world

- Effects move smoothly too: a shockwave grows on an ease-out, debris rises and falls on a gravity ease (`power2.out` up, `power2.in` down), sparks are a few frames on ones. Don't step them in jumps.
- Rain and speed lines loop on ones.
- A tween that moves the same property as an earlier tween uses absolute `fromTo` values, never `+=`. Relative values render differently when a render worker starts mid-shot (HyperFrames lint `gsap_relative_value_second_writer`).

## Limited animation budget

Only when the sheet says `limited`:

- Character acting is on twos. Each drawing holds 2 frames.
- Rain, sparks, and a blade are on ones.
- The sakuga shot may use 8 unique drawings. Every other shot uses 3.

## Secondary motion

Hair, cloth, and hanging props lag the body by one or two drawings and settle inside the hold (`skills/html-anime-motion/references/cloth-hair.md`). In full animation they're inbetweened like the body, a beat late.

## Mouths

A voiced line's mouth is on twos and follows `voice.json`, not a guessed rhythm. Mouth swaps are free: they don't count against the keys. While the mouth flaps, only a blink in a pause and the breath move on the face.

## Camera

The camera move on the sheet (push, pan, shake) is a continuous tween; it runs on ones, so it is always smooth. Action shots stay locked so the drawings do the moving.

## What not to ease

Do not fade a character in from opacity 0. They are in the hero frame, or they cut in when the shot cuts. Do not slide a whole figure across the frame with one tween: walk, run, or dash it with drawings. Type may rise about 24px and fade over 0.4s. The last 8 frames of the button shot fade to `ink`. That fade is the only scene-level exit.

Swap drawings with `tl.set` at frame boundaries. A 1-frame step is `1/24` seconds.
