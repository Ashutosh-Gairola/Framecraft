# html-anime · scene 2 · Coastal Life

Part of the sequence films/life-on-earth, from 20.00s.

Out of the water a golden beach and green hills appear; low over the waves, then a drone sweep along the coast past a fishing village and boats, a tracking shot along the beach with people and crabs, and a turn inland over fields.

20s · 24fps · 480 frames · 1920×1080
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
- ocean #1e5aa0
- land #4f7d3a
- cyan #6fd3e6

Compose the wide frame. Put the eyes on a third, with room in front of the gaze.

## Art style
Painted world — Cel characters in front of painted backgrounds built from stacked flat washes.
- Line: Characters: outer 5px, interior 2.5px. Background: no line at all.
- Shadow: Characters: one hard shadow. Background forms: three to five stacked washes, each a palette hex at low opacity.
- Proportion: 6.5 heads tall.
- Eyes: Round eyes, iris about two thirds of the eye height, one soft-shaped catchlight drawn as a flat shape.
- Background: Big cloud and foliage masses as layered flat shapes. Light comes from one side and every wash agrees with it.
Style reference: Nature-documentary realism in three.js: physically inspired light, one continuous camera journey from a coral reef to the coast, the countryside, a city, and a forest, joined by bubbles, a surface bre. Follow it. The style above fills in what the reference doesn't show.

## Cast
No named cast. If a figure is on screen, the designer names it, treats it as an original,
and draws its model sheet example at films/life-on-earth/design/<name>.html before any animation.

## Props & motion
Props and action: waves; beach; tide pools; seabirds; pelicans; crabs; fishermen; boats; fishing village; coastal grass
Read every card before drawing keys:
- Locomotion — walk, run, jump, land, turn — skills/html-anime-motion/references/locomotion.md (turn)
- Effects — light, fire, water, sparks, impact flash — skills/html-anime-motion/references/effects.md (water)

## Drawing budget
Full animation: the counts below are key poses. Every frame between keys is inbetweened (eased, on arcs).
Acting moves on twos; fast action, rain, sparks, and a blade move on ones. A hold breathes; it never freezes unless the beat says so.
The sakuga shot may use 8 keys. Every other shot uses 3.

## Shots
### 1 · Establish · 0.00–3.00
Wide · 3 keys, inbetweened · Camera push — Push 100% to 106% across the shot, power1.inOut. No other move.
The place in the logline. The figure is small, or not in it yet.

### 2 · Approach · 3.00–6.00
Medium · 3 keys, inbetweened · Camera pan — Slow lateral pan, at most 8% of the frame width across the shot, ease none. The background is drawn wider than the frame.
A cut closer. Who is there, and what they hold. The prop reads in silhouette.

### 3 · Turn · 6.00–9.00
Close-up · 3 keys, inbetweened · Camera locked — Locked. The drawings do the moving.
The moment before the verb. Four frames of anticipation, then a hold.

### 4 · Sakuga — the expensive shot · 9.00–14.00
Medium · 8 keys, inbetweened · Camera shake — Locked, plus one impact shake on the contact frame: 6 frames on ones, written-out offsets decaying to 0.
The verb in the logline. The only shot that may use 8 keys (8 drawings in limited animation). Anticipate, play the action from the motion card's keys, one or two smear frames, then the settled drawing.

### 5 · Aftermath · 14.00–17.50
Wide · 3 keys, inbetweened · Camera locked — Locked. The drawings do the moving.
The result, already settled. Hold at least 12 frames. A blink or a hair follow-through may happen inside the hold.

### 6 · Button · 17.50–20.00
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
2. Design — films/life-on-earth/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.
3. Layout — the hero frame of every shot is drawn and still, before any timing.
4. Check — node harness/check.js films/life-on-earth, then npx hyperframes lint and npx hyperframes check in films/life-on-earth.

## Build
Write films/life-on-earth/compositions/s2-coast.html at 1920×1080: a <template> whose root is data-composition-id="s2-coast", times local to the scene.
The sequence root films/life-on-earth/index.html mounts it. Asset paths are root-relative (assets/…).
films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.
Use only the hexes above. One sakuga shot. Render with --fps 24.
