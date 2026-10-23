#!/usr/bin/env node
/**
 * Builds Everest to the Galaxy: six scene compositions that all draw the one world in
 * assets/world.js at film time, so the camera path runs unbroken across the scenes;
 * the root index.html; and sfx.json for the ambience and music bed.
 *
 *   node films/everest-to-galaxy/build/build.mjs
 *   node harness/sfx.js films/everest-to-galaxy
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

// Wind on the mountain, rumble at the volcano, air at the edge of space, a drone in space; a score that builds.
const SOUNDS = {
  "wind-20": { kind: "wind", dur: 20 },
  "rumble-20": { kind: "rumble", dur: 20 },
  "drone-20": { kind: "drone", dur: 20 },
  thunder: { kind: "thunder" },
  boom: { kind: "boom" },
  crackle: { kind: "crackle" },
  "score-1": { kind: "score", dur: 20, mood: "calm" },
  "score-2": { kind: "score", dur: 20, mood: "tense" },
  "score-3": { kind: "score", dur: 20, mood: "epic" },
  "score-4": { kind: "score", dur: 20, mood: "epic" },
  "score-5": { kind: "score", dur: 20, mood: "climax" },
  "score-6": { kind: "score", dur: 20, mood: "serene" },
  bell: { kind: "bell", pitch: 2 },
};
const dur = (name) => SOUNDS[name].dur ?? KINDS[SOUNDS[name].kind].dur;
const cue = (name, t, volume) => ({ name, t, volume, dur: dur(name) });

const CUES = {
  "s1-everest": [cue("wind-20", 0, 0.7), cue("score-1", 0, 0.35)],
  "s2-volcano": [cue("rumble-20", 0, 0.75), cue("score-2", 0, 0.4), cue("boom", 4, 0.5), cue("crackle", 7, 0.4), cue("thunder", 11, 0.5), cue("boom", 15.5, 0.6), cue("wind-20", 0, 0.3)],
  "s3-earth": [cue("wind-20", 0, 0.35), cue("score-3", 0, 0.45), cue("drone-20", 0, 0.35)],
  "s4-space": [cue("drone-20", 0, 0.55), cue("score-4", 0, 0.45)],
  "s5-solar-system": [cue("drone-20", 0, 0.5), cue("score-5", 0, 0.5), cue("bell", 9.5, 0.2)],
  "s6-milky-way": [cue("drone-20", 0, 0.5), cue("score-6", 0, 0.55), cue("bell", 6, 0.18), cue("bell", 13, 0.15)],
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
