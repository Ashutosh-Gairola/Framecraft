---
name: html-anime-designer
description: Design the cast and key props of a code-drawn anime before animation — an original character gets a model sheet example to approve first; a character with a reference follows that reference exactly. Writes the film's design bible and one SVG model sheet per character or prop. Use whenever an html-anime film has a character, a creature, a vehicle, or a prop the action depends on.
---

# Designer

Nothing moves until it has a model sheet. The model sheet is the contract every later drawing is corrected against.

For a 3D film, a human or humanoid character is designed and built with `skills/html-anime-character/SKILL.md`. Its model sheet is the rendered turnaround and comparison sheet, not an SVG.

## Which path

Read the sheet's Cast section. Each member is one of:

| Kind on the sheet | What you do | Wait? |
| --- | --- | --- |
| **original** | Invent the design. Draw a model sheet example. Show it. | Yes. Wait for a yes or for changes. |
| **image** (a path or URL) | Open the image and look at it. Extract the design from it. Draw the model sheet from it. | No, unless it is unclear. |
| **notes** (written reference) | Follow the notes word for word. Fill only what they leave out, and list what you filled. | Only if the notes name an existing character and give no image. |

An existing character from a show, a game, or a book with no image: ask the user for one. Do not draw it from memory, and do not substitute a look-alike.

A figure on screen that the sheet did not name is an original. Name it and design it.

## Research first

Whatever the path, start with `node harness/refs.js init films/<slug>` and the research steps in the actor skill (section 0): search the web for the subject, read the best sources, download a few images into `references/` and look at them, sample their colours with `node harness/refs.js palette`, and write it all in `references.md`.

- **Original**: research the real-world things it is made of — the job, the culture and era of the clothes, the climate, the materials, the animal it borrows from. An invented character built on real references reads as real.
- **Image or notes**: research what the reference leaves out (the back of the costume, how the fabric falls, the animal's gait).
- **An existing character with no image from the user**: search for official reference art, tell the user which image you will follow, and follow it exactly.

## Read the reference first

For an image or notes reference, write this down before you draw, in `bible.md`:

- **Silhouette.** What reads in solid black at 120px tall: hair shape, collar, coat hem, weapon.
- **Head and proportion.** Head heights tall, head shape, eye size and spacing relative to the face.
- **Hair.** The number of masses, the bang chunks, the part, the sheen band.
- **Costume.** Layers from skin out. Every mark that makes them them: a scar, a crest, a ribbon, a stripe.
- **Colors.** Each reference color mapped to the nearest sheet paint by role (hair to `hair`, a cloak to `ink` or `accent`). A signature color with no near paint (green hair, a blue scarf) is a design color: propose a name and a hex to the director, at most 3 for the film. Never use it before the sheet is recompiled with it.
- **Do not change.** The three things a fan would notice first.

## The model sheet

One file per character or key prop: `films/<slug>/design/<name>.html`. Static SVG, no timeline, no external files. Start from `harness/templates/model-sheet.html`. `films/roof/design/ren.html` is a finished example.

It holds, left to right, at the art style's proportions:

1. **Turnaround.** Front, three-quarter, side, back, standing on one ground line, with head-height guide lines. The same height in every view.
2. **Expressions.** At least neutral, the emotion of the button shot, a blink, and the sakuga face. If the voice is on: the three mouth shapes `closed`, `mid`, `open`.
3. **Details.** The hand on the prop's grip, the eye at close-up size, any mark.
4. **Color chips.** Every paint the character uses, by role name and hex, taken only from the sheet.
5. **Notes.** Silhouette rule, line weight, what must never change.

A key prop (a blade, a bow, a bike) gets its own sheet: three views, its size against the character's height, where the hand grips it, and its pivot point for animation.

Build every view from the same named parts (`#hair-back`, `#face`, `#coat`, `#hand-r`), so staff can lift them into the film with only transforms changed.

## Originals: how to invent

- Start from the logline's verb. Design the silhouette that does that verb well: a coat that trails a cut, hair that shows a turn.
- One idea per character. A red cord, a cracked mask, a sleeve torn at the cut. One, not five.
- Shape language: round for warmth, square for steadiness, triangles for threat. Pick one, apply it to hair, costume, and prop.
- Contrast with the background: if the world is dark, the character carries the light paint; if the world is light, the character is the dark shape.
- Colour from the references, not from habit: sample a real costume or animal coat, then map it onto the paints. One saturated signature colour at full strength beats five pastel ones.

Then show it. Say what you chose and why in two lines, give the file path, and stop.

## The bible

`films/<slug>/bible.md`, from `harness/templates/bible.md`. You write Cast and Props. Art, Motion, and Layout are filled by their roles. Staff correct every drawing against it.
