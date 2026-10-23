#!/usr/bin/env node
/**
 * Reference research for a film: a place to collect what the real thing looks like and how it
 * moves before anyone draws it, and a palette sampler that turns a reference photo into colours
 * mapped onto the sheet's paints.
 *
 *   node harness/refs.js init films/<slug>                   write films/<slug>/references.md (the research
 *                                                            sheet) and make films/<slug>/references/
 *   node harness/refs.js palette <image> [--film films/<slug>] [--n 8]
 *                                                            the image's dominant colours, their share, and
 *                                                            the nearest sheet paint for each
 *
 * Reference images are for study: measure them, sample them, describe them. Never trace them or
 * ship them in a film; films/<slug>/references/ is git-ignored. Needs ffmpeg for `palette`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ---------------- colour (pure) ---------------- */

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** sRGB (0–255) to CIE Lab, for distances that match the eye. */
export function lab([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const Y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const Z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
export const deltaE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

/**
 * Dominant colours by k-means (deterministic: seeded from evenly spaced pixels).
 * @param {Uint8Array} raw RGB pixels
 * @param {number} k
 * @returns {Array<{hex: string, rgb: number[], share: number}>} largest first
 */
export function kmeans(raw, k = 8, iterations = 12) {
  const n = Math.floor(raw.length / 3);
  const px = (i) => [raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]];
  let centres = Array.from({ length: k }, (_, j) => px(Math.floor(((j + 0.5) / k) * n)));
  const label = new Int32Array(n);
  for (let it = 0; it < iterations; it += 1) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i += 1) {
      const p = px(i);
      let best = 0;
      let bd = Infinity;
      centres.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      label[i] = best;
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3] += 1;
    }
    centres = sums.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centres[j]));
  }
  const counts = centres.map((_, j) => label.filter((l) => l === j).length);
  return centres
    .map((c, j) => ({ hex: hex(c), rgb: c.map(Math.round), share: counts[j] / n }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** The nearest sheet paint to a colour: { name, hex, deltaE }. Over ~12 is a visible miss. */
export function nearestPaint(color, paints) {
  let best = null;
  for (const [name, h] of Object.entries(paints)) {
    const d = deltaE(color, rgb(h));
    if (!best || d < best.deltaE) best = { name, hex: h, deltaE: d };
  }
  return best;
}

/* ---------------- the research sheet ---------------- */

export const TEMPLATE = (title) => `# ${title} — references

Research before drawing. For every subject on screen that exists in the real world (a person's
clothes, an animal, a building, a vehicle, a plant, a sky, water), find references on the web,
write down what they show, and sample their colours. Images are for study only: keep them in
references/ (git-ignored), never trace them, never ship them.

## Subjects

| Subject | Sources (URLs) | Shape and proportion | Colours (sampled → paint) | Movement (timing, gait, arcs) | Do not change |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Light and grade

The time of day and weather the references share; the black point and saturation they hold
(\`node harness/refs.js palette\` on a frame you want to match); the warm/cool split between light
and shadow.

## Movement references

Videos or frame sequences for every action that must read as real (a walk, a gallop, a wingbeat,
cloth in wind): cycle length in frames at 24 fps, the contact and passing poses, how far the body
rises and falls, where the weight is.
`;

function init(film) {
  const dir = resolve(film);
  mkdirSync(join(dir, "references"), { recursive: true });
  const file = join(dir, "references.md");
  if (existsSync(file)) {
    console.log(`refs: ${file} exists; leaving it`);
    return;
  }
  let title = dir.split("/").pop();
  for (const f of ["sequence.json", "sheet.json"]) if (existsSync(join(dir, f))) title = JSON.parse(readFileSync(join(dir, f), "utf8")).title ?? title;
  writeFileSync(file, TEMPLATE(title));
  console.log(`refs: wrote ${file} and ${join(dir, "references")}/`);
}

function palette(image, film, k) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", image, "-vf", "scale=96:96:force_original_aspect_ratio=decrease,format=rgb24", "-frames:v", "1", "-f", "rawvideo", "-"], { maxBuffer: 1 << 26 });
  if (r.status !== 0) {
    console.error(`refs: ffmpeg could not read ${image}`);
    process.exit(1);
  }
  const colours = kmeans(new Uint8Array(r.stdout), k);
  let paints = null;
  if (film) {
    for (const f of ["sequence.json", "sheet.json"]) {
      const p = join(resolve(film), f);
      if (existsSync(p)) {
        const j = JSON.parse(readFileSync(p, "utf8"));
        paints = { ...(j.colors ?? j.palette?.colors), ...(j.designColors ?? {}) };
        break;
      }
    }
  }
  for (const c of colours) {
    const near = paints ? nearestPaint(c.rgb, paints) : null;
    const miss = near && near.deltaE > 12 ? "  ← no close paint: a blend, or a design colour" : "";
    console.log(`${c.hex}  ${(c.share * 100).toFixed(1).padStart(5)}%${near ? `  ≈ ${near.name} ${near.hex} (ΔE ${near.deltaE.toFixed(1)})${miss}` : ""}`);
  }
}

function main() {
  const [cmd, target, ...rest] = process.argv.slice(2);
  const opt = (name, d) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? d : rest[i + 1];
  };
  if (cmd === "init" && target) init(target);
  else if (cmd === "palette" && target && existsSync(target)) palette(target, opt("film"), Number(opt("n", 8)));
  else {
    console.error("usage: node harness/refs.js init films/<slug> | palette <image> [--film films/<slug>] [--n 8]");
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
