#!/usr/bin/env node
/**
 * Voice the sheet's line with emotion, place it on the timeline, and write the mouth track.
 *
 *   node harness/voice.js films/<slug>                 use the sheet's voice block
 *   node harness/voice.js films/<seq>/scenes/<scene>   one scene of a sequence
 *   node harness/voice.js films/<slug> --emotion sad --intensity 1.2 --lang es --voice Mónica
 *   node harness/voice.js films/<slug> --source my-take.wav   use your own recording
 *   node harness/voice.js films/<slug> --fit           speed up (≤1.15×) if the line overruns
 *   node harness/voice.js films/<slug> --dry           print the plan, synthesize nothing
 *   node harness/voice.js --list [--lang ja]           emotions, languages, engines, voices
 *
 * Engines, in auto order: kokoro (npx hyperframes tts, local), say (macOS), espeak-ng.
 * ffmpeg shapes the emotion (pitch, tone, tremolo, loudness). Without it only gain applies.
 *
 * Voices every line on the sheet (up to two, each with its speaker, shot, and emotion).
 * Writes assets/voice/line-N.wav under the film root (assets/voice/<scene>/ for a scene of a
 * sequence) and voice.json next to the sheet, and prints the <audio> tags and mouth snippets.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EMOTIONS, ENGINES, LANGS, VOICES, emotionProfile, voiceSettings } from "./voice-profiles.js";
import { castSlug } from "./cast.js";
import {
  J_CUT,
  MOUTHS,
  SAMPLE_RATE,
  applyGain,
  emotionFilter,
  joinClips,
  mouthTrack,
  placeLine,
  readWav,
  splitPhrases,
  trimSilence,
  writeWav,
} from "./voice-lib.js";

const NOVELTY = new Set(
  "Albert,Bad News,Bahh,Bells,Boing,Bubbles,Cellos,Wobble,Jester,Organ,Superstar,Trinoids,Zarvox,Whisper,Good News,Junior,Ralph,Fred".split(","),
);
const SAY_WPM = 175;
const MAX_FIT = 1.15;

function fail(message) {
  console.error(`voice: ${message}`);
  process.exit(1);
}

function note(message) {
  console.error(`voice: ${message}`);
}

function run(cmd, args, { quiet = true } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", stdio: quiet ? "pipe" : "inherit" });
  return { ok: r.status === 0 && !r.error, out: r.stdout ?? "", err: (r.stderr ?? "") + (r.error ? String(r.error) : "") };
}

function has(cmd) {
  return run("which", [cmd]).ok;
}

function parseArgs(argv) {
  const opts = { flags: new Set() };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (["--fit", "--dry", "--list", "--off-screen"].includes(a)) opts.flags.add(a.slice(2));
    else if (a.startsWith("--")) opts[a.slice(2)] = argv[++i];
    else rest.push(a);
  }
  opts.dir = rest[0];
  return opts;
}

/* ---------- engines ---------- */

function kokoroReady() {
  return run("npx", ["--no-install", "hyperframes", "--version"]).ok;
}

function sayVoices() {
  const r = run("say", ["-v", "?"]);
  if (!r.ok) return [];
  return r.out
    .split("\n")
    .map((line) => line.match(/^(.+?)\s+([a-z]{2,3}_[A-Za-z0-9]+)\s+#/))
    .filter(Boolean)
    .map((m) => ({ name: m[1].trim(), locale: m[2] }));
}

function espeakBin() {
  return has("espeak-ng") ? "espeak-ng" : has("espeak") ? "espeak" : "";
}

function pickEngine(wanted) {
  if (wanted !== "auto") return wanted;
  if (kokoroReady()) return "kokoro";
  if (process.platform === "darwin" && has("say")) return "say";
  if (espeakBin()) return "espeak";
  fail("no voice engine found. Install one: npx hyperframes (Kokoro), espeak-ng, or use macOS say. Or pass --source with your own recording.");
}

function candidates(engine, lang, register) {
  const table = VOICES[engine] ?? {};
  const base = lang.split("-")[0];
  const row = table[lang] ?? table[base];
  return row ? [...row[register], ...row[register === "female" ? "male" : "female"]] : [];
}

/**
 * The voice for a speaker. `nth` separates speakers who share a register:
 * the second male speaker gets the second installed male voice.
 */
function pickVoice(engine, lang, register, explicit, nth = 0) {
  if (explicit) return explicit;
  const base = lang.split("-")[0];
  const other = register === "female" ? "male" : "female";
  if (engine === "say") {
    const installed = sayVoices();
    const names = new Set(installed.map((v) => v.name));
    const row = VOICES.say[lang] ?? VOICES.say[base] ?? { female: [], male: [] };
    const mine = row[register].filter((n) => names.has(n));
    if (mine.length) return mine[nth % mine.length];
    const local = installed.filter((v) => v.locale.toLowerCase().startsWith(base) && !NOVELTY.has(v.name)).map((v) => v.name);
    const fallback = [...row[other].filter((n) => names.has(n)), ...local];
    if (fallback.length) {
      const pick = fallback[nth % fallback.length];
      note(`no ${register} macOS voice installed for "${lang}"; using ${pick}. Pass a voice to choose another.`);
      return pick;
    }
    fail(`no installed macOS voice for "${lang}". Add one in System Settings → Accessibility → Spoken Content, or pass --voice.`);
  }
  if (engine === "kokoro") {
    const table = VOICES.kokoro[lang] ?? VOICES.kokoro[base];
    const list = table ? (table[register].length ? table[register] : table[other]) : [];
    if (list.length) return list[nth % list.length];
    fail(`Kokoro has no voice for "${lang}". Use --engine say or espeak, or pass --voice.`);
  }
  const variants = register === "female" ? ["f3", "f2", "f4"] : ["m3", "m2", "m4"];
  const listed = candidates("espeak", lang, register)[0];
  return nth === 0 && listed ? listed : `${base === "en" ? "en-us" : base}+${variants[nth % variants.length]}`;
}

/** Convert any audio file to 48 kHz mono 16-bit samples. */
function loadAudio(file, tmp) {
  const out = join(tmp, `norm-${Math.abs(hash(file))}.wav`);
  if (has("ffmpeg")) {
    const r = run("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-ac", "1", "-ar", String(SAMPLE_RATE), "-c:a", "pcm_s16le", out]);
    if (!r.ok) fail(`ffmpeg could not read ${file}: ${r.err.trim()}`);
  } else if (has("afconvert")) {
    const r = run("afconvert", ["-f", "WAVE", "-d", `LEI16@${SAMPLE_RATE}`, "-c", "1", file, out]);
    if (!r.ok) fail(`afconvert could not read ${file}: ${r.err.trim()}`);
  } else {
    const wav = readWav(readFileSync(file));
    if (wav.rate !== SAMPLE_RATE) fail(`${file} is ${wav.rate} Hz and there is no ffmpeg to resample it.`);
    return wav.samples;
  }
  return readWav(readFileSync(out)).samples;
}

function hash(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return h;
}

function synthPhrase(engine, voice, lang, text, emotion, tmp, index) {
  if (engine === "kokoro") {
    const out = join(tmp, `k${index}.wav`);
    const r = run("npx", ["--no-install", "hyperframes", "tts", text, "--voice", voice, "--speed", String(emotion.rate), "--output", out]);
    if (!r.ok) fail(`hyperframes tts failed: ${r.err.trim()}`);
    return out;
  }
  if (engine === "espeak") {
    const out = join(tmp, `e${index}.wav`);
    const r = run(espeakBin(), ["-v", voice, "-s", String(Math.round(SAY_WPM * emotion.rate)), "-w", out, text]);
    if (!r.ok) fail(`espeak-ng failed: ${r.err.trim()}`);
    return out;
  }
  fail(`unknown engine ${engine}`);
}

/** Synthesize the whole line as one sample buffer with emotion-timed pauses. */
function synthLine(engine, voice, lang, line, emotion, tmp) {
  const phrases = splitPhrases(line);
  if (engine === "say") {
    // One call keeps say's sentence intonation. Pauses go in as [[slnc]] commands.
    const text = phrases.map((p) => p.text + (p.pauseAfter ? ` [[slnc ${Math.round(emotion.pause * p.pauseAfter)}]] ` : "")).join(" ");
    const out = join(tmp, "say.aiff");
    const r = run("say", ["-v", voice, "-r", String(Math.round(SAY_WPM * emotion.rate)), "-o", out, "--", text]);
    if (!r.ok) fail(`say failed: ${r.err.trim()}`);
    return loadAudio(out, tmp);
  }
  const clips = phrases.map((p, i) => ({
    samples: loadAudio(synthPhrase(engine, voice, lang, p.text, emotion, tmp, i), tmp),
    silenceAfterMs: Math.round(emotion.pause * p.pauseAfter),
  }));
  return joinClips(clips);
}

/** Pitch, tone, tremolo, loudness, gain, and an optional tempo for fitting. */
function shape(samples, emotion, tempo, tmp, { performance }) {
  if (!has("ffmpeg")) {
    if (emotion.pitch || emotion.tone !== "none" || tempo !== 1) {
      note("ffmpeg not found: pitch, tone, and fitting skipped. Only gain is applied.");
    }
    return trimSilence(applyGain(samples, performance ? 0 : emotion.gain));
  }
  const raw = join(tmp, "raw.wav");
  const out = join(tmp, "shaped.wav");
  writeFileSync(raw, writeWav(samples));
  const filter = performance
    ? [tempo !== 1 ? `atempo=${tempo.toFixed(4)}` : "", "loudnorm=I=-18:TP=-2:LRA=7"].filter(Boolean).join(",")
    : emotionFilter(emotion, { tempo });
  const r = run("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-af", `${filter},aresample=${SAMPLE_RATE}`, "-ac", "1", "-ar", String(SAMPLE_RATE), "-c:a", "pcm_s16le", out]);
  if (!r.ok) fail(`ffmpeg emotion pass failed: ${r.err.trim()}`);
  return trimSilence(readWav(readFileSync(out)).samples);
}

/* ---------- list ---------- */

function list(opts) {
  const lang = opts.lang || "en";
  console.log("Emotions:");
  for (const [id, e] of Object.entries(EMOTIONS)) {
    console.log(`  ${id.padEnd(8)} rate ${e.rate}×, pitch ${e.pitch >= 0 ? "+" : ""}${e.pitch} st, pause ${e.pause}ms — ${e.acting}`);
  }
  console.log(`\nLanguages: ${Object.entries(LANGS).map(([k, v]) => `${k} (${v})`).join(", ")}, or any code your engine knows.`);
  console.log(`\nEngines: ${ENGINES.join(", ")}`);
  console.log(`  kokoro  ${kokoroReady() ? "ready" : "not installed (npm i -D hyperframes)"} — ${lang}: ${candidates("kokoro", lang, "female").join(", ") || "none"}`);
  if (process.platform === "darwin") {
    const base = lang.split("-")[0];
    const local = sayVoices().filter((v) => v.locale.toLowerCase().startsWith(base) && !NOVELTY.has(v.name));
    console.log(`  say     ready — ${lang}: ${local.map((v) => v.name).join(", ") || "none installed"}`);
  } else {
    console.log("  say     macOS only");
  }
  console.log(`  espeak  ${espeakBin() || "not installed"}`);
  console.log(`  ffmpeg  ${has("ffmpeg") ? "ready (full emotion shaping)" : "missing (gain only)"}`);
}

/* ---------- main ---------- */

/** Where the audio goes: the film root for a standalone film, the sequence root for a scene. */
function outputFor(dir, sheet) {
  if (sheet.sequence) {
    const root = resolve(dir, sheet.sequence.root);
    return { root, rel: `assets/voice/${sheet.sequence.scene}`, idPrefix: `vo-${sheet.sequence.scene}` };
  }
  return { root: dir, rel: "assets/voice", idPrefix: "vo-line" };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.flags.has("list")) return list(opts);
  if (!opts.dir) fail("usage: node harness/voice.js films/<slug> [--emotion e] [--intensity n] [--lang l] [--voice v] [--engine e] [--source file] [--fit] [--dry]");

  const dir = resolve(opts.dir);
  const sheetPath = join(dir, "sheet.json");
  if (!existsSync(sheetPath)) {
    if (existsSync(join(dir, "sequence.json"))) {
      fail(`${dir} is a sequence. Voice each scene: node harness/voice.js ${opts.dir}/scenes/<scene>.`);
    }
    fail(`${sheetPath} not found. Write it with node harness/sheet.js first.`);
  }
  const sheet = JSON.parse(readFileSync(sheetPath, "utf8"));
  const lines = sheet.lines ?? (sheet.dialogue ? [{ text: sheet.dialogue, shot: "button" }] : []);
  if (!lines.length) fail("the sheet has no dialogue, so there is nothing to voice.");

  const base = sheet.voice?.mode === "line" ? sheet.voice : { mode: "line" };
  const merged = voiceSettings(
    {
      ...base,
      mode: "line",
      emotion: opts.emotion ?? base.emotion,
      intensity: opts.intensity ?? base.intensity,
      engine: opts.engine ?? base.engine,
      voice: opts.voice ?? base.voice,
      lang: opts.lang ?? base.lang,
      register: opts.register ?? base.register,
      source: opts.source ?? base.source,
      onScreen: opts.flags.has("off-screen") ? false : base.onScreen,
    },
    sheet.cast ?? [],
    lines,
  );
  if (!merged.ok) fail(merged.error);
  const settings = merged.voice;
  if (sheet.voice?.mode !== "line") note('the sheet has voice off; voicing anyway. Recompile with voice.mode "line" to record it on the sheet.');

  // Speakers sharing a register get different voices, in cast order, so a
  // speaker keeps the same voice in every scene of a sequence.
  const order = {};
  const counts = { female: 0, male: 0 };
  const castNames = (sheet.cast ?? []).map((m) => m.name);
  for (const who of [...castNames, ...lines.map((l) => l.speaker || settings.speaker)]) {
    if (who in order) continue;
    const reg = settings.speakers[who]?.register ?? settings.register;
    order[who] = counts[reg]++;
  }

  const allRecordings = Boolean(settings.source) || lines.every((l) => l.source);
  const engine = allRecordings ? "source" : pickEngine(settings.engine);
  const distinctSpeakers = new Set(lines.map((l) => l.speaker || settings.speaker)).size;

  const plan = lines.map((l, i) => {
    const who = l.speaker || settings.speaker;
    const cast = settings.speakers[who] ?? { register: settings.register, voice: settings.voice };
    const source = l.source || (i === 0 ? settings.source : "");
    const emotion = emotionProfile(opts.emotion ?? (l.emotion || settings.emotion), settings.intensity);
    const voice = source ? "" : pickVoice(engine, settings.lang, cast.register, opts.voice ?? cast.voice, order[who]);
    return { index: i + 1, text: l.text, speaker: who, shot: l.shot || "button", source, emotion, voice, register: cast.register };
  });

  if (opts.flags.has("dry")) {
    console.log(
      JSON.stringify(
        { engine, lang: settings.lang, lines: plan.map((p) => ({ ...p, phrases: splitPhrases(p.text), filter: p.source ? "loudnorm only" : emotionFilter(p.emotion) })) },
        null,
        2,
      ),
    );
    return;
  }

  const out = outputFor(dir, sheet);
  const outDir = join(out.root, out.rel);
  mkdirSync(outDir, { recursive: true });
  const fps = sheet.fps;
  const step = 2 / fps;
  const tmp = mkdtempSync(join(tmpdir(), "html-anime-voice-"));
  const records = [];
  try {
    let after = -Infinity;
    for (const p of plan) {
      const performance = Boolean(p.source);
      const lineEngine = performance ? "source" : engine;
      const lineTmp = join(tmp, `line-${p.index}`);
      mkdirSync(lineTmp);
      const raw = performance ? loadAudio(resolve(p.source), lineTmp) : synthLine(lineEngine, p.voice, settings.lang, p.text, p.emotion, lineTmp);
      let samples = shape(raw, p.emotion, 1, lineTmp, { performance });
      let duration = samples.length / SAMPLE_RATE;
      let place = placeLine(sheet, duration, { shot: p.shot, after });
      let tempo = 1;

      if (!place.fits) {
        const needed = duration / place.room;
        if (!opts.flags.has("fit") || needed > MAX_FIT || !has("ffmpeg")) {
          fail(
            `line ${p.index} runs ${duration.toFixed(2)}s; the ${p.shot} shot plus a ${J_CUT}s J-cut holds ${place.room.toFixed(2)}s. ` +
              (needed <= MAX_FIT && has("ffmpeg") ? "Rerun with --fit, " : "") +
              "shorten the line, move it to a longer shot, or recompile at a longer runtime.",
          );
        }
        tempo = Math.ceil(needed * 1000) / 1000;
        samples = shape(raw, p.emotion, tempo, lineTmp, { performance });
        duration = samples.length / SAMPLE_RATE;
        place = placeLine(sheet, duration, { shot: p.shot, after });
        if (!place.fits) fail(`line ${p.index} is still ${duration.toFixed(2)}s after fitting. Shorten it.`);
        note(`line ${p.index} fitted at ${tempo}× to hold ${place.room.toFixed(2)}s.`);
      }

      const fileName = `line-${p.index}.wav`;
      writeFileSync(join(outDir, fileName), writeWav(samples));
      const dur = Math.round(duration * 1000) / 1000;
      after = place.start + dur;

      const shot = sheet.shots.find((s) => s.id === p.shot) ?? sheet.shots.at(-1);
      const prefix = distinctSpeakers > 1 ? `${castSlug(p.speaker)}-mouth` : "mouth";
      const keys = [];
      if (settings.onScreen) {
        mouthTrack(samples, SAMPLE_RATE, fps).forEach((shapeIndex, i) => {
          const t = Math.round((place.start + i * step) * fps) / fps;
          if (t + step <= shot.start) return;
          const at = Math.max(t, shot.start);
          if (!keys.length || keys.at(-1)[1] !== MOUTHS[shapeIndex]) keys.push([Math.round(at * 1000) / 1000, MOUTHS[shapeIndex]]);
        });
      }
      const file = `${out.rel}/${fileName}`;
      const audio = `<audio id="${out.idPrefix}-${p.index}" class="clip" src="${file}" data-start="${place.start}" data-duration="${dur}" data-track-index="${8 + p.index}" data-volume="1"></audio>`;
      records.push({
        index: p.index,
        text: p.text,
        speaker: p.speaker,
        shot: p.shot,
        emotion: p.emotion.id,
        intensity: p.emotion.intensity,
        engine: lineEngine,
        voice: p.voice,
        source: p.source || undefined,
        tempo,
        file,
        start: place.start,
        duration: dur,
        jcut: place.jcut,
        mouth: { onTwos: true, prefix, shapes: MOUTHS, keys },
        audio,
      });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const record = { lang: settings.lang, onScreen: settings.onScreen, lines: records };
  writeFileSync(join(dir, "voice.json"), `${JSON.stringify(record, null, 2)}\n`);

  for (const r of records) {
    console.log(`Line ${r.index} · ${r.speaker || "speaker"} · "${r.text}" — ${r.engine}${r.voice ? ` (${r.voice})` : ""}, ${settings.lang}, ${r.emotion}.`);
    console.log(`  ${r.duration}s from ${r.start}s on the ${r.shot} shot${r.jcut ? " (J-cut: starts before the cut)" : ""}.`);
  }
  console.log("\nPaste inside the composition's root:\n");
  for (const r of records) console.log(`  ${r.audio}`);
  const withMouths = records.filter((r) => r.mouth.keys.length);
  if (withMouths.length) {
    console.log("\nMouth swaps (draw the closed, mid, and open mouths in the speaking shot):\n");
    for (const r of withMouths) {
      console.log(`  const MOUTH_${r.index} = ${JSON.stringify(r.mouth.keys)};`);
      console.log(`  for (const [t, shape] of MOUTH_${r.index}) for (const m of ["closed", "mid", "open"]) tl.set(\`#${r.mouth.prefix}-\${m}\`, { opacity: m === shape ? 1 : 0 }, t);`);
    }
  }
  note(`wrote ${records.length} line${records.length > 1 ? "s" : ""} to ${outDir} and ${join(dir, "voice.json")}`);
}

main();
