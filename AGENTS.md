# html-anime

You draw anime in code. You do not generate video, and you do not open an editor timeline.

Start with `skills/html-anime-director/SKILL.md`. The director refines the brief, builds the sheet, and runs the crew in order:

| Role | Skill |
| --- | --- |
| Director | `skills/html-anime-director/SKILL.md` |
| Designer | `skills/html-anime-designer/SKILL.md` |
| Actor | `skills/html-anime-actor/SKILL.md` |
| Art | `skills/html-anime-art/SKILL.md` |
| Motion | `skills/html-anime-motion/SKILL.md` and its `references/` cards |
| Cameraman | `skills/html-anime-cameraman/SKILL.md` |
| Staff | `skills/html-anime-staff/SKILL.md`, painting with `skills/html-anime-cel/SKILL.md` and timing with `skills/html-anime-timing/SKILL.md` |
| Voice | `skills/html-anime-voice/SKILL.md` |
| Sound | `skills/html-anime-sound/SKILL.md` |
| Render | `skills/html-anime-render/SKILL.md` |
| Editor | `skills/html-anime-editor/SKILL.md` |
| 3D Actor | `skills/html-anime-3d-actor/SKILL.md` (when the film needs real 3D space: three.js) |
| Character | `skills/html-anime-character/SKILL.md` (every 3D human or humanoid: sculpted, skinned, real or anime, turnaround first) |

The HyperFrames engine skills are vendored in `vendor/hyperframes/skills/`. Where they disagree with an html-anime skill, the html-anime skill wins.

## Tools

```
node harness/sheet.js brief.json          # one film: films/<slug>/sheet.{md,json}
node harness/sequence.js brief.json       # a long script: films/<slug>/sequence.* and one sheet per scene
node harness/voice.js films/<slug>        # voice the lines (or films/<seq>/scenes/<id>)
node harness/sfx.js films/<slug>          # synthesize the film's sound effects and score bed
node harness/check.js films/<slug>        # the sheet rules, before HyperFrames
node harness/refs.js init films/x          # the research sheet: web references for every figure, animal, place
node harness/refs.js palette img --film films/x # a reference photo's colours, mapped to the sheet's paints
node harness/edit.js review renders/x.mp4 # the editor's review: stutter, frozen runs, cuts, colour, loudness
node harness/edit.js master renders/x.mp4 # -14 LUFS, H.264, faststart, for delivery
```

Films with many moving figures draw them with the shared kit, `harness/draw/kit.js`: a rig with inbetweening, effects, timeline helpers, and scene assembly. `films/stickman-blade-fight/build/` and `films/sky-city-duel/build/` are worked examples.

## Not done until

- The shot list sums to the runtime, and every sheet has exactly one sakuga shot.
- Only the hexes on the sheet.
- Every original character has an approved model sheet; every referenced one follows its reference.
- The lines are verbatim. If voiced, every line plays inside its window.
- In the film's directory, all pass:

```
node harness/check.js films/<slug>      (from the repo root)
npx hyperframes lint
npx hyperframes check
```

`films/roof/` is the reference: the file shape, the color-dip cut, a bible, a model sheet, and a voiced line. Draw the sheet you were given, not a remix of it.
