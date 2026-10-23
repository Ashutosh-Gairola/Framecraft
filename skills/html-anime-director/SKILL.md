---
name: html-anime-director
description: Direct a code-drawn anime short or a multi-scene sequence end to end — refine the brief, build the html-anime sheet (or a sequence of sheets for a long script), run the crew in order (designer, art, motion, cameraman, staff, voice, render), hold the gates, and sign off. Use first whenever someone asks for an anime, an html-anime sheet, a short drawn as HTML, or pastes a sheet.
---

# Director

The sheet is the film. You own it, you run the crew, and you sign off. You do not draw until the gates in front of drawing are passed.

## 1. Refine the brief

If the user pasted an html-anime sheet, it is the brief. Go to step 2.

If they wrote a scene, find out only what changes the film. Ask at most three short questions, in one message, and only for what is missing:

- **Who.** For each character: original, or an existing one? If existing, ask for an image or a written reference. Never draw an existing character from memory.
- **What they hold and do.** A prop the verb needs (a blade, an umbrella, a bow) and how it is held.
- **How it looks and sounds.** An art reference if they have one. Whether the line is spoken aloud, in which language, and in what mood.

Everything else has a default: 8 seconds, 16:9, `indigo`, `ink-cel`, full animation (smooth, inbetweened), voice off. `animation: "limited"` gives the classic held-drawing look; use it only when asked. If they said "just make it", ask nothing and use the defaults.

**Longer than 20 seconds, or more than one action?** It's a sequence. See "Sequences" below.

## 2. Build the sheet

Write a brief (the `compileBrief` input) and run:

```
node harness/sheet.js brief.json
```

It writes `films/<slug>/sheet.md` and `sheet.json`. Show the sheet. A change to the sheet is a new brief and a recompile, never a hand edit. Fields: `logline`, `seconds` (8, 12, 20), `aspect`, `script`, `style`, `styleReference`, `dialogue` (one line on the button) or `lines` (up to two, each `{speaker, text, emotion, shot}`), `card` (on-screen text, not spoken), `cast` (`"Name"` or `"Name: reference"` per line, or `[{name, reference}]`), `props`, `voice`, `designColors`, `slug`.

## 3. Decide

- The logline's verb is the sakuga shot. Name it. Every other shot is the place, the approach, the turn, the aftermath, or the button.
- Shot times sum to the runtime. No prologue, no credit, no second action.
- Dialogue is the lines they wrote, verbatim, at most two per sheet, each on its shot. One language. Do not translate.
- The color script is closed. The designer may ask for up to 3 design colors when a reference demands it; you approve them by recompiling with `designColors`.

## 4. Run the crew

Hand off in this order. Each skill owns its subject. Do not restate one inside another.

| # | Role | Skill | Hands back |
| --- | --- | --- | --- |
| 0 | Research | `skills/html-anime-actor/SKILL.md` (section 0) | `references.md` and `references/`: web references, sampled colours, gait numbers for every figure, animal, and real place |
| 1 | Designer | `skills/html-anime-designer/SKILL.md` | `bible.md`, `design/<name>.html` per character and key prop |
| 1b | Actor | `skills/html-anime-actor/SKILL.md` | one spec per character: appearance, wardrobe and its physics, movement, pose library |
| 2 | Art | `skills/html-anime-art/SKILL.md` | the bible's Art section: style rules, color roles, background plan |
| 3 | Motion | `skills/html-anime-motion/SKILL.md` | the bible's Motion section: keys per action, from the cards |
| 4 | Cameraman | `skills/html-anime-cameraman/SKILL.md` | the bible's Layout section: size, angle, placement, move per shot |
| 5 | Staff | `skills/html-anime-staff/SKILL.md` | `index.html`: drawn, timed, corrected, finished |
| 6 | Voice | `skills/html-anime-voice/SKILL.md` | `assets/voice/line-N.wav`, `voice.json`, the mouth track (voice on only) |
| 6b | Sound | `skills/html-anime-sound/SKILL.md` | `sfx.json`, `assets/sfx/`, cues on the impacts, the score bed |
| 7 | Render | `skills/html-anime-render/SKILL.md` | the file passing every gate |
| 8 | Editor | `skills/html-anime-editor/SKILL.md` | the review of every draft render, fixes sent back to the crew, the master |

A film that needs real 3D space (a drone flight, an orbit, a realistic landscape) is built with `skills/html-anime-3d-actor/SKILL.md` instead of 2D layers; the rest of the crew works the same.

Staff paint with `skills/html-anime-cel/SKILL.md` and time with `skills/html-anime-timing/SKILL.md`.

## 5. Gates

Stop at a gate only where it says to wait.

1. **Sheet.** Show it. Continue unless they object.
2. **Design.** Every original character gets a model sheet example. Show it, say where the file is, and wait for a yes or for changes. A character that follows a reference does not wait, unless the reference is unclear or contradicts the sheet; then ask.
3. **Layout.** The hero frame of every shot is drawn and still before any timing. Look at it (`npx hyperframes snapshot --at <mid-shot times>`). Fix the picture before you animate it.
4. **Check.** In order, all clean:

```
node harness/check.js films/<slug>
cd films/<slug> && npx hyperframes lint && npx hyperframes check
```

If the user asked for no stops, gates 1 and 2 do not wait, but you still build the model sheets first and say they exist.

## 6. Sign off

Read the film against the sheet before you call it done:

- The sakuga shot is the only one with more than 3 keys, and it reads as the verb.
- Motion is smooth (full animation): nothing jumps between keys, holds breathe, no figure leans the wrong way.
- Every character matches its model sheet in every shot: proportions, hair masses, marks, colors.
- Every prop is held the way its motion card says. Contact points are touching.
- The line is verbatim. If voiced, it plays inside its window and the mouth moves only while it plays.
- Only the sheet's hexes. `check.js` is clean.

Then `npx hyperframes preview` and tell the user where to look. Render with `--fps 24`.

## Sequences

A script longer than 20 seconds, with several actions or more than two lines, becomes a sequence: 2 to 8 scenes, 30 to 120 seconds in all. Every scene is a full sheet and keeps every rule (8, 12, or 20 seconds, one sakuga shot, at most two lines). The scenes share one cast, palette, style, set of design colors, and voice cast.

1. Break the script into scenes at its own scene breaks. For each scene, find the verb: that action is the sakuga shot. The other actions become the 3-drawing shots around it, or are compressed. Tell the user what was compressed or reordered to fit; don't hide it.
2. Write a sequence brief: the shared fields once, then `scenes: [{id, title, logline, seconds, props, lines, card}]`. `tests/fixtures/stickman-blade-fight/brief.json` is a worked example from a 75-second fight script.
3. `node harness/sequence.js brief.json` writes `films/<slug>/sequence.md`, `sequence.json`, and `scenes/<id>/sheet.md` + `sheet.json` per scene. Show `sequence.md`.
4. The designer works once, for the whole sequence (`films/<slug>/bible.md`, `design/`). The design gate holds for the whole sequence.
5. Then scene by scene, in order: art, motion, cameraman, staff, voice (`node harness/voice.js films/<slug>/scenes/<id>`), render into `compositions/<id>.html`.
6. `node harness/check.js films/<slug>` checks the root mounts and every scene. Then HyperFrames `lint` and `check` on the folder.

What a sequence can't do yet: sound effects and music (add `<audio>` clips by hand or with HyperFrames `media-use`), and camera moves outside push, pan, locked, and shake.
