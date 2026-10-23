import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSequence } from "./sequence.js";
import { checkFilm } from "./check.js";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures", "stickman-blade-fight");
const brief = JSON.parse(readFileSync(join(FIXTURE, "brief.json"), "utf8"));
const script = readFileSync(join(FIXTURE, "script.md"), "utf8");

// The fight compiles into five rule-keeping scenes inside the script's 60–90 s.
const fight = compileSequence(brief);
assert.equal(fight.ok, true, fight.error);
const seq = fight.sequence;
assert.equal(seq.seconds, 84);
assert.ok(seq.seconds >= 60 && seq.seconds <= 90);
assert.deepEqual(seq.scenes.map((s) => s.id), ["s1-encounter", "s2-first-clash", "s3-blades-of-the-storm", "s4-ultimate-techniques", "s5-final-frame"]);
assert.deepEqual(seq.scenes.map((s) => s.start), [0, 12, 32, 52, 72]);
for (const { sheet } of fight.scenes) {
  assert.equal(sheet.shots.filter((s) => s.sakuga).length, 1);
  assert.equal(sheet.shots.at(-1).end, sheet.seconds);
  assert.deepEqual(sheet.designColors, { volt: "#38b6ff" });
  assert.ok(sheet.motion.includes("blade"), `${sheet.slug} needs the blade card`);
  assert.equal(sheet.sequence.slug, "stickman-blade-fight");
}
assert.deepEqual(seq.cast.map((m) => [m.name, m.kind]), [["Shadow", "notes"], ["Phantom", "notes"]]);
assert.ok(fight.scenes[1].sheet.motion.includes("strike"));
assert.ok(seq.motion.includes("effects"));

// Every spoken line in the script is on a scene, verbatim, by the right speaker.
const spoken = [...script.matchAll(/^(SHADOW|PHANTOM): “(.+)”$/gm)].map((m) => [m[1][0] + m[1].slice(1).toLowerCase(), m[2]]);
assert.equal(spoken.length, 5);
const placed = fight.scenes.flatMap(({ sheet }) => sheet.lines.map((l) => [l.speaker, l.text]));
assert.deepEqual(placed, spoken);
assert.equal(fight.scenes[4].sheet.card, script.match(/TEXT ON SCREEN: (.+)$/m)[1]);

// Voice: on where there are lines, off where there are none, off screen for stickmen.
assert.deepEqual(fight.scenes.map(({ sheet }) => sheet.voice.mode), ["line", "off", "line", "line", "off"]);
assert.equal(fight.scenes[0].sheet.voice.onScreen, false);
assert.deepEqual(fight.scenes[3].sheet.lines.map((l) => [l.shot, l.emotion]), [["approach", "angry"], ["turn", "resolve"]]);

// Scene paths point into the sequence.
assert.match(fight.scenes[2].markdown, /films\/stickman-blade-fight\/compositions\/s3-blades-of-the-storm\.html/);
assert.match(fight.scenes[2].markdown, /node harness\/voice\.js films\/stickman-blade-fight\/scenes\/s3-blades-of-the-storm/);
assert.match(fight.markdown, /data-composition-src="compositions\/s4-ultimate-techniques\.html" data-start="52" data-duration="20"/);

// Sequence rules.
const scene = (seconds, extra = {}) => ({ logline: "A bell rings.", seconds, ...extra });
const small = { title: "Bells", aspect: "16:9", script: "indigo" };
assert.equal(compileSequence({ ...small, scenes: [scene(20)] }).ok, false, "one scene is a film");
assert.equal(compileSequence({ ...small, scenes: [scene(8), scene(8)] }).ok, false, "under 30 s");
assert.equal(compileSequence({ ...small, scenes: Array.from({ length: 7 }, () => scene(20)) }).ok, false, "over 120 s");
assert.equal(compileSequence({ ...small, scenes: [scene(20, { id: "a" }), scene(20, { id: "a" })] }).ok, false);
assert.equal(compileSequence({ ...small, scenes: [scene(20, { id: "A b" }), scene(20)] }).ok, false);
assert.match(compileSequence({ ...small, scenes: [scene(20, { script: "noon" }), scene(20)] }).error, /shared/);
assert.match(compileSequence({ ...small, scenes: [scene(20), scene(15)] }).error, /Scene 2/);
assert.equal(compileSequence({ ...small, title: "" , scenes: [scene(20), scene(20)] }).ok, false);

// check.js on a minimal drawn sequence, then each break.
const mini = compileSequence({
  title: "Two Bells",
  slug: "two-bells",
  aspect: "16:9",
  script: "indigo",
  cast: "Ren",
  scenes: [scene(20, { id: "one" }), scene(12, { id: "two", card: "THE END." })],
});
assert.equal(mini.ok, true, mini.error);

function sceneFile(id, words = "") {
  return `<template>
  <style>#root { position: absolute; inset: 0; background: #101628; }</style>
  <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080">
    <svg viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#1b2d6b" /><text fill="#e7eefc">${words}</text></svg>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines["${id}"] = tl;
  </script>
</template>
`;
}

function build(edit = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), "html-anime-seq-"));
  writeFileSync(join(dir, "sequence.json"), JSON.stringify(mini.sequence));
  for (const s of mini.scenes) {
    mkdirSync(join(dir, "scenes", s.id), { recursive: true });
    writeFileSync(join(dir, "scenes", s.id, "sheet.json"), JSON.stringify(s.sheet));
  }
  mkdirSync(join(dir, "design"));
  mkdirSync(join(dir, "compositions"));
  writeFileSync(join(dir, "design", "ren.html"), "<!doctype html>");
  writeFileSync(join(dir, "bible.md"), "# bible\n\n## Motion\n");
  writeFileSync(join(dir, "compositions", "one.html"), sceneFile("one"));
  writeFileSync(join(dir, "compositions", "two.html"), sceneFile("two", "THE END."));
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html><head><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head><body>
<div id="root" data-composition-id="two-bells" data-start="0" data-duration="32" data-width="1920" data-height="1080">
  <div id="one-host" data-composition-id="one" data-composition-src="compositions/one.html" data-start="0" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="two-host" data-composition-id="two" data-composition-src="compositions/two.html" data-start="20" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
</div>
<script>window.__timelines = window.__timelines || {}; window.__timelines["two-bells"] = gsap.timeline({ paused: true });</script>
</body></html>`,
  );
  edit(dir);
  const result = checkFilm(dir);
  rmSync(dir, { recursive: true, force: true });
  return result;
}

function swap(file, from, to) {
  return (dir) => {
    const path = join(dir, file);
    writeFileSync(path, readFileSync(path, "utf8").replace(from, to));
  };
}

assert.deepEqual(build().errors, []);
assert.match(build(swap("index.html", 'data-start="20" data-duration="12"', 'data-start="18" data-duration="12"')).errors.join("\n"), /two: mounted at 18s/);
assert.match(build(swap("index.html", 'data-duration="32"', 'data-duration="30"')).errors.join("\n"), /sequence runs 32/);
assert.match(build(swap("index.html", 'compositions/two.html"', 'compositions/2.html"')).errors.join("\n"), /does not mount compositions\/two\.html/);
assert.match(build((dir) => rmSync(join(dir, "compositions", "one.html"))).errors.join("\n"), /one: compositions\/one\.html is missing/);
assert.match(build(swap("compositions/two.html", "THE END.", "THE END")).errors.join("\n"), /title card is not set verbatim/);
assert.match(build(swap("compositions/one.html", 'data-composition-id="one"', 'data-composition-id="uno"')).errors.join("\n"), /scene is "one"/);
assert.match(build(swap("compositions/one.html", "#1b2d6b", "#123456")).errors.join("\n"), /one: hexes not on the sheet: #123456/);
assert.match(build(swap("compositions/one.html", "<template>", "<div>")).errors.join("\n"), /inside <template>/);
assert.match(build((dir) => rmSync(join(dir, "design", "ren.html"))).errors.join("\n"), /model sheet missing for Ren/);
assert.match(build(swap("index.html", ' data-composition-id="one"', "")).errors.join("\n"), /one: the host needs data-composition-id="one"/);

console.log("sequence: ok");
