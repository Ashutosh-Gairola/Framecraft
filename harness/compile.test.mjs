import assert from "node:assert/strict";
import { ASPECTS, compileBrief, detectMotion, parseCast, SCRIPTS, shotPlan, STYLES } from "./compile.js";

for (const seconds of [8, 12, 20]) {
  const shots = shotPlan(seconds);
  const sum = shots.reduce((total, shot) => total + shot.dur, 0);
  assert.equal(Math.round(sum * 1000), seconds * 1000);
  assert.equal(shots.filter((shot) => shot.sakuga).length, 1);
}

assert.throws(() => shotPlan(15), /8, 12, or 20/);

const brief = compileBrief({
  logline: "On a roof in the rain, a red moon opens and a line of light falls.",
  seconds: 8,
  aspect: "16:9",
  script: "indigo",
  dialogue: "The rain hid the sound of the blade.",
});

assert.equal(brief.ok, true);
assert.equal(brief.frames, 192);
assert.equal(brief.slug, "roof-rain-red-moon");
assert.match(brief.markdown, /^# html-anime\n/);
assert.match(brief.markdown, /1920×1080/);
assert.match(brief.markdown, /192 frames/);
assert.match(brief.markdown, /Do not translate/);
assert.match(brief.markdown, /> The rain hid the sound of the blade\./);
assert.match(brief.markdown, /Sakuga — the expensive shot/);
assert.doesNotMatch(brief.markdown, /tall frame/);

const listed = new Set([...brief.markdown.matchAll(/#[0-9a-f]{6}/g)].map((match) => match[0]));
const allowed = new Set(Object.values(SCRIPTS.indigo.colors));
assert.deepEqual(listed, allowed);

const spans = [...brief.markdown.matchAll(/(\d+\.\d+)–(\d+\.\d+)/g)];
assert.equal(spans[0][1], "0.00");
assert.equal(spans.at(-1)[2], "8.00");
let cursor = 0;
for (const span of spans) {
  assert.equal(Number(span[1]), cursor);
  cursor = Number(span[2]);
}
assert.equal(cursor, 8);

const tall = compileBrief({
  logline: "A bell rings once.",
  seconds: 12,
  aspect: "9:16",
  script: "noon",
  dialogue: "",
});
assert.equal(tall.ok, true);
assert.match(tall.markdown, /1080×1920/);
assert.match(tall.markdown, /288 frames/);
assert.match(tall.markdown, /No dialogue/);
assert.doesNotMatch(tall.markdown, /Do not translate/);
const noonHexes = new Set([...tall.markdown.matchAll(/#[0-9a-f]{6}/g)].map((match) => match[0]));
assert.deepEqual(noonHexes, new Set(Object.values(SCRIPTS.noon.colors)));
assert.equal(noonHexes.has("#e23b4a"), false);
assert.match(tall.markdown, /tall frame/);
assert.equal(tall.slug, "bell-rings-once");

assert.equal(compileBrief({ logline: "   ", seconds: 8, aspect: "16:9", script: "indigo" }).ok, false);
assert.equal(
  compileBrief({ logline: "a".repeat(401), seconds: 8, aspect: "16:9", script: "indigo" }).ok,
  false,
);
assert.equal(
  compileBrief({ logline: "A bell.", seconds: 9, aspect: "16:9", script: "indigo" }).ok,
  false,
);
assert.equal(
  compileBrief({ logline: "A bell.", seconds: 8, aspect: "1:1", script: "indigo" }).ok,
  false,
);

for (const script of Object.values(SCRIPTS)) {
  for (const hex of Object.values(script.colors)) {
    assert.match(hex, /^#[0-9a-f]{6}$/);
  }
}

assert.deepEqual(Object.keys(ASPECTS), ["16:9", "9:16"]);

// Cast: originals wait on a model sheet; references are followed.
const cast = parseCast("Ren\nAoi: ref media/aoi.png\nKage: tall, scar over the left eye\nMio: original");
assert.equal(cast.ok, true);
assert.deepEqual(
  cast.cast.map((m) => [m.name, m.slug, m.kind]),
  [["Ren", "ren", "original"], ["Aoi", "aoi", "image"], ["Kage", "kage", "notes"], ["Mio", "mio", "original"]],
);
assert.equal(cast.cast[1].reference, "media/aoi.png");
assert.equal(parseCast("Ren\nren").ok, false);
assert.equal(parseCast("A\nB\nC\nD\nE").ok, false);
assert.equal(parseCast(": no name").ok, false);
assert.equal(parseCast([{ name: "Sora", reference: "https://example.com/sora.webp" }]).cast[0].kind, "image");

// Motion cards come from the scene's words, whole words only.
const motion = detectMotion("She draws her katana and leaps", "an umbrella");
assert.deepEqual(motion.map((m) => m.id), ["blade", "locomotion", "handling"]);
assert.deepEqual(detectMotion("A bowl of rice").map((m) => m.id), []);

const full = compileBrief({
  logline: "A swordsman cuts through falling petals.",
  seconds: 12,
  aspect: "16:9",
  script: "festival",
  style: "retro",
  styleReference: "media/ova-still.png",
  dialogue: "Not yet.",
  cast: "Kaito: ref media/kaito.png",
  props: "a katana",
  designColors: { scarf: "#2f8f6b" },
  voice: { mode: "line", emotion: "cold", intensity: 0.8, register: "male" },
});
assert.equal(full.ok, true, full.error);
assert.match(full.markdown, /## Art style\nRetro cel/);
assert.match(full.markdown, /Style reference: media\/ova-still\.png/);
assert.match(full.markdown, /Kaito — follows a reference \(image\): media\/kaito\.png/);
assert.match(full.markdown, /references\/blade\.md/);
assert.match(full.markdown, /references\/effects\.md/);
assert.match(full.markdown, /- scarf #2f8f6b/);
assert.match(full.markdown, /Line 1, Kaito: male register\. Cold at 0\.8/);
assert.match(full.markdown, /html-anime-voice\/SKILL\.md/);
assert.match(full.markdown, /3b\. Voice/);
assert.equal(full.sheet.version, 3);
assert.deepEqual(full.sheet.lines, [{ speaker: "Kaito", text: "Not yet.", emotion: "cold", shot: "button", source: "" }]);
assert.equal(full.sheet.voice.lang, "en");
assert.deepEqual(full.sheet.designColors, { scarf: "#2f8f6b" });
assert.equal(full.sheet.shots.at(-1).end, 12);
assert.equal(full.sheet.shots.filter((x) => x.sakuga).length, 1);
assert.match(brief.markdown, /No named cast/);
assert.match(brief.markdown, /Voice off/);
assert.match(brief.markdown, /## Art style\nInk cel/);

const base = { logline: "A bell.", seconds: 8, aspect: "16:9", script: "indigo" };
assert.equal(compileBrief({ ...base, style: "oil" }).ok, false);
assert.equal(compileBrief({ ...base, designColors: { sky: "#000000" } }).ok, false);
assert.equal(compileBrief({ ...base, designColors: { a: "#111111", b: "#222222", c: "#333333", d: "#444444" } }).ok, false);
assert.equal(compileBrief({ ...base, designColors: { teal: "teal" } }).ok, false);
assert.equal(compileBrief({ ...base, voice: { mode: "line" } }).ok, false, "voice needs dialogue");
assert.equal(compileBrief({ ...base, dialogue: "Hi.", voice: { mode: "line", emotion: "smug" } }).ok, false);
assert.equal(compileBrief({ ...base, dialogue: "Hi.", cast: "Ren", voice: { mode: "line", speaker: "Aoi" } }).ok, false);
assert.equal(compileBrief({ ...base, slug: "Bad Slug" }).ok, false);
assert.equal(compileBrief({ ...base, slug: "bell" }).slug, "bell");
const ja = compileBrief({ ...base, dialogue: "まだだ。", voice: { mode: "line" } });
assert.equal(ja.sheet.voice.lang, "ja");
assert.match(ja.markdown, /Japanese/);
const es = compileBrief({ ...base, dialogue: "Todavía no.", voice: { mode: "line", lang: "es" } });
assert.match(es.markdown, /Spanish/);
for (const style of Object.values(STYLES)) {
  assert.doesNotMatch(JSON.stringify(style), /#[0-9a-f]{3,6}/i, "styles must not carry hexes");
}

// Two placed lines with speakers, and a title card.
const duel = compileBrief({
  ...base,
  seconds: 12,
  cast: "Shadow\nPhantom",
  lines: [
    { speaker: "Shadow", text: "You came all this way just to lose?", emotion: "cold" },
    { speaker: "Phantom", text: "I came to end this.", emotion: "resolve" },
  ],
  card: "THE BATTLE IS NOT OVER.",
  voice: { mode: "line", speakers: { Shadow: { register: "male" }, Phantom: { register: "male", voice: "Daniel" } } },
});
assert.equal(duel.ok, true, duel.error);
assert.deepEqual(duel.sheet.lines.map((l) => [l.speaker, l.shot, l.emotion]), [["Shadow", "approach", "cold"], ["Phantom", "button", "resolve"]]);
assert.match(duel.markdown, /> You came all this way just to lose\?\n— Shadow, approach shot, cold/);
assert.match(duel.markdown, /Title card, on screen, not spoken/);
assert.match(duel.markdown, /> THE BATTLE IS NOT OVER\./);
assert.match(duel.markdown, /Line 2, Phantom: male register, voice Daniel\. Resolve/);
assert.equal(duel.sheet.card, "THE BATTLE IS NOT OVER.");
const lines3 = [1, 2, 3].map((n) => ({ text: `Line ${n}.` }));
assert.equal(compileBrief({ ...base, lines: lines3 }).ok, false);
assert.equal(compileBrief({ ...base, lines: [{ text: "A.", shot: "turn" }] }).ok, false, "no turn shot at 8s");
assert.equal(compileBrief({ ...base, lines: [{ text: "A.", shot: "button" }, { text: "B.", shot: "establish" }] }).ok, false);
assert.equal(compileBrief({ ...base, lines: [{ text: "A.", emotion: "smug" }] }).ok, false);
assert.equal(compileBrief({ ...base, card: "x".repeat(61) }).ok, false);
const seq = compileBrief({ ...base, sequence: { slug: "duel", scene: "s2-clash", index: 1, start: 20, title: "First Clash" } });
assert.match(seq.markdown, /^# html-anime · scene 2 · First Clash/);
assert.match(seq.markdown, /films\/duel\/compositions\/s2-clash\.html/);
assert.match(seq.markdown, /node harness\/check\.js films\/duel,/);
assert.equal(seq.sheet.sequence.root, "../..");

// Full animation is the default; limited keeps the classic drawing counts.
assert.equal(brief.sheet.animation, "full");
assert.match(brief.markdown, /Every frame between keys is inbetweened/);
assert.match(brief.markdown, /8 keys, inbetweened/);
const limited = compileBrief({ ...base, animation: "limited" });
assert.match(limited.markdown, /8 unique drawings/);
assert.match(limited.markdown, /3 drawings ·/);
assert.equal(compileBrief({ ...base, animation: "smooth" }).ok, false);

console.log("compile: ok");
