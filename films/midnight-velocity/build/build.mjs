#!/usr/bin/env node
/**
 * Builds Midnight Velocity: seven scene compositions that all draw the one world in
 * assets/world.js at film time (the camera path runs unbroken across them), the root
 * index.html with the sound laid out in film time (the score and the ambience run as long
 * beds across the scene seams), and sfx.json.
 *
 *   node films/midnight-velocity/build/build.mjs
 *   node films/midnight-velocity/build/sound.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


const FILM = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEQ = JSON.parse(readFileSync(join(FILM, "sequence.json"), "utf8"));
const W = SEQ.width;
const H = SEQ.height;
const PAINT = { ...SEQ.colors, ...SEQ.designColors };

// The car's sound (engine, turbo, shifts, squeal, pops) and the score are synthesized by
// build/sound.mjs from the same motion model as the picture; rain runs under everything.
const CUES = [
  ["car", 0, 0.9],
  ["score", 0, 0.55],
  ["rain", 0, 0.32],
];
const SOUNDS = {};
const dur = () => 96;
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
    <script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }</script>
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
writeFileSync(join(FILM, "sfx.json"), `${JSON.stringify({ sounds: SOUNDS, note: "synthesized by build/sound.mjs" }, null, 2)}\n`);
console.log(`build: wrote ${SEQ.scenes.length} scenes, index.html, sfx.json`);
