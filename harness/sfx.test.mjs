import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KINDS, ffmpegArgs } from "./sfx.js";
import { readWav } from "./voice-lib.js";

// Every kind builds a single-quoted aevalsrc expression and a filter chain.
for (const [kind, k] of Object.entries(KINDS)) {
  const args = ffmpegArgs({ kind, dur: 1 }, "out.wav");
  const src = args[args.indexOf("-i") + 1];
  assert.match(src, /^aevalsrc=exprs='[^']+':s=48000:d=1$/, kind);
  assert.match(args[args.indexOf("-af") + 1], /alimiter/, kind);
  assert.ok(k.about, `${kind} says what it is for`);
}
assert.throws(() => ffmpegArgs({ kind: "kazoo" }, "x.wav"), /unknown sound kind/);
assert.notEqual(ffmpegArgs({ kind: "score", mood: "calm" }, "a.wav")[6], ffmpegArgs({ kind: "score", mood: "climax" }, "a.wav")[6]);

// With ffmpeg present, a clang renders to a 48 kHz WAV of the right length, the same bytes twice.
if (spawnSync("ffmpeg", ["-version"]).status === 0) {
  const dir = mkdtempSync(join(tmpdir(), "html-anime-sfx-"));
  const a = join(dir, "a.wav");
  const b = join(dir, "b.wav");
  for (const out of [a, b]) assert.equal(spawnSync("ffmpeg", ffmpegArgs({ kind: "clang" }, out)).status, 0);
  const wav = readWav(readFileSync(a));
  assert.equal(wav.rate, 48000);
  assert.ok(Math.abs(wav.samples.length - 48000 * KINDS.clang.dur) < 48, "the clang lasts its dur");
  assert.equal(spawnSync("cmp", ["-s", a, b]).status, 0, "deterministic");
  rmSync(dir, { recursive: true, force: true });
}

console.log("sfx: ok");
