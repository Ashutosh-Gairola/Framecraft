# html-anime · scene 5 · Dragon and Phoenix

Part of the sequence films/sky-city-duel, from 72.00s.

Both charge their ultimates: Kuro summons a crimson dragon of shadow and lightning, Seren a radiant golden phoenix ringed with burning celestial rings, and they collide above the city in an explosion of red and gold that lights the whole sky.

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

Compose the wide frame. Put the eyes on a third, with room in front of the gaze.

## Art style
Painted world — Cel characters in front of painted backgrounds built from stacked flat washes.
- Line: Characters: outer 5px, interior 2.5px. Background: no line at all.
- Shadow: Characters: one hard shadow. Background forms: three to five stacked washes, each a palette hex at low opacity.
- Proportion: 6.5 heads tall.
- Eyes: Round eyes, iris about two thirds of the eye height, one soft-shaped catchlight drawn as a flat shape.
- Background: Big cloud and foliage masses as layered flat shapes. Light comes from one side and every wash agrees with it.
Style reference: Premium cinematic anime: dramatic cel shading, atmospheric perspective over clouds, rich red-gold contrast, impact frames, speed ramps. No narration, no subtitles, no logos.. Follow it. The style above fills in what the reference doesn't show.

## Cast
- Kuro — follows a reference (notes): Silver-haired swordsman, long black coat with glowing crimson markings, katana forged from dark energy. Build films/sky-city-duel/design/kuro.html from it. Do not redesign.
- Seren — follows a reference (notes): Female warrior, flowing white hair, golden eyes, elegant black-and-gold armor, a pair of luminous celestial blades. Build films/sky-city-duel/design/seren.html from it. Do not redesign.

## Props & motion
Props and action: crimson dragon of lightning; golden phoenix; burning rings; collision explosion; the sky lights red and gold
Read every card before drawing keys:
- Effects — light, fire, water, sparks, impact flash — skills/html-anime-motion/references/effects.md (light, explosion, lightning)

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
3. Art — skills/html-anime-art/SKILL.md — the style, the backgrounds, the color roles
4. Motion — skills/html-anime-motion/SKILL.md — key poses for every prop and action
5. Cameraman — skills/html-anime-cameraman/SKILL.md — size, angle, layout, the move
6. Staff — skills/html-anime-staff/SKILL.md — keys, inbetweens, correction, finishing (with cel and timing)
7. Voice — skills/html-anime-voice/SKILL.md — casting, emotion, the generated lines, mouth shapes
8. Render — skills/html-anime-render/SKILL.md — the HyperFrames file and the gates

## Gates
1. Sheet — show this sheet. Change it only by recompiling.
2. Design — films/sky-city-duel/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.
3. Layout — the hero frame of every shot is drawn and still, before any timing.
4. Check — node harness/check.js films/sky-city-duel, then npx hyperframes lint and npx hyperframes check in films/sky-city-duel.

## Build
Write films/sky-city-duel/compositions/s5-dragon-and-phoenix.html at 1920×1080: a <template> whose root is data-composition-id="s5-dragon-and-phoenix", times local to the scene.
The sequence root films/sky-city-duel/index.html mounts it. Asset paths are root-relative (assets/…).
films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.
Use only the hexes above. One sakuga shot. Render with --fps 24.
