#!/usr/bin/env node
/**
 * Builds Mountain Shrine: four scene compositions that all draw the one world in
 * assets/world.js at film time, so the camera path runs unbroken across the scenes;
 * the root index.html; and sfx.json for the ambience and music bed.
 *
 *   node films/mountain-shrine/build/build.mjs
 *   node harness/sfx.js films/mountain-shrine
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

// Ambience runs the whole film, split per scene; bells and the music swell are placed.
const SOUNDS = {
  "wind-20": { kind: "wind", dur: 20 },
  "stream-20": { kind: "stream", dur: 20 },
  "birds-20": { kind: "birds", dur: 20 },
  bell: { kind: "bell" },
  "bell-hi": { kind: "bell", pitch: 1.5 },
  "score-a": { kind: "score", dur: 20, mood: "serene" },
  "score-b": { kind: "score", dur: 20, mood: "calm" },
};
const dur = (name) => SOUNDS[name].dur ?? KINDS[SOUNDS[name].kind].dur;
const cue = (name, t, volume) => ({ name, t, volume, dur: dur(name) });

const CUES = {
  "s1-above-the-clouds": [cue("wind-20", 0, 0.5), cue("score-a", 0, 0.45), cue("bell", 14.5, 0.35)],
  "s2-the-valley": [cue("wind-20", 0, 0.35), cue("stream-20", 0, 0.55), cue("birds-20", 0, 0.4), cue("score-b", 0, 0.4)],
  "s3-the-shrine": [cue("wind-20", 0, 0.5), cue("score-a", 0, 0.45), cue("bell", 4, 0.6), cue("bell-hi", 9.5, 0.4), cue("bell", 15, 0.5)],
  "s4-the-range": [cue("wind-20", 0, 0.55), cue("score-b", 0, 0.45), cue("bell", 6, 0.3)],
};

function composition(scene) {
  const id = scene.id;
  const lanes = [];
  const audio = (CUES[id] ?? [])
    .sort((a, b) => a.t - b.t)
    .map((x, i) => {
      const d = Math.min(x.dur, scene.seconds - x.t);
      let lane = lanes.findIndex((e) => e <= x.t + 1e-6);
      if (lane === -1) lane = lanes.push(0) - 1;
      lanes[lane] = x.t + d;
      return `    <audio id="${id}-fx${i}" class="clip" src="assets/sfx/${x.name}.wav" data-start="${x.t}" data-duration="${d}" data-track-index="${20 + lane}" data-volume="${x.volume}"></audio>`;
    })
    .join("\n");
  return `<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: ${PAINT.moon}; }
    .${id}-cv { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; }
  </style>
  <div id="root" data-composition-id="${id}" data-start="0" data-duration="${scene.seconds}" data-width="${W}" data-height="${H}">
    <canvas id="${id}-cv" class="clip ${id}-cv" data-start="0" data-duration="${scene.seconds}" data-track-index="1" width="${W}" height="${H}"></canvas>
${audio}
  </div>
  <script>
    (function () {
      // The sheet's paints: the world derives every color from these.
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
writeFileSync(
  join(FILM, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${SEQ.title} — html-anime</title>
    <style>
      html, body { margin: 0; background: ${PAINT.moon}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${PAINT.moon}; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="${SEQ.slug}" data-start="0" data-duration="${SEQ.seconds}" data-width="${W}" data-height="${H}">
${hosts}
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
