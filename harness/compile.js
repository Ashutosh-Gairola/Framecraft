/**
 * Turns a scene into an html-anime sheet: the brief the whole crew works from.
 * Runs in Node and in the browser (no imports outside this folder).
 */

import { ASPECTS, FPS, SCRIPTS, designColors } from "./palettes.js";
import { MOVES, PLANS, RUNTIMES, SIZES, shotPlan } from "./plans.js";
import { parseCast } from "./cast.js";
import { detectMotion } from "./motion.js";
import { STYLES, styleFor } from "./styles.js";
import { EMOTIONS, LANGS, emotionProfile, voiceSettings } from "./voice-profiles.js";

export { ASPECTS, FPS, SCRIPTS, MOVES, PLANS, RUNTIMES, STYLES, EMOTIONS, LANGS, shotPlan, parseCast, detectMotion };

export const SHEET_VERSION = 3;
export const MAX_LINES = 2;
export const ANIMATION = ["full", "limited"];

export const CREW = [
  ["Director", "skills/html-anime-director/SKILL.md", "the sheet, the gates, the final review"],
  ["Designer", "skills/html-anime-designer/SKILL.md", "cast and props: model sheet example first, or follow the reference"],
  ["Actor", "skills/html-anime-actor/SKILL.md", "each character as a spec: appearance, wardrobe with cloth physics, movement"],
  ["Art", "skills/html-anime-art/SKILL.md", "the style, the backgrounds, the color roles"],
  ["Motion", "skills/html-anime-motion/SKILL.md", "key poses for every prop and action"],
  ["Cameraman", "skills/html-anime-cameraman/SKILL.md", "size, angle, layout, the move"],
  ["Staff", "skills/html-anime-staff/SKILL.md", "keys, inbetweens, correction, finishing (with cel and timing)"],
  ["Voice", "skills/html-anime-voice/SKILL.md", "casting, emotion, the generated lines, mouth shapes"],
  ["Sound", "skills/html-anime-sound/SKILL.md", "effects, ambience, and the score, cued to the picture"],
  ["Render", "skills/html-anime-render/SKILL.md", "the HyperFrames file and the gates"],
  ["Editor", "skills/html-anime-editor/SKILL.md", "the review pass on the render, rhythm, continuity, mastering"],
];

const STOP = new Set("a,an,the,of,to,and,in,on,for,with,as,at,from,by,into,over".split(","));

/**
 * A folder-safe slug from the first four meaningful words of a logline ("untitled" if none).
 * @param {string} logline
 * @returns {string}
 */
export function slugFrom(logline) {
  const words = logline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word));
  return words.slice(0, 4).join("-") || "untitled";
}

function clock(seconds) {
  return seconds.toFixed(2);
}

function oneLine(value, max) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

/**
 * Where everything for this sheet lives. A standalone film is films/<slug>/;
 * a scene of a sequence keeps its sheet in films/<seq>/scenes/<id>/ and its
 * drawing in films/<seq>/compositions/<id>.html, sharing the sequence's bible and design.
 */
function pathsFor(slug, sequence) {
  if (!sequence) {
    const film = `films/${slug}`;
    return { film, sheetDir: film, html: `${film}/index.html` };
  }
  const film = `films/${sequence.slug}`;
  return { film, sheetDir: `${film}/scenes/${sequence.scene}`, html: `${film}/compositions/${sequence.scene}.html` };
}

/**
 * Normalize dialogue to lines on shots. A string is one line on the button shot.
 * With two lines and no shots given, the first sits on the shot before the sakuga shot.
 */
function normalizeLines(input, cast, shots) {
  let raw;
  if (Array.isArray(input.lines)) {
    raw = input.lines;
  } else {
    const text = String(input.dialogue ?? "").trim();
    raw = text ? [{ text, speaker: input.voice?.speaker }] : [];
  }
  if (raw.length > MAX_LINES) {
    return { ok: false, error: `A scene holds at most ${MAX_LINES} lines. Split the scene.` };
  }
  const ids = shots.map((s) => s.id);
  const sakuga = ids.indexOf("sakuga");
  const defaults = raw.length === 2 ? [ids[Math.max(0, sakuga - 1)], "button"] : ["button"];
  const lines = [];
  for (const [i, line] of raw.entries()) {
    const text = String(line?.text ?? "").trim().replace(/\s+/g, " ");
    if (!text) return { ok: false, error: "Every line needs its text." };
    if (text.length > 180) return { ok: false, error: "Keep each line under 180 characters." };
    const speaker = String(line?.speaker || cast[0]?.name || "").trim();
    if (cast.length && speaker && !cast.some((m) => m.name === speaker)) {
      return { ok: false, error: `The speaker "${speaker}" is not in the cast.` };
    }
    const emotion = line?.emotion ? String(line.emotion) : "";
    if (emotion && !EMOTIONS[emotion]) {
      return { ok: false, error: `Emotion has to be one of: ${Object.keys(EMOTIONS).join(", ")}.` };
    }
    const shot = String(line?.shot || defaults[i]);
    if (!ids.includes(shot)) {
      return { ok: false, error: `Line ${i + 1} is on "${shot}", which is not a shot here (${ids.join(", ")}).` };
    }
    if (lines.length && ids.indexOf(shot) < ids.indexOf(lines.at(-1).shot)) {
      return { ok: false, error: "Lines must be in shot order." };
    }
    lines.push({ speaker, text, emotion, shot, source: String(line?.source || "").trim() });
  }
  return { ok: true, lines };
}

function castBlock(cast, paths) {
  if (!cast.length) {
    return [
      "No named cast. If a figure is on screen, the designer names it, treats it as an original,",
      `and draws its model sheet example at ${paths.film}/design/<name>.html before any animation.`,
    ].join("\n");
  }
  return cast
    .map((m) => {
      const sheet = `${paths.film}/design/${m.slug}.html`;
      if (m.kind === "original") {
        return `- ${m.name} — original. Draw the model sheet example at ${sheet}. Show it and wait for a yes.`;
      }
      const what = m.kind === "image" ? "image" : "notes";
      return `- ${m.name} — follows a reference (${what}): ${m.reference.replace(/\.+$/, "")}. Build ${sheet} from it. Do not redesign.`;
    })
    .join("\n");
}

function dialogueBlock(lines, card) {
  const out = [];
  if (!lines.length) {
    out.push("No dialogue. No mouth shapes. No captions.");
  } else {
    out.push(
      lines.length === 1 && lines[0].shot === "button"
        ? "Set this line verbatim on the button shot. Do not translate it."
        : "Set each line verbatim on its shot. Do not translate.",
    );
    for (const l of lines) {
      out.push("", `> ${l.text}`, `— ${l.speaker || "the speaker"}, ${l.shot} shot${l.emotion ? `, ${l.emotion}` : ""}`);
    }
  }
  if (card) {
    out.push("", "Title card, on screen, not spoken. Set it verbatim in the button shot's last hold, after any line:", "", `> ${card}`);
  }
  return out.join("\n");
}

function voiceBlock(voice, lines, paths) {
  if (voice.mode === "off") {
    return "Voice off. A line, if any, is type only. No audio.";
  }
  const out = [
    voice.source
      ? `Voice on: the user's own recording at ${voice.source}, ${LANGS[voice.lang] ?? voice.lang}. Do not resynthesize it.`
      : `Voice on: ${LANGS[voice.lang] ?? voice.lang}, engine ${voice.engine}.`,
  ];
  for (const [i, l] of lines.entries()) {
    const who = voice.speakers[l.speaker || voice.speaker] ?? { register: voice.register, voice: voice.voice };
    const e = emotionProfile(l.emotion || voice.emotion, voice.intensity);
    out.push(
      `- Line ${i + 1}, ${l.speaker || "speaker"}: ${l.source ? `own recording ${l.source}` : `${who.register} register${who.voice ? `, voice ${who.voice}` : ""}`}. ` +
        `${e.label} at ${e.intensity} — rate ${e.rate}×, pitch ${e.pitch >= 0 ? "+" : ""}${e.pitch} st, pauses ${e.pause}ms. Acting: ${e.acting}`,
    );
  }
  out.push(
    voice.onScreen ? `On screen: mouth shapes follow ${paths.sheetDir}/voice.json on twos.` : "Off screen: no mouth shapes. The face holds.",
    `Generate: node harness/voice.js ${paths.sheetDir}. It writes the audio, voice.json, and the <audio> tags to paste.`,
  );
  return out.join("\n");
}

function motionBlock(motion) {
  if (!motion.length) {
    return "No card matched. If the verb needs a prop or a body action, build its keys with skills/html-anime-motion/SKILL.md.";
  }
  return [
    "Read every card before drawing keys:",
    ...motion.map((m) => `- ${m.label} — ${m.card} (${m.matched.join(", ")})`),
  ].join("\n");
}

/**
 * Build the shot sheet the crew follows.
 * @param {{
 *   logline: string, seconds: number|string, aspect: "16:9"|"9:16", script: string,
 *   slug?: string, dialogue?: string,
 *   lines?: Array<{text: string, speaker?: string, emotion?: string, shot?: string, source?: string}>,
 *   card?: string, cast?: string|Array<{name: string, reference?: string}>, props?: string,
 *   style?: string, styleReference?: string, designColors?: Record<string,string>, animation?: "full"|"limited",
 *   voice?: {mode?: "off"|"line", speaker?: string, speakers?: Record<string,{register?: string, voice?: string}>,
 *     emotion?: string, intensity?: number, register?: "female"|"male", engine?: string, voice?: string,
 *     lang?: string, source?: string, onScreen?: boolean},
 *   sequence?: {slug: string, scene: string, index: number, start: number, title?: string}
 * }} input  `dialogue` is one line on the button shot; `lines` replaces it with up to two placed lines.
 * @returns {{ok: true, markdown: string, sheet: object, slug: string, seconds: number, frames: number, width: number, height: number, script: string} | {ok: false, error: string}}
 *   `ok: false` with a readable `error` when the input breaks a sheet rule; nothing throws.
 */
export function compileBrief(input) {
  const logline = String(input.logline ?? "").trim().replace(/\s+/g, " ");
  if (!logline) {
    return { ok: false, error: "Write the scene first." };
  }
  if (logline.length > 400) {
    return { ok: false, error: "Keep the scene under 400 characters." };
  }

  const seconds = Number(input.seconds);
  if (!PLANS[seconds]) {
    return { ok: false, error: "Length has to be 8, 12, or 20 seconds." };
  }

  const aspect = ASPECTS[input.aspect];
  if (!aspect) {
    return { ok: false, error: "Frame has to be 16:9 or 9:16." };
  }

  const script = SCRIPTS[input.script];
  if (!script) {
    return { ok: false, error: "Pick a color script." };
  }

  const style = styleFor(input.style);
  if (!style) {
    return { ok: false, error: `Art style has to be one of: ${Object.keys(STYLES).join(", ")}.` };
  }

  if (String(input.dialogue ?? "").trim().length > 180) {
    return { ok: false, error: "Keep the line under 180 characters." };
  }
  const card = String(input.card ?? "").trim().replace(/\s+/g, " ");
  if (card.length > 60) {
    return { ok: false, error: "Keep the title card under 60 characters." };
  }

  const animation = String(input.animation || "full");
  if (!ANIMATION.includes(animation)) {
    return { ok: false, error: "Animation has to be full or limited." };
  }
  const full = animation === "full";
  const props = oneLine(input.props, 200);
  const styleReference = oneLine(input.styleReference, 200);

  const parsed = parseCast(input.cast);
  if (!parsed.ok) {
    return parsed;
  }
  const cast = parsed.cast;
  const extra = designColors(input.designColors, script);
  if (!extra.ok) {
    return extra;
  }

  const shots = shotPlan(seconds);
  const normalized = normalizeLines(input, cast, shots);
  if (!normalized.ok) {
    return normalized;
  }
  const lines = normalized.lines;
  const voiced = voiceSettings(input.voice, cast, lines);
  if (!voiced.ok) {
    return voiced;
  }
  const voice = voiced.voice;

  const slug = input.slug ? String(input.slug).trim() : slugFrom(logline);
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(slug)) {
    return { ok: false, error: "A slug is lowercase letters, digits, and dashes." };
  }
  const sequence = input.sequence ?? null;
  const paths = pathsFor(slug, sequence);
  const motion = detectMotion(logline, props);
  const tall = input.aspect === "9:16";
  const frameLine = tall
    ? "Compose the tall frame. The head sits in the upper half. Type sits in the lower fifth."
    : "Compose the wide frame. Put the eyes on a third, with room in front of the gaze.";

  const shotBlocks = shots.map((s, index) => {
    const name = s.sakuga ? `${s.label} — the expensive shot` : s.label;
    return [
      `### ${index + 1} · ${name} · ${clock(s.start)}–${clock(s.end)}`,
      `${SIZES[s.size]} · ${s.drawings} ${full ? "keys, inbetweened" : "drawings"} · Camera ${s.camera} — ${MOVES[s.camera]}`,
      s.direction,
    ].join("\n");
  });

  const paints = Object.entries(script.colors)
    .map(([name, hex]) => `- ${name} ${hex}`)
    .join("\n");
  const extraNames = Object.entries(extra.colors);
  const extraBlock = extraNames.length
    ? ["", "Design colors (added by the designer for a reference; use them only where the bible says):", ...extraNames.map(([n, h]) => `- ${n} ${h}`)].join("\n")
    : "";

  const styleBlock = [
    `${style.name} — ${style.summary}`,
    `- Line: ${style.line}`,
    `- Shadow: ${style.shadow}`,
    `- Proportion: ${style.heads} heads tall.`,
    `- Eyes: ${style.eyes}`,
    `- Background: ${style.background}`,
    styleReference
      ? `Style reference: ${styleReference}. Follow it. The style above fills in what the reference doesn't show.`
      : "No style reference. Follow the style above.",
  ].join("\n");

  const gates = [
    "1. Sheet — show this sheet. Change it only by recompiling.",
    `2. Design — ${paths.film}/bible.md plus one model sheet per cast member and per key prop. Originals: show the example and wait for a yes.`,
    "3. Layout — the hero frame of every shot is drawn and still, before any timing.",
    ...(voice.mode === "line" ? [`3b. Voice — node harness/voice.js ${paths.sheetDir}. Every line fits its window.`] : []),
    `4. Check — node harness/check.js ${paths.film}, then npx hyperframes lint and npx hyperframes check in ${paths.film}.`,
  ];

  const crew = CREW.map(([role, path, job], i) => `${i + 1}. ${role} — ${path} — ${job}`);
  const title = sequence
    ? [`# html-anime · scene ${sequence.index + 1}${sequence.title ? ` · ${sequence.title}` : ""}`, "", `Part of the sequence films/${sequence.slug}, from ${clock(sequence.start)}s.`, ""]
    : ["# html-anime", ""];
  const build = sequence
    ? [
        `Write ${paths.html} at ${aspect.w}×${aspect.h}: a <template> whose root is data-composition-id="${sequence.scene}", times local to the scene.`,
        `The sequence root ${paths.film}/index.html mounts it. Asset paths are root-relative (assets/…).`,
      ]
    : [`Write ${paths.html} at ${aspect.w}×${aspect.h}. Save this sheet as ${paths.sheetDir}/sheet.json with node harness/sheet.js.`];

  const markdown = [
    ...title,
    logline,
    "",
    `${seconds}s · ${FPS}fps · ${seconds * FPS} frames · ${aspect.w}×${aspect.h}`,
    `Color script: ${script.name}`,
    paints + extraBlock,
    "",
    frameLine,
    "",
    "## Art style",
    styleBlock,
    "",
    "## Cast",
    castBlock(cast, paths),
    "",
    "## Props & motion",
    props ? `Props and action: ${props}` : "Props and action: only what the scene names.",
    motionBlock(motion),
    "",
    "## Drawing budget",
    ...(full
      ? [
          "Full animation: the counts below are key poses. Every frame between keys is inbetweened (eased, on arcs).",
          "Acting moves on twos; fast action, rain, sparks, and a blade move on ones. A hold breathes; it never freezes unless the beat says so.",
          "The sakuga shot may use 8 keys. Every other shot uses 3.",
        ]
      : [
          "Limited animation: character acting is on twos. Rain, sparks, and a blade are on ones.",
          "The sakuga shot may use 8 unique drawings. Every other shot uses 3.",
          "A hold after a settle lasts at least 12 frames.",
        ]),
    "",
    "## Shots",
    shotBlocks.join("\n\n"),
    "",
    "## Dialogue",
    dialogueBlock(lines, card),
    "",
    "## Voice",
    voiceBlock(voice, lines, paths),
    "",
    "## Crew",
    "Start with the director. Each role reads its own skill and does not restate another's.",
    ...crew,
    "",
    "## Gates",
    ...gates,
    "",
    "## Build",
    ...build,
    "films/roof/ shows the file shape, the color-dip cut, a bible, and a model sheet. Draw this sheet, not a remix of that film.",
    "Use only the hexes above. One sakuga shot. Render with --fps 24.",
    "",
  ].join("\n");

  const sheet = {
    version: SHEET_VERSION,
    logline,
    slug,
    seconds,
    fps: FPS,
    frames: seconds * FPS,
    aspect: input.aspect,
    width: aspect.w,
    height: aspect.h,
    script: script.id,
    colors: { ...script.colors },
    designColors: extra.colors,
    style: style.id,
    styleReference,
    animation,
    lines: lines.map((l) => ({ ...l, emotion: l.emotion || (voice.mode === "line" ? voice.emotion : "") })),
    card,
    props,
    voice,
    cast,
    motion: motion.map((m) => m.id),
    sequence: sequence ? { ...sequence, root: "../.." } : undefined,
    shots: shots.map(({ id, label, start, end, dur, sakuga, size, camera, drawings }) => ({
      id,
      label,
      start,
      end,
      dur,
      sakuga,
      size,
      camera,
      drawings,
    })),
  };

  return {
    ok: true,
    markdown,
    sheet,
    slug,
    seconds,
    frames: seconds * FPS,
    width: aspect.w,
    height: aspect.h,
    script: script.id,
  };
}
