<h1 align="center">html-anime</h1>

<p align="center">
  <b>Prompt an anime. Your coding agent draws it in code.</b>
</p>

<p align="center">
  <a href="https://github.com/blixvip/html-anime/stargazers"><img src="https://img.shields.io/github/stars/blixvip/html-anime?style=flat-square&color=e8434b" alt="GitHub stars"></a>
  <a href="https://blixvip.github.io/html-anime/"><img src="https://img.shields.io/badge/site-blixvip.github.io%2Fhtml--anime-111?style=flat-square" alt="Site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111?style=flat-square" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/render-HyperFrames-111?style=flat-square" alt="HyperFrames">
  <img src="https://img.shields.io/badge/agents-Claude%20%C2%B7%20Codex%20%C2%B7%20Cursor%20%C2%B7%20Grok-111?style=flat-square" alt="Claude, Codex, Cursor, Grok">
  <a href="https://discord.gg/zEB4VjmfSb"><img src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://blixvip.github.io/html-anime/"><img src="media/city.jpg" width="860" alt="A moon over the night city, a still from Kokuyō"></a>
</p>

<p align="center">
  <sub>A still from <i>Kokuyō</i>, drawn entirely in HTML. <a href="https://blixvip.github.io/html-anime/">Watch it on the site</a> · <a href="media/film.mp4">media/film.mp4</a></sub>
</p>

An anime, written as HTML. You write a scene. [The site](https://blixvip.github.io/html-anime/) turns it into a shot sheet: holds, one expensive shot, a closed color script, an art style, the cast, and the voice. Paste that sheet into Claude, Codex, Cursor, or Grok. A crew of agent skills draws it: a director, a designer, art, motion, a cameraman, the animation staff, voice, and render.

The pictures are HTML, timed for [HyperFrames](https://github.com/heygen-com/hyperframes). Nothing here calls a video model.

## The film

Kokuyō. Watch it on [the site](https://blixvip.github.io/html-anime/) or open [media/film.mp4](media/film.mp4).

<table>
  <tr>
    <td width="50%"><img src="media/moon.jpg" alt="A cracked moon falling through rain"></td>
    <td width="50%"><img src="media/fight.jpg" alt="Two figures crossing blades in front of the moon"></td>
  </tr>
  <tr>
    <td width="50%"><img src="media/helm.jpg" alt="A dark helm with a red crescent"></td>
    <td width="50%"><img src="media/ren.jpg" alt="A close-up washed in white light"></td>
  </tr>
</table>

## Start

```
git clone https://github.com/blixvip/html-anime.git
cd html-anime
```

Open the folder in the agent you already use and paste a sheet as the first message. The site builds the sheet in the browser. `harness/compile.js` builds the same sheet in Node.

Serve the site from this folder, then open the address it prints:

```
python -m http.server
```

Opening `index.html` as a file shows that same instruction. The sheet will not run until the folder is served.

Or build a sheet in Node (no dependencies):

```js
import { compileBrief } from "./harness/compile.js";

const sheet = compileBrief({
  logline: "On a roof in the rain, a red moon opens and a line of light falls.",
  seconds: 8,                 // 8, 12, or 20
  aspect: "16:9",             // or "9:16"
  script: "indigo",           // indigo, eclipse, noon, or festival
  style: "ink-cel",           // ink-cel, retro, painted-world, manga, or chibi
  dialogue: "The rain hid the sound of the blade.",
  cast: "Ren: original",      // "Name", or "Name: path/to/reference.png" or written notes
  props: "a short blade, held low",
  voice: { mode: "line", emotion: "resolve", register: "male" },
});
console.log(sheet.ok ? sheet.markdown : sheet.error);
```

Or from the command line, saving the sheet next to the film:

```
node harness/sheet.js brief.json        # films/<slug>/sheet.md and sheet.json
```

| Agent | What it reads | Open |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` | `claude` |
| Codex | `AGENTS.md` | `codex` |
| Cursor | `.cursor/rules/html-anime.mdc` | `cursor .` |
| Grok | `AGENTS.md` | `grok` |

## The crew

| Role | Skill | Job |
| --- | --- | --- |
| Director | `skills/html-anime-director/` | Refines the brief, builds the sheet (or a sequence), holds the gates, signs off |
| Designer | `skills/html-anime-designer/` | An original character gets a model sheet example to approve first; a reference is followed exactly |
| Actor | `skills/html-anime-actor/` | Each character as a spec: appearance, every garment with its own cloth physics, a movement profile, a pose library |
| Art | `skills/html-anime-art/` | Which style to follow, color roles, value, backgrounds, shape language |
| Motion | `skills/html-anime-motion/` | Key poses, grips, pivots, and frame counts: blades, strikes, locomotion, handling tools, bows, cloth and hair, effects |
| Cameraman | `skills/html-anime-cameraman/` | Size, angle, lens feel, placement, the one move per shot |
| Staff | `skills/html-anime-staff/` | Layout, keys, inbetweens, correction against the model sheet, finishing (with `cel` and `timing`) |
| Voice | `skills/html-anime-voice/` | A voice per character, any language, with emotion; generates the audio and the mouth track |
| Sound | `skills/html-anime-sound/` | Sword clangs, impacts, whooshes, thunder, wind, charges, taiko, and a score bed, synthesized and cued to the picture |
| Render | `skills/html-anime-render/` | The HyperFrames file and the gates, at 24 fps |
| Editor | `skills/html-anime-editor/` | Reviews every render (stutter, frozen runs, cuts, flashes, loudness), rhythm and continuity, mastering |
| 3D Actor | `skills/html-anime-3d-actor/` | three.js characters, buildings, and environments with real camera moves, deterministic for HyperFrames |

Claude Code also finds them in `.claude/skills/`, so `/html-anime-director` works.

## Voice

```
node harness/voice.js films/<slug>                     # voice the sheet's lines
node harness/voice.js films/<slug> --emotion sad --lang es --voice Mónica
node harness/voice.js --list --lang ja                 # emotions, languages, installed voices
```

Engines, tried in order: Kokoro through `npx hyperframes tts` (local, no key), macOS `say`, espeak-ng. Or pass your own recording with `--source`. ffmpeg shapes the emotion: pitch, tone, tremolo, loudness. The line is placed after the cut into its shot (or as a J-cut), and a mouth track on twos comes out of the real audio.

## Sequences

A script longer than 20 seconds becomes a sequence: 2 to 8 scenes, 30 to 120 seconds, each scene a full sheet that keeps every rule, sharing one cast, palette, style, and voice cast. Each scene renders as a HyperFrames sub-composition.

```
node harness/sequence.js brief.json      # films/<slug>/sequence.md and one sheet per scene
```

`tests/fixtures/stickman-blade-fight/` is a worked example: a five-scene, 84-second fight with two voiced characters. `films/sky-city-duel/` is a six-scene, 104-second aerial duel with full anime characters, wings, a dragon and a phoenix, and synthesized sound. `films/mountain-shrine/` (80 s), `films/everest-to-galaxy/` (120 s) and `films/life-on-earth/` (120 s) are single continuous three.js shots: a Himalayan shrine with pilgrims and wildlife; a journey from Everest through a volcano, Earth, the planets, and the Milky Way; and a journey from a coral reef over the coast, the countryside, a city with live traffic, and a forest, to golden hour.

## What is in the repo

- `index.html`, `site.css`, `site.js`, `tokens.css` — the site
- `skills/` — the crew, above
- `harness/compile.js` — scene to sheet (with `palettes.js`, `plans.js`, `styles.js`, `cast.js`, `motion.js`, `voice-profiles.js`)
- `harness/sheet.js`, `harness/sequence.js` — write sheets to `films/`
- `harness/voice.js`, `harness/voice-lib.js` — generate and place the voice
- `harness/check.js` — the sheet rules, checked on a film or a sequence
- `harness/sfx.js` — procedural sound effects and a score bed (ffmpeg)
- `harness/draw/kit.js` — the drawing kit: rig, spline inbetweening on ones, cloth state, effects, scene assembly
- `harness/refs.js` — research before drawing: `init` writes a film's `references.md`; `palette` samples a reference photo's colours and maps them to the sheet's paints
- `harness/edit.js` — the editor's bench: `review` (stutter, frozen runs, shots, flashes, colour grade, loudness, contact sheet) and `master`
- `harness/templates/three-scene.html` — a working three.js scene for HyperFrames
- `harness/templates/` — the bible and model sheet the designer starts from
- `vendor/hyperframes/` — the HyperFrames engine skills (Apache-2.0), pinned
- `media/film.mp4` — Kokuyō, the film
- `media/city.jpg`, `media/moon.jpg`, `media/fight.jpg`, `media/helm.jpg`, `media/ren.jpg` — stills from it
- `films/roof/` — an 8 second reference: file shape, the color-dip cut, a bible, a model sheet, a voiced line. Not a film to remix
- `tests/fixtures/` — scripts used as end-to-end tests
- `AGENTS.md` — the contract

## Test

```
npm test
```

Checks that every runtime sums exactly and has one sakuga shot; that the sheet carries the size, frame count, cast, motion cards, style, lines, and voice; the voice helpers (placement, mouth track, emotion filters); `check.js` against the reference film and a broken copy of it; and the stickman fight fixture as a full sequence.

## Render the reference

```
cd films/roof
npx hyperframes preview
```

Check before you trust a new film:

```
node harness/check.js films/<slug>      # from the repo root
npx hyperframes lint                    # in the film directory
npx hyperframes check
```

Render at 24 fps (the HyperFrames default is 30, which breaks twos):

```
npx hyperframes render --fps 24 --quality delivery --output renders/<slug>.mp4
```

## Sheet rules the agent is not allowed to break

- Shot times sum to 8, 12, or 20 seconds (a longer script is a sequence of such sheets)
- One sakuga shot (8 keys). The others get three keys
- Full animation by default: every frame between keys is inbetweened, eased, on twos for acting and ones for fast action; holds breathe. `animation: "limited"` gives the classic held-drawing look
- Only the hexes printed on the sheet
- No animation before the model sheets exist. An original character waits for your yes
- The lines you wrote, verbatim, at most two per sheet, or no dialogue at all

## Community

💬 [Join the Discord](https://discord.gg/zEB4VjmfSb) for questions, help, feedback, and updates.

## License

[MIT](LICENSE). The reference film's font keeps its own license: see [films/roof/fonts/NOTICE.txt](films/roof/fonts/NOTICE.txt).
