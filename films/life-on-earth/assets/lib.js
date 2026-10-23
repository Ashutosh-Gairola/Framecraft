/**
 * Life on Earth — shared pieces: seeded math, textures made once, geometry helpers, and the
 * instanced systems that bring the world to life (people, four-legged animals, birds, fish,
 * small creatures). Every system is posed from film time alone.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export { THREE };
export const W = 1920;
export const H = 1080;
export const deg = Math.PI / 180;

/* ---------------- seeded math ---------------- */

export function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash3(i, j, k) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export const vnoise = (x, z) => vnoise3(x, 0.5, z);
export function fbm(x, z, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    s += amp * vnoise3(x * f + i * 17.3, 0.37 - i * 3.7, z * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
export function ridged(x, z, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    const n = 1 - Math.abs(2 * vnoise(x * f + i * 5.7, z * f + i * 3.1) - 1);
    s += amp * n * n;
    f *= 2.1;
    amp *= 0.5;
  }
  return s;
}
export const smoothstep = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
export const mix = (a, b, u) => a + (b - a) * u;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * Hermite through timed points: velocity carries through every point; at rest at the ends.
 * Tangents are limited (Fritsch–Carlson) so a fast move into a slow one never overshoots —
 * a camera diving to a walking shot doesn't dip through the ground first.
 */
export function timedPath(points) {
  return (t) => {
    const n = points.length;
    if (t <= points[0][0]) return points[0].slice(1);
    if (t >= points[n - 1][0]) return points[n - 1].slice(1);
    let i = 0;
    while (points[i + 1][0] < t) i += 1;
    const [t0, ...p0] = points[i];
    const [t1, ...p1] = points[i + 1];
    const dt = t1 - t0;
    const u = (t - t0) / dt;
    const tan = (k) => {
      if (k <= 0 || k >= n - 1) return p0.map(() => 0);
      const [ta, ...a] = points[k - 1];
      const [tk, ...c] = points[k];
      const [tb, ...b] = points[k + 1];
      return a.map((v, d) => {
        const d0 = (c[d] - v) / (tk - ta);
        const d1 = (b[d] - c[d]) / (tb - tk);
        if (d0 * d1 <= 0) return 0;
        const m = (b[d] - v) / (tb - ta);
        return Math.sign(m) * Math.min(Math.abs(m), 3 * Math.min(Math.abs(d0), Math.abs(d1)));
      });
    };
    const m0 = tan(i);
    const m1 = tan(i + 1);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return p0.map((v, d) => h00 * v + h10 * dt * m0[d] + h01 * p1[d] + h11 * dt * m1[d]);
  };
}

/** A walk along a polyline at speed v: position, heading, and whether it loops or turns back. */
export function polyline(points, closed = false) {
  const pts = closed ? [...points, points[0]] : points;
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = cum[cum.length - 1];
  return {
    length,
    at(s) {
      s = Math.min(length, Math.max(0, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i += 1;
      const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      return [ax + (bx - ax) * u, az + (bz - az) * u, Math.atan2(bx - ax, bz - az)];
    },
  };
}
/** Distance along a route at time t: looping, or walking there and back. */
export const loopS = (t, v, s0, length) => (((s0 + v * t) % length) + length) % length;
export function pingS(t, v, s0, length) {
  const p = (((s0 + v * t) % (2 * length)) + 2 * length) % (2 * length);
  return p < length ? [p, 1] : [2 * length - p, -1];
}

/* ---------------- textures made once ---------------- */

export function canvas2d(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export function texture(c, { srgb = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export const rgbOf = (col) => [Math.round(col.r * 255), Math.round(col.g * 255), Math.round(col.b * 255)];
export const css = (col, a = 1) => {
  const [r, g, b] = rgbOf(col);
  return `rgba(${r},${g},${b},${a})`;
};

/** A soft round puff, tinted. */
export function puff(col, seed = 11, lobes = 14) {
  const rand = mulberry32(seed);
  const c = canvas2d(256, 256);
  const g = c.getContext("2d");
  for (let i = 0; i < lobes; i += 1) {
    const x = 256 * (0.28 + rand() * 0.44);
    const y = 256 * (0.3 + rand() * 0.4);
    const rr = 256 * (0.14 + rand() * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, css(col, 0.5));
    grad.addColorStop(1, css(col, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  return texture(c);
}
/** A radial glow. */
export function glow(col, falloff = 1) {
  const c = canvas2d(256, 256);
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, css(col, 1));
  grad.addColorStop(0.2 / falloff, css(col, 0.45));
  grad.addColorStop(1, css(col, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return texture(c);
}
/** Tiling normal map from a periodic height field f(u, v) on [0, 1)². */
export function normalMap(size, f, strength, repeat) {
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) field[y * size + x] = f(x / size, y / size);
  const c = canvas2d(size, size);
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const gx = field[y * size + ((x + 1) % size)] - field[y * size + ((x + size - 1) % size)];
      const gy = field[((y + 1) % size) * size + x] - field[((y + size - 1) % size) * size + x];
      const n = new THREE.Vector3(-gx * strength, -gy * strength, 1).normalize();
      const k = (y * size + x) * 4;
      img.data[k] = (n.x * 0.5 + 0.5) * 255;
      img.data[k + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[k + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = texture(c, { srgb: false, repeat: true });
  tex.repeat.set(repeat, repeat);
  return tex;
}
/** Periodic noise on the torus, so tiles repeat without seams. */
export function torusNoise(u, v, scale, oct = 4) {
  const a = u * Math.PI * 2;
  const b = v * Math.PI * 2;
  return fbm(Math.cos(a) * scale + 10 + Math.sin(b) * scale * 0.5, Math.sin(a) * scale + Math.cos(b) * scale + 20, oct);
}
/** Small waves: a tiling normal map. */
export function rippleNormal(repeat, seed = 0) {
  return normalMap(256, (u, v) => torusNoise(u + seed, v, 2.2, 4) + 0.5 * torusNoise(v, u + seed, 5, 3), 5, repeat);
}
/** Land grain: a tiling normal map of small bumps. */
export function grainNormal(repeat) {
  return normalMap(256, (u, v) => torusNoise(u, v, 3, 4) + 0.4 * torusNoise(v, u, 9, 2), 4, repeat);
}
/** Caustics: the bright net of light under waves; periodic Worley edges. */
export function causticTexture(col, cells = 26, sharp = 3.2, width = 9) {
  const size = 256;
  const rand = mulberry32(77);
  const pts = [];
  for (let i = 0; i < cells; i += 1) pts.push([rand(), rand()]);
  const c = canvas2d(size, size);
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const [r, gg, b] = rgbOf(col);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      let d1 = 9;
      let d2 = 9;
      for (const [px, py] of pts)
        for (let ox = -1; ox <= 1; ox += 1)
          for (let oy = -1; oy <= 1; oy += 1) {
            const d = Math.hypot(x / size - px - ox, y / size - py - oy);
            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) d2 = d;
          }
      const e = Math.pow(Math.max(0, 1 - (d2 - d1) * width), sharp);
      const k = (y * size + x) * 4;
      img.data[k] = r * e;
      img.data[k + 1] = gg * e;
      img.data[k + 2] = b * e;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return texture(c, { repeat: true });
}

/** A cumulus puff: overlapping lobes, lit on top, shaded below, a flatter base. */
export function cumulusTexture(light, shade, variant) {
  const rand = mulberry32(100 + variant * 7);
  const c = canvas2d(512, 256);
  const g = c.getContext("2d");
  const w = 512;
  const h = 256;
  const lobes = [];
  for (let i = 0; i < 22; i += 1) {
    const u = rand();
    const x = w * (0.12 + u * 0.76);
    const top = h * (0.62 - Math.sin(u * Math.PI) * (0.32 + rand() * 0.12));
    const r = h * (0.13 + rand() * 0.16) * (0.6 + Math.sin(u * Math.PI) * 0.6);
    lobes.push([x, top + r * 0.4, r]);
  }
  for (const [x, y, r] of lobes) {
    const grad = g.createRadialGradient(x, y + r * 0.2, r * 0.1, x, y, r * 1.1);
    grad.addColorStop(0, css(shade, 0.75));
    grad.addColorStop(0.6, css(shade, 0.4));
    grad.addColorStop(1, css(shade, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r * 1.25, 0, Math.PI * 2);
    g.fill();
  }
  for (const [x, y, r] of lobes) {
    const grad = g.createRadialGradient(x - r * 0.15, y - r * 0.4, r * 0.05, x, y - r * 0.1, r * 1.25);
    grad.addColorStop(0, css(light, 1));
    grad.addColorStop(0.55, css(light, 0.75));
    grad.addColorStop(1, css(light, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r * 1.25, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "destination-in";
  const base = g.createLinearGradient(0, h * 0.55, 0, h * 0.95);
  base.addColorStop(0, "rgba(0,0,0,1)");
  base.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  return texture(c);
}

/** A texture drawn with the 2D canvas API. */
export function drawn(w, h, draw, opts) {
  const c = canvas2d(w, h);
  draw(c.getContext("2d"), w, h);
  return texture(c, opts);
}

/* ---------------- geometry helpers ---------------- */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Transform a geometry in place: position, Euler rotation, scale. */
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  geo.applyMatrix4(_m.compose(_v.set(...p), _q.setFromEuler(_e.set(...r)), _s.set(...s)));
  return geo;
}
/** Give a geometry one vertex color. */
export function paint(geo, col) {
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) a.set([col.r, col.g, col.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return geo;
}
/** Merge geometries (position, normal, uv, and color when every part has one). */
export function merge(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = parts.reduce((a, p) => a + p.attributes.position.count, 0);
  const withColor = parts.every((p) => p.attributes.color);
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const colr = withColor ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3);
    if (!p.attributes.normal) p.computeVertexNormals();
    nor.set(p.attributes.normal.array, o * 3);
    if (p.attributes.uv) uv.set(p.attributes.uv.array, o * 2);
    if (colr) colr.set(p.attributes.color.array.subarray(0, c * 3), o * 3);
    o += c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (colr) g.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  return g;
}
/** A box whose faces carry UVs in metres / tile, so a facade texture repeats per floor. */
export function tiledBox(w, h, d, tileW, tileH) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const spans = [
    [d, h],
    [d, h],
    [0, 0],
    [0, 0],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f += 1) {
    const [sw, sh] = spans[f];
    for (let k = 0; k < 4; k += 1) {
      const i = f * 4 + k;
      if (sw === 0) uv.setXY(i, 0.01, 0.01);
      else uv.setXY(i, (uv.getX(i) * sw) / tileW, (uv.getY(i) * sh) / tileH);
    }
  }
  return g;
}
/** A static instanced mesh from a list of [x, y, z, ry, sx, sy, sz, color?]. */
export function instances(geo, mat, list, { shadow = true, receive = false, rx = 0 } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach(([x, y, z, ry, sx, sy, sz, col, rz = 0, rxx = rx], i) => {
    mesh.setMatrixAt(i, _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rxx, ry, rz)), _s.set(sx, sy, sz)));
    if (col) mesh.setColorAt(i, col);
  });
  mesh.count = list.length;
  mesh.castShadow = shadow;
  mesh.receiveShadow = receive;
  mesh.frustumCulled = false;
  return mesh;
}

/* ---------------- shader tweaks ---------------- */

/** Shared time uniform for wind, water and swimming. */
export const U = { uTime: { value: 0 } };

/** Plants sway in the wind: the higher a vertex, the further it moves. */
export function sway(mat, amp, freq, key = "sway") {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 swayAt = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 swayAt = vec2(0.0);
      #endif
      float swayH = max(0.0, position.y);
      transformed.x += sin(uTime * ${freq.toFixed(3)} + swayAt.x * 0.31 + swayAt.y * 0.17) * ${amp.toFixed(4)} * swayH * swayH;
      transformed.z += cos(uTime * ${(freq * 0.77).toFixed(3)} + swayAt.x * 0.13 - swayAt.y * 0.29) * ${(amp * 0.6).toFixed(4)} * swayH * swayH;`,
    );
  };
  mat.customProgramCacheKey = () => `${key}${amp}${freq}`;
  return mat;
}
/** Fish swim: a wave runs down the body to the tail (the fish faces +z, tail toward -z). */
export function swim(mat, amp, freq, length, key = "swim") {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float swimPhase = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;
      #else
        float swimPhase = 0.0;
      #endif
      float back = clamp((${(length * 0.25).toFixed(3)} - position.z) / ${length.toFixed(3)}, 0.0, 1.0);
      transformed.x += sin(uTime * ${freq.toFixed(3)} + swimPhase - position.z * ${(6 / length).toFixed(3)}) * ${amp.toFixed(4)} * back * back;`,
    );
  };
  mat.customProgramCacheKey = () => `${key}${amp}${freq}${length}`;
  return mat;
}
/** Rays fly: the wingtips rise and fall, a wave from body to tip. */
export function flapWings(mat, amp, freq) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float flapPhase = instanceMatrix[3][0] * 0.9;
      #else
        float flapPhase = 0.0;
      #endif
      float tip = abs(position.x);
      transformed.y += sin(uTime * ${freq.toFixed(3)} + flapPhase - tip * 1.4) * ${amp.toFixed(4)} * tip * tip;`,
    );
  };
  mat.customProgramCacheKey = () => `flap${amp}${freq}`;
  return mat;
}

/* ---------------- living systems ---------------- */

const M = new THREE.Matrix4();
const P = new THREE.Matrix4();
const T = new THREE.Matrix4();
const R = new THREE.Matrix4();
const S = new THREE.Matrix4();

/**
 * People: jointed figures drawn as seven instanced parts. Each spec has pose(t) →
 * { x, y, z, heading, gait (0 still → 1 walk → 2 run), cycle, mode: "walk" | "sit" | "work" | "bike" | "wave" }.
 */
export function crowd(scene, specs, colors) {
  const n = specs.length;
  const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const torsoG = new THREE.CylinderGeometry(0.17, 0.15, 0.62, 9);
  torsoG.translate(0, 0.31, 0);
  const shoulders = new THREE.SphereGeometry(0.17, 9, 6);
  xf(shoulders, [0, 0.58, 0], [0, 0, 0], [1.25, 0.55, 0.8]);
  const torso = merge([torsoG, shoulders]);
  const headG = new THREE.SphereGeometry(0.105, 12, 9);
  xf(headG, [0, 0.0, 0], [0, 0, 0], [0.92, 1.08, 1]);
  const hairG = new THREE.SphereGeometry(0.113, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55);
  xf(hairG, [0, 0.012, -0.008], [-0.25, 0, 0]);
  const legG = new THREE.CylinderGeometry(0.075, 0.055, 0.9, 7);
  legG.translate(0, -0.45, 0);
  const foot = new THREE.BoxGeometry(0.1, 0.06, 0.22);
  foot.translate(0, -0.9, 0.05);
  const leg = merge([legG, foot]);
  const armG = new THREE.CylinderGeometry(0.052, 0.042, 0.64, 6);
  armG.translate(0, -0.32, 0);
  const mk = (geo, count) => {
    const m = new THREE.InstancedMesh(geo, mat(), count);
    m.castShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const parts = { torso: mk(torso, n), head: mk(headG, n), hair: mk(hairG, n), legs: mk(leg, n * 2), arms: mk(armG, n * 2) };
  // Bicycles for riders: two wheels and a frame.
  const riders = specs.filter((s) => s.bike).length;
  const wheelG = new THREE.TorusGeometry(0.34, 0.025, 6, 20);
  wheelG.rotateY(Math.PI / 2);
  const frameG = merge([xf(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), [0, 0.55, 0], [Math.PI / 2 - 0.25, 0, 0]), xf(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), [0, 0.62, -0.18], [0.3, 0, 0]), xf(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 5), [0, 0.9, 0.42], [0, 0, Math.PI / 2])]);
  const bikes = riders ? { wheels: mk(wheelG, riders * 2), frames: mk(frameG, riders) } : null;
  specs.forEach((s, i) => {
    parts.torso.setColorAt(i, s.shirt);
    parts.arms.setColorAt(i * 2, s.sleeves ?? s.shirt);
    parts.arms.setColorAt(i * 2 + 1, s.sleeves ?? s.shirt);
    parts.legs.setColorAt(i * 2, s.trousers);
    parts.legs.setColorAt(i * 2 + 1, s.trousers);
    parts.head.setColorAt(i, s.skin);
    parts.hair.setColorAt(i, s.hair);
  });
  let bi = 0;
  for (const s of specs) {
    if (!s.bike) continue;
    s.bikeIndex = bi;
    bikes.frames.setColorAt(bi, s.bikeColor ?? colors.metal);
    bikes.wheels.setColorAt(bi * 2, colors.tyre);
    bikes.wheels.setColorAt(bi * 2 + 1, colors.tyre);
    bi += 1;
  }
  const put = (mesh, i, mat4) => mesh.setMatrixAt(i, mat4);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  return function update(t, cam, range = 1e9) {
    specs.forEach((s, i) => {
      const p = s.pose(t);
      if (!p || (cam && Math.hypot(p.x - cam.x, p.z - cam.z) > range)) {
        for (const m of [parts.torso, parts.head, parts.hair]) put(m, i, hidden);
        put(parts.legs, i * 2, hidden);
        put(parts.legs, i * 2 + 1, hidden);
        put(parts.arms, i * 2, hidden);
        put(parts.arms, i * 2 + 1, hidden);
        if (s.bike) {
          put(bikes.frames, s.bikeIndex, hidden);
          put(bikes.wheels, s.bikeIndex * 2, hidden);
          put(bikes.wheels, s.bikeIndex * 2 + 1, hidden);
        }
        return;
      }
      const sc = s.scale ?? 1;
      const mode = p.mode ?? "walk";
      const gait = p.gait ?? 0;
      const cyc = p.cycle ?? t * (gait > 1.5 ? 9 : 6.2) + (s.phase ?? 0);
      const sw = Math.sin(cyc);
      let hipY = 0.93;
      let lean = gait > 1.5 ? 0.18 : 0.03 * gait;
      let legA = sw * 0.42 * Math.min(1, gait) * (gait > 1.5 ? 1.5 : 1);
      let legB = -legA;
      let armA = -legA * 0.8;
      let armB = legA * 0.8;
      let bob = Math.abs(Math.cos(cyc)) * 0.035 * Math.min(1, gait) * (gait > 1.5 ? 2 : 1);
      let armSpread = 0.07;
      if (mode === "sit") {
        hipY = 0.47;
        legA = legB = -1.45;
        armA = armB = -0.5;
        lean = -0.08;
        bob = 0;
      } else if (mode === "work") {
        // Bending to the crop, a hand reaching down and coming back.
        const k = 0.5 + 0.5 * Math.sin(t * 1.3 + (s.phase ?? 0));
        lean = 0.55 + 0.45 * k;
        hipY = 0.9;
        legA = -0.15;
        legB = 0.1;
        armA = -lean - 0.1 - 0.3 * k;
        armB = -lean + 0.2;
        bob = 0;
      } else if (mode === "bike") {
        hipY = 0.98;
        lean = 0.35;
        legA = -0.95 + 0.55 * Math.sin(cyc);
        legB = -0.95 - 0.55 * Math.sin(cyc);
        armA = armB = -1.05;
        bob = 0;
        armSpread = 0.15;
      } else if (mode === "wave") {
        armB = -2.6 + Math.sin(t * 7 + (s.phase ?? 0)) * 0.3;
        armSpread = 0.25;
      } else if (mode === "pull") {
        // Hauling a net: lean back, arms forward, in a slow rhythm.
        const k = 0.5 + 0.5 * Math.sin(t * 1.6 + (s.phase ?? 0));
        lean = -0.25 * k + 0.1;
        armA = armB = -1.2 + 0.3 * k;
        legA = -0.3;
        legB = 0.25;
      }
      const hy = (hipY + bob) * sc;
      M.compose(_v.set(p.x, p.y, p.z), _q.setFromAxisAngle(_s.set(0, 1, 0), p.heading), _s.set(sc, sc, sc));
      // Hips frame (unscaled offsets because M carries the scale).
      const hips = P.copy(M).multiply(T.makeTranslation(0, hipY + bob, 0));
      const chest = new THREE.Matrix4().copy(hips).multiply(R.makeRotationX(lean));
      put(parts.torso, i, chest);
      put(parts.head, i, T.copy(chest).multiply(S.makeTranslation(0, 0.76, 0.01)));
      put(parts.hair, i, T.copy(chest).multiply(S.makeTranslation(0, 0.76, 0.01)));
      put(parts.legs, i * 2, T.copy(hips).multiply(S.makeTranslation(-0.09, 0, 0)).multiply(R.makeRotationX(legA)));
      put(parts.legs, i * 2 + 1, T.copy(hips).multiply(S.makeTranslation(0.09, 0, 0)).multiply(R.makeRotationX(legB)));
      put(parts.arms, i * 2, T.copy(chest).multiply(S.makeTranslation(-0.22, 0.6, 0)).multiply(R.makeRotationX(armA)).multiply(S.makeRotationZ(-armSpread)));
      put(parts.arms, i * 2 + 1, T.copy(chest).multiply(S.makeTranslation(0.22, 0.6, 0)).multiply(R.makeRotationX(armB)).multiply(S.makeRotationZ(armSpread)));
      if (s.bike) {
        const b = s.bikeIndex;
        const base = new THREE.Matrix4().compose(_v.set(p.x, p.y, p.z), _q.setFromAxisAngle(_s.set(0, 1, 0), p.heading), _s.set(1, 1, 1));
        put(bikes.frames, b, T.copy(base).multiply(S.makeTranslation(0, -0.02, -0.05)));
        const spin = -cyc * 1.6;
        put(bikes.wheels, b * 2, T.copy(base).multiply(S.makeTranslation(0, 0.34, 0.5)).multiply(R.makeRotationX(spin)));
        put(bikes.wheels, b * 2 + 1, T.copy(base).multiply(S.makeTranslation(0, 0.34, -0.55)).multiply(R.makeRotationX(spin)));
      }
      void hy;
    });
    for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
    if (bikes) {
      bikes.frames.instanceMatrix.needsUpdate = true;
      bikes.wheels.instanceMatrix.needsUpdate = true;
    }
  };
}

/**
 * Four-legged animals of every kind from one set of instanced parts. A kind gives the
 * proportions; a spec gives pose(t) → { x, y, z, heading, gait, graze (0–1), lie (0–1), pitch }.
 */
export const KINDS = {
  cow: { body: [0.36, 0.4, 0.92], bodyY: 1.02, leg: 0.78, legR: 0.075, neck: 0.5, neckR: 0.15, head: [0.15, 0.17, 0.3], neckUp: 0.5, horns: "cow", tail: 0.7 },
  buffalo: { body: [0.45, 0.46, 1.0], bodyY: 1.0, leg: 0.72, legR: 0.09, neck: 0.4, neckR: 0.2, head: [0.19, 0.19, 0.33], neckUp: 0.2, horns: "buffalo", tail: 0.6 },
  ox: { body: [0.4, 0.44, 0.98], bodyY: 1.08, leg: 0.82, legR: 0.085, neck: 0.48, neckR: 0.17, head: [0.16, 0.17, 0.32], neckUp: 0.35, horns: "cow", tail: 0.7 },
  horse: { body: [0.28, 0.36, 0.85], bodyY: 1.22, leg: 0.98, legR: 0.06, neck: 0.85, neckR: 0.12, head: [0.11, 0.14, 0.32], neckUp: 0.95, horns: null, tail: 0.75, mane: true },
  goat: { body: [0.17, 0.2, 0.42], bodyY: 0.56, leg: 0.42, legR: 0.035, neck: 0.25, neckR: 0.06, head: [0.08, 0.09, 0.17], neckUp: 0.9, horns: "goat", tail: 0.15 },
  deer: { body: [0.2, 0.26, 0.58], bodyY: 0.98, leg: 0.8, legR: 0.035, neck: 0.55, neckR: 0.075, head: [0.085, 0.1, 0.21], neckUp: 1.0, horns: null, tail: 0.15 },
  stag: { body: [0.23, 0.29, 0.64], bodyY: 1.05, leg: 0.86, legR: 0.04, neck: 0.6, neckR: 0.09, head: [0.09, 0.11, 0.23], neckUp: 1.0, horns: "antler", tail: 0.15 },
  fox: { body: [0.11, 0.12, 0.34], bodyY: 0.34, leg: 0.27, legR: 0.025, neck: 0.12, neckR: 0.05, head: [0.07, 0.07, 0.14], neckUp: 0.5, horns: "ears", tail: 0.45, bushy: true },
  dog: { body: [0.13, 0.15, 0.36], bodyY: 0.44, leg: 0.33, legR: 0.035, neck: 0.16, neckR: 0.06, head: [0.08, 0.085, 0.16], neckUp: 0.8, horns: "ears", tail: 0.3 },
  rabbit: { body: [0.09, 0.1, 0.16], bodyY: 0.15, leg: 0.1, legR: 0.025, neck: 0.04, neckR: 0.05, head: [0.055, 0.06, 0.08], neckUp: 1.2, horns: "long-ears", tail: 0.04, bushy: true },
  squirrel: { body: [0.05, 0.055, 0.11], bodyY: 0.1, leg: 0.07, legR: 0.015, neck: 0.03, neckR: 0.03, head: [0.035, 0.035, 0.05], neckUp: 1, horns: "ears", tail: 0.22, bushy: true },
  sheep: { body: [0.24, 0.26, 0.48], bodyY: 0.66, leg: 0.42, legR: 0.035, neck: 0.18, neckR: 0.08, head: [0.08, 0.09, 0.16], neckUp: 0.6, horns: null, tail: 0.1 },
};

export function herd(scene, specs) {
  const n = specs.length;
  const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const mk = (geo, count, material = mat()) => {
    const m = new THREE.InstancedMesh(geo, material, Math.max(1, count));
    m.count = count;
    m.castShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const bodyG = new THREE.SphereGeometry(1, 14, 10);
  const neckG = new THREE.CylinderGeometry(0.75, 1, 1, 8);
  neckG.translate(0, 0.5, 0);
  const headG = new THREE.SphereGeometry(1, 12, 9);
  headG.translate(0, 0, 0.35);
  const legG = new THREE.CylinderGeometry(1, 0.7, 1, 6);
  legG.translate(0, -0.5, 0);
  const tailG = new THREE.CylinderGeometry(0.25, 1, 1, 6);
  tailG.translate(0, -0.5, 0);
  const hornG = {
    cow: merge([xf(new THREE.ConeGeometry(0.04, 0.22, 6), [0.12, 0.12, 0.05], [0, 0, -1.1]), xf(new THREE.ConeGeometry(0.04, 0.22, 6), [-0.12, 0.12, 0.05], [0, 0, 1.1])]),
    buffalo: merge([xf(new THREE.TorusGeometry(0.22, 0.045, 6, 12, Math.PI * 0.9), [0, 0.1, 0.0], [0, 0, 0], [1.4, 0.8, 1])]),
    goat: merge([xf(new THREE.ConeGeometry(0.02, 0.16, 5), [0.04, 0.1, -0.04], [-0.7, 0, -0.2]), xf(new THREE.ConeGeometry(0.02, 0.16, 5), [-0.04, 0.1, -0.04], [-0.7, 0, 0.2])]),
    antler: merge(
      [-1, 1].flatMap((sd) => [
        xf(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 5), [sd * 0.1, 0.25, -0.02], [-0.3, 0, -sd * 0.45]),
        xf(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 5), [sd * 0.2, 0.38, 0.06], [0.6, 0, -sd * 0.2]),
        xf(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 5), [sd * 0.24, 0.46, -0.08], [-0.6, 0, -sd * 0.6]),
      ]),
    ),
    ears: merge([xf(new THREE.ConeGeometry(0.025, 0.07, 4), [0.035, 0.07, -0.02]), xf(new THREE.ConeGeometry(0.025, 0.07, 4), [-0.035, 0.07, -0.02])]),
    "long-ears": merge([xf(new THREE.CylinderGeometry(0.012, 0.02, 0.12, 5), [0.02, 0.09, -0.03], [-0.3, 0, -0.15]), xf(new THREE.CylinderGeometry(0.012, 0.02, 0.12, 5), [-0.02, 0.09, -0.03], [-0.3, 0, 0.15])]),
  };
  const parts = {
    body: mk(bodyG, n),
    neck: mk(neckG, n),
    head: mk(headG, n),
    legs: mk(legG, n * 4),
    tail: mk(tailG, n),
  };
  const hornSets = {};
  for (const [kind, geo] of Object.entries(hornG)) {
    const list = specs.filter((s) => KINDS[s.kind].horns === kind);
    if (!list.length) continue;
    const m = mk(geo, list.length, new THREE.MeshStandardMaterial({ roughness: 0.6 }));
    list.forEach((s, k) => {
      s.hornIndex = k;
      m.setColorAt(k, s.hornColor ?? s.color);
    });
    hornSets[kind] = m;
  }
  specs.forEach((s, i) => {
    const c = s.color;
    parts.body.setColorAt(i, c);
    parts.neck.setColorAt(i, s.neckColor ?? c);
    parts.head.setColorAt(i, s.headColor ?? c);
    parts.tail.setColorAt(i, s.tailColor ?? c);
    for (let k = 0; k < 4; k += 1) parts.legs.setColorAt(i * 4 + k, s.legColor ?? c);
  });
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const B = new THREE.Matrix4();
  const N = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();

  return function update(t, cam, range = 1e9) {
    specs.forEach((s, i) => {
      const k = KINDS[s.kind];
      const p = s.pose(t);
      if (!p || (cam && Math.hypot(p.x - cam.x, p.z - cam.z) > range)) {
        for (const m of [parts.body, parts.neck, parts.head, parts.tail]) m.setMatrixAt(i, hidden);
        for (let q = 0; q < 4; q += 1) parts.legs.setMatrixAt(i * 4 + q, hidden);
        if (k.horns && hornSets[k.horns]) hornSets[k.horns].setMatrixAt(s.hornIndex, hidden);
        return;
      }
      const sc = s.scale ?? 1;
      const gait = p.gait ?? 0;
      const lie = p.lie ?? 0;
      const cyc = t * (gait > 1.5 ? 11 : 5.2) * (s.cadence ?? 1) + (s.phase ?? 0);
      const [bx, by, bz] = k.body;
      const hop = s.kind === "rabbit" || s.kind === "squirrel";
      const bounce = gait ? (hop ? Math.max(0, Math.sin(cyc)) * 0.12 : Math.abs(Math.cos(cyc)) * 0.02 * gait) : 0;
      const bodyY = mix(k.bodyY, by * 0.85, lie) + bounce;
      B.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.pitch ?? 0, p.heading, 0, "YXZ")), _s.set(sc, sc, sc));
      // Breathing: a slow swell of the body.
      const breathe = 1 + Math.sin(t * 1.6 + (s.phase ?? 0)) * 0.012;
      parts.body.setMatrixAt(i, tmp.copy(B).multiply(M.compose(_v.set(0, bodyY, 0), _q.identity(), _s.set(bx * breathe, by * breathe, bz))));
      // Legs at the four corners; a diagonal walk, or tucked under when lying.
      const legLen = mix(k.leg, k.leg * 0.25, lie);
      const corners = [
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ];
      corners.forEach(([sx, sz], q) => {
        const ph = q === 0 || q === 3 ? 0 : Math.PI;
        const swing = hop ? Math.sin(cyc) * 0.6 * (sz > 0 ? 1 : -1) * Math.min(1, gait) : Math.sin(cyc + ph) * 0.45 * Math.min(1.4, gait);
        const legM = M.compose(_v.set(sx * bx * 0.55, bodyY - by * 0.45, sz * bz * 0.62), _q.setFromEuler(_e.set(lie > 0.5 ? sz * 1.3 : swing, 0, 0)), _s.set(k.legR, legLen, k.legR));
        parts.legs.setMatrixAt(i * 4 + q, tmp.copy(B).multiply(legM));
      });
      // Neck and head: up and alert when walking, down to the grass when grazing.
      const graze = p.graze ?? 0;
      const look = Math.sin(t * 0.7 + (s.phase ?? 0) * 2) * 0.25 * (1 - graze);
      const neckPitch = mix(Math.PI / 2 - k.neckUp, Math.PI * 0.62, graze) + Math.sin(t * 2.1 + (s.phase ?? 0)) * 0.05 * graze;
      N.copy(B)
        .multiply(T.makeTranslation(0, bodyY + by * 0.35, bz * 0.8))
        .multiply(R.makeRotationY(look))
        .multiply(S.makeRotationX(neckPitch));
      parts.neck.setMatrixAt(i, tmp.copy(N).multiply(M.compose(_v.set(0, 0, 0), _q.identity(), _s.set(k.neckR, k.neck, k.neckR))));
      const headM = tmp.copy(N).multiply(T.makeTranslation(0, k.neck, 0)).multiply(R.makeRotationX(-neckPitch + (graze ? 0.5 : 0.15)));
      const head = new THREE.Matrix4().copy(headM);
      parts.head.setMatrixAt(i, headM.multiply(M.compose(_v.set(0, 0, 0), _q.identity(), _s.set(k.head[0], k.head[1], k.head[2]))));
      if (k.horns && hornSets[k.horns]) hornSets[k.horns].setMatrixAt(s.hornIndex, head);
      // Tail: hangs and swishes; bushy tails stream out behind.
      const swish = Math.sin(t * 2.3 + (s.phase ?? 0) * 3) * 0.35;
      const tailM = M.compose(_v.set(0, bodyY + by * 0.3, -bz * 0.95), _q.setFromEuler(_e.set(k.bushy ? -1.9 + (hop ? 0.9 : 0) : -0.25, 0, swish)), _s.set(k.bushy ? k.tail * 0.32 : 0.035, k.tail, k.bushy ? k.tail * 0.32 : 0.035));
      parts.tail.setMatrixAt(i, tmp.copy(B).multiply(tailM));
    });
    for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
    for (const m of Object.values(hornSets)) m.instanceMatrix.needsUpdate = true;
  };
}

/**
 * Birds: a body and two wings per bird. pose(t) → { x, y, z, heading, pitch, bank, flap (0 glide → 1),
 * perched }. Wings beat from the shoulder; perched birds fold them.
 */
export function flock(scene, specs) {
  const n = specs.length;
  const bodyG = new THREE.SphereGeometry(1, 10, 7);
  xf(bodyG, [0, 0, 0], [0, 0, 0], [0.32, 0.3, 1]);
  const headG = new THREE.SphereGeometry(0.22, 8, 6);
  headG.translate(0, 0.12, 0.85);
  const tailG = new THREE.ConeGeometry(0.3, 0.6, 4);
  xf(tailG, [0, 0, -1.1], [-Math.PI / 2, 0, 0], [1, 1, 0.2]);
  const body = merge([bodyG, headG, tailG]);
  // A wing: broad at the shoulder, tapering to the tip, along +x.
  const wing = new THREE.BufferGeometry();
  wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.45, 0, 0, -0.35, 1.3, 0, 0.15, 1.3, 0, 0.15, 0, 0, -0.35, 2.4, 0, -0.35], 3));
  wing.computeVertexNormals();
  const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide });
  const mk = (geo, count) => {
    const m = new THREE.InstancedMesh(geo, mat(), count);
    m.castShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const bodies = mk(body, n);
  const wings = mk(wing, n * 2);
  specs.forEach((s, i) => {
    bodies.setColorAt(i, s.color);
    wings.setColorAt(i * 2, s.wingColor ?? s.color);
    wings.setColorAt(i * 2 + 1, s.wingColor ?? s.color);
  });
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const B = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  return function update(t) {
    specs.forEach((s, i) => {
      const p = s.pose(t);
      if (!p) {
        bodies.setMatrixAt(i, hidden);
        wings.setMatrixAt(i * 2, hidden);
        wings.setMatrixAt(i * 2 + 1, hidden);
        return;
      }
      const sz = s.size;
      B.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(-(p.pitch ?? 0), p.heading, p.bank ?? 0, "YXZ")), _s.set(sz, sz, sz));
      bodies.setMatrixAt(i, B);
      let a;
      let fold = 1;
      if (p.perched) {
        a = 0.15;
        fold = 0.35;
      } else {
        const beat = Math.sin(t * (s.beat ?? 9) + (s.phase ?? 0));
        a = mix(0.08 + Math.sin(t * 0.9 + (s.phase ?? 0)) * 0.04, beat * 0.75, p.flap ?? 1);
      }
      wings.setMatrixAt(i * 2, tmp.copy(B).multiply(M.compose(_v.set(0.22, 0.05, 0.1), _q.setFromEuler(_e.set(0, 0, a)), _s.set(fold, 1, 1))));
      wings.setMatrixAt(i * 2 + 1, tmp.copy(B).multiply(M.compose(_v.set(-0.22, 0.05, 0.1), _q.setFromEuler(_e.set(0, Math.PI, a)), _s.set(fold, 1, -1))));
    });
    bodies.instanceMatrix.needsUpdate = true;
    wings.instanceMatrix.needsUpdate = true;
  };
}

/** A bird flying a closed loop: circle or figure, with heading, bank, and climb from the path. */
export function loopFlight(cx, cy, cz, rx, rz, speed, phase, wobble = 4) {
  return (t) => {
    const a = phase + t * speed;
    const x = cx + Math.sin(a) * rx;
    const z = cz + Math.cos(a) * rz;
    const dx = Math.cos(a) * rx * speed;
    const dz = -Math.sin(a) * rz * speed;
    return { x, y: cy + Math.sin(a * 2 + phase) * wobble, z, heading: Math.atan2(dx, dz), bank: -0.35 * Math.sign(speed), flap: 0.6 + 0.4 * Math.sin(t * 0.5 + phase) };
  };
}

/**
 * Fish: one instanced mesh per kind, swimming with a body wave. pose(t) → { x, y, z, heading, pitch }.
 */
export function fishGeometry(len, depth, width, colorFn) {
  const body = new THREE.SphereGeometry(1, 16, 10);
  xf(body, [0, 0, 0], [0, 0, 0], [width, depth, len * 0.5]);
  const tail = new THREE.BufferGeometry();
  const L = len * 0.5;
  tail.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -L * 0.85, 0, depth * 0.9, -L * 1.45, 0, -depth * 0.9, -L * 1.45], 3));
  tail.computeVertexNormals();
  const fin = new THREE.BufferGeometry();
  fin.setAttribute("position", new THREE.Float32BufferAttribute([0, depth * 0.85, L * 0.35, 0, depth * 1.45, -L * 0.15, 0, depth * 0.8, -L * 0.5], 3));
  fin.computeVertexNormals();
  const geo = merge([body, tail, fin]);
  const p = geo.attributes.position;
  const colr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const c = colorFn(p.getX(i), p.getY(i), p.getZ(i) / L);
    colr.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  return geo;
}
export function school(scene, geo, specs, { amp = 0.12, freq = 9, length = 1, shadow = false, metal = 0.2, rough = 0.45 } = {}) {
  const mat = swim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, side: THREE.DoubleSide }), amp, freq, length, `swim${length}`);
  const mesh = new THREE.InstancedMesh(geo, mat, specs.length);
  mesh.frustumCulled = false;
  mesh.castShadow = shadow;
  specs.forEach((s, i) => mesh.setColorAt(i, s.color));
  scene.add(mesh);
  return function update(t) {
    specs.forEach((s, i) => {
      const p = s.pose(t);
      const sc = s.size;
      mesh.setMatrixAt(i, M.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(-(p.pitch ?? 0), p.heading, p.roll ?? 0, "YXZ")), _s.set(sc, sc, sc)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}
/** Heading and pitch of a path f(t) → [x, y, z] at t. */
export function along(f, t, dt = 0.05) {
  const [x, y, z] = f(t);
  const [x2, y2, z2] = f(t + dt);
  const dx = x2 - x;
  const dy = y2 - y;
  const dz = z2 - z;
  return { x, y, z, heading: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/**
 * Small moving things drawn from one geometry: pose(t) → { x, y, z, heading, pitch?, roll?, scale? } or null.
 */
export function swarm(scene, geo, mat, specs, shadow = false) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, specs.length));
  mesh.count = specs.length;
  mesh.frustumCulled = false;
  mesh.castShadow = shadow;
  specs.forEach((s, i) => s.color && mesh.setColorAt(i, s.color));
  scene.add(mesh);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  return function update(t) {
    specs.forEach((s, i) => {
      const p = s.pose(t);
      if (!p) return mesh.setMatrixAt(i, hidden);
      const sc = (p.scale ?? 1) * (s.size ?? 1);
      mesh.setMatrixAt(i, M.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.pitch ?? 0, p.heading ?? 0, p.roll ?? 0, "YXZ")), _s.set(sc * (p.sx ?? 1), sc, sc)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}

/** Butterflies and dragonflies: a pair of wings per insect, flapping fast. */
export function insects(scene, specs, { wingShape = "butterfly" } = {}) {
  const wing = new THREE.BufferGeometry();
  const pts = wingShape === "butterfly" ? [0, 0, 0.02, 0.05, 0, 0.06, 0.07, 0, 0.0, 0, 0, 0.02, 0.07, 0, 0.0, 0.045, 0, -0.05, 0, 0, 0.02, 0.045, 0, -0.05, 0, 0, -0.02] : [0, 0, 0.012, 0.08, 0, 0.008, 0.08, 0, -0.004, 0, 0, 0.012, 0.08, 0, -0.004, 0, 0, -0.008];
  wing.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, transparent: wingShape !== "butterfly", opacity: wingShape === "butterfly" ? 1 : 0.55 });
  const mesh = new THREE.InstancedMesh(wing, mat, specs.length * 2);
  mesh.frustumCulled = false;
  specs.forEach((s, i) => {
    mesh.setColorAt(i * 2, s.color);
    mesh.setColorAt(i * 2 + 1, s.color);
  });
  scene.add(mesh);
  const tmp = new THREE.Matrix4();
  const B = new THREE.Matrix4();
  return function update(t) {
    specs.forEach((s, i) => {
      const p = s.pose(t);
      const sc = s.size ?? 1;
      B.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(0, p.heading, 0)), _s.set(sc, sc, sc));
      const a = wingShape === "butterfly" ? 0.2 + Math.abs(Math.sin(t * 11 + (s.phase ?? 0))) * 1.2 : Math.sin(t * 60 + (s.phase ?? 0)) * 0.25;
      mesh.setMatrixAt(i * 2, tmp.copy(B).multiply(M.makeRotationZ(a)));
      mesh.setMatrixAt(i * 2 + 1, tmp.copy(B).multiply(M.makeRotationZ(Math.PI - a)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}

/** Everyday clothes from the paints: a shirt, trousers or a skirt, skin and hair. */
export function outfit(rand, PAINT, style = "town") {
  const c = (k) => new THREE.Color(PAINT[k]);
  const b = (a, k, u) => new THREE.Color().lerpColors(c(a), c(k), u);
  const shirts = {
    town: [c("sclera"), b("ocean", "moon", 0.3), c("accent"), b("sky", "moon", 0.2), b("practical", "sclera", 0.3), b("land", "sclera", 0.3), b("hair", "moon", 0.25), b("cyan", "sclera", 0.3), b("skin", "accent", 0.4), b("iris", "sclera", 0.3)],
    farm: [b("sclera", "iris", 0.2), b("ocean", "moon", 0.45), b("accent", "iris", 0.4), b("practical", "iris", 0.3), b("land", "practical", 0.3), b("sclera", "moon", 0.3), b("skin", "accent", 0.5)],
    coast: [c("sclera"), b("cyan", "sclera", 0.2), b("ocean", "sclera", 0.2), c("practical"), b("accent", "sclera", 0.2), b("skin", "sclera", 0.2)],
  }[style];
  const trousers = [b("ocean", "hair", 0.45), b("hair", "moon", 0.2), b("iris", "hair", 0.4), b("moon", "hair", 0.35), b("sclera", "practical", 0.25), b("land", "hair", 0.5)];
  const skins = [c("skin"), b("skin", "iris", 0.35), b("skin", "hair", 0.35), b("iris", "hair", 0.45), b("skin", "sclera", 0.2)];
  const hairs = [c("hair"), b("hair", "iris", 0.35), b("hair", "moon", 0.5), b("iris", "practical", 0.3), b("hair", "iris", 0.15)];
  const pick = (a) => a[Math.floor(rand() * a.length)].clone();
  const shirt = pick(shirts);
  const skin = pick(skins);
  return { shirt, sleeves: rand() < 0.4 ? skin : shirt, trousers: pick(trousers), skin, hair: pick(hairs) };
}
