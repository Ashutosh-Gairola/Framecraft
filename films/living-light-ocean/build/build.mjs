#!/usr/bin/env node
/**
 * Builds The Living Light of the Ocean: five scene compositions that all draw the one world in
 * assets/world.js at film time (the camera path runs unbroken across them), the root
 * index.html with the sound laid out in film time (the score and the ambience run as long
 * beds across the scene seams), and sfx.json.
 *
 *   node films/living-light-ocean/build/build.mjs
 *   node harness/sfx.js films/living-light-ocean
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS } from "../../../harness/sfx.js";

const FILM = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEQ = JSON.parse(readFileSync(join(FILM, "sequence.json"), "utf8"));
const W = SEQ.width;
const H = SEQ.height;
const PAINT = { ...SEQ.colors, ...SEQ.designColors };

// Surf and night air on the beach; the muffled sea after the dive at ~14.3s; a score that opens
// serene and builds with a second voice underwater, then settles.
const SOUNDS = {
  "surf-15": { kind: "surf", dur: 15 },
  "wind-14": { kind: "wind", dur: 14 },
  "underwater-26": { kind: "underwater", dur: 26 },
  "drone-10": { kind: "drone", dur: 10 },
  bubbles: { kind: "bubbles", dur: 4 },
  whoosh: { kind: "whoosh" },
  "score-serene-40": { kind: "score", dur: 40, mood: "serene" },
  "score-wonder-26": { kind: "score", dur: 26, mood: "wonder" },
};
const dur = (name) => SOUNDS[name].dur ?? KINDS[SOUNDS[name].kind].dur;
const CUES = [
  ["surf-15", 0, 0.75],
  ["wind-14", 0, 0.22],
  ["score-serene-40", 0, 0.28],
  ["whoosh", 14.0, 0.35],
  ["bubbles", 14.2, 0.55],
  ["underwater-26", 14.0, 0.75],
  ["score-wonder-26", 14.0, 0.3],
  ["bubbles", 21.5, 0.2],
  ["bubbles", 27.8, 0.2],
  ["drone-10", 30, 0.32],
];

function composition(scene) {
  const id = scene.id;
  return `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: ${PAINT.ink}; }
    .${id}-cv { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; }
  </style>
  <div id="root" data-composition-id="${id}" data-start="0" data-duration="${scene.seconds}" data-width="${W}" data-height="${H}">
    <canvas id="${id}-cv" class="clip ${id}-cv" data-start="0" data-duration="${scene.seconds}" data-track-index="1" width="${W}" height="${H}"></canvas>
  </div>
  <script>
    (function () {
      // The sheet's paints: the world derives every colour from these.
      const PAINT = ${JSON.stringify(PAINT)};
      window.__hf = window.__hf || {};
      window.__hf.buildReady = window.__hf.buildReady || {};
      let ready;
      const built = new Promise((resolve) => (ready = resolve));
      window.__hf.buildReady["${id}"] = built;
      let render = null;
      let pending = ${scene.start};
      // HyperFrames sends film time; the world is one continuous path across every scene.
      window.addEventListener("hf-seek", (e) => {
        pending = e.detail.time;
        if (render) render(pending);
        else if (e.detail.waitUntil) e.detail.waitUntil(built.then(() => render && render(pending)));
      });
      // "./": a dynamic import without it is a bare package name and never loads.
      import("./assets/world.js")
        .then((world) => {
          render = world.createWorld(document.getElementById("${id}-cv"), PAINT).render;
          render(pending);
        })
        .catch((error) => console.error("${id}: the world failed to load", error))
        .finally(() => ready());
      window.__timelines = window.__timelines || {};
      window.__timelines["${id}"] = gsap.timeline({ paused: true });
    })();
  </script>
</template>
`;
}

mkdirSync(join(FILM, "compositions"), { recursive: true });
for (const scene of SEQ.scenes) writeFileSync(join(FILM, "compositions", `${scene.id}.html`), composition(scene));

const hosts = SEQ.scenes
  .map((s) => `      <div id="${s.id}-host" data-composition-id="${s.id}" data-composition-src="${s.composition}" data-start="${s.start}" data-duration="${s.seconds}" data-track-index="1" data-width="${W}" data-height="${H}"></div>`)
  .join("\n");
const lanes = [];
const audio = CUES.map(([name, t, volume], i) => {
  const d = Math.min(dur(name), SEQ.seconds - t);
  let lane = lanes.findIndex((e) => e <= t + 1e-6);
  if (lane === -1) lane = lanes.push(0) - 1;
  lanes[lane] = t + d;
  return `      <audio id="sfx-${i}" class="clip" src="assets/sfx/${name}.wav" data-start="${t}" data-duration="${d}" data-track-index="${20 + lane}" data-volume="${volume}"></audio>`;
}).join("\n");
writeFileSync(
  join(FILM, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${SEQ.title} — html-anime</title>
    <style>
      html, body { margin: 0; background: ${PAINT.ink}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${PAINT.ink}; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="${SEQ.slug}" data-start="0" data-duration="${SEQ.seconds}" data-width="${W}" data-height="${H}">
${hosts}
${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${SEQ.slug}"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
);
writeFileSync(join(FILM, "sfx.json"), `${JSON.stringify({ sounds: SOUNDS }, null, 2)}\n`);
console.log(`build: wrote ${SEQ.scenes.length} scenes, index.html, sfx.json`);
