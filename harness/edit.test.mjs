import assert from "node:assert/strict";
import { analyze, frameStats } from "./edit.js";
import { createKit } from "./draw/kit.js";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SIZE = 16;

// Synthetic footage: a bar sliding every frame (smooth), then held every other frame (twos), then frozen.
function film(pattern) {
  const frames = [];
  let x = 0;
  for (const step of pattern) {
    x += step;
    const f = new Uint8Array(SIZE).fill(40);
    for (let i = 0; i < 4; i += 1) f[(Math.floor(x) + i) % SIZE] = 220;
    frames.push(f);
  }
  const raw = new Uint8Array(frames.length * SIZE);
  frames.forEach((f, i) => raw.set(f, i * SIZE));
  return frameStats(raw, SIZE);
}

const smooth = analyze(film(Array(48).fill(1)), { frozenFrames: 6 });
assert.ok(smooth.stutter < 0.05, `smooth stutter ${smooth.stutter}`);
assert.equal(smooth.frozen.length, 0);

const twos = analyze(film(Array.from({ length: 48 }, (_, i) => (i % 2 ? 0 : 2))), { frozenFrames: 6 });
assert.ok(twos.stutter > 0.4, `twos stutter ${twos.stutter}`);

const frozen = analyze(film([...Array(12).fill(1), ...Array(20).fill(0), ...Array(12).fill(1)]), { fps: 24, frozenFrames: 12 });
assert.equal(frozen.frozen.length, 1);
assert.ok(Math.abs(frozen.frozen[0].seconds - 20 / 24) < 0.05);

// The kit's spline keeps velocity through a passing key and stops on an impact.
const dir = mkdtempSync(join(tmpdir(), "html-anime-kit-"));
mkdirSync(join(dir, "scenes"));
writeFileSync(join(dir, "sequence.json"), JSON.stringify({ scenes: [] }));
const K = createKit({ film: dir, colors: { ink: "#000000", sky: "#111111", line: "#ffffff", moon: "#eeeeee", accent: "#ff0000", skin: "#ffccaa", hair: "#222222" } });
const pose = (x) => ({ x, y: 0, torso: 0 });
const ks = [0, 1, 2].map((t, i) => ({ t, p: K.resolve(pose([0, 100, 200][i])), o: {} }));
const seg = K.splineSegments(ks);
const v = (i, u) => (seg(i, u + 0.01).x - seg(i, u).x) / 0.01;
assert.ok(v(0, 0.98) > 60 && v(1, 0.01) > 60, "flows through the middle key");
assert.ok(Math.abs(seg(0, 0).x) < 1e-6 && Math.abs(seg(1, 1 - 1e-9).x - 200) < 0.01, "passes through the keys");
const hit = [{ t: 0, p: K.resolve(pose(0)), o: {} }, { t: 1, p: K.resolve(pose(100)), o: { ease: "in" } }];
const h = K.splineSegments(hit);
assert.ok((h(0, 0.99) .x - h(0, 0.98).x) > (h(0, 0.02).x - h(0, 0.01).x) * 5, "an impact accelerates into contact");
rmSync(dir, { recursive: true, force: true });

console.log("edit: ok");

// Colour: a saturated, contrasty frame is lively; a hazy grey one is flagged dull.
{
  const { colorStats, colorVerdict } = await import("./edit.js");
  const px = 100;
  const lively = new Uint8Array(px * 3 * 3);
  const hazy = new Uint8Array(px * 3 * 3);
  for (let f = 0; f < 3; f += 1)
    for (let i = 0; i < px; i += 1) {
      lively.set([[230, 50, 30], [12, 30, 110], [8, 8, 12], [250, 220, 120]][i % 4], (f * px + i) * 3);
      hazy.set(i % 2 ? [150, 160, 170] : [130, 140, 150], (f * px + i) * 3);
    }
  const a = colorVerdict(colorStats(lively, px), 1);
  const b = colorVerdict(colorStats(hazy, px), 1);
  assert.ok(a.colorfulness > 60 && a.saturation > 0.8 && a.black < 40 && a.dull.length === 0);
  assert.ok(b.saturation < 0.32 && b.black > 40 && b.dull.length === 1);
  console.log("edit colour: ok");
}
