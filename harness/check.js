#!/usr/bin/env node
/**
 * Check a film, or a whole sequence, against its sheets before HyperFrames sees it.
 *
 *   node harness/check.js films/<slug>      a film (sheet.json) or a sequence (sequence.json)
 *
 * Errors break a sheet rule (runtime, size, paints, determinism, dialogue,
 * design gate, voice, sequence mounts). Warnings are craft notes the director
 * weighs. Exit code 1 when there is any error.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NAMED_OK = new Set(["none", "transparent", "currentcolor", "inherit"]);
const BANNED = [
  [/Math\.random\s*\(/, "Math.random() — write the values out or use a seeded series"],
  [/Date\.now\s*\(|new Date\s*\(|performance\.now\s*\(/, "reads the clock"],
  [/setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(/, "timers — build the timeline synchronously"],
  [/\basync\s+function|\basync\s*\(|\bawait\s|new Promise\s*\(/, "async code — build the timeline synchronously"],
  [/repeat\s*:\s*-1/, "repeat: -1 — use a finite repeat that covers the runtime"],
  [/\.play\s*\(\s*\)/, "calls play() — HyperFrames seeks; never play media or the timeline"],
];

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function expand(hex) {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The sheet's lines, for sheets written before lines existed too. */
function linesOf(sheet) {
  return sheet.lines ?? (sheet.dialogue ? [{ text: sheet.dialogue, shot: "button" }] : []);
}

/** Paints, determinism, timeline registration, and size on one composition's HTML. */
function checkMarkup(html, sheet, label, { errors, warnings }, { scene = false } = {}) {
  const at = label ? `${label}: ` : "";
  const rootTag = html.match(/<[^>]*\bdata-composition-id="[^"]*"[^>]*>/)?.[0];
  if (!rootTag) {
    errors.push(`${at}no root element with data-composition-id.`);
  } else {
    const id = attr(rootTag, "data-composition-id");
    if (scene && id !== sheet.sequence.scene) {
      errors.push(`${at}data-composition-id is "${id}", the scene is "${sheet.sequence.scene}".`);
    }
    const duration = attr(rootTag, "data-duration");
    if ((!scene || duration !== undefined) && Number(duration) !== sheet.seconds) {
      errors.push(`${at}root data-duration is ${duration}, the sheet says ${sheet.seconds}.`);
    }
    if (Number(attr(rootTag, "data-width")) !== sheet.width || Number(attr(rootTag, "data-height")) !== sheet.height) {
      errors.push(`${at}root size is ${attr(rootTag, "data-width")}×${attr(rootTag, "data-height")}, the sheet says ${sheet.width}×${sheet.height}.`);
    }
    const registered = new RegExp(`__timelines\\s*(\\[\\s*["']${id}["']\\s*\\]|\\.${id}\\b)\\s*=`).test(html);
    if (!registered) errors.push(`${at}the timeline is not registered as window.__timelines["${id}"].`);
  }
  if (scene && !/<template\b/.test(html)) errors.push(`${at}a scene file keeps its markup inside <template>.`);

  const allowed = new Set([...Object.values(sheet.colors), ...Object.values(sheet.designColors ?? {})].map(expand));
  const strayHex = new Set();
  for (const m of html.matchAll(/(?:[:=(,]\s*["']?|\s)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g)) {
    const hex = expand(m[1]);
    if (!allowed.has(hex)) strayHex.add(hex);
  }
  if (strayHex.size) errors.push(`${at}hexes not on the sheet: ${[...strayHex].join(", ")}.`);
  if (/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/i.test(html)) {
    errors.push(`${at}color functions (rgb, hsl, color-mix…) — use the sheet's hexes and opacity instead.`);
  }
  const named = new Set();
  for (const m of html.matchAll(/\b(?:fill|stroke|stop-color|color|background(?:-color)?)\s*[:=]\s*["']?([a-zA-Z]+)\b/g)) {
    const word = m[1].toLowerCase();
    if (!NAMED_OK.has(word) && !word.startsWith("url") && !word.startsWith("var")) named.add(word);
  }
  if (named.size) errors.push(`${at}named colors: ${[...named].join(", ")}.`);

  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  // A 3D scene loads through HyperFrames' ready gate and draws on "hf-seek": async loading is the protocol there.
  const seekDriven = /__hf\.buildReady/.test(scripts) && /hf-seek/.test(scripts);
  for (const [re, why] of BANNED) {
    if (seekDriven && why.startsWith("async code")) continue;
    if (re.test(scripts)) errors.push(`${at}${why}`);
  }
  if (/\b(?:visibility|display|autoAlpha)\s*:/.test(scripts.replace(/\/\/.*$/gm, ""))) {
    errors.push(`${at}the timeline animates visibility, display, or autoAlpha. Swap drawings with opacity.`);
  }
  if (/fonts\.googleapis\.com|@import\s+url\(/.test(html)) {
    warnings.push(`${at}a stylesheet is fetched at render time. Ship the font as .woff2 next to the file.`);
  }
  if (/filter\s*:\s*blur|feGaussianBlur/.test(html)) {
    warnings.push(`${at}blur found. A smear is a drawn shape, not a filter. Keep blur out of characters.`);
  }
}

/** Lines and the card set verbatim; the voice track pasted where voice.json put it. */
function checkWords(html, sheet, sheetDir, filmRoot, label, { errors, warnings }) {
  const at = label ? `${label}: ` : "";
  const text = decode(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  for (const line of linesOf(sheet)) {
    if (!text.includes(line.text.replace(/\s+/g, " "))) errors.push(`${at}the line is not set verbatim: "${line.text}".`);
  }
  if (sheet.card && !text.includes(sheet.card)) errors.push(`${at}the title card is not set verbatim: "${sheet.card}".`);

  if (sheet.voice?.mode !== "line") return;
  const voicePath = join(sheetDir, "voice.json");
  if (!existsSync(voicePath)) {
    errors.push(`${at}voice is on but voice.json is missing. Run node harness/voice.js on it.`);
    return;
  }
  const voice = readJson(voicePath);
  const records = voice.lines ?? [{ ...voice, text: voice.line, index: 1, mouth: voice.mouth }];
  const want = linesOf(sheet).map((l) => l.text);
  if (records.length !== want.length || records.some((r, i) => r.text !== want[i])) {
    errors.push(`${at}voice.json was made for different lines. Run voice.js again.`);
  }
  const audioTags = [...html.matchAll(/<audio\b[^>]*>/g)].map((m) => m[0]);
  for (const r of records) {
    if (!existsSync(join(filmRoot, r.file))) errors.push(`${at}voice file missing: ${r.file}.`);
    const tag = audioTags.find((t) => attr(t, "src") === r.file);
    if (!tag) {
      errors.push(`${at}no <audio> with src="${r.file}". Paste the tag voice.js printed.`);
      continue;
    }
    if (!attr(tag, "id")) errors.push(`${at}the voice <audio> for line ${r.index} has no id, so it is left out of the mix.`);
    if (Math.abs(Number(attr(tag, "data-start")) - r.start) > 1 / sheet.fps) {
      errors.push(`${at}line ${r.index} starts at ${attr(tag, "data-start")}s; voice.json places it at ${r.start}s.`);
    }
    const prefix = r.mouth?.prefix ?? "mouth";
    if ((voice.onScreen ?? true) && r.mouth?.keys?.length && !html.includes(`${prefix}-open`)) {
      warnings.push(`${at}line ${r.index}'s speaker is on screen but there is no #${prefix}-open drawing for the mouth track.`);
    }
  }
}

function checkSheetRules(sheet, label, { errors }) {
  const at = label ? `${label}: ` : "";
  const sum = Math.round(sheet.shots.reduce((t, s) => t + s.dur, 0) * 1000) / 1000;
  if (sum !== sheet.seconds) errors.push(`${at}sheet shots sum to ${sum}s, not ${sheet.seconds}s.`);
  if (sheet.shots.filter((s) => s.sakuga).length !== 1) errors.push(`${at}the sheet must have exactly one sakuga shot.`);
}

/** The bible and one model sheet per cast member, in the film root. */
function checkDesign(dir, cast, motion, { errors, warnings }) {
  if (cast.length) {
    if (!existsSync(join(dir, "bible.md"))) errors.push("bible.md is missing. The designer writes it before any animation.");
    for (const m of cast) {
      if (!existsSync(join(dir, "design", `${m.slug}.html`))) errors.push(`model sheet missing for ${m.name}: design/${m.slug}.html.`);
    }
  }
  if (motion.length && existsSync(join(dir, "bible.md"))) {
    const bible = readFileSync(join(dir, "bible.md"), "utf8");
    if (!/^##\s+Motion/m.test(bible)) warnings.push("bible.md has no ## Motion section for the sheet's motion cards.");
  }
}

/**
 * @param {string} dir the film directory
 * @returns {{errors: string[], warnings: string[]}}
 */
export function checkFilm(dir) {
  const report = { errors: [], warnings: [] };
  if (existsSync(join(dir, "sequence.json"))) return checkSequence(dir, report);

  const sheetPath = join(dir, "sheet.json");
  const htmlPath = join(dir, "index.html");
  if (!existsSync(sheetPath)) {
    report.errors.push("sheet.json is missing. Write it with node harness/sheet.js.");
    return report;
  }
  if (!existsSync(htmlPath)) {
    report.errors.push("index.html is missing.");
    return report;
  }
  const sheet = readJson(sheetPath);
  const html = readFileSync(htmlPath, "utf8");
  checkSheetRules(sheet, "", report);
  checkMarkup(html, sheet, "", report);
  if (!/gsap@3\.\d+\.\d+/.test(html)) report.warnings.push("GSAP is not loaded from a pinned gsap@3.x.y URL.");
  checkWords(html, sheet, dir, dir, "", report);
  checkDesign(dir, sheet.cast ?? [], sheet.motion ?? [], report);
  return report;
}

function checkSequence(dir, report) {
  const { errors, warnings } = report;
  const seq = readJson(join(dir, "sequence.json"));
  const total = Math.round(seq.scenes.reduce((t, s) => t + s.seconds, 0) * 1000) / 1000;
  if (total !== seq.seconds) errors.push(`sequence scenes sum to ${total}s, not ${seq.seconds}s.`);

  const rootPath = join(dir, "index.html");
  const root = existsSync(rootPath) ? readFileSync(rootPath, "utf8") : "";
  if (!root) {
    errors.push("index.html (the sequence root) is missing.");
  } else {
    const rootTag = root.match(/<[^>]*\bdata-composition-id="[^"]*"[^>]*>/)?.[0];
    if (!rootTag) {
      errors.push("the sequence root has no data-composition-id.");
    } else {
      const id = attr(rootTag, "data-composition-id");
      if (Number(attr(rootTag, "data-duration")) !== seq.seconds) {
        errors.push(`root data-duration is ${attr(rootTag, "data-duration")}, the sequence runs ${seq.seconds}.`);
      }
      if (!new RegExp(`__timelines\\s*(\\[\\s*["']${id}["']\\s*\\]|\\.${id}\\b)\\s*=`).test(root)) {
        errors.push(`the root timeline is not registered as window.__timelines["${id}"].`);
      }
    }
    if (!/gsap@3\.\d+\.\d+/.test(root)) warnings.push("GSAP is not loaded from a pinned gsap@3.x.y URL in the root.");
  }
  const hosts = [...root.matchAll(/<[^>]*\bdata-composition-src="[^"]*"[^>]*>/g)].map((m) => m[0]);

  for (const scene of seq.scenes) {
    const label = scene.id;
    const host = hosts.find((t) => attr(t, "data-composition-src") === scene.composition);
    if (root && !host) {
      errors.push(`${label}: the root does not mount ${scene.composition}.`);
    } else if (host) {
      if (Math.abs(Number(attr(host, "data-start")) - scene.start) > 1 / seq.fps) {
        errors.push(`${label}: mounted at ${attr(host, "data-start")}s, the sequence places it at ${scene.start}s.`);
      }
      if (attr(host, "data-composition-id") !== scene.id) {
        errors.push(`${label}: the host needs data-composition-id="${scene.id}".`);
      }
      if (Number(attr(host, "data-duration")) !== scene.seconds) {
        errors.push(`${label}: mounted for ${attr(host, "data-duration")}s, the scene runs ${scene.seconds}s.`);
      }
    }
    const sheetDir = join(dir, scene.dir);
    if (!existsSync(join(sheetDir, "sheet.json"))) {
      errors.push(`${label}: ${scene.dir}/sheet.json is missing. Run node harness/sequence.js.`);
      continue;
    }
    const sheet = readJson(join(sheetDir, "sheet.json"));
    checkSheetRules(sheet, label, report);
    const compPath = join(dir, scene.composition);
    if (!existsSync(compPath)) {
      errors.push(`${label}: ${scene.composition} is missing.`);
      continue;
    }
    const html = readFileSync(compPath, "utf8");
    checkMarkup(html, sheet, label, report, { scene: true });
    checkWords(html, sheet, sheetDir, dir, label, report);
  }
  checkDesign(dir, seq.cast ?? [], seq.motion ?? [], report);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node harness/check.js films/<slug>");
    process.exit(1);
  }
  const { errors, warnings } = checkFilm(resolve(dir));
  for (const e of errors) console.log(`✗ ${e}`);
  for (const w of warnings) console.log(`! ${w}`);
  if (!errors.length) console.log(`check: ok${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}`);
  process.exit(errors.length ? 1 : 0);
}
