#!/usr/bin/env node
/**
 * The editor's bench: review a render the way an editor would, and master it for delivery.
 *
 *   node harness/edit.js review renders/film.mp4         cuts, shot lengths, stutter, frozen runs,
 *                                                         flash frames, colour (dull stretches),
 *                                                         loudness, and a contact sheet
 *   node harness/edit.js master renders/film.mp4 --out renders/film-master.mp4
 *                                                         loudness to -14 LUFS, H.264 yuv420p, faststart
 *   node harness/edit.js sheet renders/film.mp4 --every 2 one frame every N seconds, tiled, as a PNG
 *
 * Needs ffmpeg and ffprobe. The analysis functions are exported for tests.
 */

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AW = 64;
const AH = 36;

/* ---------------- analysis (pure) ---------------- */

/**
 * Per-frame mean absolute difference from the previous frame (0–255), from gray frames.
 * @param {Uint8Array} raw concatenated AW×AH gray frames
 * @param {number} [size=AW*AH]
 * @returns {{diffs: number[], luma: number[]}}
 */
export function frameStats(raw, size = AW * AH) {
  const n = Math.floor(raw.length / size);
  const diffs = [0];
  const luma = [];
  for (let f = 0; f < n; f += 1) {
    let sum = 0;
    let d = 0;
    for (let i = 0; i < size; i += 1) {
      const v = raw[f * size + i];
      sum += v;
      if (f > 0) d += Math.abs(v - raw[(f - 1) * size + i]);
    }
    luma.push(sum / size);
    if (f > 0) diffs.push(d / size);
  }
  return { diffs, luma };
}

/**
 * Read the edit from the frame differences.
 * - cuts: frames whose difference jumps far above its neighbors
 * - stutter: inside shots, the share of frames that barely change while their neighbors do
 *   (a drawing held for two or more frames reads as a slideshow)
 * - frozen: runs of nearly identical frames longer than `frozenFrames`
 * - flashes: runs of near-white or near-black frames
 * @param {{diffs: number[], luma: number[]}} stats
 * @param {{fps?: number, frozenFrames?: number}} [opts]
 */
export function analyze({ diffs, luma }, { fps = 24, frozenFrames = 12 } = {}) {
  const n = diffs.length;
  const cuts = [];
  for (let i = 1; i < n; i += 1) {
    const around = [diffs[i - 2], diffs[i - 1], diffs[i + 1], diffs[i + 2]].filter((x) => x != null);
    const base = around.reduce((a, b) => a + b, 0) / Math.max(1, around.length);
    if (diffs[i] > 18 && diffs[i] > base * 3) cuts.push(i);
  }
  const bounds = [0, ...cuts, n];
  const shots = [];
  for (let i = 0; i < bounds.length - 1; i += 1) shots.push({ start: bounds[i] / fps, seconds: (bounds[i + 1] - bounds[i]) / fps });

  let moving = 0;
  let held = 0;
  const cutSet = new Set(cuts);
  for (let i = 2; i < n - 1; i += 1) {
    if (cutSet.has(i) || cutSet.has(i + 1)) continue;
    const near = (diffs[i - 1] + diffs[i + 1]) / 2;
    if (near < 0.4) continue;
    moving += 1;
    if (diffs[i] < near * 0.35) held += 1;
  }

  const frozen = [];
  let run = 0;
  for (let i = 1; i <= n; i += 1) {
    if (i < n && diffs[i] < 0.08) run += 1;
    else {
      if (run >= frozenFrames) frozen.push({ start: (i - run) / fps, seconds: run / fps });
      run = 0;
    }
  }

  const flashes = [];
  let kind = null;
  let from = 0;
  for (let i = 0; i <= luma.length; i += 1) {
    const k = i < luma.length ? (luma[i] > 235 ? "white" : luma[i] < 8 ? "black" : null) : null;
    if (k !== kind) {
      if (kind) flashes.push({ kind, start: from / fps, frames: i - from });
      kind = k;
      from = i;
    }
  }

  return {
    frames: n,
    seconds: n / fps,
    cuts: cuts.map((c) => c / fps),
    shots,
    stutter: moving ? held / moving : 0,
    frozen,
    flashes,
  };
}

/**
 * Colour per sampled frame, from RGB frames: colourfulness (Hasler–Süsstrunk M; under ~25 reads
 * washed out, 35–60 is a lively grade, over ~90 garish) and contrast (the spread of luma, 0–255;
 * under ~40 reads flat and grey), saturation (mean HSV saturation of the mid-tones, 0–1; under
 * ~0.32 reads pastel), and the black point (the 5th-percentile luma, 0–255; over ~40 is haze,
 * a picture with no true darks).
 * @param {Uint8Array} raw concatenated RGB frames of `size` pixels each
 * @param {number} size
 * @returns {{colorfulness: number[], contrast: number[], saturation: number[], black: number[]}}
 */
export function colorStats(raw, size) {
  const n = Math.floor(raw.length / (size * 3));
  const colorfulness = [];
  const contrast = [];
  const saturation = [];
  const black = [];
  for (let f = 0; f < n; f += 1) {
    let sRG = 0;
    let sYB = 0;
    let qRG = 0;
    let qYB = 0;
    let sL = 0;
    let qL = 0;
    let sat = 0;
    let mids = 0;
    const lumas = new Float32Array(size);
    for (let i = 0; i < size; i += 1) {
      const k = (f * size + i) * 3;
      const r = raw[k];
      const g = raw[k + 1];
      const b = raw[k + 2];
      const rg = r - g;
      const yb = 0.5 * (r + g) - b;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sRG += rg;
      sYB += yb;
      qRG += rg * rg;
      qYB += yb * yb;
      sL += l;
      qL += l * l;
      lumas[i] = l;
      const hi = Math.max(r, g, b);
      const lo = Math.min(r, g, b);
      if (hi > 40 && hi < 245) {
        sat += (hi - lo) / hi;
        mids += 1;
      }
    }
    lumas.sort();
    saturation.push(mids ? sat / mids : 0);
    black.push(lumas[Math.floor(size * 0.05)]);
    const m = (s) => s / size;
    const sd = (s, q) => Math.sqrt(Math.max(0, m(q) - m(s) ** 2));
    colorfulness.push(Math.hypot(sd(sRG, qRG), sd(sYB, qYB)) + 0.3 * Math.hypot(m(sRG), m(sYB)));
    contrast.push(2 * sd(sL, qL));
  }
  return { colorfulness, contrast, saturation, black };
}

/**
 * Colour verdict over the film: means, and the stretches (≥ 2 samples) that read dull or flat.
 * @param {{colorfulness: number[], contrast: number[]}} stats one sample per `every` seconds
 * @param {number} every
 */
export function colorVerdict({ colorfulness, contrast, saturation = [], black = [] }, every = 1) {
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const dull = [];
  let from = -1;
  for (let i = 0; i <= colorfulness.length; i += 1) {
    const bad = i < colorfulness.length && (colorfulness[i] < 25 || contrast[i] < 40 || (saturation[i] ?? 1) < 0.32 || (black[i] ?? 0) > 40);
    if (bad && from < 0) from = i;
    if (!bad && from >= 0) {
      if (i - from >= 2) dull.push({ start: from * every, seconds: (i - from) * every });
      from = -1;
    }
  }
  return { colorfulness: mean(colorfulness), contrast: mean(contrast), saturation: mean(saturation), black: mean(black), dull };
}

/* ---------------- ffmpeg ---------------- */

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) {
    console.error(`edit: ${cmd} failed: ${String(r.stderr).trim().split("\n").slice(-3).join(" ")}`);
    process.exit(1);
  }
  return r;
}

function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,r_frame_rate,width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === "video");
  const [a, b] = (v?.r_frame_rate ?? "24/1").split("/").map(Number);
  return { duration: Number(j.format.duration), fps: a / b, width: v?.width, height: v?.height, audio: j.streams.some((s) => s.codec_type === "audio") };
}

function loudness(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const text = r.stderr ?? "";
  const integrated = text.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1)?.match(/-?[\d.]+/)?.[0];
  const peak = text.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.at(-1)?.match(/-?[\d.]+/)?.[0];
  return { lufs: integrated == null ? null : Number(integrated), peak: peak == null ? null : Number(peak) };
}

function contactSheet(file, out, every, info) {
  const n = Math.max(1, Math.floor(info.duration / every));
  const cols = 6;
  const rows = Math.ceil(n / cols);
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `fps=1/${every},scale=320:-1,tile=${cols}x${rows}`, "-frames:v", "1", out]);
}

function review(file) {
  const info = probe(file);
  const raw = run("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${AW}:${AH},format=gray`, "-f", "rawvideo", "-"]).stdout;
  const a = analyze(frameStats(new Uint8Array(raw.buffer, raw.byteOffset, raw.length)), { fps: info.fps });
  const rgb = run("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=1,scale=${AW}:${AH},format=rgb24`, "-f", "rawvideo", "-"]).stdout;
  const color = colorVerdict(colorStats(new Uint8Array(rgb.buffer, rgb.byteOffset, rgb.length), AW * AH), 1);
  const loud = info.audio ? loudness(file) : null;
  const sheet = join(dirname(file), `${basename(file, extname(file))}-sheet.png`);
  contactSheet(file, sheet, 2, info);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
  console.log(`${basename(file)} · ${info.width}×${info.height} · ${info.fps} fps · ${info.duration.toFixed(2)}s · ${a.frames} frames`);
  console.log(`\nShots: ${a.shots.length} (mean ${(a.seconds / a.shots.length).toFixed(2)}s, shortest ${Math.min(...a.shots.map((s) => s.seconds)).toFixed(2)}s, longest ${Math.max(...a.shots.map((s) => s.seconds)).toFixed(2)}s)`);
  const pct = (a.stutter * 100).toFixed(1);
  console.log(`Stutter: ${pct}% of moving frames are held drawings${a.stutter > 0.25 ? " — reads as a slideshow; inbetween on ones" : a.stutter > 0.1 ? " — some held drawings; fine for acting on twos" : " — smooth"}`);
  console.log(`Frozen runs (≥ 0.5s, nothing moves): ${a.frozen.length ? a.frozen.map((f) => `${fmt(f.start)} for ${f.seconds.toFixed(2)}s`).join(", ") : "none"}`);
  const long = a.flashes.filter((f) => f.frames > 4);
  console.log(`Flash frames: ${a.flashes.filter((f) => f.kind === "white").length} white, ${a.flashes.filter((f) => f.kind === "black").length} black${long.length ? `; long: ${long.map((f) => `${f.kind} ${fmt(f.start)} ${f.frames}f`).join(", ")}` : ""}`);
  const grade =
    color.colorfulness > 90 ? " — garish: pull saturation back"
    : color.black > 40 ? " — hazy: no true darks; lower the black point (art skill, Colour grade)"
    : color.saturation < 0.32 ? " — pastel: the mid-tones need saturation (art skill, Colour grade)"
    : color.colorfulness < 25 ? " — washed out: grade it (art skill, Colour grade)"
    : color.contrast < 40 ? " — flat: widen the values"
    : " — lively";
  console.log(`Colour: colourfulness ${color.colorfulness.toFixed(0)}, saturation ${color.saturation.toFixed(2)}, black point ${color.black.toFixed(0)}, contrast ${color.contrast.toFixed(0)}${grade}${color.dull.length ? `; dull: ${color.dull.map((d) => `${fmt(d.start)} for ${d.seconds}s`).join(", ")}` : ""}`);
  if (loud) console.log(`Loudness: ${loud.lufs} LUFS integrated, ${loud.peak} dBFS peak${loud.lufs != null && (loud.lufs < -18 || loud.lufs > -12) ? " — master to -14 LUFS (edit.js master)" : ""}`);
  else console.log("Loudness: no audio track");
  console.log(`\nContact sheet: ${sheet}`);
  writeFileSync(join(dirname(file), `${basename(file, extname(file))}-review.json`), `${JSON.stringify({ info, ...a, color, loudness: loud }, null, 2)}\n`);
}

function master(file, out) {
  const info = probe(file);
  const args = ["-v", "error", "-y", "-i", file];
  if (info.audio) args.push("-af", "loudnorm=I=-14:TP=-1:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000");
  args.push("-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", String(info.fps), "-movflags", "+faststart", out);
  run("ffmpeg", args);
  console.log(`edit: mastered ${out}${info.audio ? ` (${JSON.stringify(loudness(out))})` : ""}`);
}

function main() {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const opt = (name, d) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? d : rest[i + 1];
  };
  if (!cmd || !file || !existsSync(file)) {
    console.error("usage: node harness/edit.js review|master|sheet <video> [--out file] [--every seconds]");
    process.exit(1);
  }
  const path = resolve(file);
  if (cmd === "review") review(path);
  else if (cmd === "master") master(path, resolve(opt("out", path.replace(/(\.\w+)$/, "-master$1"))));
  else if (cmd === "sheet") {
    const out = path.replace(/(\.\w+)$/, "-sheet.png");
    contactSheet(path, out, Number(opt("every", 2)), probe(path));
    console.log(out);
  } else {
    console.error(`edit: unknown command ${cmd}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
