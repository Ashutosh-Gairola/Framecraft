import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFilm } from "./check.js";

const ROOF = join(dirname(fileURLToPath(import.meta.url)), "..", "films", "roof");

// The reference film passes.
const clean = checkFilm(ROOF);
assert.deepEqual(clean.errors, []);

// Each break is caught on a copy.
function broken(edit) {
  const dir = mkdtempSync(join(tmpdir(), "html-anime-check-"));
  cpSync(ROOF, dir, { recursive: true });
  edit(dir);
  const result = checkFilm(dir);
  rmSync(dir, { recursive: true, force: true });
  return result.errors.join("\n");
}

function editHtml(fn) {
  return (dir) => {
    const path = join(dir, "index.html");
    writeFileSync(path, fn(readFileSync(path, "utf8")));
  };
}

assert.match(broken(editHtml((h) => h.replace('fill="#d5e2ff"', 'fill="#00ff00"'))), /hexes not on the sheet: #00ff00/);
assert.match(broken(editHtml((h) => h.replace('fill="#d5e2ff"', 'fill="rgb(0,255,0)"'))), /color functions/);
assert.match(broken(editHtml((h) => h.replace('fill="#d5e2ff"', 'fill="white"'))), /named colors: white/);
assert.match(broken(editHtml((h) => h.replace('data-duration="8"', 'data-duration="9"'))), /data-duration is 9/);
assert.match(broken(editHtml((h) => h.replace("const tl =", "const r = Math.random(); const tl ="))), /Math\.random/);
assert.match(broken(editHtml((h) => h.replace("repeat: 15", "repeat: -1"))), /repeat: -1/);
assert.match(broken(editHtml((h) => h.replace('window.__timelines["roof"]', 'window.__timelines["film"]'))), /not registered/);
assert.match(broken(editHtml((h) => h.replace("hid the sound", "hid the noise"))), /not set verbatim/);
assert.match(broken(editHtml((h) => h.replace('data-start="5.917"', 'data-start="6.5"'))), /line 1 starts at 6\.5s/);
assert.match(broken(editHtml((h) => h.replace(/<audio[^>]*><\/audio>/, ""))), /no <audio>/);
assert.match(broken((dir) => rmSync(join(dir, "design", "ren.html"))), /model sheet missing for Ren/);
assert.match(broken((dir) => rmSync(join(dir, "bible.md"))), /bible\.md is missing/);
assert.match(broken((dir) => rmSync(join(dir, "voice.json"))), /voice\.json is missing/);

// A seek-driven 3D scene may load asynchronously; an ordinary film may not.
assert.doesNotMatch(
  broken(editHtml((h) => h.replace("const tl =", 'window.__hf = {}; window.__hf.buildReady = { x: new Promise(() => {}) }; addEventListener("hf-seek", () => {}); const tl ='))),
  /async code/,
);
assert.match(broken(editHtml((h) => h.replace("const tl =", "new Promise(() => {}); const tl ="))), /async code/);

console.log("check: ok");
