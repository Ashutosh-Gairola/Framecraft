#!/usr/bin/env node
/**
 * Builds Life on Earth: six scene compositions that all draw the one world in assets/world.js
 * at film time, so the camera path runs unbroken across the scenes; the root index.html; and
 * sfx.json for the ambience and the score.
 *
 *   node films/life-on-earth/build/build.mjs
 *   node harness/sfx.js films/life-on-earth
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

// Each place has its ambience; the score warms from the reef to golden hour.
const SOUNDS = {
  "underwater-20": { kind: "underwater", dur: 20 },
  bubbles: { kind: "bubbles", dur: 4.5 },
  whoosh: { kind: "whoosh" },
  "surf-20": { kind: "surf", dur: 20 },
  "gulls-20": { kind: "gulls", dur: 20 },
  "wind-20": { kind: "wind", dur: 20 },
  "birds-20": { kind: "birds", dur: 20 },
  "stream-20": { kind: "stream", dur: 20 },
  moo: { kind: "moo" },
  "moo-low": { kind: "moo", pitch: 0.85 },
  "traffic-20": { kind: "traffic", dur: 20 },
  "insects-20": { kind: "insects", dur: 20 },
  woodpecker: { kind: "woodpecker" },
  "score-1": { kind: "score", dur: 20, mood: "serene" },
  "score-2": { kind: "score", dur: 20, mood: "warm" },
  "score-3": { kind: "score", dur: 20, mood: "calm" },
  "score-4": { kind: "score", dur: 20, mood: "epic" },
  "score-5": { kind: "score", dur: 20, mood: "wonder" },
  "score-6": { kind: "score", dur: 20, mood: "warm" },
};
const dur = (name) => SOUNDS[name].dur ?? KINDS[SOUNDS[name].kind].dur;
const cue = (name, t, volume) => ({ name, t, volume, dur: dur(name) });

const CUES = {
  "s1-underwater": [cue("underwater-20", 0, 0.8), cue("score-1", 0, 0.32), cue("bubbles", 15.3, 0.55), cue("whoosh", 19.1, 0.45)],
  "s2-coast": [cue("surf-20", 0, 0.75), cue("gulls-20", 0, 0.4), cue("wind-20", 0, 0.25), cue("score-2", 0, 0.34)],
  "s3-countryside": [cue("birds-20", 0, 0.5), cue("stream-20", 0, 0.2), cue("wind-20", 0, 0.2), cue("moo", 12.4, 0.5), cue("moo-low", 15.2, 0.4), cue("score-3", 0, 0.34)],
  "s4-city": [cue("traffic-20", 0, 0.6), cue("whoosh", 15.5, 0.35), cue("birds-20", 0, 0.2), cue("score-4", 0, 0.36)],
  "s5-forest": [cue("birds-20", 0, 0.55), cue("insects-20", 0, 0.3), cue("stream-20", 0, 0.45), cue("woodpecker", 7, 0.45), cue("woodpecker", 12.5, 0.4), cue("score-5", 0, 0.38)],
  "s6-connection": [cue("wind-20", 0, 0.35), cue("birds-20", 0, 0.3), cue("score-6", 0, 0.5)],
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
