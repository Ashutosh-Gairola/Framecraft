/**
 * The Living Light of the Ocean — one continuous 40-second shot, as a pure function of film time.
 *
 * A night beach where only the breaking lip of each wave, the whitewater, and the advancing wash
 * glow; a macro look into the wash; a dive under a passing wave; then the dark sea, where
 * plankton flash and leave fading trails wherever fish, flippers, or the camera disturb them; a
 * sardine school; a green sea turtle; and the deep, where the light hangs like a galaxy.
 * Built from references.md. skills/html-anime-3d-actor/SKILL.md describes the method.
 */

import { THREE, W, H, mulberry32, fbm, smoothstep, mix, clamp, timedPath, canvas2d, drawn, css, xf, merge, swim, along, U, deg } from "./lib.js";

export const DURATION = 40;

/* ---------------- the shore and the waves (JS and GLSL agree) ---------------- */

const K = (Math.PI * 2) / 13;
const OMEGA = (Math.PI * 2) / 7;
const shoreZ = (x) => 1.5 * Math.sin(x / 11) + 0.6 * Math.sin(x / 4.3 + 1);
const phaseAt = (x, z, t) => K * (z - shoreZ(x)) - OMEGA * t + 0.35 * Math.sin(x / 7) + 0.2 * Math.sin(x / 3.1 + t * 0.3);
const ampAt = (d) => mix(0.1, 0.3, smoothstep(-40, -6, d)) * (1 - 0.45 * smoothstep(-2.5, 3, d));
const waveH = (x, z, t) => {
  const d = z - shoreZ(x);
  const s = 0.5 + 0.5 * Math.sin(phaseAt(x, z, t));
  return ampAt(d) * (Math.pow(s, 2.5) * 2 - 0.45) + 0.025 * Math.sin(x * 1.3 + t * 1.7) * Math.sin(z * 1.1 - t * 1.3);
};
const floorAt = (d) => (d > 0 ? 0.07 * d : d > -12 ? 0.09 * d : Math.max(-60, -1.08 + (d + 12) * 0.35));
const sandY = (x, z) => floorAt(z - shoreZ(x));

const WAVE_GLSL = /* glsl */ `
  float shoreZ(float x) { return 1.5 * sin(x / 11.0) + 0.6 * sin(x / 4.3 + 1.0); }
  float wavePhase(vec2 p, float t) { return ${K.toFixed(6)} * (p.y - shoreZ(p.x)) - ${OMEGA.toFixed(6)} * t + 0.35 * sin(p.x / 7.0) + 0.2 * sin(p.x / 3.1 + t * 0.3); }
  float waveAmp(float d) { return mix(0.1, 0.3, smoothstep(-40.0, -6.0, d)) * (1.0 - 0.45 * smoothstep(-2.5, 3.0, d)); }
  float waveH(vec2 p, float t) {
    float d = p.y - shoreZ(p.x);
    float s = 0.5 + 0.5 * sin(wavePhase(p, t));
    return waveAmp(d) * (pow(s, 2.5) * 2.0 - 0.45) + 0.025 * sin(p.x * 1.3 + t * 1.7) * sin(p.y * 1.1 - t * 1.3);
  }
  float floorAt(float d) { return d > 0.0 ? 0.07 * d : (d > -12.0 ? 0.09 * d : max(-60.0, -1.08 + (d + 12.0) * 0.35)); }
  float sandY(vec2 p) { return floorAt(p.y - shoreZ(p.x)); }
  float fbmLite(vec2 p) { return 0.5 + 0.25 * sin(p.x * 1.7 + sin(p.y * 1.3)) + 0.25 * sin(p.y * 2.3 + sin(p.x * 0.9)); }
  float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  // Point-like sparkles: one tiny dot per cell at a random spot, switching on and off.
  float dots(vec2 p, float n, float thr, float t) {
    vec2 c = floor(p * n);
    vec2 f = fract(p * n);
    vec2 r = vec2(hash12(c), hash12(c + 7.13));
    float on = step(thr, hash12(c + floor(t * 9.0 + r.x * 9.0) * vec2(17.0, 31.0)));
    return on * smoothstep(0.16, 0.0, length(f - (0.2 + 0.6 * r)));
  }
`;

/* ---------------- the camera ---------------- */

const SCHOOL = timedPath([
  [16.5, -12, -4.3, -26.5],
  [18, -8, -4.4, -27],
  [21, -1, -4.6, -28.5],
  [23, 4, -5.2, -31],
  [25, 6.5, -7, -38],
  [28, 6, -10, -48],
]);
const TURTLE = timedPath([
  [24, 18, -8, -48],
  [25, 16, -7.8, -46],
  [28, 9.5, -6.8, -38.8],
  [30, 6.3, -6.6, -36.6],
  [32, 2.5, -7, -37.2],
  [36, -5, -8.2, -45],
  [40, -13, -9.6, -55],
]);
const sOnShore = (x, d, lift) => [x, sandY(x, shoreZ(x) + d) + lift, shoreZ(x) + d];
// The orbit round the school, sampled into keys so the whole path is one spline.
const orbitKeys = [];
for (let t = 18; t <= 25.01; t += 0.5) {
  const [cx, cy, cz] = SCHOOL(t);
  const th = t < 21 ? 0 : -1.3 * smoothstep(21, 25, t);
  const along = t < 21 ? 0.8 : 0.8 * (1 - smoothstep(21, 23, t));
  orbitKeys.push([t, cx + along + Math.sin(th) * 5.5, cy + 0.5, cz + Math.cos(th) * 5.5]);
}
const CAM = timedPath([
  [0, ...sOnShore(-8, 2.6, 0.32)],
  [3, ...sOnShore(-4.6, 2.6, 0.3)],
  [6, ...sOnShore(-1.2, 2.6, 0.26)],
  [8, 0.7, 0.62, shoreZ(0.7) - 1.55],
  [11, 0.86, 0.6, shoreZ(0.86) - 1.6],
  [12.2, 1.0, 0.55, shoreZ(1.0) - 2.6],
  [13.6, 1.3, 0.3, shoreZ(1.3) - 5.5],
  [14.6, 1.6, -0.45, -8.5],
  [16, 2.0, -1.6, -14],
  [17.2, 0.4, -3.0, -19],
  ...orbitKeys,
  [27, 3.5, -7.6, -34.5],
  [29.3, 5.5, -6.2, -35.2],
  [31.5, 3.8, -7.6, -33.6],
  [34, 6, -8.6, -30],
  [37, 8, -10.6, -27],
  [40, 10, -12, -24],
]);
const LOOK = timedPath([
  [0, 2, 0.0, shoreZ(2) - 4.5],
  [3, 5, 0.0, shoreZ(5) - 4.5],
  [6, 1.1, 0.05, shoreZ(1.1) + 1.2],
  [8, 0.95, -0.06, shoreZ(0.95) - 2.05],
  [11, 1.08, -0.06, shoreZ(1.08) - 2.15],
  [12.2, 1.4, 0.15, shoreZ(1.4) - 4],
  [13.6, 1.6, 0.0, -12],
  [14.6, 1.9, -1.0, -16],
  [16, 1, -3, -22],
  [17.2, -6, -4.4, -27],
  ...orbitKeys.map(([t]) => [t, ...SCHOOL(t)]),
  [27, ...TURTLE(27.3)],
  [29.3, ...TURTLE(29.5)],
  [31.5, ...TURTLE(32)],
  [34, ...TURTLE(35)],
  [37, -6, -6, -46],
  [40, -8, 4, -52],
]);
const FOV = timedPath([
  [0, 58],
  [5.5, 56],
  [7.5, 24],
  [11, 22],
  [12.6, 50],
  [14.6, 70],
  [17.2, 52],
  [25, 50],
  [27, 46],
  [29.3, 44],
  [31.5, 50],
  [40, 74],
]);
// Focus distance and blur strength for the plankton's depth of field.
const FOCUS = timedPath([
  [0, 6, 2],
  [5.5, 4, 2],
  [7.5, 0.9, 1.2],
  [11, 0.9, 1.2],
  [12.2, 1.3, 2],
  [12.8, 3, 3],
  [17.2, 5.5, 2.5],
  [25, 5, 2.5],
  [29.3, 2.4, 3],
  [31.5, 5, 2.5],
  [40, 14, 1.5],
]);

/* ---------------- the turtle's rig, as a pure function ---------------- */

const STROKE = 4.8;
/** Fore-flipper angles at t: elevation (up +), sweep (forward +), twist (leading edge up +). */
function flipper(t) {
  const u = ((t + 1.2) / STROKE) % 1;
  // Downstroke 0–0.45: up and forward to down and back, the power phase; recovery is slower.
  const down = smoothstep(0, 0.45, u);
  const up = smoothstep(0.45, 1, u);
  const k = u < 0.45 ? down : 1 - up;
  return { elev: mix(-42, 55, 1 - k) * deg, sweep: mix(18, -32, k) * deg, twist: (u < 0.45 ? -24 : 18) * deg * Math.sin(Math.PI * (u < 0.45 ? down : up)), power: u < 0.45 ? Math.sin(Math.PI * down) : 0 };
}
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
function turtleFrame(t) {
  const p = along(TURTLE, t);
  const f = flipper(t);
  _q.setFromEuler(_e.set(-p.pitch + Math.sin((t / STROKE) * Math.PI * 2) * 0.03, p.heading, 0, "YXZ"));
  return { p, f, q: _q.clone() };
}
/** World positions of the fore-flipper tips, the hind flippers, and the head at time t. */
function turtlePoints(t) {
  const { p, f, q } = turtleFrame(t);
  const S = 1.1;
  const out = [];
  for (const side of [1, -1]) {
    const tip = new THREE.Vector3(side * 0.66, 0, -0.14).applyEuler(new THREE.Euler(0, -side * f.sweep, side * f.elev, "YZX"));
    tip.add(new THREE.Vector3(side * 0.28, 0.0, 0.22));
    out.push({ v: tip.multiplyScalar(S).applyQuaternion(q).add(new THREE.Vector3(p.x, p.y, p.z)), w: 0.55 + f.power });
  }
  for (const side of [1, -1]) out.push({ v: new THREE.Vector3(side * 0.24, -0.02, -0.5).multiplyScalar(S).applyQuaternion(q).add(new THREE.Vector3(p.x, p.y, p.z)), w: 0.35 });
  out.push({ v: new THREE.Vector3(0, 0, 0.7).multiplyScalar(S).applyQuaternion(q).add(new THREE.Vector3(p.x, p.y, p.z)), w: 0.3 });
  return out;
}

/* ---------------- textures from the references ---------------- */

/** Voronoi cells: dark centres, pale borders — turtle scales on the head and flippers. */
function scaleTexture(dark, pale, cells, seed) {
  const rand = mulberry32(seed);
  const pts = Array.from({ length: cells }, () => [rand(), rand()]);
  return drawn(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        let d1 = 9;
        let d2 = 9;
        for (const [px, py] of pts)
          for (let ox = -1; ox <= 1; ox += 1)
            for (let oy = -1; oy <= 1; oy += 1) {
              const d = Math.hypot(x / w - px - ox, y / h - py - oy);
              if (d < d1) {
                d2 = d1;
                d1 = d;
              } else if (d < d2) d2 = d;
            }
        const edge = smoothstep(0.012, 0.004, d2 - d1);
        const shade = 0.8 + 0.4 * (d1 * Math.sqrt(cells) * 0.6);
        const c = new THREE.Color().lerpColors(dark, pale, edge).multiplyScalar(edge > 0.5 ? 1 : Math.min(1.25, shade));
        const k = (y * w + x) * 4;
        img.data[k] = c.r * 255;
        img.data[k + 1] = c.g * 255;
        img.data[k + 2] = c.b * 255;
        img.data[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}
/** The carapace from above: 5 vertebral, 4 pairs of costal, a ring of marginal scutes; golden streaks radiate across each. */
function shellTexture(PAINT) {
  const base = new THREE.Color(PAINT.shell).lerp(new THREE.Color(PAINT.iris), 0.18).multiplyScalar(0.8);
  const gold = new THREE.Color(PAINT.practical).lerp(new THREE.Color(PAINT.shell), 0.45);
  const seam = new THREE.Color(PAINT.sclera).lerp(new THREE.Color(PAINT.shell), 0.45);
  const dark = new THREE.Color(PAINT.hair).lerp(new THREE.Color(PAINT.shell), 0.35);
  // Scute centres in uv (u across, v nose → tail = 1 → 0) with their growth centres.
  const seeds = [];
  for (let i = 0; i < 5; i += 1) seeds.push([0.5, 0.8 - i * 0.15]);
  for (let i = 0; i < 4; i += 1) for (const s of [-1, 1]) seeds.push([0.5 + s * (0.24 - Math.abs(i - 1.5) * 0.015), 0.74 - i * 0.165]);
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2;
    seeds.push([0.5 + Math.cos(a) * 0.43 * (1 - 0.1 * Math.sin(a)), 0.5 + Math.sin(a) * 0.48]);
  }
  return drawn(1024, 1024, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const u = x / w;
        const v = 1 - y / h;
        let d1 = 9;
        let d2 = 9;
        let id = 0;
        seeds.forEach(([sx, sy], i) => {
          const d = Math.hypot((u - sx) * 1.1, v - sy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = i;
          } else if (d < d2) d2 = d;
        });
        const [sx, sy] = seeds[id];
        // Streaks radiate from a growth point at the back of each scute.
        const gx = sx;
        const gy = sy - 0.05;
        const ang = Math.atan2(v - gy, (u - gx) * 1.1);
        const n = fbm(u * 18 + id, v * 18, 3);
        const streak = Math.pow(0.5 + 0.5 * Math.sin(ang * 9 + n * 6 + id * 1.7), 5) * smoothstep(0.01, 0.07, Math.hypot(u - gx, v - gy));
        const blotch = smoothstep(0.55, 0.75, fbm(u * 9 + id * 3, v * 9, 3));
        let c = base.clone().lerp(gold, Math.min(1, streak * 0.75 + blotch * 0.35));
        c.lerp(dark, smoothstep(0.0, 0.06, d1) * 0.25 + (id >= 13 ? 0.15 : 0));
        c.lerp(seam, smoothstep(0.009, 0.003, d2 - d1));
        c.multiplyScalar(0.88 + 0.24 * fbm(u * 40, v * 40, 2));
        const k = (y * w + x) * 4;
        img.data[k] = Math.min(255, c.r * 255);
        img.data[k + 1] = Math.min(255, c.g * 255);
        img.data[k + 2] = Math.min(255, c.b * 255);
        img.data[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
}

/* ---------------- the world ---------------- */

let shared = null;
export function createWorld(canvas, PAINT) {
  if (!shared) shared = build(PAINT);
  const ctx = canvas.getContext("2d");
  return {
    render(t) {
      shared.render(t);
      ctx.drawImage(shared.frame, 0, 0, canvas.width, canvas.height);
    },
  };
}

function build(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const rand = mulberry32(31);
  const glCanvas = canvas2d(W, H);
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, W / H, 0.02, 900);
  scene.add(camera);
  const uTime = U.uTime;
  const glowCol = blend("plankton", "oceanlight", 0.22);

  /* --- air: the night sky, stars, haze at the horizon --- */
  const air = new THREE.Group();
  scene.add(air);
  {
    const g = new THREE.SphereGeometry(600, 48, 24);
    const c = [];
    const p = g.attributes.position;
    const zen = blend("ink", "sky", 0.35).multiplyScalar(0.55);
    const hor = blend("sky", "oceanlight", 0.25).lerp(col("moon"), 0.08).multiplyScalar(0.55);
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i) / 600;
      const k = new THREE.Color().lerpColors(hor, zen, smoothstep(-0.02, 0.35, y));
      if (y < 0) k.multiplyScalar(0.4);
      c.push(k.r, k.g, k.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    air.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
    const n = 5200;
    const pos = new Float32Array(n * 3);
    const bright = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const a = rand() * Math.PI * 2;
      const y = 0.02 + rand() ** 0.8 * 0.98;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 580, y * 580, Math.sin(a) * r * 580], i * 3);
      bright[i] = 0.25 + rand() ** 4 * 1.8;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("bright", new THREE.BufferAttribute(bright, 1));
    air.add(
      new THREE.Points(
        sg,
        new THREE.ShaderMaterial({
          uniforms: { uTime },
          vertexShader: `attribute float bright; varying float vB; uniform float uTime;
            void main() { vB = bright * (0.8 + 0.2 * sin(uTime * 2.0 + position.x)); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 1.0 + step(1.3, bright); }`,
          fragmentShader: `varying float vB; void main() { gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * vB, 1.0); }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
  }

  /* --- under: the dark blue world --- */
  const under = new THREE.Group();
  scene.add(under);
  {
    const g = new THREE.SphereGeometry(500, 48, 24);
    const c = [];
    const p = g.attributes.position;
    const top = blend("oceanlight", "ink", 0.66);
    const mid = blend("ink", "oceanlight", 0.2).multiplyScalar(0.7);
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i) / 500;
      const k = y > 0 ? new THREE.Color().lerpColors(mid, top, smoothstep(-0.1, 1.0, y)) : mid.clone().multiplyScalar(1 - smoothstep(-0.05, 0.7, -y) * 0.9);
      c.push(k.r, k.g, k.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    under.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  }
  const fogAir = new THREE.FogExp2(blend("ink", "sky", 0.4).multiplyScalar(0.6), 0.012);
  const fogSea = new THREE.FogExp2(blend("ink", "oceanlight", 0.2).multiplyScalar(0.7), 0.05);

  /* --- light: starlight, and the glow that follows the animals --- */
  const hemi = new THREE.HemisphereLight(blend("sky", "moon", 0.25), blend("ink", "hair", 0.5), 0.35);
  const star = new THREE.DirectionalLight(blend("moon", "oceanlight", 0.3), 0.25);
  star.position.set(-0.3, 1, 0.2);
  scene.add(hemi, star);
  const schoolLight = new THREE.PointLight(glowCol, 0, 9, 2);
  const turtleLight = new THREE.PointLight(glowCol, 0, 8, 2);
  const washLight = new THREE.PointLight(glowCol, 0, 5, 2);
  scene.add(schoolLight, turtleLight, washLight);
  // Reflections: the night sky above water, a dark gradient below.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envAir = pmrem.fromScene((() => {
    const s = new THREE.Scene();
    s.add(air.children[0].clone());
    return s;
  })(), 0.02).texture;
  const envSea = pmrem.fromScene((() => {
    const s = new THREE.Scene();
    s.add(under.children[0].clone());
    return s;
  })(), 0.02).texture;

  /* --- the grids: fine where the camera goes, stretching to the horizon --- */
  const warp = (segs, fx, fz) => {
    const g = new THREE.PlaneGeometry(2, 2, segs, segs);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const x = fx(p.getX(i));
      const z = fz(p.getZ(i));
      p.setXYZ(i, x, 0, z);
    }
    return g;
  };
  const gx = (u) => 3 + 26 * u + 140 * u ** 5;
  const gz = (v) => -18 + 24 * v + 200 * v ** 5;

  /* --- the sea surface: waves, glow on the lip, the whitewater and the wash; seen from both sides --- */
  const seaUniforms = { uTime, uGlow: { value: glowCol.clone().multiplyScalar(2.6) }, uWater: { value: blend("ink", "oceanlight", 0.2).multiplyScalar(0.45) }, uUnder: { value: blend("oceanlight", "sky", 0.5).multiplyScalar(0.6) }, uAbove: { value: 1 } };
  const seaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  seaMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, seaUniforms);
    sh.vertexShader = `uniform float uTime;\nvarying vec3 vWorld;\n${WAVE_GLSL}\n${sh.vertexShader}`
      .replace(
        "#include <beginnormal_vertex>",
        `vec2 wp = position.xz;
        float e = 0.08;
        float hx = waveH(wp + vec2(e, 0.0), uTime) - waveH(wp - vec2(e, 0.0), uTime);
        float hz = waveH(wp + vec2(0.0, e), uTime) - waveH(wp - vec2(0.0, e), uTime);
        vec3 objectNormal = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace("#include <begin_vertex>", `vec3 transformed = vec3(position.x, waveH(position.xz, uTime), position.z);\nvWorld = transformed;`);
    sh.fragmentShader = `uniform float uTime;\nuniform vec3 uGlow;\nuniform vec3 uWater;\nuniform vec3 uUnder;\nuniform float uAbove;\nvarying vec3 vWorld;\n${WAVE_GLSL}\n${sh.fragmentShader}`
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `vec2 p = vWorld.xz;
        float d = p.y - shoreZ(p.x);
        float ph = wavePhase(p, uTime);
        float pm = mod(ph, 6.2831853);
        float depth = vWorld.y - sandY(p);
        if (depth < -0.005) discard;
        float dhdt = (waveH(p, uTime + 0.05) - waveH(p, uTime)) / 0.05;
        float bz = smoothstep(-30.0, -12.0, d) * (1.0 - smoothstep(-1.2, 1.2, d)) * mix(0.3, 1.0, smoothstep(-24.0, -6.0, d));
        float lip = exp(-pow((pm - 1.89) / 0.15, 2.0)) * bz;
        float foam = exp(-pow((pm - 1.35) / 0.5, 2.0)) * smoothstep(-7.0, -2.5, d) * (1.0 - smoothstep(2.0, 4.0, d));
        float wash = smoothstep(0.0, 0.012, depth) * (1.0 - smoothstep(0.03, 0.11, depth)) * smoothstep(0.02, 0.25, dhdt) * smoothstep(-3.0, -0.5, d);
        float spark = dots(p, 60.0, 0.55, uTime) + 0.6 * dots(p * 1.7 + 3.0, 60.0, 0.7, uTime);
        float grain = 0.6 + 0.4 * fbmLite(p * 6.0 + vec2(uTime * 0.3, 0.0));
        // Up close the glow resolves into single sparks; the continuous sheen is only for distance.
        float far = smoothstep(0.8, 5.0, length(vWorld - cameraPosition));
        float lit = lip * (0.9 * grain * far + 2.0 * spark) + foam * (0.25 * grain * far + 1.4 * spark) + wash * (0.5 * grain * far + 2.4 * spark);
        lit *= mix(0.45, 1.0, far);
        // Shallow surf never rests: a constant flicker of single sparks, brighter as each wave passes.
        float turb = smoothstep(-8.0, -1.5, d) * (1.0 - smoothstep(1.0, 3.5, d)) * smoothstep(-0.005, 0.03, depth);
        lit += turb * spark * (0.45 + 0.35 * sin(uTime * 2.3 + p.x * 4.0 + p.y * 3.0)) * mix(3.2, 0.4, far);
        vec3 glowEmit = uGlow * lit;
        vec4 diffuseColor = vec4(uWater, gl_FrontFacing ? mix(0.22, 0.94, smoothstep(0.02, 0.6, depth)) : 0.96);
        diffuseColor.a = max(diffuseColor.a, min(1.0, lit * 0.6));`,
      )
      .replace(
        "vec3 totalEmissiveRadiance = emissive;",
        `vec3 viewUp = normalize(cameraPosition - vWorld);
        float window = pow(max(0.0, -viewUp.y), 3.0);
        // From below, a steep wave face can pass as front-facing: treat everything as the underside.
        float nearGlow = 0.55 * (1.0 - smoothstep(6.0, 14.0, length(vWorld - cameraPosition)));
        vec3 totalEmissiveRadiance = uAbove > 0.5 && gl_FrontFacing ? glowEmit : uUnder * (0.12 + 0.9 * window) + glowEmit * nearGlow;`,
      );
  };
  seaMat.customProgramCacheKey = () => "glow-sea";
  const sea = new THREE.Mesh(warp(380, gx, gz), seaMat);
  sea.frustumCulled = false;
  sea.renderOrder = 2;
  scene.add(sea);

  /* --- the sand: black and wet at the water, holding sparkles a moment after the wash drains --- */
  const sandUniforms = { uTime, uGlow: seaUniforms.uGlow, uAbove: { value: 1 } };
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, envMapIntensity: 0.9 });
  sandMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, sandUniforms);
    sh.vertexShader = `uniform float uTime;\nvarying vec3 vWorld;\n${WAVE_GLSL}\n${sh.vertexShader}`
      .replace(
        "#include <beginnormal_vertex>",
        `vec2 wp = position.xz;
        float e = 0.1;
        float sx = sandY(wp + vec2(e, 0.0)) - sandY(wp - vec2(e, 0.0));
        float sz = sandY(wp + vec2(0.0, e)) - sandY(wp - vec2(0.0, e));
        vec3 objectNormal = normalize(vec3(-sx / (2.0 * e), 1.0, -sz / (2.0 * e)));`,
      )
      .replace(
        "#include <begin_vertex>",
        `float rip = 0.012 * sin(position.x * 3.1 + sin(position.z * 1.7) * 2.0) * sin(position.z * 2.3);
        vec3 transformed = vec3(position.x, sandY(position.xz) + rip, position.z);
        vWorld = transformed;`,
      );
    sh.fragmentShader = `uniform float uTime;\nuniform vec3 uGlow;\nuniform float uAbove;\nvarying vec3 vWorld;\n${WAVE_GLSL}\n${sh.fragmentShader}`
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `vec2 p = vWorld.xz;
        float d = p.y - shoreZ(p.x);
        float wet = 1.0 - smoothstep(2.5, 5.5, d);
        float n = hash12(floor(p * 90.0));
        vec3 dry = vec3(0.075, 0.07, 0.068);
        vec3 wetC = vec3(0.028, 0.03, 0.035);
        vec3 bed = vec3(0.03, 0.04, 0.05);
        vec3 c = d > 0.0 ? mix(dry, wetC, wet) : bed;
        if (d < -16.0) discard;
        c *= 1.0 - smoothstep(-6.0, -16.0, d) * 0.9;
        vec4 diffuseColor = vec4(c * (0.8 + 0.4 * n), 1.0);
        float rough = mix(0.92, 0.2, wet * step(0.0, d));`,
      )
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = rough;")
      .replace(
        "vec3 totalEmissiveRadiance = emissive;",
        `float covered = 0.0;
        for (int i = 1; i <= 5; i++) {
          float a = float(i) * 0.3;
          covered = max(covered, step(sandY(p), waveH(p, uTime - a)) * exp(-a / 0.55));
        }
        float nowDry = step(waveH(p, uTime), vWorld.y);
        float sparkle = dots(p, 55.0, 0.6, uTime) * 1.6;
        vec3 totalEmissiveRadiance = uGlow * covered * nowDry * sparkle * smoothstep(-0.5, 0.5, d) * 1.4 * uAbove;`,
      );
  };
  sandMat.customProgramCacheKey = () => "glow-sand";
  const sand = new THREE.Mesh(warp(300, gx, (v) => -18 + 24 * v + 200 * v ** 5), sandMat);
  sand.frustumCulled = false;
  scene.add(sand);

  /* --- plankton: points that flash where the water is disturbed, with depth of field --- */
  const MAXD = 64;
  const dist = { pos: Array.from({ length: MAXD }, () => new THREE.Vector4(0, -999, 0, 0.1)), amt: new Float32Array(MAXD) };
  const plankton = (n, box, opts) => {
    const seed = new Float32Array(n * 4);
    const r = mulberry32(opts.seed);
    for (let i = 0; i < n; i += 1) seed.set([r(), r(), r(), r()], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 4));
    const uniforms = {
      uTime,
      uCam: { value: new THREE.Vector3() },
      uBox: { value: box },
      uCentre: { value: new THREE.Vector3() },
      uFocus: { value: 5 },
      uCoc: { value: 2 },
      uBase: { value: opts.base },
      uColor: { value: glowCol.clone() },
      uD: { value: dist.pos },
      uDI: { value: dist.amt },
      uOn: { value: 1 },
      uMode: { value: opts.mode },
      uAtt: { value: opts.att },
      uPulseA: { value: new THREE.Vector4(0, 0, 0, -1) },
      uPulseB: { value: new THREE.Vector4(0, 0, 0, -1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        ${WAVE_GLSL}
        attribute vec4 seed;
        uniform float uTime; uniform vec3 uCam; uniform float uBox; uniform vec3 uCentre;
        uniform float uFocus; uniform float uCoc; uniform float uBase; uniform float uOn; uniform int uMode; uniform float uAtt;
        uniform vec4 uD[${MAXD}]; uniform float uDI[${MAXD}];
        uniform vec4 uPulseA; uniform vec4 uPulseB;
        varying float vA; varying float vSharp; varying float vSize;
        void main() {
          vec3 p;
          float glow = 0.0;
          if (uMode == 0) {
            // The open-water field: drifts on the current, wraps round the camera.
            vec3 drift = vec3(0.07, 0.012, -0.035) * uTime + vec3(sin(uTime * 0.3 + seed.w * 20.0) * 0.18, sin(uTime * 0.23 + seed.w * 13.0) * 0.12, 0.0);
            p = seed.xyz * uBox + drift;
            p = uCam + mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
            if (p.y > waveH(p.xz, uTime) - 0.04 || p.y < sandY(p.xz)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
          } else if (uMode == 1) {
            // The wash: suspended between the sand and the moving surface.
            p = uCentre + vec3((seed.x - 0.5) * uBox, 0.0, (seed.z - 0.5) * uBox * 0.8);
            float s = sandY(p.xz);
            float h = waveH(p.xz, uTime);
            p.y = max(s + 0.01, h - 0.015 - seed.y * 0.1) + sin(uTime * 2.0 + seed.w * 30.0) * 0.003;
            p.x += sin(uTime * 1.3 + seed.w * 40.0) * 0.01;
            float dhdt = (waveH(p.xz, uTime + 0.05) - h) / 0.05;
            float stir = smoothstep(0.0, 0.3, abs(dhdt)) * smoothstep(0.75, 1.0, fract(seed.w * 13.7 + uTime * (0.6 + seed.x)));
            glow += stir * 1.1 + 0.05 + 0.12 * smoothstep(0.0, 0.2, dhdt);
          } else {
            // The deep: a galaxy of light hanging in the dark, far from the camera.
            float rr = mix(28.0, 240.0, pow(seed.x, 0.8));
            float th = seed.y * 6.2831853;
            float ph = acos(2.0 * seed.z - 1.0);
            p = uCam + vec3(sin(ph) * cos(th), cos(ph) * 0.8, sin(ph) * sin(th)) * rr;
            p += vec3(0.05, 0.0, -0.02) * uTime;
            if (p.y > -1.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
            float da = length(p - uPulseA.xyz) - uPulseA.w;
            float db = length(p - uPulseB.xyz) - uPulseB.w;
            float fa = 1.0 - smoothstep(25.0, 55.0, uPulseA.w);
            float fb = 1.0 - smoothstep(25.0, 55.0, uPulseB.w);
            glow += (uPulseA.w > 0.0 ? exp(-da * da / 40.0) * fa : 0.0) * 2.5 + (uPulseB.w > 0.0 ? exp(-db * db / 40.0) * fb : 0.0) * 2.5;
          }
          for (int k = 0; k < ${MAXD}; k++) {
            vec3 dd = p - uD[k].xyz;
            glow += uDI[k] * exp(-dot(dd, dd) / (uD[k].w * uD[k].w));
          }
          float twinkle = pow(max(0.0, sin(uTime * (0.5 + seed.w * 2.0) + seed.w * 91.0)), 50.0);
          float b = uBase * (0.12 + 1.8 * pow(fract(seed.w * 7.31), uMode == 1 ? 1.6 : (uMode == 2 ? 2.5 : 4.0))) + twinkle * 0.6 + min(glow, 3.5);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = max(0.01, -mv.z);
          float coc = abs(1.0 / dist - 1.0 / uFocus) * uCoc * 6.0;
          float size = (uMode == 1 ? 2.6 : 1.3) + coc;
          gl_PointSize = clamp(size, 1.4, 22.0);
          vSharp = 1.0 - smoothstep(1.5, 6.0, size);
          vSize = gl_PointSize;
          vA = uOn * b * (2.0 / (gl_PointSize * gl_PointSize)) * 1.6 * exp(-dist * uAtt) * (1.0 - 0.6 * smoothstep(4.0, 22.0, gl_PointSize));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA; varying float vSharp; varying float vSize;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          // A point one or two pixels wide is drawn solid; larger ones are soft discs (bokeh).
          float disc = vSize < 2.6 ? 1.0 : mix(smoothstep(0.5, 0.42, d) * (0.75 + 0.25 * smoothstep(0.3, 0.48, d)), smoothstep(0.5, 0.05, d), vSharp);
          vec3 c = mix(uColor, vec3(0.85, 1.0, 1.0), clamp(vA * 0.25, 0.0, 0.6));
          gl_FragColor = vec4(c * vA * disc, 1.0);
        }`,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    return { pts, uniforms };
  };
  const field = plankton(150000, 34, { seed: 3, base: 1.3, mode: 0, att: 0.05 });
  const wash = plankton(16000, 1.6, { seed: 5, base: 1.6, mode: 1, att: 0.0 });
  const deep = plankton(22000, 0, { seed: 9, base: 5.5, mode: 2, att: 0.003 });
  under.add(field.pts, deep.pts);
  // The wash plankton lives under the surface: draw it first, and see it through the shallow water.
  wash.pts.renderOrder = 1;
  scene.add(wash.pts);
  deep.uniforms.uCentre.value.set(-4, -16, -80);

  /* --- marine snow and bubbles --- */
  const bubbleTex = drawn(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.48);
    grad.addColorStop(0, "rgba(255,255,255,0.0)");
    grad.addColorStop(0.85, "rgba(255,255,255,0.18)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.arc(w * 0.38, h * 0.36, w * 0.07, 0, Math.PI * 2);
    g.fill();
  });
  const bubbles = [];
  const bubbleMat = new THREE.SpriteMaterial({ map: bubbleTex, color: blend("plankton", "moon", 0.4), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending });
  // The dive: a burst of air round the lens, rising past it.
  const [dx, dy, dz] = CAM(14.6);
  for (let i = 0; i < 90; i += 1) {
    const sp = new THREE.Sprite(bubbleMat);
    scene.add(sp);
    bubbles.push({ sp, x: dx + (rand() - 0.5) * 1.4, y: dy - rand() * 0.8, z: dz + (rand() - 0.5) * 1.4 - 0.5, t0: 14.2 + rand() * 0.9, v: 0.35 + rand() * 0.5, s: 0.0015 + rand() ** 2 * 0.007, w: rand() * 6.28 });
  }
  // Tiny bubbles in the wash for the macro shot.
  const washBubbles = [];
  for (let i = 0; i < 160; i += 1) {
    const sp = new THREE.Sprite(bubbleMat);
    scene.add(sp);
    washBubbles.push({ sp, x: 1.0 + (rand() - 0.5) * 0.7, z: shoreZ(1.0) - 2.1 + (rand() - 0.5) * 0.6, k: rand(), s: 0.002 + rand() ** 2 * 0.006, w: rand() * 6.28 });
  }
  const snowN = 3000;
  const snowPos = new Float32Array(snowN * 3);
  const snowBase = Array.from({ length: snowN }, () => [rand() * 16 - 8, rand() * 10 - 5, rand() * 16 - 8]);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  under.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: blend("moon", "oceanlight", 0.5).multiplyScalar(0.35), size: 0.02, transparent: true, opacity: 0.6, depthWrite: false })));

  /* --- the school: sardine-like fish, silver sides, dark blue-green backs --- */
  const fishGeo = (() => {
    const prof = [];
    for (let i = 0; i <= 16; i += 1) {
      const u = i / 16;
      prof.push(new THREE.Vector2(0.11 * Math.pow(Math.sin(Math.PI * u), 0.75) * (1 - 0.25 * u), u - 0.5));
    }
    const body = new THREE.LatheGeometry(prof, 14);
    body.rotateX(Math.PI / 2);
    body.scale(0.55, 1, 1);
    const tail = new THREE.BufferGeometry();
    tail.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.46, 0, 0.11, -0.68, 0, 0.02, -0.6, 0, 0, -0.46, 0, -0.02, -0.6, 0, -0.11, -0.68], 3));
    tail.computeVertexNormals();
    const dorsal = new THREE.BufferGeometry();
    dorsal.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.09, 0.08, 0, 0.16, -0.02, 0, 0.085, -0.1], 3));
    dorsal.computeVertexNormals();
    const g = merge([body, tail, dorsal]);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const back = blend("ink", "oceanlight", 0.35).lerp(col("plankton"), 0.08);
    const side = blend("moon", "sclera", 0.4);
    const belly = col("sclera");
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i);
      const k = y > 0.035 ? back : y > -0.04 ? side : belly;
      c.set([k.r, k.g, k.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  })();
  const fishMat = swim(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.6 }), 0.07, 30, 1, "sardine");
  const FISH = 760;
  const fishMesh = new THREE.InstancedMesh(fishGeo, fishMat, FISH);
  fishMesh.frustumCulled = false;
  under.add(fishMesh);
  const fish = [];
  for (let i = 0; i < FISH; i += 1) {
    // An ellipsoid school, denser at the core, each fish with its own wander.
    const r = Math.cbrt(rand());
    const a = rand() * Math.PI * 2;
    const b = Math.acos(2 * rand() - 1);
    fish.push({ off: [Math.sin(b) * Math.cos(a) * r * 3.2, Math.cos(b) * r * 0.9, Math.sin(b) * Math.sin(a) * r * 1.6], ph: rand() * 6.28, lag: rand() * 0.6, s: 0.15 + rand() * 0.04 });
  }
  const fishAt = (f, t) => {
    const u = t - f.lag;
    const [cx, cy, cz] = SCHOOL(u);
    // The school breathes and banks: the shape stretches, folds, and turns as a body.
    const turn = Math.sin(u * 0.45 + f.off[0] * 0.25) * 0.35;
    const ox = f.off[0] * (1 + 0.15 * Math.sin(u * 0.6)) * Math.cos(turn) - f.off[2] * Math.sin(turn);
    const oz = f.off[0] * Math.sin(turn) + f.off[2] * Math.cos(turn);
    return [cx + ox + Math.sin(u * 1.3 + f.ph) * 0.12, cy + f.off[1] + Math.sin(u * 0.9 + f.off[0]) * 0.25, cz + oz + Math.cos(u * 1.1 + f.ph) * 0.12];
  };
  const M = new THREE.Matrix4();
  const S3 = new THREE.Vector3();
  // Distant silhouettes: larger fish crossing the haze in the deep.
  const farMesh = new THREE.InstancedMesh(fishGeo, new THREE.MeshBasicMaterial({ color: blend("ink", "hair", 0.5) }), 7);
  farMesh.frustumCulled = false;
  under.add(farMesh);
  const farFish = Array.from({ length: 7 }, (_, i) => ({ path: (t) => [-40 + (t - 30) * (1.8 + i * 0.2) + i * 6, -14 - i * 1.5 + Math.sin(t * 0.3 + i) * 0.8, -62 - i * 4], s: 0.9 + (i % 3) * 0.3 }));

  /* --- the turtle --- */
  const turtle = new THREE.Group();
  const turtleBody = new THREE.Group();
  turtle.add(turtleBody);
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTexture(PAINT), roughness: 0.45, metalness: 0.05, envMapIntensity: 1.3 });
  const shapeShell = (g, top) => {
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      // Teardrop outline, widest at the front third; a low dome above, flatter below.
      const wdt = 0.42 * (1 + 0.14 * z - 0.2 * z * z) * (z < 0 ? 1 + 0.22 * z : 1);
      const X = x * wdt;
      const Z = z * 0.5;
      const Y = top ? y * 0.18 * (1 - 0.2 * z * z) + 0.01 : y * 0.075;
      p.setXYZ(i, X, Y, Z);
      if (top) uv.setXY(i, X / 0.9 + 0.5, Z + 0.5);
    }
    g.computeVertexNormals();
    return g;
  };
  const shellTop = new THREE.Mesh(shapeShell(new THREE.SphereGeometry(1, 72, 24, 0, Math.PI * 2, 0, Math.PI / 2), true), shellMat);
  const plastron = new THREE.Mesh(shapeShell(new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), false), new THREE.MeshStandardMaterial({ color: blend("practical", "sclera", 0.4).lerp(col("shell"), 0.35).multiplyScalar(0.55), roughness: 0.7 }));
  turtleBody.add(shellTop, plastron);
  const scaleTex = scaleTexture(blend("hair", "shell", 0.35), blend("practical", "sclera", 0.45).lerp(col("shell"), 0.25), 70, 4);
  const skinMat = new THREE.MeshStandardMaterial({ map: scaleTex, roughness: 0.55, envMapIntensity: 1.1, side: THREE.DoubleSide });
  const neckMat = new THREE.MeshStandardMaterial({ color: blend("shell", "moon", 0.25).multiplyScalar(0.75), roughness: 0.8 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.16, 12), neckMat);
  neck.rotation.x = Math.PI / 2;
  neck.position.set(0, 0.0, 0.5);
  turtleBody.add(neck);
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.01, 0.56);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skinMat);
  head.scale.set(0.085, 0.075, 0.13);
  head.position.z = 0.09;
  headPivot.add(head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), new THREE.MeshStandardMaterial({ color: col("hair"), roughness: 0.05, metalness: 0.2, envMapIntensity: 2 }));
    eye.position.set(s * 0.06, 0.018, 0.13);
    headPivot.add(eye);
  }
  turtleBody.add(headPivot);
  const flipperGeo = (len, chord, sweep) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, chord * 0.45);
    sh.bezierCurveTo(len * 0.3, chord * 0.7, len * 0.75, chord * 0.2 - sweep * 0.6, len, -sweep);
    sh.bezierCurveTo(len * 0.7, -chord * 0.35 - sweep * 0.7, len * 0.3, -chord * 0.6, 0, -chord * 0.45);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 18 });
    g.translate(0, 0, -0.009);
    g.rotateX(Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 2.2);
    return g;
  };
  const fore = flipperGeo(0.68, 0.2, 0.16);
  const hind = flipperGeo(0.2, 0.15, 0.03);
  const flippers = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.28, 0.0, 0.22);
    const m = new THREE.Mesh(fore, skinMat);
    m.scale.x = s;
    pivot.add(m);
    turtleBody.add(pivot);
    flippers.push({ pivot, s });
  }
  const hinds = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.22, -0.02, -0.42);
    const m = new THREE.Mesh(hind, skinMat);
    m.scale.x = s;
    m.rotation.y = s * 0.5;
    pivot.add(m);
    turtleBody.add(pivot);
    hinds.push({ pivot, s });
  }
  turtle.scale.setScalar(1.1);
  under.add(turtle);

  /* --- the compositor: grade, bloom, the waterline crossing the lens, grain --- */
  const frame = canvas2d(W, H);
  const fx = frame.getContext("2d");
  const small = canvas2d(480, 270);
  const sx = small.getContext("2d");
  const grain = canvas2d(512, 512);
  {
    const g = grain.getContext("2d");
    const img = g.createImageData(512, 512);
    const r = mulberry32(77);
    for (let i = 0; i < 512 * 512; i += 1) {
      const v = 128 + (r() - 0.5) * 70;
      img.data.set([v, v, v, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
  }
  const dropCanvas = canvas2d(W, H);
  {
    const g = dropCanvas.getContext("2d");
    const r = mulberry32(55);
    for (let i = 0; i < 55; i += 1) {
      const x = r() * W;
      const y = r() * H;
      const rr = 5 + r() ** 2 * 40;
      const grad = g.createRadialGradient(x - rr * 0.25, y - rr * 0.3, rr * 0.1, x, y, rr);
      grad.addColorStop(0, "rgba(160,220,255,0.06)");
      grad.addColorStop(0.85, "rgba(160,220,255,0.05)");
      grad.addColorStop(0.95, "rgba(190,235,255,0.28)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  }
  // When the camera goes under: found once from the path and the waves.
  const camUnder = (t) => {
    const [x, y, z] = CAM(t);
    return y < waveH(x, z, t) - 0.01;
  };
  let crossT = 14.3;
  for (let t = 12; t < 16; t += 1 / 96)
    if (camUnder(t)) {
      crossT = t;
      break;
    }

  /* --- one frame --- */
  const look = new THREE.Vector3();
  function render(t) {
    uTime.value = t;
    const [cx, cy0, cz] = CAM(t);
    const floor = sandY(cx, cz) + 0.06;
    const cy = Math.max(cy0, floor);
    camera.position.set(cx, cy, cz);
    camera.lookAt(look.set(...LOOK(t)));
    camera.fov = FOV(t)[0];
    camera.updateProjectionMatrix();
    const isUnder = t >= crossT;
    air.visible = !isUnder;
    under.visible = isUnder;
    wash.pts.visible = t > 4 && t < 13;
    scene.fog = isUnder ? fogSea : fogAir;
    sandUniforms.uAbove.value = isUnder ? 0 : 1;
    seaUniforms.uAbove.value = isUnder ? 0 : 1;
    scene.environment = isUnder ? envSea : envAir;
    hemi.intensity = isUnder ? 0.18 : 0.35;
    star.intensity = isUnder ? 0.12 : 0.25;
    air.children[0].position.copy(camera.position);
    under.children[0].position.copy(camera.position);

    // Depth of field for the plankton.
    const [focus, coc] = FOCUS(t);
    for (const pl of [field, wash, deep]) {
      pl.uniforms.uCam.value.copy(camera.position);
      pl.uniforms.uFocus.value = focus;
      pl.uniforms.uCoc.value = coc;
    }
    wash.uniforms.uCentre.value.set(1.0, 0, shoreZ(1.0) - 2.1);
    // The deep brightens as the camera goes down; two slow pulses of light far off.
    deep.uniforms.uOn.value = smoothstep(26, 36, t) * 0.9 + 0.15;
    field.uniforms.uBase.value = 1.3 + smoothstep(30, 40, t) * 0.4;
    deep.uniforms.uPulseA.value.set(-40, -30, -150, t > 33.5 ? (t - 33.5) * 12 : -1);
    deep.uniforms.uPulseB.value.set(50, -36, -170, t > 36 ? (t - 36) * 12 : -1);

    // The wash light: the glow on the waterline lighting the wet sand, pulsing with the waves.
    const wx = cx + 1.5;
    const wz = shoreZ(wx) + 0.8;
    const wdh = waveH(wx, wz, t + 0.05) - waveH(wx, wz, t);
    washLight.position.set(wx, 0.25, wz);
    washLight.intensity = 0;
    void wdh;

    // Fish.
    for (let i = 0; i < FISH; i += 1) {
      const f = fish[i];
      const [x, y, z] = fishAt(f, t);
      const [x2, y2, z2] = fishAt(f, t + 0.06);
      const hd = Math.atan2(x2 - x, z2 - z);
      const pt = Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z));
      M.compose(S3.set(x, y, z), _q.setFromEuler(_e.set(-pt, hd, Math.sin(t * 2 + f.ph) * 0.1, "YXZ")), _v.set(f.s, f.s, f.s));
      fishMesh.setMatrixAt(i, M);
    }
    fishMesh.instanceMatrix.needsUpdate = true;
    farFish.forEach((f, i) => {
      const [x, y, z] = f.path(t);
      const [x2, , z2] = f.path(t + 0.1);
      M.compose(S3.set(x, y, z), _q.setFromEuler(_e.set(0, Math.atan2(x2 - x, z2 - z), 0)), _v.set(f.s, f.s, f.s));
      farMesh.setMatrixAt(i, M);
    });
    farMesh.instanceMatrix.needsUpdate = true;

    // Turtle.
    const tf = turtleFrame(t);
    turtle.position.set(tf.p.x, tf.p.y, tf.p.z);
    turtle.quaternion.copy(tf.q);
    for (const fl of flippers) {
      fl.pivot.rotation.set(0, 0, 0);
      fl.pivot.rotation.order = "YZX";
      fl.pivot.rotation.y = -fl.s * tf.f.sweep;
      fl.pivot.rotation.z = fl.s * tf.f.elev;
      fl.pivot.rotation.x = tf.f.twist;
    }
    for (const h of hinds) {
      h.pivot.rotation.z = h.s * (0.15 + Math.sin(t * 1.3 + h.s) * 0.12);
      h.pivot.rotation.y = h.s * Math.sin(t * 0.5) * 0.15;
    }
    headPivot.rotation.set(Math.sin(t * 0.6) * 0.06, Math.sin(t * 0.35) * 0.12, 0);

    // Disturbance: where fish, flippers, and the camera have just passed, the plankton flashes.
    let k = 0;
    const put = (v, r, a) => {
      if (k >= MAXD) return;
      dist.pos[k].set(v.x ?? v[0], v.y ?? v[1], v.z ?? v[2], r);
      dist.amt[k] = a;
      k += 1;
    };
    for (const age of [0, 0.25, 0.5, 0.8, 1.1]) {
      const [x, y, z] = CAM(t - age);
      put([x, y, z], 0.75, isUnder ? 1.8 * Math.exp(-age / 0.5) * (1 - smoothstep(crossT + 2.5, crossT + 4, t)) : 0);
    }
    if (t > 16 && t < 30)
      for (const age of [0, 0.35, 0.7])
        for (let j = 0; j < 14; j += 1) put(fishAt(fish[(j * 53) % FISH], t - age), 0.45, 1.25 * Math.exp(-age / 0.45));
    if (t > 23)
      for (const age of [0, 0.5, 1.0])
        for (const p of turtlePoints(t - age)) put(p.v, 0.5, p.w * 1.3 * Math.exp(-age / 0.6));
    for (; k < MAXD; k += 1) dist.amt[k] = 0;

    // The glow lights the animals that make it.
    const [sxp, syp, szp] = SCHOOL(t);
    schoolLight.position.set(sxp, syp - 0.6, szp + 0.5);
    schoolLight.intensity = isUnder ? 7 * smoothstep(17, 19, t) * (1 - smoothstep(25, 27, t)) : 0;
    const pts = turtlePoints(t);
    turtleLight.position.set(tf.p.x + 0.3, tf.p.y + 1.3, tf.p.z - 0.2);
    turtleLight.intensity = isUnder ? 7 * smoothstep(24.5, 26.5, t) * (0.7 + 0.3 * flipper(t).power) : 0;

    // Bubbles.
    for (const b of bubbles) {
      const u = t - b.t0;
      const on = u > 0 && isUnder;
      b.sp.visible = on;
      if (!on) continue;
      const y = b.y + u * b.v;
      b.sp.position.set(b.x + Math.sin(t * 5 + b.w) * 0.02, Math.min(y, waveH(b.x, b.z, t) - 0.02), b.z + Math.cos(t * 4 + b.w) * 0.02);
      const s = b.s * (1 + u * 0.05);
      b.sp.scale.set(s, s * (0.85 + 0.1 * Math.sin(t * 12 + b.w)), 1);
      b.sp.visible = y < waveH(b.x, b.z, t) - 0.02;
    }
    for (const b of washBubbles) {
      const s = sandY(b.x, b.z);
      const h = waveH(b.x, b.z, t);
      const on = !isUnder && h > s + 0.01 && t > 5 && t < 13;
      b.sp.visible = on;
      if (!on) continue;
      b.sp.position.set(b.x + Math.sin(t * 1.4 + b.w) * 0.02, mix(s, h, 0.2 + b.k * 0.75), b.z + Math.cos(t * 1.1 + b.w) * 0.02);
      b.sp.scale.set(b.s, b.s, 1);
    }
    const wrap = (v, s) => ((((v + s / 2) % s) + s) % s) - s / 2;
    const cp = camera.position;
    for (let i = 0; i < snowN; i += 1) {
      const [bx, by, bz] = snowBase[i];
      snowPos[i * 3] = cp.x + wrap(bx + t * 0.07 - cp.x, 16);
      snowPos[i * 3 + 1] = cp.y + wrap(by - t * 0.02 - cp.y, 10);
      snowPos[i * 3 + 2] = cp.z + wrap(bz - t * 0.03 - cp.z, 16);
    }
    snowGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    // Grade: deep blacks, saturated blue light.
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
    fx.filter = "contrast(1.08) saturate(1.12)";
    fx.drawImage(glCanvas, 0, 0);
    // Bloom: only the brightest light spreads.
    sx.globalCompositeOperation = "source-over";
    sx.filter = "brightness(0.9) contrast(3.2)";
    sx.drawImage(glCanvas, 0, 0, 480, 270);
    fx.globalCompositeOperation = "lighter";
    fx.filter = "blur(6px)";
    fx.globalAlpha = 0.55;
    fx.drawImage(small, 0, 0, W, H);
    fx.filter = "blur(22px)";
    fx.globalAlpha = 0.35;
    fx.drawImage(small, 0, 0, W, H);
    fx.filter = "none";
    fx.globalCompositeOperation = "source-over";
    // The waterline crossing the lens: a refracting band sweeps down, then droplets run off.
    const kx = (t - crossT) / 0.35;
    const band = Math.exp(-kx * kx);
    if (band > 0.01) {
      const y0 = H * (0.5 - kx * 0.6);
      for (let y = Math.max(0, y0 - 180); y < Math.min(H, y0 + 180); y += 12) {
        const off = Math.sin(y * 0.05 + t * 30) * 14 * band;
        fx.globalAlpha = band * 0.85;
        fx.drawImage(glCanvas, 0, y, W, 12, off, y, W, 12);
      }
      fx.globalAlpha = band * 0.25;
      fx.fillStyle = css(blend("plankton", "oceanlight", 0.5));
      fx.fillRect(0, y0 - 6, W, 12);
    }
    const drops = smoothstep(crossT - 0.15, crossT + 0.05, t) * (1 - smoothstep(crossT + 0.3, crossT + 1.6, t));
    if (drops > 0.01) {
      fx.globalAlpha = drops * 0.6;
      fx.drawImage(dropCanvas, 0, (t - crossT) * 140);
    }
    // Vignette and grain.
    fx.globalAlpha = 1;
    const vg = fx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    fx.fillStyle = vg;
    fx.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = "soft-light";
    fx.globalAlpha = 0.18;
    const f = Math.round(t * 24);
    const ox = (f * 137) % 512;
    const oy = (f * 251) % 512;
    for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) fx.drawImage(grain, x, y);
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
  }
  void fbm;
  void xf;
  void timedPath;
  return { render, frame };
}
