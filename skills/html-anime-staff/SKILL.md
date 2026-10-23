---
name: html-anime-staff
description: The animation staff of a code-drawn anime — layout artist, key animator, inbetweener, animation director (correction against the model sheet), and finishing — drawing and polishing the film's HTML so the key designs read and every frame stays on model. Use when drawing html-anime shots, strengthening weak frames or poses, fixing off-model drawings, or doing the final visual pass.
---

# Staff

Five desks, in order. Each desk finishes before the next starts on that shot. Paint by `skills/html-anime-cel/SKILL.md`, time by `skills/html-anime-timing/SKILL.md`, frame by the bible's Layout, move by the bible's Motion.

## 1. Layout

Per shot, draw the hero frame as the CSS, still, at full opacity:

- The background from the Art section, at the size the move needs (a pan's background is wider).
- The character lifted from its model sheet: same named parts, only transforms changed.
- The prop in the hand, gripped where its model sheet says.
- The bars and the type position.

Snapshot the middle of every shot and look at it. This is gate 3. Nothing is timed until every layout reads.

## 2. Key animation (genga)

Draw the keys the bible's Motion section lists for each action, each as its own `<g>` with an id (`#ren-k1`, `#ren-k2`…). A key is a whole pose, not a moved limb.

What makes a key read:

- **Line of action.** One clear curve from head through spine to the planted foot. A straight vertical figure is a dead key. The body leans into the action: forward into an attack, back away from a hit.
- **Silhouette.** Fill the key solid black in your head. The arms, the prop, and the head must separate from the body. If the blade crosses the torso, rotate it until it breaks the silhouette.
- **Weight.** The planted foot is under the center of mass, or the pose is falling on purpose.
- **Asymmetry.** Never both arms, both legs, or both eyes doing the same thing.
- **Contact.** Hands touch what they hold, feet touch the ground. Close the gap, don't let a 4px gap show.
- **Extremes go further than feels right.** Anticipation lower, the strike longer, the recoil bigger. Code drawings undersell.

## 3. Inbetweens (douga)

In full animation (the default), every frame is drawn (on ones), motion flows through keys on splines, and holds breathe. In limited animation, only where the budget allows. `skills/html-anime-timing/SKILL.md` owns the counts and the eases. An inbetween is not the average of two keys:

- Arcs: hands, the blade tip, and the head travel on curves. Interpolate joint angles, not positions, and they will.
- Spacing: favor the key you are leaving or arriving at (slow in, slow out). Spacing is the ease.
- The smear sits over the fastest inbetweens: one stretched shape along the travel.
- Generate them from a rig (`act()` in `harness/draw/kit.js`) instead of drawing hundreds of frames by hand. Give the renderer the frame's time and velocity and let cloth and hair trail the motion (`films/sky-city-duel/build/warriors.mjs`). Draw the keys; let the rig draw the rest; correct the ones that break.

If the film plays like a slideshow, keys are being held where inbetweens should be. If it plays like a UI tween, a whole figure is being eased instead of drawn.

## 4. Correction (sakkan)

Lay every drawing against the model sheet. Fix, don't note:

| Check | On model |
| --- | --- |
| Height | Same head-heights as the sheet in every key |
| Head | Same shape; eye spacing and size match the sheet at that size |
| Hair | Same number of masses and bang chunks; sheen band in the same place |
| Marks | Every "never change" item from the bible is present |
| Color | Each part uses its role's paint; shadow at the sheet's opacity |
| Hand | Grip matches the prop sheet; fingers count stays consistent |
| Line | Outer and inner weights match the style at that shot's scale |

A close-up is drawn at close-up scale, not a wide drawing scaled up: lines stay the same pixel weight in every shot.

## 5. Finishing

Allowed, sparingly, and only from the sheet's paints:

- **Light shape.** A flat polygon of `practical` or `moon` for a beam, a window spill, a blade flare.
- **Impact flash.** On the contact frame, 1–2 frames of a full-frame `line` or `accent` at 60–100% opacity, then gone.
- **Shadow mood.** One full-frame `ink` layer at 10–25% over the world (not the characters) for a darker beat.
- **Rim light.** A `line` or `accent` stroke along the edge away from the camera, on the subject only.
- **Speed lines.** Inside the sakuga shot only, straight, few, converging on the action.

Not allowed: blur on characters, glow stacks, gradients on cloth or skin, drop shadows, film-grain noise from `Math.random()`.

## Making key designs read

When a frame is weak, fix in this order; usually the first fix is enough:

1. **Value.** The subject is not the strongest contrast. Darken the world or lighten the subject.
2. **Silhouette.** The pose doesn't read in black. Push the extremes, separate the limbs, turn the prop.
3. **Placement.** The subject is centered and small. Move it to a third, cut closer.
4. **Accent.** `accent` is spread around. Put it on the one thing that matters.
5. **Detail.** Too much in the wide shot. Take detail out of the background and give it to the close-up.

## Done

`node harness/check.js films/<slug>` is clean, every shot's middle frame has been looked at, and every drawing passes the correction table.
