---
name: html-anime-render
description: Author an html-anime film as a deterministic HyperFrames HTML composition — timeline registration, a color-dip cut, drawing swaps, the voice track, and the gates (check.js, hyperframes lint and check), rendered at 24 fps. Use when writing or fixing the HTML for a code-drawn anime short.
---

# Render

The film is one HTML file. HyperFrames seeks it. Same file, same frame.

## Folder

```
films/<slug>/
  sheet.md, sheet.json     the brief (node harness/sheet.js)
  bible.md                 design, art, motion, layout
  design/<name>.html       model sheets
  index.html               the film
  assets/voice/line-N.wav  the voiced lines (voice on only)
  voice.json               their placement and mouth tracks
  fonts/*.woff2            the type
```

## Root

```html
<div
  id="root"
  data-composition-id="film"
  data-start="0"
  data-duration="8"
  data-width="1920"
  data-height="1080"
></div>
```

`data-duration` is the runtime on the sheet. Clips inside use `class="clip"`, `data-start`, `data-duration`, and `data-track-index`. Same-track clips do not overlap. `data-track-index` is not z-order. z-index is CSS. Give `#root` an opaque `ink` background so a dip never flashes white.

A single sheet stays one file. Do not split its shots into sub-compositions unless a shot is reused. HyperFrames lint warns `nested_structure_needs_subcomposition` on a one-file film; that warning is expected and is not an error.

## Sequence

A sequence (`harness/sequence.js`) is one sub-composition per scene:

```
films/<seq>/
  sequence.md, sequence.json
  bible.md, design/
  index.html                       the root: mounts every scene, empty paused timeline
  compositions/<scene>.html        one scene, inside <template>
  scenes/<scene>/sheet.json, voice.json
  assets/voice/<scene>/line-N.wav
```

The root carries `data-composition-id="<seq>"` and the total `data-duration`, and mounts each scene with the host tag `sequence.md` prints (`data-composition-src`, `data-start`, `data-duration`). A scene file wraps its styles, markup, and script in `<template>`; its root has `data-composition-id="<scene>"` and the size; its timeline is registered under the scene id; its times start at 0; its asset paths are root-relative (`assets/…`). Everything else in this file applies to each scene.

## Timeline

```js
const tl = gsap.timeline({ paused: true });
// … every tween and set …
window.__timelines = window.__timelines || {};
window.__timelines["film"] = tl;
```

- Build the timeline synchronously. No `async`, `setTimeout`, or `Promise`.
- GSAP 3.14 from `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`.
- Animate transform, opacity, color, stroke. Do not animate `visibility`, `display`, or `autoAlpha`.
- Don't put a CSS `transform` on an element GSAP transforms; wrap it and transform the wrapper. An SVG `transform` attribute on a group that only swaps opacity is fine.
- Do not call `play()` on media or the timeline. No `repeat: -1`. A looping rain field uses a finite `repeat` that covers the runtime.
- No `Math.random()`, `Date.now()`, or reading the clock. If you need variation, write the values out or use a seeded series.
- `tl.set` is allowed at a clip's start time or later. Do not `gsap.set` a later shot's elements before that shot exists.
- The hero frame is the CSS. Tweens describe the way in. Layout before animation.

## How a cut works

Characters do not fade up. The cut is a color dip. This replaces the motion-graphics habit of fading every element in.

Straddle the cut by about a quarter second on each side. The outgoing shot is still fully drawn when the dip covers it. The incoming shot is already in its hero-frame CSS underneath.

```js
tl.set("#dip", { opacity: 0 }, 0);
tl.to("#dip", { opacity: 1, duration: 0.25, ease: "power2.in" }, cut - 0.25);
tl.to("#dip", { opacity: 0, duration: 0.35, ease: "power2.out" }, cut + 0.05);
```

`#dip` is a full-frame element on a higher track, filled with `accent` or `ink`. Scene content does not animate out, except the button shot's last 8 frames to `ink`. An impact flash is not a dip: it is a 1–2 frame `tl.set`, no tween.

Drawing changes inside a shot are `tl.set` opacity swaps, on frame boundaries (multiples of `1/24`).

## Voice

Paste the `<audio>` tags `harness/voice.js` printed inside the composition's root, as is. Each has an `id`, so it's in the mix. Sound effects and the score bed are more `<audio>` clips (see the sound skill). In a sequence, audio times are scene-local; HyperFrames lint notes each one as `nested_media_start_basis_ambiguous`, which is expected. Do not call `play()` on it. The mouth snippet goes in the timeline with the other sets.

## Type and fonts

Prefer a font shipped as a `.woff2` next to the file, with `@font-face`. A render must not depend on a stylesheet fetched at capture time. One family is enough for the line. The font must have glyphs for the line's language.

## Gates

From the repo root, then the film directory:

```
node harness/check.js films/<slug>
cd films/<slug>
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at <the middle of every shot>
```

All clean, and you have looked at the snapshots. `validate` is a deprecated alias of `check`; don't run both. Then `npx hyperframes preview` and watch it.

Render at the sheet's frame rate. The HyperFrames default is 30 fps, which breaks twos:

```
npx hyperframes render --fps 24 --quality delivery --output renders/<slug>.mp4
```

## Engine details

The HyperFrames skills are vendored at `vendor/hyperframes/skills/` (the render contract in `hyperframes/SKILL.md`, the CLI in `hyperframes-cli/SKILL.md`). Read them for engine questions this file does not answer. Where they disagree with an html-anime skill (a fade-in on a character, 30 fps, one sub-composition per scene, CSS blur for motion), the html-anime skill wins.
