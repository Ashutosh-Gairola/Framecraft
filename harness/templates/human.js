/**
 * human.js — characters for three.js films, sculpted and rigged from code.
 *
 * One continuous skin, not a stack of tubes: the body is a signed distance field of anatomical
 * masses (ribcage, pectorals, deltoids, biceps, glutes, quadriceps, calves…) joined with smooth
 * unions, meshed by surface nets, its normals taken from the field's gradient. The head is the
 * same method at finer resolution (cranium, brow, cheekbones, nose, lips, chin, ears). Hair and
 * clothes are shells offset from the same field. Everything is skinned automatically onto a real
 * skeleton (distance to each bone, restricted to the bones of the part a vertex belongs to), so it
 * bends at the joints without seams, and posed with the same angle conventions as a figure.
 *
 * Two styles from one design:
 *   style: "real"  — anatomical proportions, physical skin (sheen, regional colour), small eyes.
 *   style: "anime" — ~7 heads tall, large eyes with a big iris and two highlights, a small nose,
 *                    a short mouth, clumped hair; cel-shaded (a three-step ramp) with ink outlines.
 *
 *   import { buildHuman, poseHuman } from "./human.js";
 *   const h = buildHuman(THREE, { style: "real", height: 1.76, sex: 0, ... });
 *   scene.add(h.root);  poseHuman(h, { spine: [0.05, 0, 0], armL: { sh: [0.3, 0, 0.2], el: 0.6 } });
 *
 * Spec: see DEFAULTS below. Method and rules: skills/html-anime-character/SKILL.md.
 * Pure math in the core (works in node too), so a build script can precompute meshes.
 */

/* ---------------- spec ---------------- */

export const DEFAULTS = {
  style: "real", // "real" | "anime"
  height: 1.76,
  sex: 0, // 0 male … 1 female (proportions, not a switch)
  build: 0.5, // 0 slight … 1 broad
  muscle: 0.5,
  fat: 0.3,
  skin: "#c99b82",
  eyes: "#4a6e8c",
  face: { jaw: 0.5, chin: 0.5, nose: 0.5, noseWidth: 0.5, brow: 0.5, cheek: 0.5, lips: 0.5, eyeSize: 0.5 },
  hair: { style: "short", color: "#3b2a1e" }, // short | long | bun | bald
  brows: "#2f2219",
  top: { type: "tshirt", color: "#2c3e5c" }, // tshirt | jacket | none
  bottom: { type: "jeans", color: "#30425e" }, // jeans | shorts | skirt | none
  shoes: { color: "#e8e6e0", sole: "#f4f2ee" },
  res: 1, // mesh resolution multiplier (1 = 3 mm body, 1.4 mm head)
};
const merge = (a, b) => {
  const o = { ...a };
  for (const k of Object.keys(b ?? {})) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(a[k] ?? {}, b[k]) : b[k];
  return o;
};

/* ---------------- vector math ---------------- */

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const mix = (a, b, u) => a + (b - a) * u;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
/** Polynomial smooth min / max (k in metres). */
const smin = (a, b, k) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return mix(b, a, h) - k * h * (1 - h);
};
const smax = (a, b, k) => -smin(-a, -b, k);

/* ---------------- primitives ---------------- */

/**
 * Each primitive: { type, ...geometry, k (blend into its part), sub (carve), box (bounds) }.
 * Types: "ell" ellipsoid (c, r[3], rot?: [rx, ry, rz]); "cone" round cone (a, b, ra, rb).
 */
function rotInv(rot) {
  if (!rot) return null;
  const [x, y, z] = rot;
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  // R = Rz * Ry * Rx; inverse = transpose.
  const m = [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}
function ell(c, r, opt = {}) {
  const R = Math.max(...r);
  return { type: "ell", c, r, m: rotInv(opt.rot), k: opt.k ?? 0.02, sub: !!opt.sub, box: [c[0] - R, c[1] - R, c[2] - R, c[0] + R, c[1] + R, c[2] + R] };
}
function cone(a, b, ra, rb, opt = {}) {
  const R = Math.max(ra, rb);
  return {
    type: "cone",
    a,
    b,
    ra,
    rb,
    k: opt.k ?? 0.02,
    sub: !!opt.sub,
    box: [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R],
  };
}
function dPrim(p, x, y, z) {
  if (p.type === "lid") {
    // The skin over the eye, open in an almond: a shell round the ball, cut by two arcs.
    const lx = (x - p.c[0]) * p.sd, ly = y - p.c[1], lz = z - p.c[2];
    const r = p.r;
    const shell = Math.abs(len3(lx, ly, lz) - (r + p.t)) - p.t;
    const u = lx / r;
    const yUp = r * (p.up - 0.3 * u * u + 0.12 * u);
    const yLo = r * (p.lo + 0.22 * u * u + 0.04 * u);
    const outside = Math.max(yLo - ly, ly - yUp, Math.abs(lx) - r * 0.95);
    let d = Math.max(shell, -outside);
    d = Math.max(d, -(lz + r * 0.15));
    return d;
  }
  if (p.type === "ell") {
    let px = x - p.c[0];
    let py = y - p.c[1];
    let pz = z - p.c[2];
    if (p.m) {
      const m = p.m;
      const qx = m[0] * px + m[3] * py + m[6] * pz;
      const qy = m[1] * px + m[4] * py + m[7] * pz;
      const qz = m[2] * px + m[5] * py + m[8] * pz;
      px = qx;
      py = qy;
      pz = qz;
    }
    const [rx, ry, rz] = p.r;
    const k0 = len3(px / rx, py / ry, pz / rz);
    const k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  }
  // Round cone (capsule with two radii), exact.
  const [ax, ay, az] = p.a;
  const bax = p.b[0] - ax, bay = p.b[1] - ay, baz = p.b[2] - az;
  const pax = x - ax, pay = y - ay, paz = z - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = p.ra - p.rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const yv = pax * bax + pay * bay + paz * baz;
  const zv = yv - l2;
  const xx = pax * l2 - bax * yv, xy = pay * l2 - bay * yv, xz = paz * l2 - baz * yv;
  const x2 = xx * xx + xy * xy + xz * xz;
  const y2 = yv * yv * l2;
  const z2 = zv * zv * l2;
  const kk = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zv) * a2 * z2 > kk) return Math.sqrt(x2 + z2) * il2 - p.rb;
  if (Math.sign(yv) * a2 * y2 < kk) return Math.sqrt(x2 + y2) * il2 - p.ra;
  return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - p.ra;
}
/** A part: primitives combined in order (smooth union, or smooth carve for `sub`). */
function part(name, prims, bones) {
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of prims)
    if (!p.sub)
      for (let i = 0; i < 3; i += 1) {
        box[i] = Math.min(box[i], p.box[i]);
        box[i + 3] = Math.max(box[i + 3], p.box[i + 3]);
      }
  return { name, prims, bones, box };
}
function dPart(P, x, y, z, pad = 0.04) {
  const b = P.box;
  if (x < b[0] - pad || y < b[1] - pad || z < b[2] - pad || x > b[3] + pad || y > b[4] + pad || z > b[5] + pad) {
    // Outside the bounds: a cheap lower bound is enough.
    const dx = Math.max(b[0] - x, 0, x - b[3]);
    const dy = Math.max(b[1] - y, 0, y - b[4]);
    const dz = Math.max(b[2] - z, 0, z - b[5]);
    return len3(dx, dy, dz);
  }
  let d = 1e9;
  for (const p of P.prims) {
    if (p.sub) {
      const bb = p.box;
      if (x < bb[0] - p.k || y < bb[1] - p.k || z < bb[2] - p.k || x > bb[3] + p.k || y > bb[4] + p.k || z > bb[5] + p.k) continue;
      d = smax(d, -dPrim(p, x, y, z), p.k);
    } else {
      const bb = p.box;
      const out = Math.max(bb[0] - x, x - bb[3], bb[1] - y, y - bb[4], bb[2] - z, z - bb[5]);
      if (out > d + p.k) continue;
      d = smin(d, dPrim(p, x, y, z), p.k);
    }
  }
  return d;
}

/* ---------------- surface nets ---------------- */

/**
 * Mesh the zero set of f inside [min, max] at spacing h. Blocks far from the surface are skipped
 * after one sample; vertices are projected onto the surface along the gradient.
 */
export function surfaceNets(f, min, max, h) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1;
  const ny = Math.ceil((max[1] - min[1]) / h) + 1;
  const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const Bk = 8;
  const bx = Math.ceil(nx / Bk), by = Math.ceil(ny / Bk), bz = Math.ceil(nz / Bk);
  const blocks = new Array(bx * by * bz);
  const centerD = new Float32Array(bx * by * bz);
  const half = Bk * h * 0.9;
  for (let k = 0; k < bz; k += 1)
    for (let j = 0; j < by; j += 1)
      for (let i = 0; i < bx; i += 1) {
        const id = i + bx * (j + by * k);
        const cx = min[0] + (i * Bk + Bk / 2) * h, cy = min[1] + (j * Bk + Bk / 2) * h, cz = min[2] + (k * Bk + Bk / 2) * h;
        const d = f(cx, cy, cz);
        centerD[id] = d;
        if (Math.abs(d) < half) {
          const a = new Float32Array((Bk + 1) ** 3);
          for (let c = 0; c <= Bk; c += 1)
            for (let b = 0; b <= Bk; b += 1)
              for (let q = 0; q <= Bk; q += 1) a[q + (Bk + 1) * (b + (Bk + 1) * c)] = f(min[0] + (i * Bk + q) * h, min[1] + (j * Bk + b) * h, min[2] + (k * Bk + c) * h);
          blocks[id] = a;
        }
      }
  const val = (i, j, k) => {
    const I = Math.min(bx - 1, Math.floor(i / Bk)), J = Math.min(by - 1, Math.floor(j / Bk)), K = Math.min(bz - 1, Math.floor(k / Bk));
    const id = I + bx * (J + by * K);
    const a = blocks[id];
    if (!a) return centerD[id];
    return a[i - I * Bk + (Bk + 1) * (j - J * Bk + (Bk + 1) * (k - K * Bk))];
  };
  // One vertex per cell that the surface crosses.
  const vid = new Map();
  const pos = [];
  const cellKey = (i, j, k) => i + nx * (j + ny * k);
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let K = 0; K < bz; K += 1)
    for (let J = 0; J < by; J += 1)
      for (let I = 0; I < bx; I += 1) {
        if (!blocks[I + bx * (J + by * K)]) continue;
        for (let k = K * Bk; k < Math.min(nz - 1, K * Bk + Bk); k += 1)
          for (let j = J * Bk; j < Math.min(ny - 1, J * Bk + Bk); j += 1)
            for (let i = I * Bk; i < Math.min(nx - 1, I * Bk + Bk); i += 1) {
              let mask = 0;
              for (let c = 0; c < 8; c += 1) {
                v[c] = val(i + corner[c][0], j + corner[c][1], k + corner[c][2]);
                if (v[c] < 0) mask |= 1 << c;
              }
              if (mask === 0 || mask === 255) continue;
              let sx = 0, sy = 0, sz = 0, n = 0;
              for (const [a, b] of edges) {
                if (v[a] < 0 === v[b] < 0) continue;
                const t = v[a] / (v[a] - v[b]);
                sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
                sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
                sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
                n += 1;
              }
              vid.set(cellKey(i, j, k), pos.length / 3);
              pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
            }
      }
  // Quads across every grid edge with a sign change.
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (const [key] of vid) {
    const i = key % nx;
    const j = Math.floor(key / nx) % ny;
    const k = Math.floor(key / (nx * ny));
    const v0 = val(i + 1, j + 1, k + 1) < 0;
    // Edge along x from corner (i, j+1, k+1) to (i+1, j+1, k+1): cells sharing it.
    if (v0 !== (val(i, j + 1, k + 1) < 0)) quad(vid.get(cellKey(i, j, k)), vid.get(cellKey(i, j + 1, k)), vid.get(cellKey(i, j + 1, k + 1)), vid.get(cellKey(i, j, k + 1)), !v0);
    if (v0 !== (val(i + 1, j, k + 1) < 0)) quad(vid.get(cellKey(i, j, k)), vid.get(cellKey(i, j, k + 1)), vid.get(cellKey(i + 1, j, k + 1)), vid.get(cellKey(i + 1, j, k)), !v0);
    if (v0 !== (val(i + 1, j + 1, k) < 0)) quad(vid.get(cellKey(i, j, k)), vid.get(cellKey(i + 1, j, k)), vid.get(cellKey(i + 1, j + 1, k)), vid.get(cellKey(i, j + 1, k)), !v0);
  }
  // Wind every triangle to face out along the field's gradient.
  const fixWinding = (nrmA) => {
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx2 = uy * vz - uz * vy, ny2 = uz * vx - ux * vz, nz2 = ux * vy - uy * vx;
      if (nx2 * nrmA[a] + ny2 * nrmA[a + 1] + nz2 * nrmA[a + 2] < 0) {
        const tmp = idx[t + 1];
        idx[t + 1] = idx[t + 2];
        idx[t + 2] = tmp;
      }
    }
  };
  // Project onto the surface and take normals from the gradient.
  const nrm = new Float32Array(pos.length);
  const e = h * 0.5;
  for (let q = 0; q < pos.length; q += 3) {
    let x = pos[q], y = pos[q + 1], z = pos[q + 2];
    let gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 2; it += 1) {
      const d = f(x, y, z);
      gx = f(x + e, y, z) - f(x - e, y, z);
      gy = f(x, y + e, z) - f(x, y - e, z);
      gz = f(x, y, z + e) - f(x, y, z - e);
      const gl = len3(gx, gy, gz) || 1;
      gx /= gl;
      gy /= gl;
      gz /= gl;
      const step = clamp(d, -h, h);
      x -= gx * step;
      y -= gy * step;
      z -= gz * step;
    }
    pos[q] = x;
    pos[q + 1] = y;
    pos[q + 2] = z;
    nrm[q] = gx;
    nrm[q + 1] = gy;
    nrm[q + 2] = gz;
  }
  fixWinding(nrm);
  return { pos: new Float32Array(pos), nrm, idx: pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
}

/* ---------------- the design ---------------- */

/**
 * Joints (rest pose, metres; facing +z, the character's left is +x, arms hanging a little out),
 * and the parts' primitives, all from the spec.
 */
function design(S) {
  const H = S.height;
  const anime = S.style === "anime";
  const fem = S.sex;
  // Anime bodies: slimmer, longer-legged.
  const b = S.build - (anime ? 0.25 : 0);
  const mu = S.muscle - (anime ? 0.35 : 0);
  const fa = S.fat - (anime ? 0.25 : 0);
  // Head height: 1/7.5 of the body (real), 1/7 (anime: a larger head).
  const headH = H / (anime ? 6.9 : 7.6);
  const hs = headH / 0.232; // head scale against the reference head
  // Landmarks as fractions of height.
  const yChin = H - headH;
  const yNeck = yChin - 0.03 * hs;
  const yShoulder = H * 0.818;
  const sw = H * (0.116 + 0.012 * b - 0.014 * fem); // shoulder joint half-width
  const yChest = H * 0.72;
  const yWaist = H * (0.615 + 0.01 * fem);
  const yHip = H * (anime ? 0.54 : 0.522);
  const hw = H * (0.05 + 0.006 * fem);
  const upper = H * 0.186;
  const fore = H * 0.148;
  const handL = H * 0.106;
  const thigh = H * (anime ? 0.252 : 0.243);
  const shin = H * (anime ? 0.254 : 0.245);
  const abd = 0.22; // arm abduction at rest, so the arms clear the body and the clothes
  const J = {};
  J.hips = [0, yHip + 0.02 * H, 0];
  J.spine = [0, yWaist, -0.005];
  J.chest = [0, yChest - 0.02 * H, 0];
  J.neck = [0, yNeck - 0.02 * hs, -0.02 * hs];
  J.head = [0, yChin + 0.035 * hs, -0.005 * hs];
  for (const [s, n] of [[1, "L"], [-1, "R"]]) {
    J["clav" + n] = [s * 0.025 * H, yShoulder - 0.005 * H, 0.01];
    J["arm" + n] = [s * sw, yShoulder, -0.005];
    const ex = J["arm" + n][0] + s * Math.sin(abd) * upper;
    const ey = yShoulder - Math.cos(abd) * upper;
    J["fore" + n] = [ex, ey, -0.01];
    const wx = ex + s * Math.sin(abd * 0.8) * fore;
    const wy = ey - Math.cos(abd * 0.8) * fore;
    J["hand" + n] = [wx, wy, 0.005];
    // Hip joints ~0.09 m either side of the midline (a real pelvis), knees and feet under them:
    // wider and the legs part high under the hips like two sticks.
    J["thigh" + n] = [s * hw * 1.02, yHip, 0.005];
    J["shin" + n] = [s * hw * 0.98, yHip - thigh, 0.012];
    J["foot" + n] = [s * hw * 1.0, yHip - thigh - shin, -0.012];
    J["toe" + n] = [s * hw * 1.08, 0.012, J["foot" + n][2] + H * 0.11];
  }
  const A = (n) => J[n];
  const lerp3 = (a, b2, u) => [mix(a[0], b2[0], u), mix(a[1], b2[1], u), mix(a[2], b2[2], u)];
  const add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
  const parts = [];
  const sc = H / 1.76;
  const mm = (v) => v * sc;

  /* torso: pelvis, abdomen, ribcage, chest, back, shoulders, neck */
  {
    const chestW = mm(0.155 + 0.02 * b - 0.012 * fem + 0.01 * mu);
    const chestD = mm(0.105 + 0.008 * b + 0.01 * fa);
    const waistW = mm(0.135 + 0.03 * fa - 0.012 * fem + 0.006 * b);
    const hipW = mm(0.165 + 0.03 * fem + 0.02 * fa);
    const P = [
      ell([0, yChest + mm(0.01), -mm(0.005)], [chestW, mm(0.15), chestD], { k: mm(0.04) }), // ribcage
      ell([0, yWaist, mm(0.005) + mm(0.02) * fa], [waistW, mm(0.1), mm(0.1) + mm(0.03) * fa], { k: mm(0.06) }), // abdomen
      ell([0, yHip + mm(0.035), -mm(0.012)], [hipW, mm(0.09), mm(0.095) + mm(0.012) * fem], { k: mm(0.05) }), // pelvis
      ell([0, yShoulder - mm(0.04), -mm(0.03)], [sw * 0.92, mm(0.06), mm(0.075)], { k: mm(0.05) }), // upper back / shoulder girdle
      cone([0, yNeck - mm(0.02), -mm(0.02)], [0, yChin + mm(0.02), -mm(0.012)], mm(0.06 + 0.008 * b - 0.008 * fem), mm(0.052 - 0.006 * fem), { k: mm(0.05) }), // neck
    ];
    for (const s of [1, -1]) {
      // Trapezius: neck to shoulder.
      P.push(cone([s * mm(0.03), yNeck + mm(0.0), -mm(0.03)], [s * sw * 0.85, yShoulder + mm(0.0), -mm(0.02)], mm(0.03 + 0.008 * mu), mm(0.025), { k: mm(0.04) }));
      // Pectorals (male) or breasts (female).
      if (fem < 0.5) P.push(ell([s * mm(0.068), yChest + mm(0.045), chestD * 0.62], [mm(0.075), mm(0.055), mm(0.035 + 0.012 * mu)], { k: mm(0.035), rot: [0, 0, s * -0.25] }));
      else P.push(ell([s * mm(0.075), yChest + mm(0.01), chestD * 0.7], [mm(0.065), mm(0.06), mm(0.05)], { k: mm(0.04) }));
      // Lats and obliques.
      P.push(ell([s * mm(0.11), yChest - mm(0.06), -mm(0.02)], [mm(0.045 + 0.01 * mu), mm(0.12), mm(0.07)], { k: mm(0.05) }));
      // Glutes.
      P.push(ell([s * mm(0.066), yHip - mm(0.005), -mm(0.062)], [mm(0.068 + 0.012 * fem), mm(0.078), mm(0.052 + 0.012 * fem)], { k: mm(0.045) }));
      // The top of the thigh into the hip.
      P.push(ell([s * hw * 1.25, yHip - mm(0.04), mm(0.0)], [mm(0.075 + 0.012 * fem), mm(0.09), mm(0.075)], { k: mm(0.05) }));
      // Clavicle ridge.
      P.push(cone([s * mm(0.02), yNeck - mm(0.025), mm(0.05)], [s * sw * 0.9, yShoulder + mm(0.005), mm(0.02)], mm(0.012), mm(0.014), { k: mm(0.02) }));
    }
    // Navel.
    P.push(ell([0, yWaist - mm(0.03), mm(0.098) + mm(0.03) * fa], [mm(0.006), mm(0.008), mm(0.012)], { sub: true, k: mm(0.006) }));
    parts.push(part("torso", P, ["hips", "spine", "chest", "neck", "clavL", "clavR", "armL", "armR", "thighL", "thighR"]));
  }

  /* arms */
  for (const [s, n] of [[1, "L"], [-1, "R"]]) {
    const sh = A("arm" + n), el = A("fore" + n), wr = A("hand" + n);
    const ar = mm(0.047 + 0.007 * mu + 0.004 * b - 0.007 * fem + 0.005 * fa);
    const P = [
      ell(add(sh, [s * mm(0.004), -mm(0.03), 0]), [mm(0.048 + 0.008 * mu), mm(0.07), mm(0.052 + 0.006 * mu)], { k: mm(0.035) }), // deltoid
      cone(add(sh, [0, -mm(0.04), 0]), el, ar, ar * 0.72, { k: mm(0.03) }),
      ell(lerp3(sh, el, 0.55), [ar * 0.75, mm(0.075), ar * (0.85 + 0.25 * mu)], { k: mm(0.03) }), // biceps / triceps mass
      ell(add(lerp3(sh, el, 0.55), [0, 0, -mm(0.012)]), [ar * 0.8, mm(0.08), ar * 0.75], { k: mm(0.03) }),
      cone(el, wr, ar * 0.78, ar * 0.45, { k: mm(0.025) }),
      ell(add(lerp3(el, wr, 0.25), [0, 0, mm(0.006)]), [ar * 0.85, mm(0.06), ar * 0.75], { k: mm(0.03) }), // forearm flexors
      ell(el, [mm(0.02), mm(0.02), mm(0.02)], { k: mm(0.02) }),
    ];
    parts.push(part("upper" + n, P.slice(0, 4), ["clav" + n, "arm" + n, "fore" + n, "chest"]));
    parts.push(part("fore" + n, P.slice(4), ["arm" + n, "fore" + n, "hand" + n]));
  }

  /* hands: palm and fingers along -y from the wrist, palm toward the body, thumb forward */
  const fingerSpec = [
    { z: 0.33, len: 0.47, r: 0.0088 },
    { z: 0.11, len: 0.5, r: 0.0092 },
    { z: -0.11, len: 0.47, r: 0.0088 },
    { z: -0.31, len: 0.38, r: 0.0078 },
  ];
  const fingerBones = {};
  for (const [s, n] of [[1, "L"], [-1, "R"]]) {
    const w = A("hand" + n);
    const L = handL;
    const palmLen = L * 0.52;
    const palmW = mm(0.084 - 0.008 * fem);
    const P = [
      ell(add(w, [0, -palmLen * 0.5, 0]), [mm(0.017), palmLen * 0.55, palmW * 0.5], { k: mm(0.012) }),
      ell(add(w, [-s * mm(0.004), -palmLen * 0.35, palmW * 0.3]), [mm(0.016), palmLen * 0.32, mm(0.02)], { k: mm(0.012) }), // thenar
      cone(add(w, [0, mm(0.015), 0]), add(w, [0, -mm(0.01), 0]), mm(0.024), mm(0.022), { k: mm(0.015) }),
    ];
    const bones = ["fore" + n, "hand" + n];
    fingerSpec.forEach((f, fi) => {
      let p0 = add(w, [0, -palmLen, f.z * palmW]);
      const segs = [0.47, 0.3, 0.23];
      const total = f.len * L * 0.9;
      segs.forEach((sg, k) => {
        const p1 = add(p0, [0, -sg * total, 0]);
        const r0 = mm(f.r) * (1 - 0.1 * k);
        P.push(cone(p0, p1, r0, r0 * 0.88, { k: mm(0.004) }));
        const bn = `f${n}${fi}${k}`;
        J[bn] = p0;
        fingerBones[bn] = { parent: k === 0 ? "hand" + n : `f${n}${fi}${k - 1}`, end: p1 };
        bones.push(bn);
        p0 = p1;
      });
    });
    // Thumb from the heel of the palm, forward and down.
    let t0 = add(w, [-s * mm(0.008), -palmLen * 0.28, palmW * 0.45]);
    const dir = [0, -0.72, 0.69];
    [0.19, 0.14, 0.12].forEach((sg, k) => {
      const t1 = add(t0, [dir[0] * sg * L, dir[1] * sg * L, dir[2] * sg * L * (k === 0 ? 1 : 0.4)]);
      const r0 = mm(0.0115) * (k === 0 ? 1.25 : 1 - 0.1 * k);
      P.push(cone(t0, t1, r0, r0 * 0.88, { k: mm(0.006) }));
      const bn = `f${n}4${k}`;
      J[bn] = t0;
      fingerBones[bn] = { parent: k === 0 ? "hand" + n : `f${n}4${k - 1}`, end: t1 };
      bones.push(bn);
      t0 = t1;
    });
    parts.push(part("hand" + n, P, bones));
  }

  /* legs and feet */
  for (const [s, n] of [[1, "L"], [-1, "R"]]) {
    const hp = A("thigh" + n), kn = A("shin" + n), an = A("foot" + n), to = A("toe" + n);
    const tr = mm(0.075 + 0.01 * fa + 0.008 * mu + 0.008 * fem);
    const P = [
      cone(add(hp, [0, -mm(0.02), 0]), kn, tr, tr * 0.6, { k: mm(0.04) }),
      ell(add(lerp3(hp, kn, 0.45), [0, 0, mm(0.022)]), [tr * 0.75, thigh * 0.38, tr * 0.7], { k: mm(0.04) }), // quadriceps
      ell(add(lerp3(hp, kn, 0.4), [-s * mm(0.022), 0, -mm(0.005)]), [tr * 0.62, thigh * 0.33, tr * 0.6], { k: mm(0.04) }), // adductors
    ];
    const P2 = [
      ell(add(kn, [0, mm(0.005), mm(0.025)]), [mm(0.024), mm(0.028), mm(0.016)], { k: mm(0.03) }), // patella
      cone(kn, an, tr * 0.6, mm(0.032), { k: mm(0.03) }),
      ell(add(lerp3(kn, an, 0.28), [0, 0, -mm(0.025)]), [tr * 0.56, shin * 0.22, tr * 0.5], { k: mm(0.03) }), // calf
    ];
    const P3 = [
      ell(add(an, [0, -mm(0.04), -mm(0.02)]), [mm(0.03), mm(0.03), mm(0.04)], { k: mm(0.02) }), // heel
      cone(add(an, [0, -mm(0.035), mm(0.0)]), add(to, [0, mm(0.012), -mm(0.03)]), mm(0.035), mm(0.03), { k: mm(0.02) }),
      ell(add(to, [0, mm(0.005), -mm(0.01)]), [mm(0.04), mm(0.017), mm(0.035)], { k: mm(0.015) }),
      ell(an, [mm(0.034), mm(0.025), mm(0.03)], { k: mm(0.02) }),
    ];
    parts.push(part("thigh" + n, P, ["hips", "thigh" + n, "shin" + n]));
    parts.push(part("shin" + n, P2, ["thigh" + n, "shin" + n, "foot" + n]));
    parts.push(part("foot" + n, P3, ["shin" + n, "foot" + n, "toe" + n]));
  }

  /* head (its own part, meshed finer) */
  const head = headDesign(S, J.head, hs);
  return { H, J, parts, head, hs, fingerBones, landmarks: { yChin, yNeck, yShoulder, yChest, yWaist, yHip, headH } };
}

/**
 * The head, in metres, around a reference head 0.232 m tall (scaled by hs), centred at c.
 * Real: anatomical planes. Anime: a rounder skull, a small chin, big eye sockets, a tiny nose.
 */
function headDesign(S, J, hs) {
  const F = S.face;
  const anime = S.style === "anime";
  const fem = S.sex;
  const s = hs;
  // Head centre: above the head joint.
  const c = [J[0], J[1] + 0.085 * s, J[2] + 0.012 * s];
  const P = (x, y, z) => [c[0] + x * s, c[1] + y * s, c[2] + z * s];
  const r3 = (x, y, z) => [x * s, y * s, z * s];
  const prims = [];
  const k = (v) => v * s;
  const jaw = F.jaw - 0.25 * fem;
  if (!anime) {
    prims.push(ell(P(0, 0.028, -0.012), r3(0.074, 0.09, 0.1), { k: k(0.02) })); // cranium
    prims.push(ell(P(0, 0.004, 0.03), r3(0.058, 0.072, 0.068), { k: k(0.025) })); // face mass
    prims.push(ell(P(0, -0.064, 0.024), r3(0.033 + 0.012 * jaw, 0.034, 0.058), { k: k(0.025) })); // jaw body
    for (const sd of [1, -1]) {
      prims.push(ell(P(sd * (0.043 + 0.006 * jaw), -0.048, -0.02), r3(0.012, 0.024, 0.024), { k: k(0.025) })); // jaw angle
      prims.push(ell(P(sd * 0.046, -0.002, 0.055), r3(0.018, 0.012 + 0.004 * F.cheek, 0.018), { k: k(0.02) })); // cheekbone
      if (fem > 0.3) prims.push(ell(P(sd * 0.036, -0.032, 0.054), r3(0.017, 0.02, 0.013 + 0.007 * fem), { k: k(0.022) })); // cheek
      prims.push(ell(P(sd * 0.071, 0.004, -0.012), r3(0.009, 0.03, 0.019), { k: k(0.006), rot: [0, sd * 0.35, sd * 0.12] })); // ear
      prims.push(ell(P(sd * 0.077, 0.004, -0.008), r3(0.005, 0.018, 0.011), { k: k(0.005), sub: true, rot: [0, sd * 0.35, 0] })); // concha
      // Eye socket, then the lids wrapping the ball (an almond opening, slightly tilted up at the outer corner).
      prims.push(ell(P(sd * 0.032, 0.011, 0.092), r3(0.019, 0.013, 0.012), { k: k(0.01), sub: true }));
      const ec = P(sd * 0.032, 0.012, 0.073);
      const er = 0.0122 * s;
      prims.push({ type: "lid", c: ec, r: er, t: 0.0016 * s, sd, up: 0.4, lo: -0.36, k: k(0.004), sub: false, box: [ec[0] - er * 1.4, ec[1] - er * 1.4, ec[2] - er * 1.4, ec[0] + er * 1.4, ec[1] + er * 1.4, ec[2] + er * 1.4] });
      // The crease above the upper lid.
      prims.push(cone(P(sd * 0.022, 0.0215, 0.0835), P(sd * 0.043, 0.02, 0.078), k(0.0012), k(0.0009), { k: k(0.002), sub: true }));
      // Nose alae.
      prims.push(ell(P(sd * (0.0085 + 0.003 * F.noseWidth), -0.033, 0.0915), r3(0.0055, 0.0055, 0.0065), { k: k(0.007) }));
      // Nostril.
      prims.push(ell(P(sd * 0.007, -0.0395, 0.096), r3(0.0036, 0.0022, 0.005), { k: k(0.002), sub: true }));
      // The zygomatic arch back to the ear, and the soft fill of the cheek over the maxilla, so the
      // face is full beside the nose and mouth rather than a muzzle.
      prims.push(cone(P(sd * 0.046, -0.004, 0.05), P(sd * 0.064, 0.0, 0.006), k(0.006), k(0.005), { k: k(0.014) }));
      prims.push(ell(P(sd * 0.03, -0.034, 0.058), r3(0.013, 0.016, 0.011 + 0.006 * fem), { k: k(0.022) }));
      // The buccal fill between cheekbone and jaw: no hollow under the cheekbone in three-quarter view.
      prims.push(ell(P(sd * 0.044, -0.038, 0.028), r3(0.014, 0.022, 0.026), { k: k(0.026) }));
    }
    // Brow ridge.
    prims.push(cone(P(-0.042, 0.03, 0.079), P(0.042, 0.03, 0.079), k(0.011 + 0.004 * F.brow - 0.004 * fem), k(0.011 + 0.004 * F.brow - 0.004 * fem), { k: k(0.012) }));
    prims.push(ell(P(0, 0.03, 0.088), r3(0.012, 0.01, 0.006), { k: k(0.008) })); // glabella
    // Nose: bridge, tip.
    const nl = 0.82 + 0.2 * F.nose;
    prims.push(cone(P(0, 0.014, 0.086), P(0, -0.025 * nl, 0.103 + 0.004 * F.nose), k(0.005), k(0.0068), { k: k(0.006) }));
    prims.push(ell(P(0, -0.029 * nl, 0.1 + 0.004 * F.nose), r3(0.0068 + 0.0018 * F.noseWidth, 0.0068, 0.0072), { k: k(0.005) }));
    // The dental arch: the curved mass of the jaws and teeth the lips lie on, filling the philtrum
    // and the area under the lower lip, so the mouth isn't a pair of tubes on a hollow.
    prims.push(ell(P(0, -0.056, 0.074), r3(0.027, 0.024, 0.019), { k: k(0.014) }));
    // Lips: arcs of small round cones; a crease between.
    const lf = 0.44 + 0.24 * F.lips + 0.15 * fem;
    const up = [P(-0.021, -0.0615, 0.081), P(-0.009, -0.0585, 0.089), P(0, -0.059, 0.0915), P(0.009, -0.0585, 0.089), P(0.021, -0.0615, 0.081)];
    const lo = [P(-0.017, -0.066, 0.082), P(-0.007, -0.0688, 0.087), P(0.007, -0.0688, 0.087), P(0.017, -0.066, 0.082)];
    for (let i = 0; i < up.length - 1; i += 1) prims.push(cone(up[i], up[i + 1], k(0.0042 * lf * (i === 0 || i === 3 ? 0.75 : 1)), k(0.0042 * lf * (i === 0 || i === 3 ? 0.75 : 1)), { k: k(0.006) }));
    for (let i = 0; i < lo.length - 1; i += 1) prims.push(cone(lo[i], lo[i + 1], k(0.0052 * lf * (i === 1 ? 1 : 0.8)), k(0.0052 * lf * (i === 1 ? 1 : 0.8)), { k: k(0.007) }));
    prims.push(ell(P(0, -0.0628, 0.089), r3(0.021, 0.0016, 0.012), { k: k(0.0025), sub: true })); // the crease
    prims.push(ell(P(0, -0.049, 0.096), r3(0.004, 0.008, 0.003), { k: k(0.003), sub: true })); // philtrum
    // Chin.
    prims.push(ell(P(0, -0.093, 0.064), r3(0.017 + 0.006 * F.chin, 0.015, 0.016), { k: k(0.014) }));
    prims.push(ell(P(0, -0.078, 0.082), r3(0.015, 0.0045, 0.006), { k: k(0.006), sub: true })); // mentolabial fold
  } else {
    // Anime: a round skull, a narrow small jaw coming to a soft point, a flat face.
    prims.push(ell(P(0, 0.03, -0.01), r3(0.079, 0.088, 0.093), { k: k(0.02) }));
    prims.push(ell(P(0, -0.018, 0.03), r3(0.063, 0.065, 0.066), { k: k(0.035) }));
    prims.push(ell(P(0, -0.064, 0.034), r3(0.04 + 0.01 * jaw, 0.032, 0.045), { k: k(0.04) }));
    prims.push(ell(P(0, -0.09, 0.054), r3(0.016 + 0.012 * Math.max(0, jaw - 0.5), 0.014, 0.014), { k: k(0.025) }));
    // A squarer, shonen jaw (face.jaw > 0.5): angles at the back of the jaw and a broad chin.
    if (jaw > 0.55) {
      // Angular: the jaw line runs straight from below the ear to a broad chin, no jowls.
      for (const sd of [1, -1]) prims.push(cone(P(sd * 0.045, -0.035, -0.005), P(sd * 0.018, -0.088, 0.05), k(0.012), k(0.012), { k: k(0.025) }));
    }
    for (const sd of [1, -1]) {
      prims.push(ell(P(sd * 0.075, 0.0, -0.008), r3(0.008, 0.026, 0.016), { k: k(0.006), rot: [0, sd * 0.3, sd * 0.1] }));
      // Shallow wide sockets for the big eyes.
      // (shallow: a deep socket's rim catches the ink outline and draws a ring round the eye).
      prims.push(ell(P(sd * 0.034, -0.006, 0.086), r3(0.024, 0.024, 0.007), { k: k(0.016), sub: true }));
    }
    // A small nose; face.nose lengthens it into the defined, angular nose of a Toriyama face.
    prims.push(cone(P(0, -0.008, 0.087), P(0, -0.03 - 0.008 * (F.nose - 0.5), 0.097 + 0.008 * Math.max(0, F.nose - 0.5)), k(0.003), k(0.0045 + 0.002 * Math.max(0, F.nose - 0.5)), { k: k(0.006) }));
    prims.push(ell(P(0, -0.058, 0.082), r3(0.012, 0.0014, 0.01), { k: k(0.0015), sub: true })); // mouth line
  }
  // Neck stub into the body.
  prims.push(cone(P(0, -0.08, -0.02), P(0, -0.16, -0.03), k(0.05 - 0.006 * fem), k(0.052), { k: k(0.03) }));
  return { c, s, prims, part: part("head", prims, ["neck", "head"]) };
}

/* ---------------- skinning ---------------- */

const PARENT = {
  hips: null,
  spine: "hips",
  chest: "spine",
  neck: "chest",
  head: "neck",
  clavL: "chest",
  armL: "clavL",
  foreL: "armL",
  handL: "foreL",
  clavR: "chest",
  armR: "clavR",
  foreR: "armR",
  handR: "foreR",
  thighL: "hips",
  shinL: "thighL",
  footL: "shinL",
  toeL: "footL",
  thighR: "hips",
  shinR: "thighR",
  footR: "shinR",
  toeR: "footR",
};
const CHILD = { hips: "spine", spine: "chest", chest: "neck", neck: "head", clavL: "armL", armL: "foreL", foreL: "handL", clavR: "armR", armR: "foreR", foreR: "handR", thighL: "shinL", shinL: "footL", footL: "toeL", thighR: "shinR", shinR: "footR", footR: "toeR" };
function segOf(D, name) {
  const a = D.J[name];
  if (D.fingerBones[name]) return [a, D.fingerBones[name].end];
  if (name === "head") return [a, [a[0], a[1] + 0.18 * D.hs, a[2]]];
  if (name === "handL" || name === "handR") return [a, [a[0], a[1] - 0.06 * (D.H / 1.76), a[2]]];
  if (name === "toeL" || name === "toeR") return [a, [a[0], a[1], a[2] + 0.05]];
  const ch = CHILD[name];
  return [a, D.J[ch]];
}
function distSeg(x, y, z, a, b) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const t = clamp(((x - a[0]) * bax + (y - a[1]) * bay + (z - a[2]) * baz) / (bax * bax + bay * bay + baz * baz || 1), 0, 1);
  return len3(x - a[0] - bax * t, y - a[1] - bay * t, z - a[2] - baz * t);
}
/** Skin weights for positions: the vertex's part (nearest field) picks the candidate bones. */
function skinWeights(D, pos, boneIndex, allParts, allow = null) {
  const n = pos.length / 3;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  const segs = {};
  for (const name of Object.keys(boneIndex)) segs[name] = segOf(D, name);
  for (let v = 0; v < n; v += 1) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let best = null;
    let bd = Infinity;
    for (const P of allParts) {
      if (allow && !allow(P.name, x, y, z)) continue;
      const d = dPart(P, x, y, z);
      if (d < bd) {
        bd = d;
        best = P;
      }
    }
    const cand = best.bones.map((b) => [b, distSeg(x, y, z, ...segs[b])]);
    cand.sort((a, b) => a[1] - b[1]);
    const top = cand.slice(0, 4);
    const d0 = top[0][1];
    let sum = 0;
    const ws = top.map(([, d]) => {
      // Falloff relative to the nearest bone: a soft blend across the joint, none far from it.
      const w = Math.exp(-(((d - d0) / (0.018 * (D.H / 1.76))) ** 2)) / (d + 0.01) ** 2;
      sum += w;
      return w;
    });
    top.forEach(([b], i) => {
      si[v * 4 + i] = boneIndex[b];
      sw[v * 4 + i] = ws[i] / sum;
    });
  }
  return { si, sw };
}

/* ---------------- colour ---------------- */

const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
};
const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  const h = (a, b, c) => hash3(ix + a, iy + b, iz + c);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
/** Skin colour per vertex: flush on lips, cheeks, nose, ears, knuckles; mottling; lighter palms. */
function skinColors(D, S, pos, isHead) {
  const base = hex(S.skin);
  const n = pos.length / 3;
  const out = new Float32Array(n * 3);
  const c = D.head.c;
  const s = D.head.s;
  const anime = S.style === "anime";
  for (let v = 0; v < n; v += 1) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let r = base[0], g = base[1], b = base[2];
    const mott = anime ? 0 : (vnoise(x * 60, y * 60, z * 60) - 0.5) * 0.08 + (vnoise(x * 300, y * 300, z * 300) - 0.5) * 0.04;
    r *= 1 + mott;
    g *= 1 + mott * 1.1;
    b *= 1 + mott * 1.1;
    let flush = 0;
    let lip = 0;
    let brow = 0;
    let beard = 0;
    if (isHead) {
      const hx = (x - c[0]) / s, hy = (y - c[1]) / s, hz = (z - c[2]) / s;
      const g2 = (dx, dy, dz, w) => Math.exp(-(dx * dx + dy * dy + dz * dz) / (w * w));
      if (anime) {
        flush += 0.6 * g2(Math.abs(hx) - 0.042, hy + 0.035, hz - 0.07, 0.016); // blush
      } else {
        lip = g2(hx * 0.42, (hy + 0.064) * 1.25, (hz - 0.09) * 0.6, 0.012);
        flush += 0.5 * g2(Math.abs(hx) - 0.042, hy + 0.025, hz - 0.07, 0.025); // cheeks
        flush += 0.45 * g2(hx, hy + 0.028, hz - 0.104, 0.014); // nose tip
        flush += 0.5 * g2(Math.abs(hx) - 0.072, hy, hz + 0.01, 0.03); // ears
        flush -= 0.25 * g2(Math.abs(hx) - 0.032, hy + 0.004, hz - 0.08, 0.012); // under the eyes, shadowed
        flush += 0.15 * g2(hx, hy - 0.05, hz - 0.06, 0.04); // forehead
        // Under the brow hairs, the skin is a little darker; on a male face, a faint beard shadow.
        brow = 0.35 * g2(Math.abs(hx) - 0.032, (hy - 0.033) * 1.6, (hz - 0.085) * 0.5, 0.011);
        if (S.sex < 0.5) beard = 0.22 * Math.max(g2(hx * 0.6, hy + 0.085, (hz - 0.06) * 0.5, 0.03), g2(hx * 0.5, hy + 0.047, (hz - 0.09) * 0.6, 0.012) * 0.8);
      }
    }
    // Knuckles, elbows, knees.
    for (const n2 of ["foreL", "foreR", "shinL", "shinR", "handL", "handR"]) {
      const j = D.J[n2];
      const d = len3(x - j[0], y - j[1], z - j[2]);
      flush += 0.25 * Math.exp(-(d * d) / 0.0009);
    }
    r *= 1 + 0.12 * flush;
    g *= 1 - 0.1 * flush;
    b *= 1 - 0.08 * flush;
    if (lip) {
      const L = [base[0] * 0.85, base[1] * 0.48, base[2] * 0.48];
      r = mix(r, L[0], lip * 0.85);
      g = mix(g, L[1], lip * 0.85);
      b = mix(b, L[2], lip * 0.85);
    }
    if (brow) {
      r *= 1 - brow;
      g *= 1 - brow * 1.05;
      b *= 1 - brow * 1.05;
    }
    if (beard) {
      r *= 1 - beard * 1.1;
      g *= 1 - beard;
      b *= 1 - beard * 0.85;
    }
    out.set([r, g, b], v * 3);
  }
  return out;
}

/* ---------------- build ---------------- */

/**
 * Build the character: meshes (skin, head, eyes, brows, hair, clothes), a skeleton, materials for
 * the style. Returns { root, bones, J, meshes, setFace, spec }.
 */
export function buildHuman(THREE, spec = {}, opts = {}) {
  const S = merge(DEFAULTS, spec);
  const D = design(S);
  const anime = S.style === "anime";
  const root = new THREE.Group();
  root.name = "human";

  // Skeleton: bones at the rest joints, unrotated, so a pose's angles read like a figure's.
  const names = [...Object.keys(PARENT), ...Object.keys(D.fingerBones)];
  const bones = {};
  const boneIndex = {};
  names.forEach((n, i) => {
    const b = new THREE.Bone();
    b.name = n;
    bones[n] = b;
    boneIndex[n] = i;
  });
  for (const n of names) {
    const p = PARENT[n] ?? D.fingerBones[n]?.parent;
    const j = D.J[n];
    if (p) {
      const pj = D.J[p];
      bones[n].position.set(j[0] - pj[0], j[1] - pj[1], j[2] - pj[2]);
      bones[p].add(bones[n]);
    } else bones[n].position.set(...j);
  }
  root.add(bones.hips);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(names.map((n) => bones[n]));

  const res = S.res;
  const bodyParts = D.parts;
  const allParts = [...bodyParts, D.head.part];
  const bodyF = (x, y, z) => {
    let d = 1e9;
    for (const P of bodyParts) d = smin(d, dPart(P, x, y, z), 0.012 * (D.H / 1.76));
    return d;
  };
  const headF = (x, y, z) => dPart(D.head.part, x, y, z, 0.02);
  // Clothes and hair as fields, before the meshes, so the skin under them can be skipped.
  const cloth = clothFields(D, S, bodyF);

  const mats = materials(THREE, S);
  const meshes = {};
  const outlineQueue = [];
  const makeSkinned = (field, bmin, bmax, h, mat, name, colorFn, keep, allow) => {
    const M = surfaceNets(field, bmin, bmax, h);
    let { pos, nrm, idx } = M;
    if (keep) {
      // Drop triangles fully hidden under clothing (cheaper, and no skin poking through).
      const out = [];
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        if (keep(pos, a) || keep(pos, b) || keep(pos, c)) out.push(a, b, c);
      }
      idx = pos.length / 3 > 65535 ? new Uint32Array(out) : new Uint16Array(out);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    if (colorFn) geo.setAttribute("color", new THREE.BufferAttribute(colorFn(pos), 3));
    const { si, sw } = skinWeights(D, pos, boneIndex, allParts, allow);
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    const m = new THREE.SkinnedMesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    root.add(m);
    m.bind(skeleton);
    meshes[name] = m;
    if (anime) outlineQueue.push([m, name === "head" || name === "brows" ? 0.0011 : 0.0016]);
    return m;
  };
  const H = D.H;
  const pad = 0.06;
  // Body below the head; skin hidden deep under clothes is dropped.
  // With a scanned head, the scan's own neck replaces the body's above the collar.
  const scanNeck = !anime && opts.scan ? D.landmarks.yNeck + 0.012 * D.hs : Infinity;
  const hidden = (p, i) => cloth.covers(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) === false && p[i * 3 + 1] < scanNeck;
  makeSkinned(
    (x, y, z) => (y > D.landmarks.yChin + 0.02 * D.hs ? Math.max(bodyF(x, y, z), y - (D.landmarks.yChin + 0.06 * D.hs)) : bodyF(x, y, z)),
    [-0.5 * H * 0.6, -0.01, -0.2 * H * 0.9],
    [0.5 * H * 0.6, D.landmarks.yChin + 0.08 * D.hs, 0.2 * H * 0.9],
    0.0032 / res * (H / 1.76),
    mats.skin,
    "body",
    (p) => skinColors(D, S, p, false),
    hidden,
  );
  const hc = D.head.c;
  const hsz = 0.15 * D.hs;
  makeSkinned(
    (x, y, z) => Math.max(headF(x, y, z), D.landmarks.yChin - 0.035 * D.hs - y),
    [hc[0] - hsz * 0.75, hc[1] - hsz * 1.35, hc[2] - hsz * 0.95],
    [hc[0] + hsz * 0.75, hc[1] + hsz * 0.9, hc[2] + hsz * 0.95],
    0.0011 / res * D.hs,
    mats.skin,
    "head",
    (p) => skinColors(D, S, p, true),
  );
  // Clothes and shoes.
  for (const c of cloth.items) makeSkinned(c.f, c.min, c.max, (c.h ?? 0.0035) / res * (H / 1.76), mats[c.mat], c.name, c.colors ? (p) => c.colors(p) : null, null, c.allow);
  // Hair and brows.
  const hair = hairField(D, S);
  if (hair) makeSkinned(hair.f, hair.min, hair.max, 0.0018 / res * D.hs, mats.hair, "hair", (p) => hair.colors(p), null, (n) => n === "head");
  const brow = browField(D, S);
  // Anime brows are solid strokes; realistic brows are hair (strands, in realFaceDetail).
  if (anime) makeSkinned(brow.f, brow.min, brow.max, 0.0011 / res * D.hs, mats.brow, "brows", null, null, (n) => n === "head");

  // Eyes: eyeball + iris/pupil (+ anime highlights), lids that blink and widen.
  const eyes = buildEyes(THREE, D, S, bones.head, mats);
  if (!anime && opts.scan) attachHeadScan(THREE, { D, S, bones, meshes, eyes, mats }, opts.scan);
  else if (!anime) realFaceDetail(THREE, D, S, bones.head, meshes.hair);
  // Face morphs (displacement fields on the head mesh): smile, browUp, browIn, frown, squint, jaw.
  addFaceMorphs(THREE, D, S, [meshes.head, meshes.brows].filter(Boolean));
  const outlines = outlineQueue.filter(([m]) => m.name !== "brows").map(([m, w]) => [addOutline(THREE, m, skeleton, w), m]);

  function setFace(f = {}) {
    for (const m of [meshes.head, meshes.brows]) {
      if (!m || !m.morphTargetDictionary) continue;
      for (const [k, i] of Object.entries(m.morphTargetDictionary)) m.morphTargetInfluences[i] = f[k] ?? 0;
    }
    for (const [o, m] of outlines) if (m.morphTargetInfluences && o.morphTargetInfluences) o.morphTargetInfluences.splice(0, Infinity, ...m.morphTargetInfluences);
    eyes.set(f);
  }
  setFace({});
  return { root, bones, skeleton, J: D.J, meshes, setFace, spec: S, design: D };
}

/* ---------------- clothes ---------------- */

function clothFields(D, S, bodyF) {
  const items = [];
  const H = D.H;
  const sc = H / 1.76;
  const L = D.landmarks;
  const J = D.J;
  const torsoBody = D.parts.find((p) => p.name === "torso");
  // Cloth drapes over the body rather than clinging to every muscle: the torso without the neck,
  // pectorals, navel and lats, joined with wider blends.
  const torso = part(
    "torsoCloth",
    torsoBody.prims.filter((p, i) => i !== 5 && !p.sub).map((p) => ({ ...p, k: p.k * 1.25 })),
    torsoBody.bones,
  );
  const upperL = D.parts.find((p) => p.name === "upperL");
  const upperR = D.parts.find((p) => p.name === "upperR");
  const foreL = D.parts.find((p) => p.name === "foreL");
  const foreR = D.parts.find((p) => p.name === "foreR");
  const legs = ["thighL", "thighR", "shinL", "shinR"].map((n) => D.parts.find((p) => p.name === n));
  const feet = ["footL", "footR"].map((n) => D.parts.find((p) => p.name === n));
  const along = (a, b, x, y, z) => {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    return ((x - a[0]) * bax + (y - a[1]) * bay + (z - a[2]) * baz) / (bax * bax + bay * bay + baz * baz);
  };
  const box = (pad = 0.05) => [[-0.4 * H, -0.02, -0.25 * H], [0.4 * H, H, 0.25 * H]];
  const covers = [];
  const nearest = (x, y, z) => {
    let best = null;
    let bd = Infinity;
    for (const P of D.parts) {
      const d = dPart(P, x, y, z);
      if (d < bd) {
        bd = d;
        best = P.name;
      }
    }
    return best;
  };
  // A top over the torso and arms: thickness, sleeve length (0..1 down the upper arm, past 1 into
  // the forearm), hem height, neckline (round or a V), looseness.
  const ySec = L.yChest - 0.05 * sc;
  const topField = ({ thick, sleeve, hem, neck = "round", vDepth = 0, loose = 0, cuffPuff = 0, hang = true }) => (x, y, z) => {
    let d = dPart(torso, x, y, z) - thick - loose * ss(L.yChest, L.yHip, y);
    // Below the chest, cloth falls straight: the chest's own cross-section carried down to the hem,
    // narrowing a little, so the hem hangs over the hips instead of wrapping them.
    if (hang) {
      let col = dPart(torso, x, Math.max(y, ySec), z) - thick;
      // Fade the column in over the ribs, so there is no crease where the drop begins.
      col = smax(col, y - ySec, 0.05 * sc);
      d = smin(d, col, 0.02 * sc);
    }
    for (const [up, fo, n] of [[upperL, foreL, "L"], [upperR, foreR, "R"]]) {
      const tA = along(J["arm" + n], J["fore" + n], x, y, z);
      let da = dPart(up, x, y, z) - thick - 0.002 * sc - loose * 0.6;
      if (sleeve > 1) {
        const tF = along(J["fore" + n], J["hand" + n], x, y, z);
        // A rolled cuff: thicker in a band at the end of the sleeve.
        const roll = cuffPuff * Math.exp(-(((tF - (sleeve - 1) + 0.06) / 0.06) ** 2));
        const df = dPart(fo, x, y, z) - thick - 0.006 * sc - roll;
        da = smin(da, Math.max(df, (tF - (sleeve - 1)) * 0.1), 0.01 * sc);
      } else da = Math.max(da, (tA - sleeve) * 0.3);
      d = smin(d, da, 0.016 * sc);
    }
    d += 0.0007 * sc * Math.sin(y * 110 + Math.sin(x * 40) * 2) * ss(L.yChest, L.yHip, y);
    if (neck === "v") {
      // A crossed V: the opening deepens to vDepth below the neck.
      const yTop = L.yNeck + 0.02 * sc;
      const w = 0.07 * sc * ss(yTop - vDepth, yTop, y) + 0.004 * sc;
      const v = Math.max(Math.abs(x - J.neck[0]) - w, yTop - vDepth - y, -(z - J.neck[2]));
      d = smax(d, -v, 0.004 * sc);
      d = smax(d, -(len3((x - J.neck[0]) / 1.0, (y - yTop) / 0.75, (z - J.neck[2] + 0.01 * sc) / 0.95) - 0.075 * sc), 0.006 * sc);
    } else d = smax(d, -(len3((x - J.neck[0]) / 1.0, (y - (L.yNeck + 0.02 * sc)) / 0.75, (z - J.neck[2] - 0.02 * sc) / 0.95) - 0.078 * sc), 0.006 * sc);
    d = smax(d, hem - y, 0.004 * sc);
    return d;
  };
  const coverTop = (hem, sleeve) =>
    covers.push((x, y, z) => {
      if (y < hem + 0.015 * sc || y > L.yNeck - 0.04 * sc) return false;
      const n = nearest(x, y, z);
      if (n === "torso") return true;
      if (n === "upperL" || n === "upperR") return along(J["arm" + n.slice(-1)], J["fore" + n.slice(-1)], x, y, z) < Math.min(sleeve, 1) - 0.12;
      if (sleeve > 1 && (n === "foreL" || n === "foreR")) return along(J["fore" + n.slice(-1)], J["hand" + n.slice(-1)], x, y, z) < sleeve - 1 - 0.12;
      return false;
    });
  // A top binds to the torso and the upper arms (and the forearms only along a long sleeve), never
  // to the hands that hang beside its hem.
  const topAllow = (sleeve) => (n, x, y, z) => {
    if (n === "torso") return true;
    if (n === "upperL" || n === "upperR") return y > L.yWaist;
    if (sleeve > 1 && (n === "foreL" || n === "foreR")) return along(J["fore" + n.slice(-1)], J["hand" + n.slice(-1)], x, y, z) < sleeve - 1 + 0.15 && y > L.yHip;
    return false;
  };
  const T = S.top.type;
  if (T === "tshirt" || T === "jacket") {
    const jacket = T === "jacket";
    const hem = L.yHip - (jacket ? 0.06 : 0.03) * sc;
    const sleeve = jacket ? 1.9 : 0.55;
    items.push({ name: "top", f: topField({ thick: (jacket ? 0.012 : 0.0055) * sc, sleeve, hem }), min: box()[0], max: box()[1], mat: "top", h: 0.0035, allow: topAllow(sleeve) });
    coverTop(hem, sleeve);
  }
  if (T === "shirt") {
    // A button-up, untucked, sleeves rolled to the forearm, a collar standing round the neck,
    // the placket down the front.
    const hem = L.yHip - 0.045 * sc;
    const sleeve = 1.45;
    const base = topField({ thick: 0.005 * sc, sleeve, hem, loose: 0.004 * sc, cuffPuff: 0.005 * sc });
    const f = (x, y, z) => {
      let d = base(x, y, z);
      // Placket: a fine groove just off the centre line, front only.
      // (only within a millimetre of the surface, or it would split the whole shirt).
      if (z > J.neck[2] && y < L.yNeck) d = smax(d, -Math.max(Math.abs(x - 0.006 * sc) - 0.0007 * sc, -d - 0.0012 * sc), 0.0006 * sc);
      // Collar: a band round the neck base, open at the front.
      const rx = x - J.neck[0], rz = z - (J.neck[2] + 0.005 * sc);
      const rad = Math.hypot(rx / 1.0, rz / 0.9);
      const yc = L.yNeck + 0.012 * sc;
      let col = Math.hypot(rad - 0.064 * sc - (y - yc) * 0.25, (y - yc) * 0.35) - 0.006 * sc;
      col = Math.max(col, Math.abs(y - yc) - 0.022 * sc);
      if (rz > 0) col = Math.max(col, 0.012 * sc - Math.abs(rx));
      return smin(d, col, 0.004 * sc);
    };
    items.push({ name: "top", f, min: box()[0], max: box()[1], mat: "top", h: 0.0032, allow: topAllow(sleeve) });
    coverTop(hem, sleeve);
  }
  if (T === "gi") {
    // A martial-arts gi: a fitted undershirt, then the loose crossed top over it with short sleeves.
    const hem = L.yHip - 0.08 * sc;
    // The orange top is cut away at the shoulder; the short sleeves are the blue undershirt's.
    items.push({ name: "under", f: topField({ thick: 0.0045 * sc, sleeve: 0.48, hem: L.yWaist, hang: false }), min: box()[0], max: box()[1], mat: "under", h: 0.0035, allow: topAllow(0.48) });
    items.push({ name: "top", f: topField({ thick: 0.011 * sc, sleeve: 0.14, hem, neck: "v", vDepth: 0.16 * sc, loose: 0.012 * sc }), min: box()[0], max: box()[1], mat: "top", h: 0.0035, allow: topAllow(0.14) });
    coverTop(L.yWaist, 0.62);
  }
  // Belt or sash at the waist, with a knot for a gi.
  if (S.belt) {
    const yb = S.top.type === "gi" ? L.yWaist - 0.04 * sc : L.yHip + 0.06 * sc;
    const f = (x, y, z) => {
      let d = dPart(torso, x, y, z) - (S.top.type === "gi" ? 0.02 : 0.009) * sc;
      d = smax(d, Math.abs(y - yb) - (S.top.type === "gi" ? 0.03 : 0.022) * sc, 0.003 * sc);
      if (S.top.type === "gi") {
        // The knot and its two tails.
        const kx = 0, kz = 0.16 * sc;
        d = smin(d, len3((x - kx) / 1.3, (y - yb) / 1.0, (z - kz) / 0.8) - 0.022 * sc, 0.006 * sc);
        for (const sd of [-1, 1]) {
          const t = clamp((yb - y) / (0.24 * sc), 0, 1);
          const tail = len3(x - sd * (0.012 + 0.03 * t) * sc, 0, (z - kz + 0.01 * sc * t) / 0.4) - 0.016 * sc;
          d = smin(d, Math.max(tail, Math.max(y - yb, yb - 0.25 * sc - y)), 0.004 * sc);
        }
      }
      return d;
    };
    items.push({ allow: (n) => n === "torso", name: "belt", f, min: [-0.3 * H, yb - 0.32 * sc, -0.2 * H], max: [0.3 * H, yb + 0.05 * sc, 0.25 * H], mat: "belt", h: 0.0025 });
  }
  // Wristbands.
  if (S.bands) {
    const f = (x, y, z) => {
      let d = 1e9;
      for (const [fo, n] of [[foreL, "L"], [foreR, "R"]]) {
        const tF = along(J["fore" + n], J["hand" + n], x, y, z);
        d = Math.min(d, smax(dPart(fo, x, y, z) - 0.008 * sc, Math.abs(tF - 0.82) - 0.13, 0.003 * sc));
      }
      return d;
    };
    items.push({ name: "bands", f, min: box()[0], max: box()[1], mat: "band", h: 0.0025, allow: (n) => n.startsWith("fore") || n.startsWith("hand") });
  }
  if (S.bottom.type !== "none") {
    const B2 = S.bottom.type;
    const shorts = B2 === "shorts";
    const gi = B2 === "gi";
    const thick = 0.006 * sc;
    const top = L.yHip + 0.07 * sc;
    const boots = S.shoes.type === "boot";
    const cuff = shorts ? J.shinL[1] + 0.12 * sc : boots ? J.shinL[1] - 0.2 * sc : 0.045 * sc;
    const f = (x, y, z) => {
      let d = dPart(torso, x, y, z) - thick - (gi ? 0.015 * sc : 0);
      d = Math.max(d, y - top);
      for (const P of legs) d = smin(d, dPart(P, x, y, z) - thick, 0.015 * sc);
      // Each trouser leg hangs as a straight tube from the hip to the hem (gi: wider, gathered into
      // the boot with a puff above it), so the cloth doesn't cling to the knee and calf.
      let tubes = 1e9;
      for (const n of ["L", "R"]) {
        const hp = J["thigh" + n], an = J["foot" + n];
        // From mid-thigh down (above that the hips shape the cloth), so the tubes stay under a top.
        const t0 = [hp[0] + (an[0] - hp[0]) * 0.25, hp[1] - 0.14 * sc, hp[2]];
        const t1 = [an[0] + (hp[0] - an[0]) * 0.02, cuff, an[2] + 0.01 * sc];
        let tube;
        if (gi) {
          // Gi trousers balloon out to the knee and stay full to the cuff, where they are gathered
          // into the boot with a puff hanging over its top (after the cosplay reference).
          const kn = J["shin" + n];
          const k1 = [kn[0], kn[1], kn[2] + 0.01 * sc];
          tube = Math.min(dPrim({ type: "cone", a: t0, b: k1, ra: 0.078 * sc, rb: 0.084 * sc }, x, y, z), dPrim({ type: "cone", a: k1, b: [t1[0], cuff + 0.03 * sc, t1[2]], ra: 0.084 * sc, rb: 0.082 * sc }, x, y, z));
          tube -= 0.01 * sc * Math.exp(-(((y - cuff - 0.05 * sc) / (0.045 * sc)) ** 2));
        } else tube = dPrim({ type: "cone", a: t0, b: t1, ra: 0.078 * sc, rb: 0.054 * sc }, x, y, z);
        // A sharp union between the legs, so two trouser legs never merge into a skirt.
        tubes = Math.min(tubes, tube);
      }
      d = smin(d, tubes, 0.02 * sc);
      // Folds: soft diagonal creases, more behind the knee and stacked at the hem.
      d += (gi ? 0.0022 : 0.0009) * sc * Math.sin(y * (gi ? 55 : 80) + x * 40 + 2 * Math.sin(z * 60)) * (gi ? 1 : 0.5 + ss(J.shinL[1] + 0.1 * sc, J.shinL[1], y) * ss(J.shinL[1] - 0.1 * sc, J.shinL[1], y) + ss(0.16 * sc, cuff, y));
      d = smax(d, cuff - y, 0.004 * sc);
      d = smax(d, y - top, 0.004 * sc);
      return d;
    };
    items.push({ name: "bottom", f, min: box()[0], max: [0.4 * H, top + 0.02, 0.25 * H], mat: "bottom", h: 0.0035, allow: (n) => n === "torso" || n.startsWith("thigh") || n.startsWith("shin") });
    covers.push((x, y, z) => {
      if (!(y < top - 0.02 * sc && y > cuff + 0.03 * sc)) return false;
      const n = nearest(x, y, z);
      return n === "torso" || n.startsWith("thigh") || n.startsWith("shin");
    });
  }
  // Shoes (a sole and an upper) or boots (a shaft to mid-calf, a tie at the top).
  {
    const boot = S.shoes.type === "boot";
    const shins = ["shinL", "shinR"].map((n) => D.parts.find((p) => p.name === n));
    const shaftTop = J.shinL[1] - 0.14 * sc;
    const soleTop = 0.028 * sc;
    const f = (x, y, z) => {
      let d = 1e9;
      for (const [P, n] of [[feet[0], "L"], [feet[1], "R"]]) {
        const an = J["foot" + n], to = J["toe" + n];
        // The upper: the foot, a little roomier, rising to a padded collar round the ankle.
        let u = dPart(P, x, y, z) - (boot ? 0.011 : 0.009) * sc;
        const collar = dPrim({ type: "cone", a: [an[0], an[1] - 0.045 * sc, an[2] - 0.004 * sc], b: [an[0], an[1] + (boot ? 0.0 : 0.012) * sc, an[2] - 0.01 * sc], ra: 0.047 * sc, rb: 0.044 * sc }, x, y, z);
        u = smin(u, collar, 0.02 * sc);
        if (boot) for (const sh of shins) if (sh.name.endsWith(n)) u = smin(u, smax(dPart(sh, x, y, z) - 0.016 * sc - 0.008 * sc * ss(shaftTop - 0.08 * sc, shaftTop, y), y - shaftTop, 0.006 * sc), 0.012 * sc);
        if (!boot) {
          u = smax(u, y - (an[1] + 0.014 * sc), 0.008 * sc);
          // Laces: small ridges across the instep.
          const instep = ss(an[2] + 0.01 * sc, an[2] + 0.04 * sc, z) * ss(to[2] - 0.03 * sc, to[2] - 0.08 * sc, z) * ss(0.03 * sc, 0.0, Math.abs(x - an[0]));
          u -= 0.0018 * sc * instep * (0.5 + 0.5 * Math.sin((z - an[2]) / sc * 260));
        }
        // The sole: a slab under the foot with a rounded edge, the toe sprung up a little.
        const spring = 0.012 * sc * ss(to[2] - 0.05 * sc, to[2] + 0.04 * sc, z);
        let so = dPart(P, x, y - spring * 0.0, z) - 0.014 * sc;
        so = smax(so, y - soleTop - spring, 0.004 * sc);
        so = smax(so, spring - y, 0.004 * sc);
        d = Math.min(d, smin(u, so, 0.004 * sc));
      }
      return d;
    };
    const up = hex(S.shoes.color);
    const so = hex(S.shoes.sole ?? S.shoes.color);
    const tie = hex(S.shoes.tie ?? S.shoes.color);
    const colors = (pos) => {
      const out = new Float32Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const y = pos[i + 1];
        // The sole, a thin foxing stripe above it on sneakers, the tie at the top of a boot.
        const c = y < soleTop * 0.9 ? so : !boot && y < soleTop + 0.006 * sc ? so : boot && y > shaftTop - 0.03 * sc ? tie : up;
        out.set(c, i);
      }
      return out;
    };
    items.push({ allow: (n) => n.startsWith("foot") || n.startsWith("shin"), name: "shoes", f, min: [-0.3 * H, -0.01, -0.15], max: [0.3 * H, (boot ? shaftTop + 0.03 : 0.16) * sc / sc, 0.25 * H], mat: "shoes", h: 0.0025, colors });
    covers.push((x, y, z) => {
      const n = nearest(x, y, z);
      if (n.startsWith("foot")) return y < J.footL[1] - 0.005 * sc || boot;
      return boot && n.startsWith("shin") && y < shaftTop - 0.02 * sc;
    });
  }
  return {
    items,
    covers: (x, y, z) => {
      // A vertex is kept if no garment covers it (with margin for the garment's thickness).
      for (const c of covers) if (c(x, y, z)) return true;
      return false;
    },
  };
}

/* ---------------- hair and brows ---------------- */

function hairField(D, S) {
  const st = S.hair.style;
  if (st === "bald") return null;
  const anime = S.style === "anime";
  const c = D.head.c;
  const s = D.head.s;
  const sk = D.head.part;
  const L = (x, y, z) => [(x - c[0]) / s, (y - c[1]) / s, (z - c[2]) / s];
  const thick = (anime ? 0.016 : 0.009) * s;
  // Spiked styles (Goku): cones from the skull, pointed at the tips.
  const SPIKES = {
    goku: [
      // The crown: tall spikes standing up and back.
      [[0.05, 1, -0.15], [0.12, 1, -0.45], 0.17, 0.042],
      [[-0.3, 0.95, -0.15], [-0.35, 1, -0.4], 0.16, 0.04],
      [[0.38, 0.88, -0.2], [0.5, 0.95, -0.45], 0.15, 0.038],
      [[-0.55, 0.75, -0.3], [-0.75, 0.7, -0.45], 0.14, 0.036],
      [[0.6, 0.7, -0.35], [0.8, 0.6, -0.5], 0.13, 0.034],
      [[0, 0.65, -0.75], [0.05, 0.55, -1], 0.14, 0.038],
      [[0.35, 0.4, -0.85], [0.4, 0.2, -1], 0.11, 0.032],
      [[-0.35, 0.4, -0.85], [-0.4, 0.2, -1], 0.11, 0.032],
      // Sides: swept out and down past the ears.
      [[0.92, 0.35, -0.15], [1, 0.1, -0.15], 0.13, 0.032],
      [[-0.92, 0.35, -0.15], [-1, 0.1, -0.15], 0.13, 0.032],
      [[0.8, 0.6, 0.05], [1, 0.45, 0.05], 0.12, 0.03],
      [[-0.8, 0.6, 0.05], [-1, 0.45, 0.05], 0.12, 0.03],
      [[0.85, 0.05, -0.45], [0.8, -0.45, -0.45], 0.09, 0.026],
      [[-0.85, 0.05, -0.45], [-0.8, -0.45, -0.45], 0.09, 0.026],
      // Bangs over the forehead, and the tuft that stands up at the front.
      [[0.12, 0.62, 0.78], [0.22, -0.7, 0.68], 0.1, 0.026],
      [[-0.25, 0.64, 0.72], [-0.38, -0.72, 0.58], 0.095, 0.024],
      [[0.4, 0.6, 0.66], [0.55, -0.75, 0.38], 0.08, 0.02],
      [[-0.48, 0.58, 0.6], [-0.65, -0.7, 0.3], 0.07, 0.018],
      [[-0.02, 0.8, 0.6], [0.05, 0.75, 0.6], 0.08, 0.026],
    ],
  };
  const spikes = (SPIKES[st] ?? null)?.map(([dir, out, L, r]) => {
    const n = len3(...dir);
    const R0 = [c[0] + (dir[0] / n) * 0.082 * s, c[1] + 0.02 * s + (dir[1] / n) * 0.085 * s, c[2] + (dir[2] / n) * 0.09 * s];
    const m = len3(...out);
    const R1 = [R0[0] + (out[0] / m) * L * s, R0[1] + (out[1] / m) * L * s, R0[2] + (out[2] / m) * L * s];
    return cone(R0, R1, r * s, 0.0015 * s, { k: 0.01 * s });
  });
  const f = (x, y, z) => {
    const [hx, hy, hz] = L(x, y, z);
    // A shell over the skull, above the hairline and the ears.
    const line = (hz > 0.02 ? (anime ? 0.05 : 0.074) - 0.12 * Math.max(0, Math.abs(hx) - 0.035) : hz > -0.04 ? 0.03 - 0.25 * (0.02 - hz) : -0.075) + (anime ? 0 : 0.006 * (vnoise(hx * 90, 3.1, hz * 90) - 0.5));
    // Thickness grows from nothing at the hairline, so the hair blends into the scalp.
    const grow = anime ? 1 : ss(line - 0.004, line + 0.035, hy);
    const tuft = anime ? 0 : (vnoise(hx * 38 + 7, hy * 38, hz * 38) - 0.5) * 0.009 * s + (vnoise(hx * 90, hy * 90, hz * 90) - 0.5) * 0.003 * s;
    // Short on the sides and back (a fade), fuller on top and swept up at the front.
    const sideFade = anime ? 1 : 0.25 + 0.75 * ss(0.035, 0.075, hy);
    let d = dPart(sk, x, y, z) - (thick * sideFade + (anime ? 0.006 : 0.007) * s * ss(0.04, 0.1, hy) + (anime ? 0 : 0.008 * s * ss(-0.01, 0.06, hz) * ss(0.045, 0.085, hy)) + tuft * ss(0.04, 0.08, hy)) * grow + 0.0025 * s * (1 - grow);
    d = smax(d, (line - 0.006 - hy) * s * 0.5, 0.004 * s);
    d = smax(d, (-0.085 - hy) * s, 0.006 * s);
    if (st === "long") {
      // A fall of hair down the back to the shoulder blades.
      const back = len3(hx / 0.088, (hy + 0.1) / 0.21, (hz + 0.04) / 0.065) - 1;
      const fall = smax(back * 0.06 * s, (-0.29 - hy) * s, 0.01 * s);
      d = smin(d, smax(fall, (hz - 0.02) * s, 0.01 * s), 0.02 * s);
    }
    if (anime && (st === "short" || st === "long")) {
      // Bangs over the forehead in clumps that come to points.
      const ang = Math.atan2(hx, hz);
      const clump = Math.cos(ang * 9) * 0.5 + 0.5;
      const bangs = len3(hx / 0.082, (hy - 0.03) / 0.07, (hz - 0.032) / 0.076) - 1;
      const tip = 0.012 - 0.03 * clump;
      d = smin(d, smax(bangs * 0.06 * s, (tip - hy) * s * 0.5, 0.004 * s), 0.01 * s);
    }
    // Keep the face clear.
    d = smax(d, -(len3(hx / 0.06, (hy + 0.03) / 0.065, (hz - 0.09) / 0.05) - 1) * 0.03 * s, 0.003 * s);
    // Strand grooves along the flow (front to back on top, downward at the sides).
    const ang = Math.atan2(hx, -hz);
    d += (anime ? 0.0012 * s * Math.sin(ang * 30 + hy * 8) : 0.00022 * s * (Math.sin(ang * 60 + hy * 14 + 8 * vnoise(hx * 30, hy * 30, hz * 30)) + 2 * (vnoise(hx * 160, hy * 60, hz * 160) - 0.5)));
    if (st === "bun") d = smin(d, len3(hx, hy - 0.07, hz + 0.075) * s - 0.03 * s, 0.01 * s);
    if (spikes) for (const sp of spikes) d = smin(d, dPrim(sp, x, y, z), 0.01 * s);
    return d;
  };
  const base = hex(S.hair.color);
  const colors = (pos) => {
    const out = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const [hx, hy, hz] = L(pos[i], pos[i + 1], pos[i + 2]);
      const ang = Math.atan2(hx, -hz);
      const groove = 0.5 + 0.5 * Math.sin(ang * (anime ? 30 : 90) + hy * 8);
      const k = (anime ? 0.85 + 0.25 * groove : 0.75 + 0.4 * groove) * (1 + 0.15 * vnoise(hx * 200, hy * 30, hz * 200));
      out.set([base[0] * k, base[1] * k, base[2] * k], i);
    }
    return out;
  };
  return { f, min: [c[0] - (spikes ? 0.24 : 0.13) * s, c[1] - 0.36 * s, c[2] - (spikes ? 0.26 : 0.15) * s], max: [c[0] + (spikes ? 0.24 : 0.13) * s, c[1] + (spikes ? 0.3 : 0.14) * s, c[2] + (spikes ? 0.2 : 0.14) * s], colors };
}
function browField(D, S) {
  const c = D.head.c;
  const s = D.head.s;
  const anime = S.style === "anime";
  const P = (x, y, z) => [c[0] + x * s, c[1] + y * s, c[2] + z * s];
  const prims = [];
  const onSkin = (p) => {
    // March from in front of the face back to the skin, stopping 1 mm outside it.
    let z = p[2] + 0.06 * s;
    for (let i = 0; i < 80; i += 1) {
      const d = dPart(D.head.part, p[0], p[1], z, 0.02);
      if (d < 0.0008 * s) break;
      z -= Math.max(0.0004 * s, d * 0.8);
    }
    return [p[0], p[1], z];
  };
  for (const sd of [1, -1]) {
    const tilt = S.face.browTilt ?? 0;
    const by = S.face.browY ?? 0;
    const pts = anime ? [P(sd * 0.014, 0.03 - 0.012 * tilt + by, 0.087), P(sd * 0.034, 0.036 + by, 0.085), P(sd * 0.054, 0.034 + 0.006 * tilt + by, 0.073)] : [P(sd * 0.012, 0.03 - 0.004 * tilt, 0.09), P(sd * 0.03, 0.036, 0.089), P(sd * 0.05, 0.033, 0.08)];
    const bw = S.face.browWeight ?? 1;
    const r = (anime ? [0.0018, 0.0022, 0.0012] : [0.0024, 0.0022, 0.0012]).map((v) => v * bw);
    const q = pts.map(onSkin);
    for (let i = 0; i < 2; i += 1) prims.push(cone(q[i], q[i + 1], r[i] * s, r[i + 1] * s, { k: 0.002 * s }));
  }
  const P0 = part("brows", prims, ["head"]);
  return { f: (x, y, z) => dPart(P0, x, y, z, 0.01), min: [c[0] - 0.07 * s, c[1] + 0.015 * s, c[2] + 0.05 * s], max: [c[0] + 0.07 * s, c[1] + 0.05 * s, c[2] + 0.115 * s] };
}

/* ---------------- realistic face detail ---------------- */

/**
 * What makes a code-built face read as real at a close-up: hair that is hair. Brows as a few
 * hundred short strands that grow out of the skin in the directions real brows grow (up and out at
 * the head, out along the arch, down toward the tail); upper and lower lashes that curl away from
 * the lid; thousands of strands laid over the hair mass along its flow; a cornea over each iris,
 * and the pink caruncle in the inner corner. Lines are one pixel wide, so they stay fine at any
 * distance. Everything rides on the head bone.
 */
function realFaceDetail(THREE, D, S, headBone, hairMesh, opts = {}) {
  const s = D.head.s;
  const c = D.head.c;
  const hj = D.J.head;
  let seed = 9173;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pos = [];
  const col = [];
  const toLocal = (p) => [p[0] - hj[0], p[1] - hj[1], p[2] - hj[2]];
  const strand = (pts, rgb) => {
    for (let i = 0; i < pts.length - 1; i += 1) {
      pos.push(...toLocal(pts[i]), ...toLocal(pts[i + 1]));
      col.push(...rgb, ...rgb.map((q) => q * 0.9));
    }
  };
  const P = (x, y, z) => [c[0] + x * s, c[1] + y * s, c[2] + z * s];
  // March from in front of the face back to the skin.
  const onSkin = (p, lift = 0.0004) => {
    let z = p[2] + 0.06 * s;
    for (let i = 0; i < 90; i += 1) {
      const d = dPart(D.head.part, p[0], p[1], z, 0.02);
      if (d < lift * s) break;
      z -= Math.max(0.0003 * s, d * 0.8);
    }
    return [p[0], p[1], z];
  };
  const browCol = hex(S.brows);
  const hairCol = S.hair.style === "bald" ? browCol : hex(S.hair.color);

  // The eye on side sd: centre, ball radius, opening half-width and lid heights, lid radius.
  const eyeOf =
    opts.eye ??
    ((sd) => {
      const r = 0.0122 * s;
      return { c: P(sd * 0.032, 0.012, 0.073), r, w: 0.85 * r, up: 0.4 * r, lo: -0.36 * r, R0: r + 0.0032 * s, sculpted: true };
    });

  /* Brows: along an arch from the head (inner) to the tail. */
  for (const sd of opts.brows === false ? [] : [1, -1]) {
    for (let k = 0; k < 420; k += 1) {
      const t = rnd();
      const x = sd * (0.012 + 0.04 * t);
      // The arch peaks two-thirds out; the brow is tall at the head and thins to the tail.
      const yMid = 0.031 + 0.006 * Math.sin(Math.min(1, t / 0.68) * Math.PI * 0.5) - 0.007 * Math.max(0, (t - 0.68) / 0.32) ** 1.5;
      const h = 0.0075 * (1 - 0.65 * t);
      const y = yMid + (rnd() - 0.5) * h;
      const root = onSkin(P(x, y, 0.085));
      // Up and slightly out at the head, out along the body, out and down at the tail.
      const ang = t < 0.15 ? 1.2 - t * 3 : t < 0.7 ? 0.25 - (t - 0.15) * 0.3 : -0.25 - (t - 0.7);
      const L = (0.0055 + rnd() * 0.0035) * s;
      const dx = sd * Math.cos(ang) * L;
      const dy = Math.sin(ang) * L;
      const v = 0.75 + rnd() * 0.5;
      strand([root, [root[0] + dx * 0.5, root[1] + dy * 0.5, root[2] + 0.0007 * s], [root[0] + dx, root[1] + dy, root[2] + 0.0009 * s]], browCol.map((q) => q * v));
    }
  }

  /* Lashes: along the lid margins of the almond opening (the same curves as the sculpted lids). */
  for (const sd of [1, -1]) {
    const E = eyeOf(sd);
    const ec = E.c;
    const r = E.r;
    const R0 = E.R0;
    for (const [up, n, len] of E.scan ? [[true, 44, 0.0065], [false, 16, 0.003]] : [[true, 60, 0.008], [false, 22, 0.0035]]) {
      for (let k = 0; k < n; k += 1) {
        const u = -0.85 + 1.7 * ((k + rnd() * 0.6) / n);
        const lx = u * E.w;
        const shape = (1 - u * u) ** 0.75;
        const ly = E.sculpted ? (up ? r * (0.4 - 0.3 * u * u + 0.12 * u) : r * (-0.36 + 0.22 * u * u + 0.04 * u)) : up ? E.up * shape + 0.25 * E.up * u : E.lo * shape;
        const lz = Math.sqrt(Math.max(0, R0 * R0 - lx * lx - ly * ly));
        const root = [ec[0] + sd * lx, ec[1] + ly, ec[2] + lz];
        const nrm = [(sd * lx) / R0, ly / R0, lz / R0];
        // Longest toward the outer corner.
        const L = len * s * (1 - 0.45 * u * u) * (0.8 + rnd() * 0.4) * (u > 0.3 ? 1.1 : 1);
        const curl = up ? 1 : -1;
        const p1 = [root[0] + nrm[0] * L * 0.45 + sd * u * L * 0.15, root[1] + nrm[1] * L * 0.45 + curl * L * 0.25, root[2] + nrm[2] * L * 0.45];
        const p2 = [root[0] + nrm[0] * L * 0.7 + sd * u * L * 0.25, root[1] + nrm[1] * L * 0.7 + curl * L * 0.7, root[2] + nrm[2] * L * 0.55];
        strand([root, p1, p2], [0.02, 0.016, 0.014]);
      }
    }
  }

  /* Hair: strands laid over the hair mass along its flow. */
  if (hairMesh) {
    const hp = hairMesh.geometry.attributes.position;
    const hn = hairMesh.geometry.attributes.normal;
    const off = opts.local ? hj : [0, 0, 0];
    const hidx = hairMesh.geometry.index?.array;
    for (let k = 0; k < 26000; k += 1) {
      // A random point on a random triangle (or a vertex, on unindexed meshes), so strands spread evenly.
      let x, y, z, nx, ny, nz;
      if (hidx) {
        const t = Math.floor(rnd() * (hidx.length / 3)) * 3;
        let a = rnd(), b = rnd();
        if (a + b > 1) {
          a = 1 - a;
          b = 1 - b;
        }
        const w = [1 - a - b, a, b];
        x = y = z = nx = ny = nz = 0;
        for (let q = 0; q < 3; q += 1) {
          const i = hidx[t + q];
          x += hp.getX(i) * w[q];
          y += hp.getY(i) * w[q];
          z += hp.getZ(i) * w[q];
          nx += hn.getX(i) * w[q];
          ny += hn.getY(i) * w[q];
          nz += hn.getZ(i) * w[q];
        }
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        x += off[0];
        y += off[1];
        z += off[2];
      } else {
        const i = Math.floor(rnd() * hp.count);
        x = hp.getX(i) + off[0];
        y = hp.getY(i) + off[1];
        z = hp.getZ(i) + off[2];
        nx = hn.getX(i);
        ny = hn.getY(i);
        nz = hn.getZ(i);
      }
      if (ny < -0.6) continue;
      const hy = (y - c[1]) / s;
      const hz = (z - c[2]) / s;
      // Swept up and back at the front, back over the crown, down the sides and nape.
      let f = hz > 0.03 ? [0, 0.75, -0.65] : hy > 0.05 ? [0, 0.1, -1] : [0, -0.85, -0.3];
      const dn = f[0] * nx + f[1] * ny + f[2] * nz;
      f = [f[0] - dn * nx, f[1] - dn * ny, f[2] - dn * nz];
      const fl = Math.hypot(...f) || 1;
      const L = (0.006 + rnd() * 0.01) * s * (hy > 0.05 ? 1 : 0.6);
      const j = (rnd() - 0.5) * 0.5;
      const dir = [f[0] / fl + j * nz, f[1] / fl, f[2] / fl - j * nx];
      const lift = (a) => [nx * a * s, ny * a * s, nz * a * s];
      const at = (t, a) => [x + dir[0] * L * t + lift(a)[0], y + dir[1] * L * t + lift(a)[1], z + dir[2] * L * t + lift(a)[2]];
      const v = 0.6 + rnd() * 0.9;
      strand([at(0, -0.0004), at(0.5, 0.0004), at(1, 0.0001)], hairCol.map((q) => Math.min(1, q * v)));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
  lines.frustumCulled = false;
  headBone.add(lines);

  /* Corneas and caruncles. */
  for (const sd of [1, -1]) {
    const E = eyeOf(sd);
    const ec = toLocal(E.c);
    const r = E.r;
    // The cornea: a clear dome over the iris, so the eye catches a sharp highlight.
    const cornea = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false }),
    );
    cornea.rotation.x = Math.PI / 2;
    cornea.position.set(ec[0], ec[1], ec[2] + r * 0.43);
    headBone.add(cornea);
    // The caruncle: the small pink mound in the inner corner.
    const car = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xc87a78, roughness: 0.25, clearcoat: 1 }));
    car.scale.set(1, 0.8, 0.8);
    car.position.set(ec[0] - sd * r * 0.92, ec[1] - r * 0.02, ec[2] + r * 0.42);
    headBone.add(car);
  }
}

/* ---------------- a scanned head ---------------- */

/**
 * For a photoreal close-up, a sculpted head isn't enough: use a scanned one. loadHeadScan loads
 * the Lee Perry-Smith scan that ships with three.js (CC BY 3.0, Lee Perry-Smith / Infinite Realities,
 * based on a work at triplegangers.com) with its colour and normal maps, plus its landmarks in scan
 * units, measured once from a calibration render.
 */
export async function loadHeadScan(THREE, base) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const g = await new GLTFLoader().loadAsync(base + "LeePerrySmith.glb");
  let mesh = null;
  g.scene.traverse((o) => {
    if (o.isMesh && !mesh) mesh = o;
  });
  const tl = new THREE.TextureLoader();
  const [map, normalMap] = await Promise.all([tl.loadAsync(base + "Map-COL.jpg"), tl.loadAsync(base + "Infinite-Level_02_Tangent_SmoothUV.jpg")]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return {
    geometry: mesh.geometry,
    map,
    normalMap,
    // Landmarks (scan units): eye centres, eyeball radius, the eye opening's half-width, top, chin.
    marks: { eyeX: 0.63, eyeY: 1.65, eyeZ: 1.55, eyeR: 0.227, eyeW: 0.29, lidUp: 0.084, lidLo: -0.078, top: 3.97, chin: -0.35, neckCut: -1.15 },
    skin: "#c89a8b",
  };
}

/**
 * Fit a scanned head to a built character: scale it to the head's height, put its eyes where the
 * character's eyes are, cut almond openings in the closed lids (subdividing them first so the cut
 * is clean), trim the neck so it sits inside the collar, and grow hair, lashes and corneas on it.
 */
function attachHeadScan(THREE, ctx, scan) {
  const { D, S, bones, meshes, eyes, mats } = ctx;
  const s = D.head.s;
  const c = D.head.c;
  const hj = D.J.head;
  const M = scan.marks;
  const k = (0.232 * s) / (M.top - M.chin);
  const eyeW = [c[0], c[1] + 0.012 * s, c[2] + 0.073 * s];
  // A width factor fits the scan to the design's build (a slimmer face for a slim build).
  const wf = 0.86 + 0.14 * clamp(S.build + 0.2, 0, 1);
  const toW = (x, y, z) => [eyeW[0] + x * k * wf, eyeW[1] + (y - M.eyeY) * k, eyeW[2] + (z - M.eyeZ) * k];
  const src = scan.geometry;
  const sp = src.attributes.position;
  const sn = src.attributes.normal;
  const su = src.attributes.uv;
  const idx = src.index.array;

  // The almond opening, in scan units, for the eye on side sd.
  const opening = (x, y, sd) => {
    const u = (x - sd * M.eyeX) / M.eyeW;
    if (Math.abs(u) >= 1) return false;
    const w = (1 - u * u) ** 0.75;
    const up = M.eyeY + M.lidUp * w + 0.02 * u * sd;
    const lo = M.eyeY + M.lidLo * w;
    return y < up && y > lo;
  };
  const nearEye = (x, y, z) => z > 1.3 && Math.abs(y - M.eyeY) < 0.3 && Math.abs(Math.abs(x) - M.eyeX) < M.eyeW + 0.15;

  // Triangles as flat arrays [pos(9), nrm(9), uv(6)], subdivided around the eyes.
  const out = { p: [], n: [], u: [] };
  const vert = (i) => ({ p: [sp.getX(i), sp.getY(i), sp.getZ(i)], n: [sn.getX(i), sn.getY(i), sn.getZ(i)], u: [su.getX(i), su.getY(i)] });
  const mid = (a, b) => {
    const n = a.n.map((v, q) => v + b.n[q]);
    const l = Math.hypot(...n) || 1;
    return { p: a.p.map((v, q) => (v + b.p[q]) / 2), n: n.map((v) => v / l), u: a.u.map((v, q) => (v + b.u[q]) / 2) };
  };
  const emit = (a, b, cc) => {
    const cx = (a.p[0] + b.p[0] + cc.p[0]) / 3, cy = (a.p[1] + b.p[1] + cc.p[1]) / 3;
    if (cy < M.neckCut) return;
    if (cx > 0 ? opening(cx, cy, 1) : opening(cx, cy, -1)) {
      const cz = (a.p[2] + b.p[2] + cc.p[2]) / 3;
      if (cz > 1.3) return;
    }
    for (const v of [a, b, cc]) {
      out.p.push(...toW(...v.p));
      out.n.push(...v.n);
      out.u.push(...v.u);
    }
  };
  const split = (a, b, cc, depth) => {
    if (depth === 0) return emit(a, b, cc);
    const ab = mid(a, b), bc = mid(b, cc), ca = mid(cc, a);
    split(a, ab, ca, depth - 1);
    split(ab, b, bc, depth - 1);
    split(ca, bc, cc, depth - 1);
    split(ab, bc, ca, depth - 1);
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = vert(idx[t]), b = vert(idx[t + 1]), cc = vert(idx[t + 2]);
    const cx = (a.p[0] + b.p[0] + cc.p[0]) / 3, cy = (a.p[1] + b.p[1] + cc.p[1]) / 3, cz = (a.p[2] + b.p[2] + cc.p[2]) / 3;
    split(a, b, cc, nearEye(cx, cy, cz) ? 4 : 0);
  }
  const geo = new THREE.BufferGeometry();
  // Positions relative to the head bone (it is unrotated at rest).
  const rel = new Float32Array(out.p.length);
  for (let q = 0; q < out.p.length; q += 3) {
    rel[q] = out.p[q] - hj[0];
    rel[q + 1] = out.p[q + 1] - hj[1];
    rel[q + 2] = out.p[q + 2] - hj[2];
  }
  geo.setAttribute("position", new THREE.BufferAttribute(rel, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(out.u, 2));
  const mat = skinMaterial(THREE, S, { map: scan.map, normalMap: scan.normalMap, pores: false });
  const head = new THREE.Mesh(geo, mat);
  head.castShadow = true;
  head.receiveShadow = true;
  head.frustumCulled = false;
  head.name = "scanHead";
  bones.head.add(head);
  if (meshes.head) meshes.head.visible = false;
  meshes.scanHead = head;

  // Eyes into the openings.
  eyes.groups.forEach((g, i) => {
    const sd = i === 0 ? 1 : -1;
    const e = toW(sd * M.eyeX, M.eyeY, M.eyeZ);
    g.position.set(e[0] - hj[0], e[1] - hj[1], e[2] - hj[2]);
    g.scale.setScalar((M.eyeR * k) / (0.0122 * s));
  });

  // Hair: a shell grown from the scan's own scalp, thick on top, thinning to the hairline and the
  // nape, with tufts; then strands over it.
  const base = hex(S.hair.color);
  const hairline = (x, y, z) => {
    // Hair grows above this height: high at the forehead, above the ears at the sides, down the back.
    const front = ss(0.5, 1.5, z);
    const sides = 2.15 + 0.1 * Math.max(0, z);
    const back = mix(0.55, sides, ss(-1.4, -0.5, z));
    // An irregular front edge, a little higher at the temples.
    return mix(Math.abs(x) > 1.1 ? back : mix(0.55, 2.4, ss(-1.6, -0.2, z)), 2.7 + 0.25 * Math.max(0, Math.abs(x) - 0.4) + 0.22 * (vnoise(x * 5, 1.7, z * 5) - 0.5) + 0.08 * (vnoise(x * 14, 3.1, z * 14) - 0.5), front);
  };
  // The ears stay clear.
  const ear = (x, y, z) => Math.abs(x) > 1.55 && y > 0.75 && y < 2.2 && z > -0.7 && z < 0.8;
  // A long ramp, so the hair thickens gradually from the hairline instead of standing as a ledge.
  const hairW = (x, y, z) => (ear(x, y, z) ? 0 : ss(0, 1.0, y - hairline(x, y, z)) ** 1.6);
  // Shared vertices, so the shell is smooth; the region subdivided twice, so the hairline is fine.
  let verts = [];
  const vmap = new Map();
  const vid = (i) => {
    if (!vmap.has(i)) {
      vmap.set(i, verts.length);
      verts.push(vert(i));
    }
    return vmap.get(i);
  };
  let tris = [];
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    if (tri.every((i) => hairW(sp.getX(i), sp.getY(i), sp.getZ(i)) <= 0)) continue;
    tris.push(tri.map(vid));
  }
  for (let lvl = 0; lvl < 2; lvl += 1) {
    const mc = new Map();
    const midv = (a, b) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!mc.has(key)) {
        mc.set(key, verts.length);
        verts.push(mid(verts[a], verts[b]));
      }
      return mc.get(key);
    };
    const nt = [];
    for (const [a, b, cc] of tris) {
      const ab = midv(a, b), bc = midv(b, cc), ca = midv(cc, a);
      nt.push([a, ab, ca], [ab, b, bc], [ca, bc, cc], [ab, bc, ca]);
    }
    tris = nt;
  }
  const ws = verts.map((v) => hairW(...v.p));
  tris = tris.filter((t) => t.some((i) => ws[i] > 0));
  const hidx = tris.flat();
  const hp = new Float32Array(verts.length * 3);
  const hc = new Float32Array(verts.length * 3);
  verts.forEach((v, j) => {
    const w = ws[j];
    const top = ss(1.5, 3.5, v.p[1]);
    const tuft = 0.06 * (vnoise(v.p[0] * 2.5, v.p[1] * 2.5, v.p[2] * 2.5) - 0.5);
    // Sink the shell's edge under the skin, so the hairline has no ledge.
    // Fuller on top and swept up at the front, short at the sides.
    const fringe = ss(1.0, 1.8, v.p[2]) * ss(2.6, 3.2, v.p[1]);
    const th = (0.04 + 0.2 * top + 0.04 * fringe + tuft * 1.6) * w - 0.01 * (1 - w);
    const q = toW(v.p[0] + v.n[0] * th, v.p[1] + v.n[1] * th, v.p[2] + v.n[2] * th);
    hp.set([q[0] - hj[0], q[1] - hj[1], q[2] - hj[2]], j * 3);
    const g = 0.7 + 0.5 * vnoise(v.p[0] * 9, v.p[1] * 3, v.p[2] * 9);
    hc.set([base[0] * g, base[1] * g, base[2] * g], j * 3);
  });
  const hgeo = new THREE.BufferGeometry();
  hgeo.setAttribute("position", new THREE.BufferAttribute(hp, 3));
  hgeo.setAttribute("color", new THREE.BufferAttribute(hc, 3));
  hgeo.setIndex(hidx);
  hgeo.computeVertexNormals();
  const hair = new THREE.Mesh(hgeo, mats.hair);
  hair.castShadow = true;
  bones.head.add(hair);
  if (meshes.hair) meshes.hair.visible = false;
  // Strands over the shell, lashes on the openings, corneas, caruncles.
  realFaceDetail(THREE, D, S, bones.head, hair, {
    local: true,
    brows: false,
    eye: (sd) => {
      const e = toW(sd * M.eyeX, M.eyeY, M.eyeZ);
      return { c: e, r: M.eyeR * k, w: M.eyeW * k * wf, up: M.lidUp * k, lo: M.lidLo * k, R0: (M.eyeR + 0.11) * k, scan: true };
    },
  });
  return head;
}

/* ---------------- eyes ---------------- */

/**
 * A realistic eye map. The sphere's texture spans 360° across and 180° down, so a round iris must be
 * drawn half as wide as it is tall: an iris of ~29° angular radius (11.5 mm on a 12 mm eye), a pupil
 * 40% of it, fibres, a dark limbal ring, and an off-white sclera with faint vessels.
 */
function realEyeTexture(THREE, S) {
  const N = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d");
  g.fillStyle = "#d9cec6";
  g.fillRect(0, 0, N, N);
  // Vessels toward the corners.
  g.strokeStyle = "rgba(170,70,70,0.22)";
  g.lineWidth = 1;
  for (let i = 0; i < 40; i += 1) {
    const y = N * (0.42 + 0.16 * Math.sin(i * 7.3));
    const x0 = N * (i % 2 ? 0.2 : 0.62);
    g.beginPath();
    g.moveTo(x0, y);
    g.bezierCurveTo(x0 + N * 0.04, y + 6 * Math.sin(i), x0 + N * 0.08, y - 6 * Math.cos(i), x0 + N * 0.15 * (i % 2 ? 1 : 1), y + 4);
    g.stroke();
  }
  g.save();
  g.translate(N / 2, N / 2);
  g.scale(0.5, 1);
  const ir = N * 0.161;
  const col = new THREE.Color(S.eyes);
  const c = (k, a = 1) => `rgba(${(col.r * 255 * k) | 0},${(col.g * 255 * k) | 0},${(col.b * 255 * k) | 0},${a})`;
  const grad = g.createRadialGradient(0, 0, ir * 0.3, 0, 0, ir);
  grad.addColorStop(0, c(0.55));
  grad.addColorStop(0.45, c(1.05));
  grad.addColorStop(0.85, c(0.8));
  grad.addColorStop(0.97, "rgba(25,28,32,1)");
  grad.addColorStop(1, "rgba(60,58,58,0.6)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, ir, 0, Math.PI * 2);
  g.fill();
  // Fibres radiating from the pupil.
  for (let i = 0; i < 160; i += 1) {
    const a = (i / 160) * Math.PI * 2;
    g.strokeStyle = i % 3 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(Math.cos(a) * ir * 0.42, Math.sin(a) * ir * 0.42);
    g.lineTo(Math.cos(a + 0.04) * ir * 0.93, Math.sin(a + 0.04) * ir * 0.93);
    g.stroke();
  }
  g.fillStyle = "#060607";
  g.beginPath();
  g.arc(0, 0, ir * 0.4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function eyeTexture(THREE, S, anime) {
  const N = 256;
  const cv = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!cv) return null;
  if (!anime) return realEyeTexture(THREE, S);
  // Anime eyes. The sphere map spans 360° across and 180° down, so a round iris is drawn half as
  // wide as it is tall (drawn as a plain circle, it wraps the whole front and the eye reads black).
  // face.iris: the iris's angular radius in degrees (40 a soft lead, ~30 a sharp fighter like Goku,
  // whose eyes show white all round a black iris).
  cv.width = cv.height = N;
  const g = cv.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, N, N);
  const deg = S.face.iris ?? 40;
  const ry = (deg / 180) * N;
  g.save();
  g.translate(N / 2, N / 2);
  g.scale(0.5, 1);
  const col = new THREE.Color(S.eyes);
  const css2 = (k) => `rgb(${(col.r * 255 * k) | 0},${(col.g * 255 * k) | 0},${(col.b * 255 * k) | 0})`;
  const grad = g.createLinearGradient(0, -ry, 0, ry);
  grad.addColorStop(0, css2(0.35));
  grad.addColorStop(0.45, css2(0.85));
  grad.addColorStop(1, css2(1.15));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, ry, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = ry * 0.08;
  g.strokeStyle = "#0b0c10";
  g.stroke();
  g.fillStyle = "#050506";
  g.beginPath();
  g.ellipse(0, 0, ry * 0.42, ry * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  // Highlights: a large one upper-right, a small one lower-left.
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.ellipse(ry * 0.32, -ry * 0.38, ry * 0.26, ry * 0.2, -0.5, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(-ry * 0.34, ry * 0.4, ry * 0.09, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildEyes(THREE, D, S, headBone, mats) {
  const anime = S.style === "anime";
  const s = D.head.s;
  const c = D.head.c;
  const hj = D.J.head;
  const r = (anime ? 0.017 * (0.85 + 0.3 * S.face.eyeSize) : 0.0122) * s;
  const tex = eyeTexture(THREE, S, anime);
  const eyes = [];
  const lids = [];
  for (const sd of [1, -1]) {
    const g = new THREE.Group();
    const ex = sd * (anime ? 0.034 : 0.032) * s;
    const ey = (anime ? -0.006 : 0.012) * s;
    const ez = (anime ? 0.0765 : 0.073) * s;
    g.position.set(c[0] + ex - hj[0], c[1] + ey - hj[1], c[2] + ez - hj[2]);
    headBone.add(g);
    const geo = new THREE.SphereGeometry(r, 32, 24);
    geo.rotateY(-Math.PI / 2);
    const ballMat = anime ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
    const ball = new THREE.Mesh(geo, ballMat);
    const tall = anime ? 1.25 * (S.face.eyeTall ?? 1) : 1;
    if (anime) ball.scale.set(0.95, tall, 0.6);
    g.add(ball);
    eyes.push(g);
    // Lids: shells over the ball with a thick rounded margin and a lash line.
    const lid = (top) => {
      const lg = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 32, 10, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2), mats.lid);
      lg.add(shell);
      const margin = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * (anime ? (top ? 0.14 : 0.06) : 0.12), 8, 40, Math.PI), anime || top ? mats.lash : mats.lid);
      margin.rotation.set(Math.PI / 2, 0, top ? 0 : Math.PI);
      lg.add(margin);
      if (anime) lg.scale.set(0.95, tall, 0.6);
      g.add(lg);
      return lg;
    };
    lids.push({ up: lid(true), lo: lid(false), sd });
  }
  return {
    groups: eyes,
    set(f) {
      const blink = f.blink ?? 0;
      const wide = f.wide ?? 0;
      const sq = f.squint ?? 0;
      for (const L of lids) {
        if (!anime) {
          L.up.visible = blink > 0.05;
          L.lo.visible = blink > 0.05;
        }
        // Upper lid covers the top of the iris when relaxed; the lower sits at its bottom edge.
        L.up.rotation.x = mix((anime ? -0.75 : -0.45) - 0.3 * wide + 0.25 * sq, 0.42, blink);
        L.lo.rotation.x = mix((anime ? 0.85 : 0.45) + 0.1 * wide - 0.3 * sq, 0.1, blink);
      }
      for (const e of eyes) {
        e.rotation.y = f.lookX ?? 0;
        e.rotation.x = -(f.lookY ?? 0);
      }
    },
  };
}

/* ---------------- face morphs ---------------- */

function addFaceMorphs(THREE, D, S, meshes) {
  const c = D.head.c;
  const s = D.head.s;
  const g = (d, w) => Math.exp(-(d * d) / (w * w));
  const fields = {
    smile: (hx, hy, hz) => {
      const w = g(Math.abs(hx) - 0.025, 0.012) * g(hy + 0.064, 0.012) * ss(0.07, 0.09, hz);
      const ch = g(Math.abs(hx) - 0.04, 0.02) * g(hy + 0.03, 0.02) * ss(0.04, 0.07, hz);
      return [Math.sign(hx) * 0.004 * w, 0.005 * w + 0.003 * ch, -0.002 * w + 0.002 * ch];
    },
    frown: (hx, hy, hz) => {
      const w = g(Math.abs(hx) - 0.026, 0.012) * g(hy + 0.058, 0.012) * ss(0.07, 0.09, hz);
      return [0, -0.004 * w, 0];
    },
    browUp: (hx, hy, hz) => {
      const w = g(hy - 0.035, 0.02) * ss(0.065, 0.02, Math.abs(hx)) * ss(0.05, 0.08, hz);
      return [0, 0.005 * w, 0.0005 * w];
    },
    browIn: (hx, hy, hz) => {
      const w = g(hy - 0.03, 0.015) * g(Math.abs(hx) - 0.015, 0.018) * ss(0.06, 0.085, hz);
      return [-Math.sign(hx) * 0.0025 * w, -0.0035 * w, 0.0015 * w];
    },
    squint: (hx, hy, hz) => {
      const w = g(Math.abs(hx) - 0.035, 0.018) * g(hy + 0.008, 0.012) * ss(0.05, 0.08, hz);
      return [0, 0.003 * w, 0.001 * w];
    },
    jaw: (hx, hy, hz) => {
      // The lower face drops a little (a parted mouth reads through the lip crease).
      const w = ss(-0.058, -0.064, hy) * ss(-0.02, 0.04, hz);
      const a = 0.12 * w;
      const py = -0.03, pz = -0.02;
      const dy = hy - py, dz = hz - pz;
      return [0, dy * Math.cos(a) - dz * Math.sin(a) - dy, dy * Math.sin(a) + dz * Math.cos(a) - dz];
    },
  };
  for (const m of meshes) {
    const p = m.geometry.attributes.position;
    const list = [];
    const dict = {};
    Object.entries(fields).forEach(([name, fn], i) => {
      const a = new Float32Array(p.count * 3);
      for (let v = 0; v < p.count; v += 1) {
        const hx = (p.getX(v) - c[0]) / s, hy = (p.getY(v) - c[1]) / s, hz = (p.getZ(v) - c[2]) / s;
        const d = fn(hx, hy, hz);
        a[v * 3] = d[0] * s;
        a[v * 3 + 1] = d[1] * s;
        a[v * 3 + 2] = d[2] * s;
      }
      list.push(new THREE.Float32BufferAttribute(a, 3));
      dict[name] = i;
    });
    m.geometry.morphAttributes.position = list;
    m.geometry.morphTargetsRelative = true;
    m.updateMorphTargets();
    m.morphTargetDictionary = dict;
  }
}

/* ---------------- materials ---------------- */

function toonRamp(THREE) {
  const data = new Uint8Array([175, 170, 180, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
function materials(THREE, S) {
  const anime = S.style === "anime";
  const col = (h) => new THREE.Color(h);
  if (anime) {
    const ramp = toonRamp(THREE);
    const toon = (c, vc = false) => new THREE.MeshToonMaterial({ color: vc ? 0xffffff : col(c), gradientMap: ramp, vertexColors: vc });
    return {
      skin: toon(S.skin, true),
      lid: toon(S.skin),
      lash: new THREE.MeshBasicMaterial({ color: 0x1a1214 }),
      hair: toon(S.hair.color, true),
      brow: new THREE.MeshBasicMaterial({ color: col(S.hair.color).multiplyScalar(0.6) }),
      top: toon(S.top.color),
      under: toon(S.top.under ?? S.top.color),
      bottom: toon(S.bottom.color),
      shoes: toon(S.shoes.color, true),
      belt: toon(S.belt ?? "#222222"),
      band: toon(S.bands ?? "#222222"),
    };
  }
  return {
    skin: skinMaterial(THREE, S),
    lid: new THREE.MeshPhysicalMaterial({ color: col(S.skin).multiplyScalar(0.92), roughness: 0.5, sheen: 0.3 }),
    lash: new THREE.MeshStandardMaterial({ color: 0x16100c, roughness: 0.7 }),
    hair: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, sheen: 1, sheenRoughness: 0.3, sheenColor: col(S.hair.color).multiplyScalar(1.6) }),
    brow: new THREE.MeshStandardMaterial({ color: col(S.brows), roughness: 0.8 }),
    top: new THREE.MeshPhysicalMaterial({ color: col(S.top.color), roughness: 0.85, sheen: 0.6, sheenRoughness: 0.8, sheenColor: col(S.top.color).multiplyScalar(1.5) }),
    bottom: new THREE.MeshStandardMaterial({ color: col(S.bottom.color), roughness: 0.78 }),
    under: new THREE.MeshPhysicalMaterial({ color: col(S.top.under ?? S.top.color), roughness: 0.85, sheen: 0.5 }),
    shoes: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    belt: new THREE.MeshStandardMaterial({ color: col(S.belt ?? "#222222"), roughness: 0.6 }),
    band: new THREE.MeshPhysicalMaterial({ color: col(S.bands ?? "#222222"), roughness: 0.8, sheen: 0.5 }),
  };
}
/**
 * Realistic skin: light that wraps past the terminator and reddens there (a cheap subsurface
 * scattering), pores and fine creases as a procedural bump from the rest-pose position (no UVs
 * needed), and roughness that varies with them.
 */
function skinMaterial(THREE, S, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: !o.map, map: o.map ?? null, normalMap: o.normalMap ?? null, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.5, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(S.skin).multiplyScalar(1.1), clearcoat: 0.12, clearcoatRoughness: 0.45 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPore = { value: 0.000045 };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vRest;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = position;");
    const noise = `
      varying vec3 vRest;
      uniform float uPore;
      float hS3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vnS(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hS3(i), hS3(i + vec3(1,0,0)), f.x), mix(hS3(i + vec3(0,1,0)), hS3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hS3(i + vec3(0,0,1)), hS3(i + vec3(1,0,1)), f.x), mix(hS3(i + vec3(0,1,1)), hS3(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      // Pores are small pits; creases are a softer, larger ripple.
      float skinH(vec3 p) { float pore = 1.0 - smoothstep(0.0, 0.35, vnS(p * 2200.0)); return -pore + 0.5 * vnS(p * 380.0) + 0.25 * vnS(p * 900.0); }
      vec3 skinPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
        vec3 vSigmaX = normalize(dFdx(surf_pos.xyz)); vec3 vSigmaY = normalize(dFdy(surf_pos.xyz)); vec3 vN = surf_norm;
        vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX);
        float fDet = dot(vSigmaX, R1) * faceDirection;
        vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
        return normalize(abs(fDet) * surf_norm - vGrad);
      }`;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + noise)
      .replace("#include <normal_fragment_maps>", o.pores === false ? "#include <normal_fragment_maps>" : "#include <normal_fragment_maps>\n{ float hh = skinH(vRest) * uPore; normal = skinPerturb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection); }")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.14 * (vnS(vRest * 500.0) - 0.5), 0.3, 0.75);")
      .replace(
        "#include <lights_physical_pars_fragment>",
        THREE.ShaderChunk.lights_physical_pars_fragment.replace(
          "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
          `float ndlS = dot( geometryNormal, directLight.direction );
          vec3 wS = vec3( 0.45, 0.22, 0.16 );
          vec3 wrapS = clamp( ( vec3( ndlS ) + wS ) / ( 1.0 + wS ), 0.0, 1.0 );
          reflectedLight.directDiffuse += wrapS * wrapS * directLight.color * BRDF_Lambert( material.diffuseColor );`,
        ),
      );
  };
  return m;
}

/** Ink outline for anime: the same skinned mesh, back faces, pushed out along the normal. */
function addOutline(THREE, m, skeleton, w) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x1a1214, side: THREE.BackSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\ntransformed += normalize(objectNormal) * ${w.toFixed(5)};`);
  };
  const o = new THREE.SkinnedMesh(m.geometry, mat);
  o.frustumCulled = false;
  m.parent.add(o);
  o.bind(skeleton, m.bindMatrix);
  o.updateMorphTargets();
  return o;
}

/* ---------------- posing ---------------- */

/**
 * Pose with figure conventions: spine x > 0 bends forward, y > 0 turns to the character's left;
 * shoulders [flex forward, twist, abduct out]; el / knee bend > 0; hand { curl[5], spread }.
 */
export function poseHuman(h, p = {}) {
  const B = h.bones;
  const D = h.design;
  const set = (b, r, order = "YXZ") => b && b.rotation.set(r?.[0] ?? 0, r?.[1] ?? 0, r?.[2] ?? 0, order);
  h.root.position.set(...(p.at ?? [0, 0, 0]));
  h.root.rotation.set(0, p.yaw ?? 0, 0);
  B.hips.position.set(D.J.hips[0], D.J.hips[1] + (p.drop ?? 0), D.J.hips[2]);
  set(B.hips, p.hips);
  set(B.spine, p.spine);
  set(B.chest, p.chest);
  set(B.neck, p.neck);
  set(B.head, p.head);
  for (const [n, s] of [["L", 1], ["R", -1]]) {
    const A = p["arm" + n] ?? {};
    set(B["clav" + n], [A.clav?.[0] ?? 0, s * (A.clav?.[1] ?? 0), s * (A.clav?.[2] ?? 0)]);
    const sh = A.sh ?? [0, 0, 0];
    // The rest pose already holds the arm 0.22 rad out.
    B["arm" + n].rotation.set(-sh[0], s * (sh[1] ?? 0), s * ((sh[2] ?? 0) - 0.22), "ZXY");
    B["fore" + n].rotation.set(-(A.el ?? 0), s * (A.tw ?? 0), s * 0.1 * 0, "YXZ");
    const wr = A.wr ?? [0, 0, 0];
    B["hand" + n].rotation.set(wr[0], s * (wr[1] ?? 0), s * (wr[2] ?? 0), "YXZ");
    const hd = A.hand ?? {};
    const curl = hd.curl ?? [0.12, 0.12, 0.16, 0.2, 0.05];
    for (let f = 0; f < 4; f += 1)
      for (let k = 0; k < 3; k += 1) {
        const bn = B[`f${n}${f}${k}`];
        if (!bn) continue;
        bn.rotation.set(k === 0 ? (f - 1.5) * 0.05 * (1 + (hd.spread ?? 0)) : 0, 0, -s * curl[f] * [1.4, 1.65, 1.2][k]);
      }
    const t = curl[4];
    const t0 = B[`f${n}40`];
    if (t0) {
      t0.rotation.set(-(hd.thumbX ?? 0), s * (0.1 + 0.6 * (hd.oppose ?? t)), -s * 0.35 * t);
      B[`f${n}41`].rotation.set(0, 0, -s * t * 0.7);
      B[`f${n}42`].rotation.set(0, 0, -s * t * 0.8);
    }
    const Lg = p["leg" + n] ?? {};
    const hp = Lg.hip ?? [0, 0, 0];
    B["thigh" + n].rotation.set(-hp[0], s * (hp[1] ?? 0), s * (hp[2] ?? 0), "ZXY");
    B["shin" + n].rotation.set(Lg.knee ?? 0, 0, 0);
    const an = Lg.ankle ?? [0, 0, 0];
    B["foot" + n].rotation.set(an[0] ?? 0, s * (an[1] ?? 0), s * (an[2] ?? 0));
  }
  h.setFace(p.face ?? {});
}
export const _internal = { design, clothFields, merge, DEFAULTS, dPart, part };
