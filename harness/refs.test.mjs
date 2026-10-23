import assert from "node:assert/strict";
import { kmeans, nearestPaint, deltaE, TEMPLATE } from "./refs.js";

// Two flat colours, 3:1 — k-means finds both, largest first, with their shares.
const raw = new Uint8Array(400 * 3);
for (let i = 0; i < 400; i += 1) raw.set(i < 300 ? [30, 120, 200] : [240, 180, 40], i * 3);
const c = kmeans(raw, 2);
assert.equal(c.length, 2);
assert.equal(c[0].hex, "#1e78c8");
assert.ok(Math.abs(c[0].share - 0.75) < 1e-9);
assert.equal(c[1].hex, "#f0b428");

// Nearest paint by Lab distance.
const paints = { ocean: "#1e5aa0", practical: "#f0c36a", ink: "#101628" };
assert.equal(nearestPaint([30, 120, 200], paints).name, "ocean");
assert.equal(nearestPaint([240, 180, 40], paints).name, "practical");
assert.equal(deltaE([10, 10, 10], [10, 10, 10]), 0);
assert.ok(TEMPLATE("Film").includes("## Subjects"));

console.log("refs: ok");
