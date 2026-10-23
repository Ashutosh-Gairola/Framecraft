---
name: html-anime-motion
description: Motion reference for code-drawn anime — key poses, contact points, grips, arcs, pivots, and frame counts for props and actions (blades, strikes, walking and running, holding and catching tools, bows and thrown weapons, cloth and hair, light, fire, water, and impact effects). Use before animating any html-anime action or prop, so the motion is physically correct instead of a UI tween.
---

# Motion

An action is a short list of keys that a body or a prop can really reach, in order, with the right number of frames between them. Find it on a card before you draw it.

## Use the cards

The sheet's Props & motion section lists the cards that match the scene. Read every one listed. If the action is not on any card, build it with the method below and add it to the bible.

| Card | Covers |
| --- | --- |
| `references/blade.md` | Draw, cut, thrust, parry, clash, sheathe; swords, knives, spears |
| `references/strike.md` | Punch, kick, block, hit reaction, clash of bodies |
| `references/locomotion.md` | Walk, run, jump, land, turn, dodge |
| `references/handling.md` | Hold, reach, catch, throw; umbrellas, cups, phones, lanterns, letters, tools |
| `references/ranged.md` | Bow, thrown weapons, aiming |
| `references/cloth-hair.md` | Follow-through, wind, drag, settle |
| `references/effects.md` | Light, beams, fire, water, sparks, smoke, petals, rain, snow, impact flash, shatter |

## Write the plan

In the bible's Motion section, per action:

```
Action: Ren cuts the falling light (sakuga, 2.40–6.00)
Card: blade.md → Cut (horizontal)
Keys (on twos unless noted):
  K1 ready        2.40  hold 8f
  K2 anticipation 2.73  4f  — blade back past the shoulder, weight on the back foot
  K3 smear        2.90  1f on ones — stretched blade arc, no hand detail
  K4 contact      2.94  2f — edge meets the light; impact flash 2f
  K5 follow       3.02  4f — blade past the target, body turned
  K6 settle       3.19  hold 18f+
Pivots: blade rotates at the right hand (grip point on the prop sheet)
Contacts: both feet planted from K2 to K6; left hand leaves the grip at K5
Secondary: coat hem lags 2 drawings (cloth-hair.md), hair lags 1
```

The times come from the sheet's shot window. The keys count against the shot's budget (8 for sakuga, 3 elsewhere). In full animation every frame between keys is inbetweened (on ones for the fast moves, on twos otherwise; see timing); holds are free.

## Building a rig

For figures that move a lot, pose a rig instead of drawing every frame: a hip, a torso angle, a head tilt, and an angle per limb segment (upper arm, forearm, thigh, shin), with props attached to a hand by angle. Angles are measured so a positive torso lean always leans toward the side the figure faces; check one forward-leaning key before posing the rest. The shared kit, `harness/draw/kit.js`, has the rig, the eases, and `act()` for inbetweens; a film supplies only its renderer. `films/stickman-blade-fight/build/` (stick figures) and `films/sky-city-duel/build/warriors.mjs` (full anime characters: volume, faces, cloth and hair trailing velocity) are worked examples.

## Physics that code gets wrong

- **Everything has a pivot.** A blade turns at the hand, a forearm at the elbow, an umbrella at the grip. Set `transform-origin` (or the SVG `transform` center) at the pivot before you rotate anything.
- **Arcs, not lines.** Hands, heads, blade tips, and thrown things travel on curves. A straight tween between two positions looks mechanical; place the drawings on the arc.
- **Weight.** Heavy things start slow and stop slow; a blade swing is slow in the windup, fastest at contact. Light things (petals, ribbons) are pushed by air and never travel straight.
- **Overlap.** The body leads, the arm follows, the prop follows the arm, the cloth follows the prop. Each lags the one before by one or two drawings.
- **Gravity.** A thrown or falling thing accelerates: spacing between drawings grows each frame (1, 3, 5, 7…). A rising thing decelerates the same way in reverse.
- **Contact frames hold.** At impact, hold the contact drawing for 2 frames before the follow-through. That's where the eye registers the hit.

## When no card fits

1. Act it out or find the real motion. Name the start pose, the extreme, and the end pose.
2. Find the pivot of every moving part and the path of the fastest point.
3. Add anticipation the other way (4 frames) and a settle after (12+ frames).
4. Count the unique drawings against the budget. Cut keys, never holds.
5. Write it in the bible in the plan format above.
