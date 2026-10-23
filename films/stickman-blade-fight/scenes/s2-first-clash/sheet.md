# html-anime · scene 2 · First Clash

Part of the sequence films/stickman-blade-fight, from 12.00s.

Phantom dashes in a blue streak and slashes; Shadow pivots past it, spins, and his crimson katana slams into Phantom's crossed blades in a burst of red and blue sparks that shatters the roof tiles.

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
- volt #38b6ff

Compose the wide frame. Put the eyes on a third, with room in front of the gaze.

## Art style
Ink cel — Modern TV cel. Flat local color, one hard shadow, tapered line, silhouette backgrounds.
- Line: Outer contour 6px, interior 3px at 1080px tall. Tapered by the path.
- Shadow: One hard shadow shape per form, ink at about 20%.
- Proportion: 7 heads tall.
- Eyes: Large almond eyes, iris about half the eye height, two window catchlights.
- Background: Silhouette layers with a few practical windows. No line on the background.
Style reference: Stickman silhouettes: solid ink and solid white figures, no faces, no line on the figures. Glowing blades as flat light shapes. Speed lines and impact frames.. Follow it. The style above fills in what the reference doesn't show.

## Cast
- Shadow — follows a reference (notes): A black stickman wielding a crimson energy katana. Fast, aggressive, unpredictable. Build films/stickman-blade-fight/design/shadow.html from it. Do not redesign.
- Phantom — follows a reference (notes): A white stickman wielding two electric-blue blades. Precise, defensive, and incredibly fast. Build films/stickman-blade-fight/design/phantom.html from it. Do not redesign.

## Props & motion
Props and action: crimson katana; twin blue blades crossed to block; sparks; shockwave; wet stone cracking; Phantom slides back; three-strike combination ends with the crimson blade splitting the courtyard
Read every card before drawing keys:
- Blades — draw, cut, parry, sheathe — skills/html-anime-motion/references/blade.md (blade, katana, slash)
- Strikes — punch, kick, clash, impact — skills/html-anime-motion/references/strike.md (strike, block, slam)
- Locomotion — walk, run, jump, land, turn — skills/html-anime-motion/references/locomotion.md (dash)
- Effects — light, fire, water, sparks, impact flash — skills/html-anime-motion/references/effects.md (spark, shatter)

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
2. Design — films/stickman-blade-fight/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.
3. Layout — the hero frame of every shot is drawn and still, before any timing.
4. Check — node harness/check.js films/stickman-blade-fight, then npx hyperframes lint and npx hyperframes check in films/stickman-blade-fight.

## Build
Write films/stickman-blade-fight/compositions/s2-first-clash.html at 1920×1080: a <template> whose root is data-composition-id="s2-first-clash", times local to the scene.
The sequence root films/stickman-blade-fight/index.html mounts it. Asset paths are root-relative (assets/…).
films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.
Use only the hexes above. One sakuga shot. Render with --fps 24.
