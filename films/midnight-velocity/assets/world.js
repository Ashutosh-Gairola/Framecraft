/**
 * Midnight Velocity — a night street race, as a pure function of film time.
 *
 * One route through a rain-wet neon city (boulevard, tunnel, closed intersection, elevated
 * highway, overlook), an original widebody supercar driven by motion.js, traffic, rain, spray,
 * tyre smoke and exhaust flames; the road mirrors the city (a planar reflector under a wet,
 * semi-transparent asphalt), the paint reflects its surroundings (a cube camera that rides
 * with the car), the camera blurs the city by its own motion while the car stays sharp
 * (a depth-reprojection blur masked by the car), and the brightest light blooms.
 * References: references.md. Method: skills/html-anime-3d-actor/SKILL.md.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mulberry32, fbm, smoothstep, mix, clamp, drawn, xf, merge } from "./lib.js";
import { T, CAR, WHEEL_R, ROUTE, speedAt, sAt, accelAt, rpmAt, DRIVE, driftAt } from "./motion.js";

const W = 1920;
const H = 1080;
export const DURATION = 96;

/* ---------------- the route ---------------- */

const STEP = 0.5;
const route = (() => {
  const xs = [];
  const ys = [];
  const zs = [];
  const fxs = [];
  const fzs = [];
  const kind = [];
  let x = 0;
  let z = 0;
  let y = 0;
  let a = -Math.PI / 2;
  for (const p of ROUTE.pieces) {
    const n = Math.max(1, Math.round(p.len / STEP));
    const y0 = y;
    for (let i = 0; i < n; i += 1) {
      const u = (i + 1) / n;
      a -= p.turn / n;
      x += Math.cos(a) * (p.len / n);
      z += Math.sin(a) * (p.len / n);
      if (p.rise) y = p.rise[0] + (p.rise[1] - p.rise[0]) * smoothstep(0, 1, u);
      else y = y0;
      xs.push(x);
      ys.push(y);
      zs.push(z);
      fxs.push(Math.cos(a));
      fzs.push(Math.sin(a));
      kind.push(p.name);
    }
  }
  xs.unshift(0);
  ys.unshift(0);
  zs.unshift(0);
  fxs.unshift(0);
  fzs.unshift(-1);
  kind.unshift("boulevard");
  const n = xs.length;
  const idx = (s) => clamp(s / STEP, 0, n - 1.001);
  const at = (s) => {
    const f = idx(s);
    const i = Math.floor(f);
    const u = f - i;
    const L = (arr) => arr[i] + (arr[i + 1] - arr[i]) * u;
    const fx = L(fxs);
    const fz = L(fzs);
    const l = Math.hypot(fx, fz);
    return { x: L(xs), y: L(ys), z: L(zs), fx: fx / l, fz: fz / l, kind: kind[i] };
  };
  // Where each piece starts.
  const starts = {};
  let acc = 0;
  for (const p of ROUTE.pieces) {
    starts[p.name] = acc;
    acc += p.len;
  }
  return { at, n, xs, ys, zs, kind, starts, length: acc };
})();
const RS = route.starts;
/** Lateral layout per stretch: road half-width, where the road's centre sits from the hero lane. */
function layout(kind) {
  switch (kind) {
    case "boulevard":
      return { half: 16, centre: -5.25, walk: 7 };
    case "tunnel-in":
    case "tunnel-curve":
    case "tunnel-out":
      return { half: 5.6, centre: 0, walk: 0 };
    case "approach":
    case "street":
      return { half: 9, centre: -1.75, walk: 5 };
    case "drift":
      return { half: 14, centre: 0, walk: 0 };
    case "ramp":
    case "deck":
    case "highway":
      return { half: 12.5, centre: -3.5, walk: 0 };
    default:
      return { half: 5.5, centre: 0, walk: 0 };
  }
}

/** Nearest distance from (x, z) to the route (coarse grid of samples). */
const near = (() => {
  const cell = 60;
  const grid = new Map();
  for (let i = 0; i < route.n; i += 8) {
    const k = `${Math.floor(route.xs[i] / cell)},${Math.floor(route.zs[i] / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  return (x, z) => {
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    let best = 1e9;
    let bi = 0;
    for (let a = -2; a <= 2; a += 1)
      for (let b = -2; b <= 2; b += 1) {
        const list = grid.get(`${cx + a},${cz + b}`);
        if (!list) continue;
        for (const i of list) {
          const d = Math.hypot(x - route.xs[i], z - route.zs[i]);
          if (d < best) {
            best = d;
            bi = i;
          }
        }
      }
    return { d: best, i: bi, s: bi * STEP };
  };
})();

/* ---------------- the car's pose ---------------- */

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);
/** The car body at film time t: position, heading (with drift slip), pitch and roll from the forces. */
function carPose(t) {
  const s = sAt(t);
  const r = route.at(s);
  const ra = route.at(s + 2);
  const rb = route.at(Math.max(0, s - 2));
  const heading = Math.atan2(r.fx, r.fz);
  const curv = (Math.atan2(ra.fx, ra.fz) - Math.atan2(rb.fx, rb.fz)) / 4;
  const v = speedAt(t);
  const lat = v * v * curv;
  const { slip, counter } = driftAt(t);
  const acc = accelAt(t);
  // Squat under power, dive under brakes, lean away from the turn.
  const pitch = clamp(acc * 0.0042, -0.05, 0.045);
  const roll = clamp(-lat * 0.0055, -0.06, 0.06);
  const bump = v > 1 ? 0.004 * Math.sin(s * 1.7) * Math.sin(s * 0.63) : 0;
  // The drift is a right-hander: the nose points further into the turn than the path.
  const yaw = heading - slip;
  // A small idle shake once the engine runs.
  const idle = t > T.start && v < 0.5 ? 0.0012 * Math.sin(t * 52) : 0;
  return { s, x: r.x, y: r.y, z: r.z, heading, yaw, pitch, roll, bump: bump + idle, v, curv, slip, counter, kind: r.kind };
}
function carMatrix(p, out = new THREE.Matrix4()) {
  _q.setFromEuler(_e.set(-p.pitch, p.yaw, p.roll, "YXZ"));
  return out.compose(new THREE.Vector3(p.x, p.y + p.bump, p.z), _q, new THREE.Vector3(1, 1, 1));
}
/** A point in car-local space (x right, y up, z forward) to world space at time t. */
function local(t, lx, ly, lz, pose = carPose(t)) {
  const m = carMatrix(pose);
  return new THREE.Vector3(-lx, ly, lz).applyMatrix4(m);
}

/* ---------------- the camera ---------------- */

/*
 * Keyframes: [t, mode, pos, look, fov, cut?]. "car" positions are car-local (x right, y up,
 * z forward) and move with the car; "world" positions are fixed. Between two car keys the
 * camera orbits (cylindrical interpolation round the car), so it never passes through it.
 */
function routeWorld(s, lateral, y) {
  const r = route.at(s);
  return [r.x - r.fz * lateral, r.y + y, r.z + r.fx * lateral];
}
const driftC = (() => {
  // The drift's centre of turn and a low camera on the outside of the corner.
  const a = route.at(RS.drift);
  const b = route.at(RS.drift + ROUTE.pieces.find((p) => p.name === "drift").len);
  return { a, b };
})();
const SHOTS = [
  [0, "car", [1.0, 0.64, 3.35], [0.66, 0.6, 2.05], 24],
  [3.2, "car", [1.7, 0.5, 2.9], [0.8, 0.42, 1.4], 30],
  [5.8, "car", [2.3, 0.46, 0.5], [0.85, 0.4, -0.2], 34],
  [7.8, "car", [2.4, 0.5, -1.8], [0.85, 0.5, -1.1], 36],
  [10.2, "car", [3.4, 0.3, 3.5], [0, 0.55, 0.1], 38],
  [11.9, "world", null, null, 38],
  [12.5, "car", [1.18, 0.3, -0.55], [0.86, 0.34, -1.31], 46, true],
  [13.95, "car", [1.18, 0.32, -0.5], [0.86, 0.34, -1.31], 46],
  [13.95, "car", [0.3, 0.34, 9.5], [0, 0.6, 0], 40, true],
  [16.4, "car", [0.5, 0.4, 5.6], [0, 0.6, 0], 42],
  [18, "car", [3.1, 0.62, 0.25], [0, 0.5, 0], 44],
  [20, "car", [3.0, 0.6, 0.4], [0, 0.5, 0], 44],
  [21.6, "car", [-0.35, 0.22, 6.5], [0, 0.5, 0], 40],
  [24, "car", [-0.3, 0.22, 7.4], [0, 0.5, 0], 40],
  [25.6, "car", [7.6, 1.0, 0.6], [0, 0.6, 0.2], 34],
  [28, "car", [7.8, 1.0, 0.2], [0, 0.6, 0.2], 34],
  [29.4, "car", [0, 1.55, -7.8], [0, 0.85, 6], 50],
  [31.5, "car", [0, 1.6, -8.2], [0, 0.85, 6], 50],
  [34, "car", [3, 30, -12], [0, 0, 16], 54],
  [36, "car", [0, 38, 4], [0, 0, 8], 54],
  [36, "car", [0.3, 0.98, -0.4], [-0.32, 0.8, 0.36], 50, true],
  [38.6, "car", [0.24, 0.97, -0.3], [-0.34, 0.8, 0.36], 46],
  [38.6, "car", [0, 1.35, -7.0], [0, 0.9, 8], 50, true],
  [43, "car", [0, 1.3, -6.6], [0, 0.9, 8], 50],
  [44.6, "car", [3.2, 0.75, 0.7], [0, 0.55, 0.5], 46],
  [47, "car", [3.1, 0.72, 0.4], [0, 0.55, 0.5], 46],
  [47, "car", [0, 1.07, 1.3], [0, 1.0, 14], 62, true],
  [49.6, "car", [0, 1.07, 1.3], [0, 1.0, 14], 62],
  [49.6, "car", [-2.4, 2.6, -10.5], [0, 1, 10], 52, true],
  [53, "car", [-2.2, 2.4, -10], [0, 1, 10], 52],
  [54.1, "world", "drift-low", "car", 44],
  [55.3, "world", "drift-low", "car", 44],
  [55.6, "car", [5.2, 0.75, 5.2], [0, 0.55, 0], 44],
  [58.2, "car", [-5.2, 0.9, -5.2], [0, 0.55, 0], 44, false, "orbit+"],
  [60, "car", [0, 1.3, -8], [0, 0.8, 8], 50],
  [64, "car", [0, 1.4, -8.4], [0, 0.8, 8], 50],
  [65.5, "car", [0, 0.62, -4.9], [0, 0.6, 10], 55],
  [68, "car", [0, 0.62, -4.9], [0, 0.6, 10], 55],
  [72, "car", [-14, 22, -20], [0, 0, 25], 50],
  [78, "car", [-28, 34, 10], [0, 0, 20], 50],
  [80.5, "car", [-4.3, 1.0, 0.6], [0, 0.6, 2], 46],
  [84, "car", [-4.2, 1.0, 0.4], [0, 0.6, 2], 46],
  [86, "car", [0, 1.6, -8], [0, 0.8, 8], 50],
  [87.5, "world", "overlook", "car", 40],
  [90.7, "world", "overlook", "car", 36],
  [90.7, "car", [1.55, 0.4, 1.95], [0.88, 0.36, 1.31], 40, true],
  [92.2, "car", [1.42, 0.38, 1.8], [0.88, 0.36, 1.31], 40],
  [96, "car", [2.9, 2.5, -6.4], [0, 0.6, 5], 44, false, "orbit+"],
];
const stopPose = carPose(T.stop + 0.1);
const WORLD_CAMS = {
  "drift-low": (() => {
    // Ahead of the corner on the outside, near the asphalt.
    const s = RS.drift - 4;
    return routeWorld(s + 12, 6, 0.5);
  })(),
  overlook: (() => {
    const p = stopPose;
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    return [p.x + fx * 5 + fz * 7.5, p.y + 2.2, p.z + fz * 5 - fx * 7.5];
  })(),
};
function shotAt(t) {
  let i = 0;
  while (i < SHOTS.length - 1 && SHOTS[i + 1][0] <= t) i += 1;
  const A = SHOTS[i];
  const B = SHOTS[Math.min(SHOTS.length - 1, i + 1)];
  const evalKey = (K, tt, pose) => {
    const [, mode, pos, look, fov] = K;
    if (mode === "world") {
      // A held world camera: fixed position (or where the previous car key left it), looking at the car.
      const wp = typeof pos === "string" ? WORLD_CAMS[pos] : null;
      const P = wp ? new THREE.Vector3(...wp) : heldWorld(K);
      const L = look === "car" || !look ? new THREE.Vector3(pose.x, pose.y + 0.6, pose.z) : new THREE.Vector3(...look);
      return { P, L, fov };
    }
    return { P: local(tt, ...pos, pose), L: local(tt, ...look, pose), fov, lp: pos, ll: look };
  };
  const pose = carPose(t);
  if (B === A || B[5] === true || A[0] === B[0]) return evalKey(A, t, pose);
  const u = smoothstep(0, 1, (t - A[0]) / (B[0] - A[0]));
  const a = evalKey(A, t, pose);
  const b = evalKey(B, t, pose);
  if (A[1] === "car" && B[1] === "car") {
    // Orbit: interpolate in the car's cylindrical coordinates.
    const cyl = (p) => [Math.atan2(p[0], p[2]), Math.hypot(p[0], p[2]), p[1]];
    const [aA, aR, aY] = cyl(A[2]);
    let [bA, bR, bY] = cyl(B[2]);
    let d = bA - aA;
    if (B[6] === "orbit+") d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    else if (B[6] === "orbit-") d = -(((-d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
    else d = Math.atan2(Math.sin(d), Math.cos(d));
    const ang = aA + d * u;
    const rad = mix(aR, bR, u);
    const yy = mix(aY, bY, u);
    const lp = [Math.sin(ang) * rad, yy, Math.cos(ang) * rad];
    const ll = A[3].map((v, k) => mix(v, B[3][k], u));
    return { P: local(t, ...lp, pose), L: local(t, ...ll, pose), fov: mix(A[4], B[4], u) };
  }
  return { P: a.P.clone().lerp(b.P, u), L: a.L.clone().lerp(b.L, u), fov: mix(a.fov, b.fov, u) };
}
// A "world" key without a named position holds where the camera was at that moment.
const heldCache = new Map();
function heldWorld(K) {
  if (heldCache.has(K)) return heldCache.get(K).clone();
  const prev = SHOTS[SHOTS.indexOf(K) - 1];
  const pose = carPose(K[0] - 0.001);
  const P = local(K[0], ...prev[2], pose);
  heldCache.set(K, P);
  return P.clone();
}
/** Camera position, target, field of view at t — with a little road vibration at speed on car mounts. */
function cameraAt(t) {
  const c = shotAt(t);
  const v = speedAt(t);
  const k = Math.min(1, v / 60) * 0.012;
  c.P.x += Math.sin(t * 61) * k * 0.6;
  c.P.y += Math.sin(t * 47 + 1) * k;
  c.P.z += Math.sin(t * 53 + 2) * k * 0.6;
  return c;
}

/* ---------------- shared look ---------------- */

let shared = null;
export function createWorld(canvas, PAINT) {
  if (!shared) shared = build(PAINT);
  const ctx = canvas.getContext("2d");
  return {
    render(t) {
      shared.render(t);
      ctx.drawImage(shared.canvas, 0, 0, canvas.width, canvas.height);
    },
  };
}

function build(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const rand = mulberry32(7);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 6000);
  scene.fog = new THREE.FogExp2(blend("sky", "violet", 0.25).multiplyScalar(0.55), 0.0011);

  const NEON = [col("cyan"), col("accent"), col("violet"), col("electric"), col("practical"), blend("accent", "violet", 0.5)];
  const neon = (i) => NEON[((i % NEON.length) + NEON.length) % NEON.length];

  /* --- sky: deep midnight blue, a city-glow haze at the horizon --- */
  {
    const g = new THREE.SphereGeometry(5000, 48, 24);
    const c = [];
    const p = g.attributes.position;
    const zen = blend("ink", "sky", 0.5).multiplyScalar(0.7);
    const hor = blend("sky", "accent", 0.22).lerp(col("violet"), 0.2);
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i) / 5000;
      const k = new THREE.Color().lerpColors(hor, zen, smoothstep(-0.02, 0.4, y));
      c.push(k.r, k.g, k.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    var sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    scene.add(sky);
  }
  // Low clouds lit from below by the city.
  const cloudTex = drawn(256, 128, (g, w, h) => {
    const r = mulberry32(5);
    for (let i = 0; i < 26; i += 1) {
      const x = w * (0.15 + r() * 0.7);
      const y = h * (0.35 + r() * 0.35);
      const rr = h * (0.2 + r() * 0.25);
      const grad = g.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, "rgba(255,255,255,0.35)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
  for (let i = 0; i < 60; i += 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: blend("accent", "violet", rand()).multiplyScalar(0.35), transparent: true, depthWrite: false, fog: false }));
    const a = rand() * Math.PI * 2;
    const r = 1200 + rand() * 1800;
    sp.position.set(Math.cos(a) * r + 400, 380 + rand() * 260, Math.sin(a) * r - 1600);
    const s = 900 + rand() * 900;
    sp.scale.set(s, s * 0.35, 1);
    scene.add(sp);
  }

  /* --- light --- */
  scene.add(new THREE.HemisphereLight(blend("violet", "electric", 0.5), blend("ink", "accent", 0.15), 0.22));
  const moon = new THREE.DirectionalLight(blend("electric", "sclera", 0.6), 0.18);
  moon.position.set(-0.4, 1, 0.3);
  scene.add(moon);

  /* --- the city's reflections for wet glossy surfaces (built once from a neon box) --- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envNeon = pmrem.fromScene(
    (() => {
      const s = new THREE.Scene();
      s.background = blend("ink", "sky", 0.4).multiplyScalar(0.3);
      for (let i = 0; i < 40; i += 1) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(20 + rand() * 40, 8 + rand() * 30), new THREE.MeshBasicMaterial({ color: neon(i).clone().multiplyScalar(1.5 + rand()), side: THREE.DoubleSide }));
        const a = rand() * Math.PI * 2;
        m.position.set(Math.cos(a) * 120, -10 + rand() * 60, Math.sin(a) * 120);
        m.lookAt(0, m.position.y, 0);
        s.add(m);
      }
      return s;
    })(),
    0.03,
  ).texture;
  scene.environment = envNeon;

  /* --- the ground: a mirror under wet asphalt, puddles letting more of it through --- */
  const groundSize = 9000;
  const reflector = new Reflector(new THREE.PlaneGeometry(groundSize, groundSize), { textureWidth: 960, textureHeight: 540, color: 0x8e8e8e, clipBias: 0.003 });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(500, 0, -1800);
  scene.add(reflector);
  const puddles = drawn(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const a = (x / w) * Math.PI * 2;
        const b = (y / h) * Math.PI * 2;
        const n = fbm(Math.cos(a) * 2 + 9, Math.sin(a) * 2 + Math.cos(b) * 2, 5) + 0.3 * fbm(Math.sin(b) * 6, Math.cos(a) * 6, 3);
        const k = (y * w + x) * 4;
        const grit = 0.9 + 0.1 * fbm(x * 0.7, y * 0.7, 2);
        img.data[k] = 22 * grit;
        img.data[k + 1] = 22 * grit;
        img.data[k + 2] = 26 * grit;
        // Opaque asphalt where dry-ish, see-through where the water pools.
        img.data[k + 3] = 255 * mix(0.82, 0.12, smoothstep(0.52, 0.62, n));
      }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
  puddles.repeat.set(groundSize / 22, groundSize / 22);
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), new THREE.MeshStandardMaterial({ map: puddles, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(500, 0.012, -1800);
  asphalt.renderOrder = 1;
  scene.add(asphalt);

  /* --- road ribbons: lane lines over the ground stretches; decks for the raised ones --- */
  const laneTex = drawn(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(240,235,220,0.85)";
    for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 3, y, 6, 64);
  }, { repeat: true });
  function ribbon(s0, s1, lateral, halfW, yOff, mat, step = 2) {
    const verts = [];
    const uv = [];
    const ind = [];
    let row = 0;
    for (let s = s0; s <= s1; s += step) {
      const r = route.at(s);
      for (const k of [-1, 1]) {
        const lat = lateral + k * halfW;
        verts.push(r.x - r.fz * lat, r.y + yOff, r.z + r.fx * lat);
        uv.push(k > 0 ? 1 : 0, s / 6);
      }
      if (row) ind.push((row - 1) * 2, row * 2, (row - 1) * 2 + 1, (row - 1) * 2 + 1, row * 2, row * 2 + 1);
      row += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    scene.add(m);
    return m;
  }
  const lineMat = new THREE.MeshBasicMaterial({ map: laneTex, transparent: true, depthWrite: false, color: 0x9a9a9a, polygonOffset: true, polygonOffsetFactor: -4 });
  const solidMat = new THREE.MeshBasicMaterial({ color: blend("practical", "sclera", 0.4).multiplyScalar(0.6), polygonOffset: true, polygonOffsetFactor: -4 });
  const groundStretches = [
    [0, RS["tunnel-in"], "boulevard"],
    [RS["tunnel-in"], RS.approach, "tunnel-in"],
    [RS.approach, RS.drift, "approach"],
    [RS.street, RS.ramp + 40, "street"],
  ];
  for (const [s0, s1, k] of groundStretches) {
    const L = layout(k);
    const lanes = Math.round((L.half * 2) / 3.5);
    for (let i = 1; i < lanes; i += 1) {
      const lat = L.centre - L.half + i * 3.5;
      if (Math.abs(lat - L.centre) < 0.3 && k === "boulevard") ribbon(s0, s1, lat, 0.25, 0.02, solidMat, 4);
      else ribbon(s0, s1, lat, 0.12, 0.02, lineMat, 4);
    }
  }
  // Raised decks: the ramp, the highway, the exit; concrete with a glossy wet top.
  const deckTop = new THREE.MeshStandardMaterial({ color: blend("ink", "sky", 0.3).multiplyScalar(0.5), roughness: 0.16, metalness: 0.1, envMapIntensity: 1.4 });
  const concrete = new THREE.MeshStandardMaterial({ color: blend("ink", "sky", 0.35).lerp(col("moon"), 0.08), roughness: 0.85 });
  const raisedFrom = RS.ramp;
  const raisedTo = RS.overlook;
  ribbon(raisedFrom, raisedTo, -3.5, 13, 0.0, deckTop, 1);
  {
    // Deck slab sides and barriers with a light line along the top.
    const strip = new THREE.MeshBasicMaterial({ color: col("cyan").multiplyScalar(2.2) });
    for (const sd of [-1, 1]) {
      ribbon(raisedFrom + 30, raisedTo, -3.5 + sd * 13, 0.35, 0.55, concrete, 2);
      ribbon(raisedFrom + 30, raisedTo, -3.5 + sd * 13.05, 0.05, 1.08, strip, 2);
    }
    for (let i = 1; i < 7; i += 1) ribbon(raisedFrom, raisedTo, -3.5 - 13 + i * 3.7, 0.12, 0.03, lineMat, 2);
    // Pillars where the deck is high.
    const pil = [];
    for (let s = raisedFrom; s < raisedTo; s += 34) {
      const r = route.at(s);
      if (r.y < 4) continue;
      for (const lat of [-12, 5]) pil.push([r.x - r.fz * lat, r.y, r.z + r.fx * lat]);
    }
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 1.7, 1, 12), concrete, pil.length);
    const mm = new THREE.Matrix4();
    pil.forEach(([x, y, z], i) => pm.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y / 2 - 0.8, z), _q.identity(), new THREE.Vector3(1, y, 1))));
    pm.frustumCulled = false;
    scene.add(pm);
  }

  /* --- the tunnel: walls, a ceiling, rings of cyan, purple and white LED --- */
  {
    const t0 = RS["tunnel-in"];
    const t1 = RS.approach;
    const wall = new THREE.MeshStandardMaterial({ color: blend("ink", "moon", 0.12), roughness: 0.22, metalness: 0.2, envMapIntensity: 1.2, side: THREE.DoubleSide });
    // Walls and ceiling as ribbons swept along the route.
    const sweep = (fn, mat) => {
      const verts = [];
      const ind = [];
      let row = 0;
      for (let s = t0; s <= t1; s += 2) {
        const r = route.at(s);
        const pts = fn();
        for (const [lat, y] of pts) verts.push(r.x - r.fz * lat, r.y + y, r.z + r.fx * lat);
        const m = pts.length;
        if (row) for (let k = 0; k < m - 1; k += 1) ind.push((row - 1) * m + k, row * m + k, (row - 1) * m + k + 1, (row - 1) * m + k + 1, row * m + k, row * m + k + 1);
        row += 1;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(ind);
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, mat));
    };
    sweep(() => [[-7, 0], [-7.2, 4.5], [-6, 6.4], [6, 6.4], [7.2, 4.5], [7, 0]], wall);
    const ringN = Math.floor((t1 - t0) / 7);
    const bars = [];
    for (let i = 0; i < ringN; i += 1) {
      const s = t0 + 4 + i * 7;
      const c = [col("cyan"), col("violet"), col("sclera")][i % 3].clone().multiplyScalar(3.2);
      bars.push([s, c]);
    }
    const ringGeo = merge([
      xf(new THREE.BoxGeometry(11.4, 0.12, 0.35), [0, 6.3, 0]),
      xf(new THREE.BoxGeometry(0.12, 2.6, 0.35), [-6.95, 4.2, 0], [0, 0, -0.3]),
      xf(new THREE.BoxGeometry(0.12, 2.6, 0.35), [6.95, 4.2, 0], [0, 0, 0.3]),
    ]);
    const rings = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), bars.length);
    const mm = new THREE.Matrix4();
    bars.forEach(([s, c], i) => {
      const r = route.at(s);
      rings.setMatrixAt(i, mm.compose(new THREE.Vector3(r.x, r.y, r.z), _q.setFromAxisAngle(UP, Math.atan2(r.fx, r.fz)), new THREE.Vector3(1, 1, 1)));
      rings.setColorAt(i, c);
    });
    rings.frustumCulled = false;
    scene.add(rings);
    // Low amber guide lines on both walls.
    for (const sd of [-1, 1]) ribbon(t0, t1, sd * 6.98, 0.05, 0.9, new THREE.MeshBasicMaterial({ color: col("practical").multiplyScalar(1.8) }), 2);
    // The portal: a block of the city over the mouth, outlined in light.
    const r = route.at(t0);
    const portal = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(70, 46, 30), windowsMaterial(11));
    block.position.set(0, 6.5 + 23, -15);
    portal.add(block);
    for (const [w, h, x, y] of [
      [15, 0.4, 0, 6.6],
      [0.4, 6.6, -7.4, 3.3],
      [0.4, 6.6, 7.4, 3.3],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), new THREE.MeshBasicMaterial({ color: col("cyan").multiplyScalar(3) }));
      m.position.set(x, y, 0.2);
      portal.add(m);
    }
    portal.position.set(r.x, 0, r.z);
    portal.rotation.y = Math.atan2(r.fx, r.fz) + Math.PI;
    scene.add(portal);
  }

  /* --- the towers: lit windows drawn in the shader from world position --- */
  function windowsMaterial(seed) {
    const m = new THREE.MeshStandardMaterial({ color: blend("ink", "sky", 0.5).multiplyScalar(0.55), roughness: 0.2, metalness: 0.6, envMapIntensity: 0.9 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = `varying vec3 vW;\nvarying vec3 vN;\n${sh.vertexShader}`.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n vec4 wpos = modelMatrix * vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wpos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);\n #endif\n vW = wpos.xyz;\n vN = normalize(mat3(modelMatrix) * objectNormal);\n #ifdef USE_INSTANCING\n vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n #endif`);
      sh.fragmentShader = `varying vec3 vW;\nvarying vec3 vN;\nfloat h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }\n${sh.fragmentShader}`.replace(
        "vec3 totalEmissiveRadiance = emissive;",
        `vec3 totalEmissiveRadiance = emissive;
        if (abs(vN.y) < 0.5) {
          float along = abs(vN.x) > 0.5 ? vW.z : vW.x;
          vec2 cell = vec2(floor(along / 1.7), floor(vW.y / 3.4));
          vec2 f = vec2(fract(along / 1.7), fract(vW.y / 3.4));
          float win = step(0.1, f.x) * step(f.x, 0.9) * step(0.22, f.y) * step(f.y, 0.86);
          // Each building has its own share of lit rooms; lit rooms come in runs along a floor.
          float bld = h21(floor(vec2(vW.x, vW.z) / 40.0) + ${seed}.0);
          float run = h21(vec2(floor(cell.x / (2.0 + floor(h21(cell.yy) * 4.0))), cell.y) + ${seed}.0);
          float lit = step(mix(0.55, 0.88, bld), run);
          float hue = h21(cell * 1.7 + 3.0);
          vec3 warm = vec3(1.0, 0.72, 0.42);
          vec3 cool = vec3(0.55, 0.8, 1.0);
          vec3 c = mix(warm, cool, step(0.65, hue)) * (0.35 + 0.65 * h21(cell + 9.0));
          totalEmissiveRadiance += c * win * lit * 0.85 * step(4.0, vW.y);
        } else if (vN.y > 0.5) {
          totalEmissiveRadiance += vec3(1.0, 0.05, 0.05) * step(0.985, h21(floor(vW.xz / 6.0))) * 3.0;
        }`,
      );
    };
    m.customProgramCacheKey = () => `windows${seed}`;
    return m;
  }
  const xsAll = route.xs;
  const zsAll = route.zs;
  const bx0 = Math.min(...xsAll) - 900;
  const bx1 = Math.max(...xsAll) + 900;
  const bz0 = Math.min(...zsAll) - 900;
  const bz1 = Math.max(...zsAll) + 900;
  const towers = [];
  const plazaC = { x: (driftC.a.x + driftC.b.x) / 2, z: (driftC.a.z + driftC.b.z) / 2 };
  const endP = route.at(route.length);
  const hill = { x: endP.x, z: endP.z, r: 150 };
  const downtown = route.at(RS.highway + 500);
  for (let gx = bx0; gx < bx1; gx += 64)
    for (let gz = bz0; gz < bz1; gz += 64) {
      const cx = gx + 32;
      const cz = gz + 32;
      if (Math.hypot(cx - hill.x, cz - hill.z) < hill.r + 40) continue;
      const parts = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < parts; k += 1) {
        const w = 14 + rand() * 22;
        const d = 14 + rand() * 22;
        const x = cx + (rand() - 0.5) * (46 - w);
        const z = cz + (rand() - 0.5) * (46 - d);
        const nr = near(x, z);
        const r = route.at(nr.s);
        const L = layout(r.kind);
        const clear = r.kind.startsWith("tunnel") ? 9 : L.half + Math.abs(L.centre) + L.walk + 4;
        if (nr.d < clear + Math.max(w, d) * 0.6) continue;
        if (Math.hypot(x - plazaC.x, z - plazaC.z) < 70) continue;
        const dd = Math.hypot(x - downtown.x, z - downtown.z);
        let h = 18 + rand() * 40 + 230 * Math.exp(-((dd / 700) ** 2)) * rand() + (rand() < 0.06 ? 120 : 0);
        if (r.kind.startsWith("tunnel") && nr.d < 40) h = 30 + rand() * 30;
        towers.push([x, z, w, d, h]);
      }
    }
  {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(geo, windowsMaterial(3), towers.length);
    const mm = new THREE.Matrix4();
    towers.forEach(([x, z, w, d, h], i) => mesh.setMatrixAt(i, mm.compose(new THREE.Vector3(x, 0, z), _q.identity(), new THREE.Vector3(w, h, d))));
    mesh.frustumCulled = false;
    scene.add(mesh);
    // Over the tunnel, the city carries on: blocks on its roof.
    const deckBlocks = [];
    for (let s = RS["tunnel-in"] + 40; s < RS.approach - 30; s += 46) {
      const r = route.at(s);
      deckBlocks.push([r.x, r.z, 30 + rand() * 12, 36, 20 + rand() * 40, Math.atan2(r.fx, r.fz)]);
    }
    const dm = new THREE.InstancedMesh(geo, windowsMaterial(5), deckBlocks.length);
    deckBlocks.forEach(([x, z, w, d, h, ry], i) => dm.setMatrixAt(i, mm.compose(new THREE.Vector3(x, 7, z), _q.setFromAxisAngle(UP, ry), new THREE.Vector3(d, h, w))));
    dm.frustumCulled = false;
    scene.add(dm);
  }

  /* --- LED billboards, neon blade signs, shopfronts: abstract animated graphics, no text --- */
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uC: { value: NEON.map((c) => c.clone()) } },
    vertexShader: `attribute vec3 aInfo; varying vec2 vUv; varying vec3 vInfo;
      void main(){ vUv = uv; vInfo = aInfo; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uC[6]; varying vec2 vUv; varying vec3 vInfo;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      vec3 pick(float k){ int i = int(mod(floor(k * 6.0), 6.0)); return uC[i]; }
      void main(){
        float seed = vInfo.x; float kind = vInfo.y; float t = uTime * (0.4 + h(seed) * 0.8) + seed * 7.0;
        vec3 a = pick(h(seed + 1.0)); vec3 b = pick(h(seed + 2.0));
        vec2 p = vUv;
        vec3 c;
        float edge = step(0.035, p.x) * step(p.x, 0.965) * step(0.05, p.y) * step(p.y, 0.95);
        if (kind < 0.5) {
          // A screen: drifting gradient bands and a soft shape, changing every few seconds.
          float scene = floor(t / 3.0);
          float m = h(seed + scene);
          float bands = 0.5 + 0.5 * sin((p.x * 3.0 + p.y * 2.0) * 6.2831 * (0.5 + m) - t * 2.0);
          float blob = smoothstep(0.42, 0.0, length((p - vec2(0.3 + 0.4 * h(scene + seed), 0.5)) * vec2(1.6, 1.0)));
          c = mix(a, b, bands) * (0.25 + 0.75 * bands) + mix(b, vec3(1.0), 0.4) * blob * 1.2;
          c *= 0.9 + 0.1 * sin(p.y * 400.0);
          c *= edge * 2.2;
        } else if (kind < 1.5) {
          // A neon blade sign: a bright frame round glyph-like shapes (circles, chevrons, bars).
          float frame = (1.0 - edge) + (step(0.08, p.x) * step(p.x, 0.92) * step(0.06, p.y) * step(p.y, 0.94) - step(0.11, p.x) * step(p.x, 0.89) * step(0.08, p.y) * step(p.y, 0.92));
          float row = floor(p.y * 6.0);
          float g1 = step(0.5, h(row + seed * 3.0)) * step(0.25, fract(p.y * 6.0)) * step(fract(p.y * 6.0), 0.75) * step(0.25, p.x) * step(p.x, 0.75);
          float g2 = smoothstep(0.16, 0.12, length(vec2(p.x - 0.5, fract(p.y * 6.0) - 0.5) * vec2(1.0, 2.0)));
          float glyph = mix(g1, g2, step(0.5, h(row + seed)));
          float flick = step(0.04, fract(sin(floor(uTime * 12.0) + seed) * 91.3)) ;
          c = a * frame * 3.0 + b * glyph * 2.2 * (h(seed + 5.0) > 0.15 ? 1.0 : flick);
        } else {
          // A shopfront: a warm glow with silhouettes of shelves.
          float shelf = step(0.5, fract(p.y * 4.0)) * 0.3 + 0.7;
          c = mix(vec3(1.0, 0.75, 0.45), a, 0.35) * shelf * 1.4 * (0.6 + 0.4 * step(0.5, fract(p.x * 8.0 + seed)));
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const screens = [];
  for (const [x, z, w, d, h] of towers) {
    const nr = near(x, z);
    if (nr.d > 95) continue;
    const r = route.at(nr.s);
    // The face toward the route.
    const dx = r.x - x;
    const dz = r.z - z;
    const alongX = Math.abs(dx) / w > Math.abs(dz) / d;
    const nx = alongX ? Math.sign(dx) : 0;
    const nz = alongX ? 0 : Math.sign(dz);
    const faceW = alongX ? d : w;
    const fx = x + nx * (w / 2 + 0.25);
    const fz = z + nz * (d / 2 + 0.25);
    const ry = Math.atan2(nx, nz);
    if (rand() < 0.75 && h > 22) {
      const sw = Math.min(faceW * 0.8, 10 + rand() * 18);
      const sh = sw * (0.45 + rand() * 0.25);
      screens.push([fx, 8 + rand() * Math.min(60, h - sh - 8) + sh / 2, fz, ry, sw, sh, rand() * 100, 0]);
    }
    if (rand() < 0.8) screens.push([fx + nz * (rand() - 0.5) * faceW * 0.6, 2.2, fz - nx * (rand() - 0.5) * faceW * 0.6, ry, Math.min(faceW * 0.7, 12), 3.6, rand() * 100, 2]);
    if (r.kind === "boulevard" || r.kind === "approach" || r.kind === "street")
      for (let k = 0; k < 2; k += 1) {
        const off = (rand() - 0.5) * faceW * 0.8;
        // Blade signs stand out from the facade, edge-on to the street.
        screens.push([fx + nx * 1.2 + nz * off, 7 + rand() * 9, fz + nz * 1.2 - nx * off, ry + Math.PI / 2, 1.6, 5 + rand() * 4, rand() * 100, 1]);
      }
  }
  {
    const g = new THREE.PlaneGeometry(1, 1);
    const info = new Float32Array(screens.length * 3);
    screens.forEach((sc, i) => info.set([sc[6], sc[7], 0], i * 3));
    g.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 3));
    const mesh = new THREE.InstancedMesh(g, screenMat, screens.length);
    const mm = new THREE.Matrix4();
    screens.forEach(([x, y, z, ry, w, h], i) => mesh.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), new THREE.Vector3(w, h, 1))));
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* --- street furniture: lamps (with pools of light on the road), palms, signals, steam --- */
  const glowTex = drawn(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const lampPos = [];
  for (let s = 6; s < RS.ramp + 60; s += 32) {
    const r = route.at(s);
    if (r.kind.startsWith("tunnel") || r.kind === "drift") continue;
    const L = layout(r.kind);
    for (const sd of [-1, 1]) {
      const lat = L.centre + sd * (L.half + 1.2);
      lampPos.push([r.x - r.fz * lat, r.z + r.fx * lat, Math.atan2(r.fx, r.fz) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), sd, lat]);
    }
  }
  {
    const pole = new THREE.MeshStandardMaterial({ color: 0x23242b, roughness: 0.4, metalness: 0.7 });
    const pm = new THREE.InstancedMesh(merge([xf(new THREE.CylinderGeometry(0.1, 0.14, 9, 8), [0, 4.5, 0]), xf(new THREE.BoxGeometry(0.15, 0.15, 2.4), [0, 9, 1.1])]), pole, lampPos.length);
    const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.12, 1.1), new THREE.MeshBasicMaterial({ color: blend("practical", "sclera", 0.3).multiplyScalar(3) }), lampPos.length);
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, color: blend("practical", "sclera", 0.2).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), lampPos.length);
    const mm = new THREE.Matrix4();
    lampPos.forEach(([x, z, ry], i) => {
      pm.setMatrixAt(i, mm.compose(new THREE.Vector3(x, 0, z), _q.setFromAxisAngle(UP, ry), new THREE.Vector3(1, 1, 1)));
      const hx = x + Math.sin(ry) * 2.2;
      const hz = z + Math.cos(ry) * 2.2;
      hm.setMatrixAt(i, mm.compose(new THREE.Vector3(hx, 8.9, hz), _q.setFromAxisAngle(UP, ry), new THREE.Vector3(1, 1, 1)));
      pools.setMatrixAt(i, mm.compose(new THREE.Vector3(hx, 0.03, hz), _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)), new THREE.Vector3(16, 16, 1)));
    });
    for (const m of [pm, hm, pools]) {
      m.frustumCulled = false;
      scene.add(m);
    }
  }
  {
    // Palms down the boulevard's median and pavements.
    const trunkParts = [];
    for (let i = 0; i < 10; i += 1) {
      const u = i / 10;
      trunkParts.push(xf(new THREE.CylinderGeometry(0.22 - u * 0.06, 0.26 - u * 0.06, 1.15, 7), [u * u * 0.6, 0.55 + i * 1.1, 0], [0, 0, -u * 0.1]));
    }
    const fronds = [];
    for (let i = 0; i < 9; i += 1) {
      const g = new THREE.PlaneGeometry(0.7, 4.2, 1, 6);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k += 1) {
        const y = p.getY(k) + 2.1;
        p.setXYZ(k, p.getX(k), 0.7 * y - 0.22 * y * y, y);
      }
      xf(g, [0, 0, 0], [0, (i / 9) * Math.PI * 2, 0]);
      fronds.push(g);
    }
    const palmsAt = [];
    for (let s = 20; s < RS["tunnel-in"] - 30; s += 22) {
      const r = route.at(s);
      for (const lat of [-5.25, 5.25 + 6.5, -5.25 - 16 - 2.5]) palmsAt.push([r.x - r.fz * lat, r.z + r.fx * lat, rand() * 6.28, 11 + rand() * 4]);
    }
    const trunk = new THREE.InstancedMesh(merge(trunkParts), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 }), palmsAt.length);
    const crown = new THREE.InstancedMesh(merge(fronds), new THREE.MeshStandardMaterial({ color: 0x1d3a24, roughness: 0.7, side: THREE.DoubleSide, emissive: blend("violet", "cyan", 0.5), emissiveIntensity: 0.06 }), palmsAt.length);
    const uplight = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, color: col("cyan").multiplyScalar(0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), palmsAt.length);
    const mm = new THREE.Matrix4();
    palmsAt.forEach(([x, z, ry, h], i) => {
      const k = h / 11;
      trunk.setMatrixAt(i, mm.compose(new THREE.Vector3(x, 0, z), _q.setFromAxisAngle(UP, ry), new THREE.Vector3(1, k, 1)));
      crown.setMatrixAt(i, mm.compose(new THREE.Vector3(x + Math.cos(ry) * 0.6, 11 * k, z - Math.sin(ry) * 0.6), _q.setFromAxisAngle(UP, ry * 3), new THREE.Vector3(1, 1, 1)));
      uplight.setMatrixAt(i, mm.compose(new THREE.Vector3(x, 0.04, z), _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)), new THREE.Vector3(5, 5, 1)));
    });
    for (const m of [trunk, crown, uplight]) {
      m.frustumCulled = false;
      scene.add(m);
    }
  }
  // Steam from vents: near the start and round the plaza.
  const steamTex = drawn(128, 128, (g, w, h) => {
    const r = mulberry32(9);
    for (let i = 0; i < 12; i += 1) {
      const x = w * (0.3 + r() * 0.4);
      const y = h * (0.3 + r() * 0.4);
      const rr = w * (0.18 + r() * 0.2);
      const grad = g.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, "rgba(255,255,255,0.4)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
  const steam = [];
  const vents = [routeWorld(9, -4.2, 0), routeWorld(16, 6.5, 0), routeWorld(-6, -9, 0), routeWorld(RS.drift + 10, 16, 0), routeWorld(RS.drift - 12, -15, 0)];
  vents.forEach(([x, , z], v) => {
    for (let k = 0; k < 14; k += 1) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: blend("moon", "violet", 0.3), transparent: true, depthWrite: false, opacity: 0 }));
      scene.add(sp);
      steam.push({ sp, x, z, ph: k / 14, v });
    }
  });

  /* --- the elevated highway's structures: gantries and a skybridge --- */
  {
    const steel = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.4, metalness: 0.8 });
    const lightBar = new THREE.MeshBasicMaterial({ color: blend("sclera", "cyan", 0.3).multiplyScalar(3) });
    for (let s = RS.deck + 40; s < RS.exit; s += 260) {
      const r = route.at(s);
      const g = new THREE.Group();
      for (const lat of [-17, 10]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), steel);
        m.position.set(-lat, 4, 0);
        g.add(m);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(28, 0.9, 0.8), steel);
      beam.position.set(3.5, 8, 0);
      g.add(beam);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(26, 0.15, 0.3), lightBar);
      bar.position.set(3.5, 7.45, 0);
      g.add(bar);
      g.position.set(r.x, r.y, r.z);
      g.rotation.y = Math.atan2(r.fx, r.fz);
      scene.add(g);
    }
    // The skybridge: a glass bridge between two towers, over the highway.
    const sb = sAt(81);
    const r = route.at(sb);
    const g = new THREE.Group();
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.6 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(120, 7, 12), glass);
    bridge.position.set(0, r.y + 16, 0);
    g.add(bridge);
    for (const y of [r.y + 12.6, r.y + 19.4]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(120, 0.25, 12.2), new THREE.MeshBasicMaterial({ color: col("violet").multiplyScalar(3) }));
      strip.position.set(0, y, 0);
      g.add(strip);
    }
    for (const x of [-70, 70]) {
      const tw = new THREE.Mesh(new THREE.BoxGeometry(28, 140, 28), windowsMaterial(17));
      tw.position.set(x, 70, 0);
      g.add(tw);
    }
    g.position.set(r.x, 0, r.z);
    g.rotation.y = Math.atan2(r.fx, r.fz) + Math.PI / 2;
    scene.add(g);
  }

  /* --- the overlook: a hill, a terrace, a glass railing toward the city --- */
  {
    const hg = new THREE.CircleGeometry(hill.r + 60, 64, 0, Math.PI * 2);
    hg.rotateX(-Math.PI / 2);
    const p = hg.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      p.setY(i, 37.6 * (1 - smoothstep(hill.r * 0.55, hill.r + 60, r)) + (fbm(x / 30, z / 30, 3) - 0.5) * 4 * smoothstep(20, 80, r));
    }
    hg.computeVertexNormals();
    const hm = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.95 }));
    hm.position.set(hill.x, 0, hill.z);
    scene.add(hm);
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 0.6, 48), new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.6 }));
    terrace.position.set(stopPose.x, stopPose.y - 0.3, stopPose.z);
    scene.add(terrace);
    // The railing ahead of the car, curving round the edge.
    const fx = Math.sin(stopPose.yaw);
    const fz = Math.cos(stopPose.yaw);
    const rail = new THREE.Group();
    const railGlass = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
    const railTop = new THREE.MeshBasicMaterial({ color: col("cyan").multiplyScalar(2) });
    for (let k = -8; k <= 8; k += 1) {
      const a = Math.atan2(fx, fz) + k * 0.09;
      const x = stopPose.x + Math.sin(a) * 30;
      const z = stopPose.z + Math.cos(a) * 30;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.05), railGlass);
      pane.position.set(x, stopPose.y + 0.55, z);
      pane.rotation.y = a;
      rail.add(pane);
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 0.08), railTop);
      top.position.set(x, stopPose.y + 1.12, z);
      top.rotation.y = a;
      rail.add(top);
    }
    scene.add(rail);
  }

  /* --- traffic: same-direction and oncoming, with light trails --- */
  const lanes = [];
  const lane = (s0, s1, lat, dir, n, v0) => lanes.push({ s0, s1, lat, dir, n, v0 });
  lane(30, RS["tunnel-in"] - 30, -3.5, 1, 9, 22);
  lane(30, RS["tunnel-in"] - 30, 3.5, 1, 9, 19);
  lane(30, RS["tunnel-in"] - 30, 7, 1, 8, 16);
  for (const lat of [-8.75, -12.25, -15.75, -19.25]) lane(10, RS["tunnel-in"] + 0, lat - 0, -1, 10, 20 + rand() * 8);
  lane(RS["tunnel-in"] + 30, RS.approach - 30, -3.5, 1, 4, 28);
  lane(RS["tunnel-in"] + 30, RS.approach - 30, 3.5, 1, 4, 24);
  for (const lat of [-3.5 - 3.5, 3.5, 7]) lane(RS.deck, RS.exit, lat, 1, 16, 26 + rand() * 8);
  for (const lat of [-12, -15.5, -19, -22.5]) lane(RS.deck, RS.exit, lat, -1, 18, 26 + rand() * 6);
  const traffic = [];
  for (const L of lanes) for (let i = 0; i < L.n; i += 1) traffic.push({ L, s0: L.s0 + ((i + rand() * 0.5) / L.n) * (L.s1 - L.s0), v: L.v0 * (0.9 + rand() * 0.2), hue: rand() });
  const tBodyGeo = merge([xf(new THREE.BoxGeometry(1.85, 0.7, 4.5), [0, 0.6, 0]), xf(new THREE.BoxGeometry(1.6, 0.55, 2.2), [0, 1.2, -0.25])]);
  const tBodies = new THREE.InstancedMesh(tBodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }), traffic.length);
  const tHead = new THREE.InstancedMesh(merge([xf(new THREE.BoxGeometry(0.4, 0.12, 0.05), [0.6, 0.7, 2.26]), xf(new THREE.BoxGeometry(0.4, 0.12, 0.05), [-0.6, 0.7, 2.26])]), new THREE.MeshBasicMaterial({ color: blend("sclera", "moon", 0.4).multiplyScalar(4) }), traffic.length);
  const tTail = new THREE.InstancedMesh(merge([xf(new THREE.BoxGeometry(0.5, 0.1, 0.05), [0.62, 0.78, -2.26]), xf(new THREE.BoxGeometry(0.5, 0.1, 0.05), [-0.62, 0.78, -2.26])]), new THREE.MeshBasicMaterial({ color: col("accent").multiplyScalar(4) }), traffic.length);
  const trails = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), traffic.length * 2);
  traffic.forEach((c, i) => {
    tBodies.setColorAt(i, new THREE.Color().setHSL(c.hue, 0.25, 0.08 + (c.hue > 0.8 ? 0.4 : 0.05)));
    trails.setColorAt(i * 2, col("accent").multiplyScalar(1.4));
    trails.setColorAt(i * 2 + 1, blend("sclera", "moon", 0.4).multiplyScalar(1.2));
  });
  for (const m of [tBodies, tHead, tTail, trails]) {
    m.frustumCulled = false;
    scene.add(m);
  }

  /* --- rain: streaks round the camera, stretched by the camera's own motion --- */
  const RAIN = 6000;
  const rainPos = new Float32Array(RAIN * 6);
  const rainBase = Array.from({ length: RAIN }, () => [rand() * 40 - 20, rand() * 24 - 6, rand() * 40 - 20]);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: blend("moon", "cyan", 0.4).multiplyScalar(0.55), transparent: true, opacity: 0.45, depthWrite: false }));
  rain.frustumCulled = false;
  scene.add(rain);

  /* --- the car --- */
  const car = buildCar(PAINT, col, blend);
  scene.add(car.group);

  /* --- tyre smoke, spray, flames --- */
  const smokeTex = steamTex;
  const smoke = [];
  const emitters = [];
  for (let te = T.launch; te < T.launch + 1.4; te += 0.05) emitters.push(te);
  for (let te = T.driftIn - 0.5; te < T.driftOut + 0.8; te += 0.035) emitters.push(te);
  emitters.forEach((te, k) => {
    for (const side of [-1, 1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: blend("moon", "violet", 0.2 + (k % 5) * 0.08), transparent: true, depthWrite: false, opacity: 0 }));
      scene.add(sp);
      smoke.push({ sp, te, side, j: rand() });
    }
  });
  const SPRAY = 3000;
  const sprayPos = new Float32Array(SPRAY * 3);
  const sprayInfo = Array.from({ length: SPRAY }, (_, i) => ({ w: i % 4, ph: rand(), vx: (rand() - 0.5) * 2.4, vy: 0.8 + rand() * 2.6, back: 0.15 + rand() * 0.25 }));
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const dropTex = drawn(32, 32, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: blend("moon", "cyan", 0.3).multiplyScalar(0.7), size: 0.022, map: dropTex, transparent: true, opacity: 0.6, depthWrite: false }));
  spray.frustumCulled = false;
  scene.add(spray);
  const flameTex = drawn(64, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h * 0.75, 2, w / 2, h * 0.6, h * 0.6);
    grad.addColorStop(0, "rgba(220,240,255,1)");
    grad.addColorStop(0.25, "rgba(90,150,255,0.9)");
    grad.addColorStop(0.55, "rgba(255,140,40,0.6)");
    grad.addColorStop(1, "rgba(255,60,20,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const flames = [0, 1, 2, 3].map(() => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(sp);
    return sp;
  });
  const flameEvents = DRIVE.events.map((e) => ({ t: e.t, dur: e.type === "up" ? 0.16 : 0.28, k: e.type === "up" ? 1 : 0.7 }));

  /* --- post: reflections on the paint, motion blur that spares the car, bloom --- */
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.5, 2000, cubeRT);
  car.paint.envMap = cubeRT.texture;
  car.paint.needsUpdate = true;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType), samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const maskRT = new THREE.WebGLRenderTarget(480, 270);
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blur = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tMask: { value: maskRT.texture }, uInvProj: { value: new THREE.Matrix4() }, uInvView: { value: new THREE.Matrix4() }, uPrev: { value: new THREE.Matrix4() }, uAmount: { value: 0.6 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tMask;
      uniform mat4 uInvProj; uniform mat4 uInvView; uniform mat4 uPrev; uniform float uAmount; varying vec2 vUv;
      void main(){
        float d = texture2D(tDepth, vUv).x;
        vec4 ndc = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        vec4 view = uInvProj * ndc; view /= view.w;
        vec4 world = uInvView * view;
        vec4 prev = uPrev * world;
        vec2 puv = prev.xy / prev.w * 0.5 + 0.5;
        vec2 vel = (vUv - puv) * uAmount;
        // The car moves with the camera: keep it sharp.
        float m = texture2D(tMask, vUv).r;
        vel *= 1.0 - smoothstep(0.1, 0.6, m);
        float len = length(vel);
        if (len > 0.06) vel *= 0.06 / len;
        vec4 c = vec4(0.0);
        for (int i = 0; i < 12; i++) {
          float k = float(i) / 11.0 - 0.5;
          c += texture2D(tDiffuse, vUv + vel * k);
        }
        gl_FragColor = c / 12.0;
      }`,
  });
  blur.uniforms.tMask.value = maskRT.texture;
  composer.addPass(blur);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* --- one frame --- */
  const prevCam = new THREE.PerspectiveCamera();
  function placeCamera(cam, t) {
    const c = cameraAt(t);
    cam.position.copy(c.P);
    cam.lookAt(c.L);
    cam.fov = c.fov;
    cam.aspect = W / H;
    cam.near = 0.05;
    cam.far = 6000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
  function render(t) {
    screenMat.uniforms.uTime.value = t;
    placeCamera(camera, t);
    placeCamera(prevCam, t - 1 / 24);
    sky.position.copy(camera.position);

    // The car.
    const pose = carPose(t);
    car.update(t, pose);

    // Traffic, and its trails.
    const mm = new THREE.Matrix4();
    const cp = camera.position;
    traffic.forEach((c, i) => {
      const span = c.L.s1 - c.L.s0;
      const s = c.L.s0 + ((((c.s0 - c.L.s0 + c.L.dir * c.v * t) % span) + span) % span);
      const r = route.at(s);
      const x = r.x - r.fz * c.L.lat;
      const z = r.z + r.fx * c.L.lat;
      const yaw = Math.atan2(r.fx, r.fz) + (c.L.dir < 0 ? Math.PI : 0);
      mm.compose(new THREE.Vector3(x, r.y, z), _q.setFromAxisAngle(UP, yaw), new THREE.Vector3(1, 1, 1));
      tBodies.setMatrixAt(i, mm);
      tHead.setMatrixAt(i, mm);
      tTail.setMatrixAt(i, mm);
      // A light trail, as a long exposure would draw it, for cars away from the lens.
      const far = smoothstep(25, 60, Math.hypot(x - cp.x, z - cp.z));
      const len = far * clamp(c.v * 0.35, 2, 10);
      for (const k of [0, 1]) {
        const back = k === 0 ? -1 : 1;
        const off = back * (2.3 + len / 2);
        const tm = new THREE.Matrix4().compose(new THREE.Vector3(x + Math.sin(yaw) * off, r.y + 0.75, z + Math.cos(yaw) * off), _q.setFromEuler(_e.set(-Math.PI / 2, 0, -yaw, "YXZ")), new THREE.Vector3(1.4, Math.max(0.001, len), 1));
        trails.setMatrixAt(i * 2 + k, far > 0.01 ? tm : new THREE.Matrix4().makeScale(0, 0, 0));
      }
    });
    for (const m of [tBodies, tHead, tTail, trails]) m.instanceMatrix.needsUpdate = true;

    // Rain, falling and streaking by the camera's speed.
    const cv = new THREE.Vector3().subVectors(camera.position, prevCam.position).multiplyScalar(24);
    const fall = new THREE.Vector3(1.2, -9.5, 0.6);
    const streak = fall.clone().sub(cv).multiplyScalar(1 / 48);
    const wrap = (v, s) => ((((v + s / 2) % s) + s) % s) - s / 2;
    for (let i = 0; i < RAIN; i += 1) {
      const [bx, by, bz] = rainBase[i];
      const x = cp.x + wrap(bx + fall.x * t - cp.x, 40);
      const y = cp.y + wrap(by + fall.y * t - cp.y, 24);
      const z = cp.z + wrap(bz + fall.z * t - cp.z, 40);
      rainPos.set([x, y, z, x - streak.x, y - streak.y, z - streak.z], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;

    // Steam.
    for (const s of steam) {
      const u = (s.ph + t * 0.12 + s.v * 0.17) % 1;
      s.sp.position.set(s.x + u * 2 + Math.sin(t + s.v) * 0.3, 0.3 + u * 7, s.z + u * 0.6);
      const sz = 1.2 + u * 5;
      s.sp.scale.set(sz, sz, 1);
      s.sp.material.opacity = 0.35 * Math.sin(u * Math.PI);
    }

    // Tyre smoke from the rear wheels.
    for (const p of smoke) {
      const age = t - p.te;
      if (age < 0 || age > 3.2) {
        p.sp.visible = false;
        continue;
      }
      const ep = carPose(p.te);
      const w = local(p.te, p.side * 0.86, 0.3, -1.31, ep);
      p.sp.visible = true;
      p.sp.position.set(w.x + (p.j - 0.5) * age * 2 + age * 0.6, w.y + 0.2 + age * 0.7, w.z + (p.j - 0.3) * age * 1.5);
      const sz = 0.8 + age * 2.6;
      p.sp.scale.set(sz, sz, 1);
      // Thin where the camera passes through the cloud, so the orbit never whites out.
      const near = smoothstep(1.2, 5, p.sp.position.distanceTo(camera.position));
      p.sp.material.opacity = 0.24 * near * smoothstep(0, 0.15, age) * (1 - smoothstep(0.8, 3.2, age));
    }
    // Spray off all four tyres.
    const wheelsL = [
      [0.84, -0.0, 1.31],
      [-0.84, 0, 1.31],
      [0.86, 0, -1.31],
      [-0.86, 0, -1.31],
    ];
    for (let i = 0; i < SPRAY; i += 1) {
      const sInfo = sprayInfo[i];
      const life = 0.6;
      const age = (sInfo.ph * life + t) % life;
      const te = t - age;
      const v = speedAt(te);
      if (v < 4 || t < T.launch) {
        sprayPos.set([0, -100, 0], i * 3);
        continue;
      }
      const ep = carPose(te);
      const [lx, , lz] = wheelsL[sInfo.w];
      const w = local(te, lx, 0.05, lz - 0.3, ep);
      const fx = Math.sin(ep.yaw);
      const fz = Math.cos(ep.yaw);
      const vx = fx * v * (1 - sInfo.back) + fz * sInfo.vx;
      const vz = fz * v * (1 - sInfo.back) - fx * sInfo.vx;
      sprayPos.set([w.x + vx * age, w.y + sInfo.vy * age * Math.min(1, v / 30) - 4.9 * age * age, w.z + vz * age], i * 3);
    }
    sprayGeo.attributes.position.needsUpdate = true;
    // Flames on the shifts.
    const fl = flameEvents.find((e) => t >= e.t && t < e.t + e.dur);
    flames.forEach((sp, k) => {
      const on = !!fl;
      sp.visible = on;
      if (!on) return;
      const tip = local(t, [-0.12, 0.12, -0.3, 0.3][k], 0.33, -2.45, pose);
      const back = local(t, [-0.12, 0.12, -0.3, 0.3][k], 0.33, -2.95, pose);
      sp.position.copy(tip).lerp(back, 0.5);
      const fk = fl.k * (0.7 + 0.3 * Math.sin(t * 90 + k));
      sp.scale.set(0.32 * fk, 0.75 * fk, 1);
    });

    // Exposure: the tunnel exit floods the frame with light.
    renderer.toneMappingExposure = 1.0 + 0.9 * Math.exp(-(((t - T.tunnelOut) / 0.45) ** 2));

    // The paint's reflections, captured where the car is.
    car.group.visible = false;
    reflector.visible = false;
    cubeCam.position.set(pose.x, pose.y + 0.9, pose.z);
    cubeCam.update(renderer, scene);
    car.group.visible = true;
    reflector.visible = true;

    // The car mask, for the motion blur.
    const bgSave = scene.background;
    scene.overrideMaterial = maskMat;
    const vis = [];
    scene.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) {
        vis.push([o, o.visible]);
        if (!car.meshes.has(o)) o.visible = false;
      }
    });
    renderer.setRenderTarget(maskRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    for (const [o, v] of vis) o.visible = v;
    scene.overrideMaterial = null;
    scene.background = bgSave;

    blur.uniforms.tDepth.value = composer.readBuffer.depthTexture;
    blur.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
    blur.uniforms.uInvView.value.copy(camera.matrixWorld);
    blur.uniforms.uPrev.value.multiplyMatrices(prevCam.projectionMatrix, prevCam.matrixWorldInverse);
    // Less smear on the aerials, where the whole frame moves and the car is small.
    blur.uniforms.uAmount.value = 0.55 * (1 - 0.7 * (smoothstep(33.6, 34.2, t) * (1 - smoothstep(35.8, 36, t)) + smoothstep(69, 71, t) * (1 - smoothstep(79.5, 80.5, t))));
    composer.render();
  }
  return { render, canvas };
}

/* ---------------- the car ---------------- */

/**
 * An original widebody supercar at real proportions: a lofted body with flared arches, a dark
 * glass canopy, a carbon splitter, skirts, diffuser and wing, Y-shaped headlights and a full-width
 * light bar, 20-inch ten-spoke wheels with big brakes, quad exhausts, underglow, and a cockpit with
 * a driver, a lit dash, and paddle shifters.
 */
function buildCar(PAINT, col, blend) {
  const group = new THREE.Group();
  const meshes = new Set();
  const body = new THREE.Group();
  group.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: col("electric").multiplyScalar(0.55), metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
  const carbonTex = drawn(64, 64, (g, w, h) => {
    for (let y = 0; y < h; y += 8)
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = (x + y) % 16 ? "#202226" : "#141518";
        g.fillRect(x, y, 8, 8);
      }
  }, { repeat: true });
  carbonTex.repeat.set(8, 8);
  const carbon = new THREE.MeshStandardMaterial({ color: 0xffffff, map: carbonTex, roughness: 0.35, metalness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x04060a, roughness: 0.03, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.8, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.18, metalness: 1 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tailMat = new THREE.MeshBasicMaterial({ color: col("accent") });
  const add = (geo, mat, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    meshes.add(m);
    return m;
  };
  const Lh = CAR.length / 2;
  const wb = CAR.wheelbase / 2;
  // Body loft: stations along the length, a superellipse at each, arches cut round the wheels.
  const N = 56;
  const M = 36;
  const hw = (z) => {
    let w = 0.93 + 0.055 * (Math.exp(-(((z - wb) / 0.42) ** 2)) + Math.exp(-(((z + wb) / 0.45) ** 2)));
    if (z > 1.85) w *= 1 - ((z - 1.85) / 0.4) ** 2 * 0.3;
    if (z < -2.0) w *= 1 - ((-2.0 - z) / 0.25) ** 2 * 0.12;
    return w;
  };
  const topY = (z) => {
    if (z > 1.95) return mix(0.6, 0.52, (z - 1.95) / 0.3);
    if (z > 0.95) return mix(0.79, 0.6, (z - 0.95) / 1.0) ** 1.0;
    if (z > -1.25) return 0.8;
    return mix(0.95, 0.92, (-1.25 - z) / 1.0) + (z < -2.05 ? 0.04 * Math.sin(((z + 2.25) / 0.2) * Math.PI) : 0);
  };
  const botY = (z) => (z > 1.95 ? 0.11 : 0.14);
  const pos = [];
  const ind = [];
  for (let i = 0; i <= N; i += 1) {
    const z = -Lh + (i / N) * CAR.length;
    const w = hw(z);
    const yt = topY(z);
    const yb = botY(z);
    const mid = (yt + yb) / 2;
    const hh = (yt - yb) / 2;
    for (let j = 0; j < M; j += 1) {
      const a = (j / M) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      let x = w * Math.sign(c) * Math.abs(c) ** (2 / 5);
      let y = mid + hh * Math.sign(s) * Math.abs(s) ** (2 / 4.2);
      // Tumblehome above a crisp shoulder line; the lower body tucks under toward the sills.
      const hn = (y - mid) / hh;
      x *= 1 - 0.13 * smoothstep(0.45, 1, hn) - 0.06 * smoothstep(-0.4, -1, hn);
      // Arches over the wheels.
      for (const zw of [wb, -wb]) {
        const dz = z - zw;
        const ra = 0.42;
        if (Math.abs(dz) < ra && Math.abs(c) > 0.25) {
          const arch = WHEEL_R + Math.sqrt(ra * ra - dz * dz) * 0.95;
          if (y < arch) y = arch;
        }
      }
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < N; i += 1)
    for (let j = 0; j < M; j += 1) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + ((j + 1) % M);
      // Leave the cockpit open under the canopy.
      const open = [a, b, c, d].every((k) => pos[k * 3 + 1] > 0.7 && Math.abs(pos[k * 3]) < 0.72 && Math.abs(pos[k * 3 + 2] + 0.05) < 0.9);
      if (open) continue;
      ind.push(a, b, c, b, d, c);
    }
  // Caps at the nose and the tail.
  const capC = (i) => {
    const z = -Lh + (i / N) * CAR.length;
    pos.push(0, (topY(z) + botY(z)) / 2, z);
    return pos.length / 3 - 1;
  };
  const c0 = capC(0);
  const c1 = capC(N);
  for (let j = 0; j < M; j += 1) {
    ind.push(c0, (j + 1) % M, j);
    ind.push(c1, N * M + j, N * M + ((j + 1) % M));
  }
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  bodyGeo.setIndex(ind);
  bodyGeo.computeVertexNormals();
  add(bodyGeo, paint);
  // The inside of the shell, seen through the cockpit opening: a dark trim, and a floor and seats.
  add(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x060709, roughness: 0.8, side: THREE.BackSide }));
  // The canopy: a raked windscreen, a short roof, a fastback over the engine.
  {
    const cp = [];
    const ci = [];
    const NS = 30;
    const MS = 18;
    for (let i = 0; i <= NS; i += 1) {
      const z = mix(-1.3, 0.98, i / NS);
      let yr;
      if (z > 0.05) yr = mix(1.16, 0.8, smoothstep(0.05, 0.98, z) ** 0.9);
      else if (z > -0.45) yr = 1.17;
      else yr = mix(1.17, 0.95, smoothstep(-0.45, -1.3, z));
      const yb = topY(z) - 0.02;
      const wBase = 0.74 - 0.05 * Math.abs(z);
      const wTop = 0.5;
      for (let j = 0; j <= MS; j += 1) {
        const u = j / MS;
        const ang = mix(-Math.PI / 2, Math.PI / 2, u);
        const sx = Math.sin(ang);
        const up = Math.cos(ang);
        const y = yb + (yr - yb) * Math.abs(up) ** 0.6;
        const ww = mix(wBase, wTop, ((y - yb) / Math.max(0.01, yr - yb)) ** 1.5);
        cp.push(sx * ww, y, z);
      }
    }
    for (let i = 0; i < NS; i += 1)
      for (let j = 0; j < MS; j += 1) {
        const a = i * (MS + 1) + j;
        ci.push(a, a + 1, a + MS + 1, a + 1, a + MS + 2, a + MS + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
    g.setIndex(ci);
    g.computeVertexNormals();
    add(g, glass);
    // A carbon roof panel.
    const roof = add(new THREE.BoxGeometry(0.98, 0.02, 0.55), carbon);
    roof.position.set(0, 1.172, -0.2);
  }
  // Aero in carbon: splitter, skirts, diffuser fins, wing.
  add(xf(new THREE.BoxGeometry(1.86, 0.035, 0.32), [0, 0.1, 2.18]), carbon);
  for (const sd of [-1, 1]) {
    add(xf(new THREE.BoxGeometry(0.08, 0.07, 1.75), [sd * 0.98, 0.17, 0]), carbon);
    // Lower intakes: slim, angled up toward the arches.
    add(xf(new THREE.BoxGeometry(0.34, 0.07, 0.05), [sd * 0.64, 0.29, 2.2], [0, sd * 0.2, sd * 0.18]), black);
    add(xf(new THREE.BoxGeometry(0.06, 0.32, 0.06), [sd * 0.52, 1.08, -1.95]), carbon);
    // Mirrors.
    add(xf(new THREE.BoxGeometry(0.2, 0.09, 0.14), [sd * 0.98, 0.92, 0.72]), paint);
  }
  for (let k = -3; k <= 3; k += 1) add(xf(new THREE.BoxGeometry(0.02, 0.16, 0.42), [k * 0.2, 0.2, -2.12]), carbon);
  add(xf(new THREE.BoxGeometry(1.86, 0.035, 0.34), [0, 1.24, -1.98], [0.08, 0, 0]), carbon);
  add(xf(new THREE.BoxGeometry(1.0, 0.07, 0.05), [0, 0.42, 2.23]), black);
  // Lights: a smoked housing on each corner holding a thin light guide (a long top stroke and a
  // hook down at the outer end) and two small projector lenses ringed in chrome; a full-width rear bar.
  const heads = [];
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xdfe9ff });
  const smoke = new THREE.MeshPhysicalMaterial({ color: 0x020305, roughness: 0.04, metalness: 0.2, clearcoat: 1, envMapIntensity: 2 });
  for (const sd of [-1, 1]) {
    // The nose sweeps back toward the corner: z falls with x along the housing.
    const zAt = (x) => 2.045 - (x - 0.62) * 0.365;
    const ry = sd * 0.35;
    add(xf(new THREE.BoxGeometry(0.5, 0.09, 0.012), [sd * 0.64, 0.6, zAt(0.64) - 0.006], [0.12, ry, sd * 0.1]), smoke);
    heads.push(add(xf(new THREE.BoxGeometry(0.46, 0.012, 0.012), [sd * 0.64, 0.632, zAt(0.64) + 0.008], [0, ry, sd * 0.1]), headMat));
    heads.push(add(xf(new THREE.BoxGeometry(0.012, 0.07, 0.012), [sd * 0.865, 0.6, zAt(0.865) + 0.008], [0, ry, -sd * 0.25]), headMat));
    for (const x of [0.54, 0.68]) {
      const z = zAt(x) + 0.004;
      add(xf(new THREE.TorusGeometry(0.03, 0.006, 8, 20), [sd * x, 0.572, z], [0, ry, 0]), chrome);
      heads.push(add(xf(new THREE.CircleGeometry(0.026, 20), [sd * x, 0.572, z + 0.002], [0, ry, 0]), lensMat));
    }
  }
  const tails = [add(xf(new THREE.BoxGeometry(1.7, 0.035, 0.03), [0, 0.86, -2.245]), tailMat)];
  for (const sd of [-1, 1]) tails.push(add(xf(new THREE.BoxGeometry(0.03, 0.16, 0.03), [sd * 0.83, 0.8, -2.23]), tailMat));
  // Quad exhausts.
  for (const x of [-0.3, -0.12, 0.12, 0.3]) add(xf(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 14, 1, true), [x, 0.33, -2.28], [Math.PI / 2, 0, 0]), chrome);
  // Underglow.
  const glowGeo = new THREE.PlaneGeometry(2.6, 5.2);
  glowGeo.rotateX(-Math.PI / 2);
  // A soft pool, not a rectangle: alpha falls off from the centre line.
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const g = c.getContext("2d");
    const im = g.createImageData(64, 128);
    for (let y = 0; y < 128; y += 1)
      for (let x = 0; x < 64; x += 1) {
        const dx = (x - 31.5) / 32;
        const dy = (y - 63.5) / 64;
        const v = Math.max(0, 1 - Math.hypot(dx, dy * 0.8)) ** 1.6;
        // alphaMap reads the green channel.
        im.data.set([255 * v, 255 * v, 255 * v, 255], (y * 64 + x) * 4);
      }
    g.putImageData(im, 0, 0);
    return new THREE.CanvasTexture(c);
  })();
  const glowMat = new THREE.MeshBasicMaterial({ color: col("cyan"), alphaMap: glowTex, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = add(glowGeo, glowMat, group);
  glow.position.y = 0.06;
  const under = [new THREE.PointLight(col("cyan"), 0, 3, 2), new THREE.PointLight(col("accent"), 0, 3, 2)];
  under[0].position.set(0, 0.32, 1.0);
  under[1].position.set(0, 0.32, -1.0);
  body.add(...under);
  // Headlight beams.
  const beams = [-1, 1].map((sd) => {
    const s = new THREE.SpotLight(new THREE.Color(0.85, 0.92, 1), 0, 90, 0.42, 0.6, 1.2);
    s.position.set(sd * 0.66, 0.62, 2.1);
    s.target.position.set(sd * 0.8, 0, 20);
    body.add(s, s.target);
    return s;
  });
  const tailLight = new THREE.PointLight(col("accent"), 0, 6, 2);
  tailLight.position.set(0, 0.8, -2.5);
  body.add(tailLight);
  // Wheels: tyre, ten-spoke rim, centre lock, disc and caliper.
  const tyreGeo = (w) => {
    const pts = [];
    const r = WHEEL_R;
    const rr = 0.255;
    for (let i = 0; i <= 12; i += 1) {
      const a = (i / 12) * Math.PI;
      pts.push(new THREE.Vector2(rr + (r - rr) * (0.5 + 0.5 * Math.sin(a)) + 0.01 * Math.sin(a), -w / 2 + (w * (1 - Math.cos(a))) / 2));
    }
    const g = new THREE.LatheGeometry(pts, 40);
    g.rotateZ(Math.PI / 2);
    return g;
  };
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.25, metalness: 0.9 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.15, metalness: 1 });
  const caliper = new THREE.MeshStandardMaterial({ color: col("cyan"), roughness: 0.35, emissive: col("cyan"), emissiveIntensity: 0.15 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5, metalness: 0.8 });
  const wheels = [];
  for (const [x, z, w, front] of [
    [CAR.trackF / 2, wb, 0.25, true],
    [-CAR.trackF / 2, wb, 0.25, true],
    [CAR.trackR / 2, -wb, 0.31, false],
    [-CAR.trackR / 2, -wb, 0.31, false],
  ]) {
    const steer = new THREE.Group();
    steer.position.set(x, WHEEL_R, z);
    body.add(steer);
    const spin = new THREE.Group();
    steer.add(spin);
    const out = Math.sign(x);
    add(tyreGeo(w), rubber, spin);
    add(xf(new THREE.CylinderGeometry(0.255, 0.255, w * 0.9, 32, 1, true), [0, 0, 0], [0, 0, Math.PI / 2]), rimMat, spin);
    add(xf(new THREE.TorusGeometry(0.252, 0.012, 6, 40), [out * w * 0.42, 0, 0], [0, Math.PI / 2, 0]), lipMat, spin);
    for (let k = 0; k < 10; k += 1) {
      const a = (k / 10) * Math.PI * 2;
      add(xf(new THREE.BoxGeometry(0.03, 0.2, 0.035), [out * w * 0.36, Math.cos(a) * 0.13, Math.sin(a) * 0.13], [a, 0, 0]), rimMat, spin);
    }
    add(xf(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), [out * w * 0.42, 0, 0], [0, 0, Math.PI / 2]), lipMat, spin);
    add(xf(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 28), [out * 0.02, 0, 0], [0, 0, Math.PI / 2]), discMat, spin);
    add(xf(new THREE.BoxGeometry(0.06, 0.12, 0.2), [out * 0.07, 0.12, -0.1]), caliper, steer);
    // Wheel-well liner, so the arch is dark inside.
    add(xf(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 20, 1, true, 0, Math.PI), [-out * 0.05, 0.02, 0], [0, 0, Math.PI / 2]), black);
    wheels.push({ steer, spin, front, liner: null });
  }
  // The cockpit: dash, wheel, paddles, a lit display, and the driver.
  const dashTex = drawn(256, 64, (g, w, h) => {
    g.fillStyle = "#03050a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i += 1) {
      g.fillStyle = i > 20 ? "#ff3355" : i > 15 ? "#ffb020" : "#29e0ff";
      g.fillRect(70 + i * 4.4, 12, 3, 14);
    }
    g.strokeStyle = "#29e0ff";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(128, 70, 46, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    g.fillStyle = "#8a3cff";
    g.fillRect(14, 30, 34, 22);
    g.fillRect(208, 30, 34, 22);
  });
  const cockpit = new THREE.Group();
  body.add(cockpit);
  const trim = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.75 });
  add(xf(new THREE.BoxGeometry(1.36, 0.04, 1.8), [0, 0.3, -0.05]), trim, cockpit);
  for (const sx of [0.36, -0.36]) {
    add(xf(new THREE.BoxGeometry(0.46, 0.12, 0.5), [sx, 0.4, -0.3]), trim, cockpit);
    add(xf(new THREE.BoxGeometry(0.46, 0.62, 0.1), [sx, 0.72, -0.6], [-0.2, 0, 0]), trim, cockpit);
  }
  add(xf(new THREE.BoxGeometry(0.2, 0.18, 1.0), [0, 0.45, 0.0]), trim, cockpit);
  const dash = add(xf(new THREE.BoxGeometry(1.3, 0.12, 0.42), [0, 0.74, 0.62]), black, cockpit);
  void dash;
  const display = add(xf(new THREE.PlaneGeometry(0.34, 0.085), [0.36, 0.83, 0.48], [-0.35, 0, 0]), new THREE.MeshBasicMaterial({ map: dashTex, color: new THREE.Color(0.32, 0.32, 0.32) }), cockpit);
  const screen = add(xf(new THREE.PlaneGeometry(0.22, 0.12), [-0.06, 0.8, 0.5], [-0.5, 0, 0]), new THREE.MeshBasicMaterial({ color: col("violet").multiplyScalar(1.4) }), cockpit);
  // The dash glow on the driver: a cool key from the cluster, a violet fill from the centre screen.
  const dashKey = new THREE.PointLight(new THREE.Color(0.55, 0.85, 1), 0, 1.6, 1.5);
  dashKey.position.set(0.36, 0.8, 0.42);
  const dashFill = new THREE.PointLight(col("violet"), 0, 1.4, 1.5);
  dashFill.position.set(-0.06, 0.86, 0.42);
  cockpit.add(dashKey, dashFill);
  void screen;
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.36, 0.78, 0.36);
  wheelPivot.rotation.x = -0.35;
  cockpit.add(wheelPivot);
  add(new THREE.TorusGeometry(0.17, 0.022, 10, 32), carbon, wheelPivot);
  add(xf(new THREE.BoxGeometry(0.3, 0.04, 0.02), [0, -0.02, 0]), carbon, wheelPivot);
  // Model +x is the car's left, so the driver's right hand (and the upshift paddle) sits at -x.
  const paddleR = add(xf(new THREE.BoxGeometry(0.07, 0.1, 0.01), [-0.15, 0.04, -0.04]), lipMat, wheelPivot);
  add(xf(new THREE.BoxGeometry(0.07, 0.1, 0.01), [0.15, 0.04, -0.04]), lipMat, wheelPivot);
  // The driver: a jacket, gloved hands on the wheel at quarter to three.
  const jacket = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.7 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: col("skin").multiplyScalar(0.7), roughness: 0.6 });
  add(xf(new THREE.CylinderGeometry(0.2, 0.22, 0.55, 12), [0.36, 0.72, -0.35], [-0.25, 0, 0]), jacket, cockpit);
  add(xf(new THREE.SphereGeometry(0.11, 16, 12), [0.36, 1.07, -0.3]), skin, cockpit);
  add(xf(new THREE.SphereGeometry(0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), [0.36, 1.09, -0.31]), jacket, cockpit);
  const hands = [];
  for (const sd of [-1, 1]) {
    const arm = add(xf(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), [0.36 + sd * 0.16, 0.82, 0.08], [1.2, 0, -sd * 0.25]), jacket, cockpit);
    void arm;
    // A fist round the rim at quarter to three: an arc of glove over the rim, a thumb on the spoke.
    const fist = add(new THREE.TorusGeometry(0.17, 0.036, 8, 10, 0.5), glove, wheelPivot);
    fist.rotation.z = (sd > 0 ? 0 : Math.PI) - 0.25;
    add(xf(new THREE.SphereGeometry(0.022, 8, 6), [sd * 0.135, -0.005, 0.02]), glove, wheelPivot);
    // Fingers that reach behind the rim to the paddle.
    const finger = add(xf(new THREE.BoxGeometry(0.06, 0.022, 0.03), [sd * 0.15, 0.04, -0.03]), glove, wheelPivot);
    hands.push({ sd, finger });
  }

  function update(t, p) {
    const m = carMatrix(p);
    // The car's local frame is x right; three's is mirrored so the left of the car is +x.
    // Model space: +x is the car's left (three's convention after the yaw), +z forward.
    group.matrixAutoUpdate = false;
    group.matrix.copy(m);
    group.matrixWorldNeedsUpdate = true;
    // Engine on: lights up, underglow on, a brighter beam when it launches.
    const on = smoothstep(T.start, T.start + 0.25, t);
    const rev = Math.min(1, rpmAt(t) / 8000);
    headMat.color.setRGB(1, 1, 1).multiplyScalar(0.5 + 2.6 * on);
    lensMat.color.setRGB(0.87, 0.91, 1).multiplyScalar(0.3 + 1.6 * on);
    tailMat.color.copy(col("accent")).multiplyScalar(0.4 + 4.5 * on + (speedAt(t + 0.1) < speedAt(t) - 0.05 ? 3 : 0));
    // Dipped once the car rolls onto the overlook, so the terrace does not flare.
    for (const b of beams) b.intensity = 45 * on * (1 - 0.75 * smoothstep(T.highwayEnd + 2, T.stop - 1, t));
    tailLight.intensity = 3 * on;
    dashKey.intensity = 0.6 * on;
    // The canopy clears for the interior close-up, so the street reads through it.
    glass.opacity = t >= 36 && t < 38.6 ? 0.25 : 0.94;
    dashFill.intensity = 0.9 * on;
    glowMat.opacity = 0.22 + 0.2 * on;
    // Kept soft and high: close to the asphalt they burn a square hotspot that the bloom blows up.
    under[0].intensity = 0.12 + 0.2 * on;
    under[1].intensity = 0.12 + 0.2 * on;
    // Wheels: roll with the distance; the rears spin up off the line and in the drift; fronts steer.
    const rollF = p.s / WHEEL_R;
    const extra = 9 * smoothstep(T.launch, T.launch + 1.2, t) + 30 * smoothstep(T.driftIn - 0.4, T.driftOut + 0.8, t);
    const rollR = (p.s + extra) / WHEEL_R;
    const steer = clamp(Math.atan(CAR.wheelbase * p.curv) * 1.0 + p.counter, -0.6, 0.6);
    for (const w of wheels) {
      w.spin.rotation.x = w.front ? rollF : rollR;
      w.steer.rotation.y = w.front ? steer : 0;
      w.steer.position.y = WHEEL_R - (w.front ? -1 : 1) * clamp(accelAt(t) * 0.0015, -0.02, 0.02);
    }
    // The driver's paddle and wheel.
    const shift = DRIVE.events.find((e) => t >= e.t - 0.08 && t < e.t + 0.18);
    paddleR.position.z = shift ? -0.015 : -0.04;
    for (const h of hands) if (h.sd < 0) h.finger.position.z = shift ? -0.005 : -0.03;
    wheelPivot.rotation.z = -steer * 2.2;
    void rev;
    void hands;
  }
  return { group, update, paint, meshes };
}
