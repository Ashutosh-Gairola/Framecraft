---
name: html-anime-sound
description: Sound design for a code-drawn anime — sword clangs, impacts, whooshes, thunder, wind, energy charges, creature calls, taiko, and a score bed, synthesized with harness/sfx.js and cued to the picture (impacts on contact frames, silence before the climax). Use when an html-anime film needs sound effects or music, or the script asks for impacts, metal, ambience, or a soundtrack.
---

# Sound

Sound sells the hit. A clash with no clang is a picture; a clash with a clang is an event.

## The kit

`harness/sfx.js` synthesizes every sound from a formula with ffmpeg. Same formula, same sound, every render. `node harness/sfx.js --list` prints the kinds:

| Kind | Use |
| --- | --- |
| `clang` | Metal on metal. `pitch` 1.3 for a light parry, 0.75 for a heavy bind |
| `shing` | A blade drawn, a glint, energy weapons appearing |
| `impact` | A body or a strike landing. `pitch` 0.7 for heavy landings and collapsing stone |
| `boom` | The one big explosion of a scene |
| `whoosh` | A fast move, a leap, a projectile. `dur` 0.9 for long sweeps |
| `burst` | A vanish, a teleport, a flare |
| `thunder` | Lightning on the horizon; aftermath rumble |
| `wind` | Ambience under a whole scene (`dur` = the scene) |
| `charge` | Power building (`dur` = the charge) |
| `crackle` | Lightning crawling on a blade, sparks in a bind |
| `roar`, `cry` | Creatures: a dragon, a phoenix |
| `taiko` | Drum hits on the beat in action scenes |
| `stream`, `birds`, `bell`, `rumble`, `drone` | Nature and place: running water, birdsong, a temple bell, the earth, space |
| `underwater`, `bubbles`, `surf`, `gulls` | The sea: the muffled hush below, rising bubbles, waves on a beach, seabirds |
| `traffic`, `insects`, `moo`, `woodpecker` | A city street; crickets in a forest; a cow lowing; a woodpecker drumming |
| `score` | A synthesized music bed by `mood`: `calm`, `tense`, `epic`, `climax`, `fade`, `serene`, `warm`, `wonder` |

The score is a drone with a pulse, not an orchestra. For a real soundtrack, the user supplies a file; play it as one `<audio>` clip per scene, cut the same way.

## Cue it

The film's build writes `sfx.json` (every sound by name: kind and parameters) and passes cues to the kit's `scene(…, { sounds })`: `[{ name, t, dur, volume }]` in scene time. The kit lays the clips on tracks that never overlap. Then:

```
node harness/sfx.js films/<slug>
```

renders `assets/sfx/<name>.wav`. `films/sky-city-duel/build/build.mjs` (`SOUNDS`, `CUES`) is a worked cue sheet.

## Rules

- **On the frame.** An impact sound starts on the contact frame, the same `t` as the impact flash and the shake. A whoosh starts 0.2s before the move it carries.
- **One loud thing at a time.** The boom gets volume 1; the score ducks under it, or stops.
- **Silence is a sound.** Before the climax's impact, cut the score for about half a second (end one score clip, start the next after the impact). Before the last flash, end everything.
- **Layer, don't stack.** A big hit is a clang plus an impact plus a short crackle, not three clangs.
- **Ambience under everything.** Wind or rain at 0.4–0.6 for the whole scene, so cuts between shots don't drop to dead air.
- **Volumes.** Score 0.4–0.55, ambience 0.4–0.6, effects 0.3–0.9, the one big hit 1.
- **No narration or captions** unless the sheet has lines; sound design never adds words.

## Done

`sfx.json` lists every sound the cues use, `node harness/sfx.js` renders them, every `<audio>` has an `id`, and you have listened to the render once with sound on.
