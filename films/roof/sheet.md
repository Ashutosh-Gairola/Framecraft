# html-anime

On a roof in the rain, a red moon opens and a line of light falls.

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

Compose the wide frame. Put the eyes on a third, with room in front of the gaze.

## Art style
Ink cel — Modern TV cel. Flat local color, one hard shadow, tapered line, silhouette backgrounds.
- Line: Outer contour 6px, interior 3px at 1080px tall. Tapered by the path.
- Shadow: One hard shadow shape per form, ink at about 20%.
- Proportion: 7 heads tall.
- Eyes: Large almond eyes, iris about half the eye height, two window catchlights.
- Background: Silhouette layers with a few practical windows. No line on the background.
No style reference. Follow the style above.

## Cast
- Ren — original. Draw the model sheet example at films/roof/design/ren.html. Show it and wait for a yes.

## Props & motion
Props and action: a short blade, held low
Read every card before drawing keys:
- Blades — draw, cut, parry, sheathe — skills/html-anime-motion/references/blade.md (blade)
- Effects — light, fire, water, sparks, impact flash — skills/html-anime-motion/references/effects.md (light, rain, moon)

## Drawing budget
Limited animation: character acting is on twos. Rain, sparks, and a blade are on ones.
The sakuga shot may use 8 unique drawings. Every other shot uses 3.
A hold after a settle lasts at least 12 frames.

## Shots
### 1 · Establish · 0.00–2.40
Wide · 3 drawings · Camera push — Push 100% to 106% across the shot, power1.inOut. No other move.
The place in the logline. The figure is small, or not in it yet.

### 2 · Sakuga — the expensive shot · 2.40–6.00
Medium · 8 drawings · Camera shake — Locked, plus one impact shake on the contact frame: 6 frames on ones, written-out offsets decaying to 0.
The verb in the logline. The only shot that may use 8 keys (8 drawings in limited animation). Anticipate, play the action from the motion card's keys, one or two smear frames, then the settled drawing.

### 3 · Button · 6.00–8.00
Close-up · 3 drawings · Camera locked — Locked. The drawings do the moving.
The line, if there is one, in the clear, bottom third, off the eyes. Then a hold. Fade the last 8 frames to ink.

## Dialogue
Set this line verbatim on the button shot. Do not translate it.

> The rain hid the sound of the blade.
— Ren, button shot

## Voice
Voice on: English, engine auto.
- Line 1, Ren: male register. Resolve at 1 — rate 0.95×, pitch -1 st, pauses 260ms. Acting: Brows down at the inner corner. Jaw set. No head move.
On screen: mouth shapes follow films/roof/voice.json on twos.
Generate: node harness/voice.js films/roof. It writes the audio, voice.json, and the <audio> tags to paste.

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
2. Design — films/roof/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.
3. Layout — the hero frame of every shot is drawn and still, before any timing.
3b. Voice — node harness/voice.js films/roof. Every line fits its window.
4. Check — node harness/check.js films/roof, then npx hyperframes lint and npx hyperframes check in films/roof.

## Build
Write films/roof/index.html at 1920×1080. Save this sheet as films/roof/sheet.json with node harness/sheet.js.
films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.
Use only the hexes above. One sakuga shot. Render with --fps 24.
