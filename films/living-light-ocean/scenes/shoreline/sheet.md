# html-anime · scene 1 · The Glowing Shoreline

Part of the sequence films/living-light-ocean, from 0.00s.

An extremely low glide follows a glowing wave over black sand, then closes on tiny cyan plankton flashing in the ripples and bubbles.

8s · 24fps · 192 frames · 1920×1080
Color script: Indigo moon
- sky #1b2d6b
- ink #101628
- moon #d5e2ff
- accent #e23b4a
- practical #f0c36a
- iris #e7a04a
- skin #f0c2ae
- hair #16141c
- sclera #f6f3ee
- line #e7eefc
Design colors (added by the designer for a reference; use them only where the bible says):
- plankton #42dff5
- shell #526b4a
- oceanlight #2857a4

Compose the wide frame. Put the eyes on a third, with room in front of the gaze.

## Art style
Painted world — Cel characters in front of painted backgrounds built from stacked flat washes.
- Line: Characters: outer 5px, interior 2.5px. Background: no line at all.
- Shadow: Characters: one hard shadow. Background forms: three to five stacked washes, each a palette hex at low opacity.
- Proportion: 6.5 heads tall.
- Eyes: Round eyes, iris about two thirds of the eye height, one soft-shaped catchlight drawn as a flat shape.
- Background: Big cloud and foliage masses as layered flat shapes. Light comes from one side and every wash agrees with it.
Style reference: A restrained, hand-drawn anime nature-documentary interpretation of realistic nighttime ocean cinematography: layered painterly darkness, subtle textured water, tiny cyan bioluminescence, anatomically. Follow it. The style above fills in what the reference doesn't show.

## Cast
- Green sea turtle — follows a reference (notes): A scientifically recognizable adult green sea turtle: broad oval olive shell with subtle scute pattern, pale underside, small dark eyes, four broad paddle-shaped flippers, realistic proportions and calm marine movement. No markings, accessories, or anthropomorphism. Build films/living-light-ocean/design/green-sea-turtle.html from it. Do not redesign.

## Props & motion
Props and action: moonless star field; black wet sand; gently advancing electric-cyan wave; sparse short-lived plankton sparks and delicate fading trails; tiny bubbles; faint star reflections
Read every card before drawing keys:
- Effects — light, fire, water, sparks, impact flash — skills/html-anime-motion/references/effects.md (spark, glow, star)

## Drawing budget
Full animation: the counts below are key poses. Every frame between keys is inbetweened (eased, on arcs).
Acting moves on twos; fast action, rain, sparks, and a blade move on ones. A hold breathes; it never freezes unless the beat says so.
The sakuga shot may use 8 keys. Every other shot uses 3.

## Shots
### 1 · Establish · 0.00–2.40
Wide · 3 keys, inbetweened · Camera push — Push 100% to 106% across the shot, power1.inOut. No other move.
The place in the logline. The figure is small, or not in it yet.

### 2 · Sakuga — the expensive shot · 2.40–6.00
Medium · 8 keys, inbetweened · Camera shake — Locked, plus one impact shake on the contact frame: 6 frames on ones, written-out offsets decaying to 0.
The verb in the logline. The only shot that may use 8 keys (8 drawings in limited animation). Anticipate, play the action from the motion card's keys, one or two smear frames, then the settled drawing.

### 3 · Button · 6.00–8.00
Close-up · 3 keys, inbetweened · Camera locked — Locked. The drawings do the moving.
The line, if there is one, in the clear, bottom third, off the eyes. Then a hold. Fade the last 8 frames to ink.

## Dialogue
No dialogue. No mouth shapes. No captions.

## Voice
Voice off. A line, if any, is type only. No audio.

## Crew
Start with the director. Each role reads its own skill and does not restate another's.
1. Director — skills/html-anime-director/SKILL.md — the sheet, the gates, the final review
2. Designer — skills/html-anime-designer/SKILL.md — cast and props: model sheet example first, or follow the reference
3. Actor — skills/html-anime-actor/SKILL.md — each character as a spec: appearance, wardrobe with cloth physics, movement
4. Art — skills/html-anime-art/SKILL.md — the style, the backgrounds, the color roles
5. Motion — skills/html-anime-motion/SKILL.md — key poses for every prop and action
6. Cameraman — skills/html-anime-cameraman/SKILL.md — size, angle, layout, the move
7. Staff — skills/html-anime-staff/SKILL.md — keys, inbetweens, correction, finishing (with cel and timing)
8. Voice — skills/html-anime-voice/SKILL.md — casting, emotion, the generated lines, mouth shapes
9. Sound — skills/html-anime-sound/SKILL.md — effects, ambience, and the score, cued to the picture
10. Render — skills/html-anime-render/SKILL.md — the HyperFrames file and the gates
11. Editor — skills/html-anime-editor/SKILL.md — the review pass on the render, rhythm, continuity, mastering

## Gates
1. Sheet — show this sheet. Change it only by recompiling.
2. Design — films/living-light-ocean/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.
3. Layout — the hero frame of every shot is drawn and still, before any timing.
4. Check — node harness/check.js films/living-light-ocean, then npx hyperframes lint and npx hyperframes check in films/living-light-ocean.

## Build
Write films/living-light-ocean/compositions/shoreline.html at 1920×1080: a <template> whose root is data-composition-id="shoreline", times local to the scene.
The sequence root films/living-light-ocean/index.html mounts it. Asset paths are root-relative (assets/…).
films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.
Use only the hexes above. One sakuga shot. Render with --fps 24.
