#!/usr/bin/env node
/**
 * A sequence: a longer film told as scenes. Every scene is a full sheet that
 * keeps every sheet rule (8, 12, or 20 seconds, one sakuga shot, its own
 * lines); the scenes share one cast, one palette, one style, and one voice cast.
 * The film root mounts each scene as a HyperFrames sub-composition.
 *
 *   node harness/sequence.js brief.json            writes films/<slug>/sequence.{md,json}
 *                                                  and films/<slug>/scenes/<id>/sheet.{md,json}
 *   node harness/sequence.js brief.json --out dir  writes into dir instead
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CREW, FPS, compileBrief, slugFrom } from "./compile.js";

export const SEQUENCE_LIMITS = { minScenes: 2, maxScenes: 8, minSeconds: 30, maxSeconds: 120 };

const SHARED = ["aspect", "script", "style", "styleReference", "cast", "designColors", "voice", "animation"];

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

/**
 * Compile a sequence brief into one sheet per scene plus the sequence plan.
 * @param {{title: string, slug?: string, aspect: string, script: string, style?: string, styleReference?: string,
 *   cast?: string|Array<object>, designColors?: Record<string,string>, voice?: object,
 *   scenes: Array<{id?: string, title?: string, logline: string, seconds: number, props?: string,
 *     lines?: Array<object>, dialogue?: string, card?: string}>}} input
 * @returns {{ok: true, sequence: object, scenes: Array<{id: string, markdown: string, sheet: object}>, markdown: string} | {ok: false, error: string}}
 */
export function compileSequence(input) {
  const title = String(input.title ?? "").trim();
  if (!title) return { ok: false, error: "A sequence needs a title." };
  const slug = input.slug ? String(input.slug).trim() : slugFrom(title);
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(slug)) {
    return { ok: false, error: "A slug is lowercase letters, digits, and dashes." };
  }
  const list = Array.isArray(input.scenes) ? input.scenes : [];
  const { minScenes, maxScenes, minSeconds, maxSeconds } = SEQUENCE_LIMITS;
  if (list.length < minScenes || list.length > maxScenes) {
    return { ok: false, error: `A sequence has ${minScenes} to ${maxScenes} scenes. One scene is a film: use sheet.js.` };
  }

  const scenes = [];
  const ids = new Set();
  let start = 0;
  for (const [index, scene] of list.entries()) {
    const id = String(scene.id || `s${index + 1}`).trim();
    if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(id)) {
      return { ok: false, error: `Scene id "${id}" must be lowercase letters, digits, and dashes.` };
    }
    if (ids.has(id)) return { ok: false, error: `Scene id "${id}" is used twice.` };
    ids.add(id);
    const brief = { ...scene };
    for (const key of SHARED) {
      if (key in scene) return { ok: false, error: `Scene ${id} sets "${key}"; that is shared by the whole sequence.` };
      brief[key] = input[key];
    }
    const speaks = (Array.isArray(scene.lines) && scene.lines.length) || String(scene.dialogue ?? "").trim();
    if (!speaks && input.voice) brief.voice = { mode: "off" };
    brief.slug = `${slug}-${id}`;
    brief.sequence = { slug, scene: id, index, start, title: String(scene.title ?? "").trim() };
    const result = compileBrief(brief);
    if (!result.ok) return { ok: false, error: `Scene ${index + 1} (${id}): ${result.error}` };
    scenes.push({ id, markdown: result.markdown, sheet: result.sheet });
    start = Math.round((start + result.seconds) * 1000) / 1000;
  }
  if (start < minSeconds || start > maxSeconds) {
    return { ok: false, error: `The scenes run ${start}s; a sequence runs ${minSeconds} to ${maxSeconds} seconds.` };
  }

  const first = scenes[0].sheet;
  const motion = [...new Set(scenes.flatMap((s) => s.sheet.motion))];
  const sequence = {
    version: 1,
    kind: "sequence",
    title,
    slug,
    fps: FPS,
    frames: start * FPS,
    seconds: start,
    aspect: first.aspect,
    width: first.width,
    height: first.height,
    script: first.script,
    colors: first.colors,
    designColors: first.designColors,
    style: first.style,
    styleReference: first.styleReference,
    cast: first.cast,
    motion,
    scenes: scenes.map(({ id, sheet }) => ({
      id,
      title: sheet.sequence.title,
      index: sheet.sequence.index,
      start: sheet.sequence.start,
      seconds: sheet.seconds,
      dir: `scenes/${id}`,
      composition: `compositions/${id}.html`,
      lines: sheet.lines.length,
      card: sheet.card || undefined,
    })),
  };

  const film = `films/${slug}`;
  const rows = sequence.scenes.map(
    (s, i) =>
      `| ${i + 1} | ${s.id} | ${s.title || "—"} | ${clock(s.start)}–${clock(s.start + s.seconds)} | ${s.seconds}s | ${scenes[i].sheet.logline} | ${s.lines}${s.card ? " + card" : ""} |`,
  );
  const hosts = sequence.scenes.map(
    (s) =>
      `  <div id="${s.id}-host" data-composition-id="${s.id}" data-composition-src="${s.composition}" data-start="${s.start}" data-duration="${s.seconds}" data-track-index="1" data-width="${sequence.width}" data-height="${sequence.height}"></div>`,
  );
  const castLines = sequence.cast.length
    ? sequence.cast.map((m) =>
        m.kind === "original"
          ? `- ${m.name} — original. Model sheet example at ${film}/design/${m.slug}.html. Show it and wait for a yes before any scene is drawn.`
          : `- ${m.name} — follows a reference: ${m.reference.replace(/\.+$/, "")}. Build ${film}/design/${m.slug}.html from it.`,
      )
    : ["No named cast. Any figure on screen is an original and gets a model sheet first."];

  const markdown = [
    "# html-anime · sequence",
    "",
    `${title}`,
    "",
    `${sequence.seconds}s · ${FPS}fps · ${sequence.frames} frames · ${sequence.width}×${sequence.height} · ${scenes.length} scenes`,
    `Color script and art style: as on every scene sheet (${first.script}, ${first.style}).`,
    "",
    "## Scenes",
    "Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.",
    "",
    "| # | Id | Title | Time | Length | Scene | Lines |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Cast (shared)",
    ...castLines,
    "",
    "## Build",
    `One bible and one design folder for the whole sequence: ${film}/bible.md, ${film}/design/.`,
    `Each scene is a sub-composition: ${film}/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).`,
    `The root ${film}/index.html (data-composition-id="${slug}", data-duration="${sequence.seconds}") mounts them, and registers an empty paused timeline:`,
    "",
    "```html",
    ...hosts,
    "```",
    "",
    "Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.",
    "",
    "## Order",
    "1. Director: this plan, then every scene sheet.",
    "2. Designer: the shared bible and model sheets, once, before any scene.",
    `3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js ${film}/scenes/<id>), render.`,
    `4. Check the whole: node harness/check.js ${film}, then npx hyperframes lint and npx hyperframes check in ${film}.`,
    "",
    "## Crew",
    ...CREW.map(([role, path, job], i) => `${i + 1}. ${role} — ${path} — ${job}`),
    "",
  ].join("\n");

  return { ok: true, sequence, scenes, markdown };
}

function main() {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith("--"));
  const outAt = args.indexOf("--out");
  if (!source) {
    console.error("usage: node harness/sequence.js <brief.json> [--out <dir>]");
    process.exit(1);
  }
  let brief;
  try {
    brief = JSON.parse(readFileSync(source, "utf8"));
  } catch (error) {
    console.error(`sequence: cannot read the brief: ${error.message}`);
    process.exit(1);
  }
  const result = compileSequence(brief);
  if (!result.ok) {
    console.error(`sequence: ${result.error}`);
    process.exit(1);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = outAt === -1 ? join(root, "films", result.sequence.slug) : resolve(args[outAt + 1]);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "sequence.md"), result.markdown);
  writeFileSync(join(dir, "sequence.json"), `${JSON.stringify(result.sequence, null, 2)}\n`);
  for (const scene of result.scenes) {
    const sceneDir = join(dir, "scenes", scene.id);
    mkdirSync(sceneDir, { recursive: true });
    writeFileSync(join(sceneDir, "sheet.md"), scene.markdown);
    writeFileSync(join(sceneDir, "sheet.json"), `${JSON.stringify(scene.sheet, null, 2)}\n`);
  }
  console.log(result.markdown);
  console.error(`sequence: wrote ${join(dir, "sequence.md")}, sequence.json, and ${result.scenes.length} scene sheets`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
