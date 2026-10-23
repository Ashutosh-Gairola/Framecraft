/**
 * Mountain Shrine — the world, as a pure function of film time.
 *
 * createWorld(canvas, PAINT) builds everything once (seeded terrain, forests, river, lake,
 * waterfalls, bridge, shrine, flags, lanterns, birds, clouds, sky, light) and returns
 * render(t): the camera on its one continuous path and every moving thing, from t alone.
 * Every color is derived from PAINT, the sheet's paints. No clock, no Math.random().
 * skills/html-anime-3d-actor/SKILL.md describes the method.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const W = 1920;
const H = 1080;
export const DURATION = 80;
const WATER = 12;
const TOP = 262;

/* ---------------- seeded math ---------------- */

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(i, j) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    s += amp * vnoise(x * f + i * 17.3, z * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
function ridged(x, z, oct = 5) {
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
const smoothstep = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const mix = (a, b, u) => a + (b - a) * u;

/** The river's centerline: it winds south from the foot of the peak. */
export const riverX = (z) => 80 + 120 * Math.sin(z / 260) + 40 * Math.sin(z / 97);

/** The land: rolling hills, ridges, the shrine's peak with a flat summit, the far snow range, the valley. */
export function height(x, z) {
  const r = Math.hypot(x, z);
  let h = 30 + fbm(x / 180, z / 180) * 90;
  h += ridged(x / 260, z / 260) * 150 * smoothstep(220, 650, r);
  h += 235 * Math.exp(-((r / 230) ** 2));
  h += 560 * smoothstep(1050, 1650, r) * (0.55 + 0.45 * ridged(x / 420, z / 420));
  // Fine relief: knolls and rock steps, so the slopes aren't smooth clay.
  h += (fbm(x / 26, z / 26, 3) - 0.5) * 12 + (ridged(x / 70, z / 70, 3) - 0.3) * 12 * smoothstep(60, 200, r);
  // The valley south of the peak, and the river cut into it.
  const valley = smoothstep(140, 300, z) * (1 - smoothstep(1500, 1750, z));
  const d = Math.abs(x - riverX(z));
  h -= 95 * Math.exp(-((d / 280) ** 2)) * valley;
  h = mix(h, WATER - 7 + d * 0.04, Math.exp(-((d / 55) ** 2)) * valley);
  // The lake.
  const ld = Math.hypot(x - riverX(560), z - 560);
  h = mix(h, WATER - 9, Math.exp(-((ld / 120) ** 2)));
  // The summit plateau.
  h = mix(h, TOP, smoothstep(62, 28, r));
  return h;
}

/* ---------------- textures made once ---------------- */

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function puffTexture(hex) {
  const rand = mulberry32(11);
  return canvasTexture(256, 256, (g, w, h) => {
    const col = new THREE.Color(hex);
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    for (let i = 0; i < 14; i += 1) {
      const x = w * (0.25 + rand() * 0.5);
      const y = h * (0.35 + rand() * 0.35);
      const r = w * (0.16 + rand() * 0.22);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${rgb},0.55)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
}

function fallTexture() {
  const rand = mulberry32(23);
  const tex = canvasTexture(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i += 1) {
      g.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`;
      g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 10 + rand() * 40);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function rippleTexture() {
  const rand = mulberry32(31);
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const field = new Float32Array(size * size);
  for (let i = 0; i < 26; i += 1) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 10 + rand() * 40;
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1) {
        const dx = Math.min(Math.abs(x - cx), size - Math.abs(x - cx));
        const dy = Math.min(Math.abs(y - cy), size - Math.abs(y - cy));
        field[y * size + x] += Math.sin(Math.hypot(dx, dy) / r * 6.28) * Math.exp(-Math.hypot(dx, dy) / (r * 2));
      }
  }
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const gx = field[y * size + ((x + 1) % size)] - field[y * size + ((x + size - 1) % size)];
      const gy = field[((y + 1) % size) * size + x] - field[((y + size - 1) % size) * size + x];
      const n = new THREE.Vector3(-gx * 0.6, -gy * 0.6, 1).normalize();
      const k = (y * size + x) * 4;
      img.data[k] = (n.x * 0.5 + 0.5) * 255;
      img.data[k + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[k + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(110, 110);
  return tex;
}

/** Surface grain for the land: a tiling normal map of small bumps and cracks. */
function grainTexture() {
  const size = 256;
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      // Periodic noise: sample on a torus so the tile repeats without seams.
      const a = (x / size) * Math.PI * 2;
      const b = (y / size) * Math.PI * 2;
      const u = Math.cos(a) * 3 + 10;
      const v = Math.sin(a) * 3 + Math.cos(b) * 3 + 20;
      field[y * size + x] = fbm(u * 2.2, v * 2.2 + Math.sin(b) * 6.6, 4) + 0.4 * ridged(u * 4, v * 4, 2);
    }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const gx = field[y * size + ((x + 1) % size)] - field[y * size + ((x + size - 1) % size)];
      const gy = field[((y + 1) % size) * size + x] - field[((y + size - 1) % size) * size + x];
      const n = new THREE.Vector3(-gx * 4, -gy * 4, 1).normalize();
      const k = (y * size + x) * 4;
      img.data[k] = (n.x * 0.5 + 0.5) * 255;
      img.data[k + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[k + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(420, 420);
  return tex;
}

/**
 * A cumulus puff: overlapping round lobes, a flatter base, lit warm from above and
 * shaded underneath — not a flat blur. variant changes the lobe layout.
 */
function cumulusTexture(PAINT, variant) {
  const rand = mulberry32(100 + variant * 7);
  const light = new THREE.Color(PAINT.practical);
  const warm = new THREE.Color(PAINT.moon);
  const shade = new THREE.Color().lerpColors(new THREE.Color(PAINT.glacier), new THREE.Color(PAINT.moon), 0.55);
  const rgba = (c, a) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  return canvasTexture(512, 256, (g, w, h) => {
    const lobes = [];
    for (let i = 0; i < 22; i += 1) {
      const u = rand();
      const x = w * (0.12 + u * 0.76);
      const top = h * (0.62 - Math.sin(u * Math.PI) * (0.32 + rand() * 0.12));
      const r = h * (0.13 + rand() * 0.16) * (0.6 + Math.sin(u * Math.PI) * 0.6);
      lobes.push([x, top + r * 0.4, r]);
    }
    // Body: soft lobes in the shade color.
    for (const [x, y, r] of lobes) {
      const grad = g.createRadialGradient(x, y + r * 0.2, r * 0.1, x, y, r * 1.1);
      grad.addColorStop(0, rgba(shade, 0.75));
      grad.addColorStop(0.6, rgba(shade, 0.4));
      grad.addColorStop(1, rgba(shade, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r * 1.25, 0, Math.PI * 2);
      g.fill();
    }
    // Light: each lobe lit from the top, warm at the crown.
    for (const [x, y, r] of lobes) {
      const grad = g.createRadialGradient(x - r * 0.15, y - r * 0.4, r * 0.05, x, y - r * 0.1, r * 1.25);
      grad.addColorStop(0, rgba(light, 1));
      grad.addColorStop(0.55, rgba(warm, 0.8));
      grad.addColorStop(1, rgba(warm, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r * 1.25, 0, Math.PI * 2);
      g.fill();
    }
    // A flat, shaded base.
    g.globalCompositeOperation = "destination-in";
    const base = g.createLinearGradient(0, h * 0.55, 0, h * 0.95);
    base.addColorStop(0, "rgba(0,0,0,1)");
    base.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
  });
}

/** The cloud veil the camera flies through: soft, uneven, wider than the frame. */
function veilTexture(PAINT) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const col = new THREE.Color(PAINT.practical);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const n = fbm(x / 40 + 3, y / 40 + 7, 5);
      const k = (y * size + x) * 4;
      img.data[k] = col.r * 255;
      img.data[k + 1] = col.g * 255;
      img.data[k + 2] = col.b * 255;
      img.data[k + 3] = Math.min(255, Math.max(0, (n - 0.25) * 2.2) * 255);
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * A curved hip roof in the Himalayan pagoda style: concave slopes, eaves that overhang,
 * corners that turn up. Returns a group with the roof, tile ribs, a gold fascia, and the ridge.
 */
function pagodaRoof(w, d, h, over, curl, mats) {
  const P = 72;
  const R = 12;
  const hw = w / 2 + over;
  const hd = d / 2 + over;
  const ridgeW = w * 0.12;
  const ridgeD = 0.6;
  const perim = [];
  for (let i = 0; i < P; i += 1) {
    const t = (i / P) * 4;
    const side = Math.floor(t);
    const f = t - side;
    const [x, z] = side === 0 ? [-1 + 2 * f, 1] : side === 1 ? [1, 1 - 2 * f] : side === 2 ? [1 - 2 * f, -1] : [-1, -1 + 2 * f];
    perim.push([x, z, Math.pow(Math.abs(x) * Math.abs(z), 6)]);
  }
  const point = (i, k) => {
    const s = k / R;
    const [x, z, corner] = perim[i % P];
    return new THREE.Vector3(x * mix(hw, ridgeW, s), h * Math.pow(s, 1.7) + curl * corner * Math.pow(1 - s, 2.4), z * mix(hd, ridgeD, s));
  };
  const pos = [];
  const idx = [];
  for (let k = 0; k <= R; k += 1) for (let i = 0; i < P; i += 1) pos.push(...point(i, k).toArray());
  for (let k = 0; k < R; k += 1)
    for (let i = 0; i < P; i += 1) {
      const a = k * P + i;
      const b = k * P + ((i + 1) % P);
      const c = (k + 1) * P + i;
      const e = (k + 1) * P + ((i + 1) % P);
      idx.push(a, c, b, b, c, e);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mats.roof));
  // Tile ribs from eave to ridge.
  const rib = [];
  for (let i = 0; i < P; i += 2)
    for (let k = 0; k < R; k += 1) rib.push(...point(i, k).toArray(), ...point(i, k + 1).toArray());
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute("position", new THREE.Float32BufferAttribute(rib, 3));
  group.add(new THREE.LineSegments(ribGeo, mats.rib));
  // Gold fascia along the eave, and the ridge cap.
  const eave = new THREE.CatmullRomCurve3(perim.map((_, i) => point(i, 0).add(new THREE.Vector3(0, -0.3, 0))), true);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(eave, 160, 0.55, 6, true), mats.gold));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(ridgeW * 2 + 1.4, 1.1, 1.6), mats.gold);
  cap.position.y = h + 0.5;
  group.add(cap);
  // A lantern and a small bell at each upturned corner.
  for (const [x, z] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 8), mats.lantern);
    lamp.position.set(x * hw, curl - 2.4, z * hd);
    group.add(lamp);
  }
  return group;
}

/* ---------------- the camera path ---------------- */

/** Hermite through timed points: velocity carries through every point; it starts and ends at rest. */
function timedPath(points) {
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
      if (k <= 0 || k >= n - 1) return [0, 0, 0];
      const [ta, ...a] = points[k - 1];
      const [tb, ...b] = points[k + 1];
      return a.map((v, d) => (b[d] - v) / (tb - ta));
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

function orbit(t0, t1, cx, cz, y, radius, a0, a1, step = 2.5) {
  const out = [];
  for (let t = t0; t <= t1 + 1e-6; t += step) {
    const a = a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
    out.push([t, cx + Math.sin(a) * radius, y, cz + Math.cos(a) * radius]);
  }
  return out;
}

const deg = Math.PI / 180;

// Positions: above the clouds from the south, down into the valley over the river and lake,
// up the steps to the summit, a slow orbit, then up and back over the whole range.
const CAM = timedPath([
  [0, 230, 560, 1450],
  [6, 200, 520, 1290],
  [12, 160, 460, 1130],
  [18, 130, 390, 990],
  [22, riverX(880) + 20, 180, 880],
  [26, riverX(760), 75, 760],
  [30, riverX(620), 48, 620],
  [33, riverX(520), 40, 500],
  [36, riverX(380) - 10, 92, 360],
  [39, 60, 200, 270],
  [42, 30, 285, 180],
  ...orbit(44, 58, 0, 0, 312, 120, 10 * deg, -150 * deg, 2),
  [62, -170, 420, 260],
  [67, -330, 600, 620],
  [73, -460, 820, 1180],
  [80, -560, 1000, 1700],
]);
// Where the camera looks: ahead along the valley, at the shrine while near it.
const LOOK = timedPath([
  [0, 0, 330, 0],
  [12, 0, 300, 0],
  [18, 60, 240, 400],
  [22, riverX(700), 60, 700],
  [28, riverX(480), 40, 480],
  [33, riverX(300), 80, 300],
  [36, 10, 270, 40],
  [41, 0, 290, 0],
  [58, 0, 290, 0],
  [80, 0, 250, 0],
]);

/* ---------------- the world ---------------- */

let shared = null;

/**
 * A scene's view of the world. The world is built once per page and drawn by one WebGL
 * renderer; each scene's 2D canvas copies the frame, so four scenes cost one build.
 */
export function createWorld(canvas, PAINT) {
  if (!shared) shared = buildWorld(PAINT);
  const ctx = canvas.getContext("2d");
  return {
    render(t) {
      shared.render(t);
      ctx.drawImage(shared.canvas, 0, 0, canvas.width, canvas.height);
    },
  };
}

function buildWorld(PAINT) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const rand = mulberry32(5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const haze = blend("sky", "moon", 0.35);
  scene.fog = new THREE.FogExp2(haze, 0.00042);
  const camera = new THREE.PerspectiveCamera(36, W / H, 1, 9000);

  // Sun: low in the east-south-east, rising a little over the film.
  const sunDir = new THREE.Vector3();
  const sunAt = (t) => {
    const el = (9 + t * 0.12) * deg;
    const az = 118 * deg;
    return sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  };

  // Sky dome: deep blue overhead, warm at the horizon, a glow around the sun.
  const skyGeo = new THREE.SphereGeometry(6000, 48, 24);
  const skyCol = [];
  const zenith = blend("glacier", "ink", 0.25);
  const horizon = blend("sky", "moon", 0.4);
  const glow = blend("moon", "practical", 0.5);
  const s0 = sunAt(0).clone();
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const c = new THREE.Color().lerpColors(horizon, zenith, smoothstep(0.02, 0.6, v.y));
    c.lerp(glow, Math.pow(Math.max(0, v.dot(s0)), 6) * 0.8);
    if (v.y < 0) c.copy(horizon);
    skyCol.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: blend("moon", "practical", 0.5), fog: false }));
  scene.add(sunDisc);

  // Reflections come from the sky.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  // Light.
  const sun = new THREE.DirectionalLight(blend("sky", "practical", 0.45), 2.6);
  const hemi = new THREE.HemisphereLight(blend("glacier", "moon", 0.4), blend("meadow", "sky", 0.3), 1.0);
  scene.add(sun, hemi);

  // Terrain, colored by height and slope.
  const tSize = 3800;
  const tSeg = 440;
  const tGeo = new THREE.PlaneGeometry(tSize, tSize, tSeg, tSeg);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position;
  for (let i = 0; i < tp.count; i += 1) tp.setY(i, height(tp.getX(i), tp.getZ(i)));
  tGeo.computeVertexNormals();
  // Heights from the grid, bilinear: placing trees and steps without re-running the noise.
  const cell = tSize / tSeg;
  const ground = (x, z) => {
    const gx = Math.min(tSeg - 1e-6, Math.max(0, (x + tSize / 2) / cell));
    const gz = Math.min(tSeg - 1e-6, Math.max(0, (z + tSize / 2) / cell));
    const i = Math.floor(gx);
    const k = Math.floor(gz);
    const fx = gx - i;
    const fz = gz - k;
    const at = (a, b) => tp.getY(b * (tSeg + 1) + a);
    return (at(i, k) * (1 - fx) + at(i + 1, k) * fx) * (1 - fz) + (at(i, k + 1) * (1 - fx) + at(i + 1, k + 1) * fx) * fz;
  };
  const tn = tGeo.attributes.normal;
  const rock = blend("hair", "iris", 0.55);
  const rockLight = blend("iris", "sky", 0.35);
  const meadow = col("meadow");
  const grassDeep = blend("meadow", "pine", 0.5);
  const grassDry = blend("meadow", "sky", 0.4);
  const forest = blend("pine", "ink", 0.2);
  const snow = col("sclera");
  const shore = blend("skin", "iris", 0.45);
  const earth = blend("iris", "skin", 0.3);
  const tc = [];
  const row = tSeg + 1;
  for (let i = 0; i < tp.count; i += 1) {
    const x = tp.getX(i);
    const y = tp.getY(i);
    const z = tp.getZ(i);
    const slope = 1 - tn.getY(i);
    const n = fbm(x / 60, z / 60, 3);
    const n2 = fbm(x / 18 + 40, z / 18 - 40, 2);
    // Grass in patches: deep, fresh, and dry; earth where it wears thin.
    let c = new THREE.Color().lerpColors(meadow, grassDeep, smoothstep(0.35, 0.65, n));
    c.lerp(grassDry, smoothstep(0.58, 0.75, n2) * 0.6);
    c.lerp(earth, smoothstep(0.7, 0.82, n2) * 0.35);
    c.lerp(forest, smoothstep(60, 170, y + n * 60) * 0.65);
    // Rock on the steep ground, banded in strata.
    const strata = 0.82 + 0.18 * Math.sin(y / 5.5 + n * 5);
    const rk = new THREE.Color().lerpColors(rock, rockLight, smoothstep(250, 520, y) * 0.7).multiplyScalar(strata);
    c.lerp(rk, smoothstep(0.16, 0.38, slope + (n - 0.5) * 0.25));
    c.lerp(snow, smoothstep(430, 620, y + n * 80) * (1 - smoothstep(0.35, 0.6, slope)));
    c.lerp(shore, 1 - smoothstep(WATER + 1, WATER + 6, y));
    const dist = Math.hypot(x, z);
    if (dist < 75) c.lerp(blend("skin", "sky", 0.4), smoothstep(75, 40, dist) * 0.7);
    // Ambient occlusion: hollows darker, crests a touch brighter.
    const gi = i % row;
    const gk = Math.floor(i / row);
    if (gi > 2 && gk > 2 && gi < row - 3 && gk < row - 3) {
      const around = (tp.getY(i - 3) + tp.getY(i + 3) + tp.getY(i - 3 * row) + tp.getY(i + 3 * row)) / 4;
      const cav = around - y;
      c.multiplyScalar(1 - Math.min(0.38, Math.max(0, cav / 30)) + Math.min(0.08, Math.max(0, -cav / 60)));
    }
    tc.push(c.r, c.g, c.b);
  }
  tGeo.setAttribute("color", new THREE.Float32BufferAttribute(tc, 3));
  scene.add(new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, normalMap: grainTexture(), normalScale: new THREE.Vector2(0.45, 0.45) })));

  // Water: river and lake, rippling and reflecting the sky.
  const ripples = rippleTexture();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(tSize, tSize),
    new THREE.MeshStandardMaterial({ color: blend("glacier", "pine", 0.35), roughness: 0.06, metalness: 0.2, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER;
  scene.add(water);

  // Pine forests: instanced cones in clustered stands on the slopes.
  const pineGeo = new THREE.ConeGeometry(4.2, 15, 7);
  pineGeo.translate(0, 7.5, 0);
  const pines = new THREE.InstancedMesh(pineGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), 7000);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  let placed = 0;
  for (let tries = 0; tries < 60000 && placed < 7000; tries += 1) {
    const x = (rand() - 0.5) * 2600;
    const z = (rand() - 0.5) * 2600 + 300;
    const y = ground(x, z);
    if (y < WATER + 4 || y > 330 || Math.hypot(x, z) < 90) continue;
    const e = cell;
    const slope = Math.hypot(ground(x + e, z) - ground(x - e, z), ground(x, z + e) - ground(x, z - e)) / (2 * e);
    if (slope > 0.9 || vnoise(x / 140, z / 140) < 0.45) continue;
    const s = 0.7 + rand() * 1.1;
    m.compose(sv.set(x, y - 1, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28), new THREE.Vector3(s, s * (0.9 + rand() * 0.5), s));
    pines.setMatrixAt(placed, m);
    pines.setColorAt(placed, new THREE.Color().lerpColors(col("pine"), blend("pine", "meadow", 0.4), rand() * 0.7));
    placed += 1;
  }
  pines.count = placed;
  scene.add(pines);

  // Wildflowers on the valley floor.
  const flowerColors = ["accent", "practical", "sky", "glacier"].map(col);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 1400);
  let fp = 0;
  for (let tries = 0; tries < 30000 && fp < 1400; tries += 1) {
    const z = 250 + rand() * 950;
    const x = riverX(z) + (rand() - 0.5) * 420;
    const y = ground(x, z);
    if (y < WATER + 2 || y > 70) continue;
    m.compose(sv.set(x, y + 0.6, z), q.identity(), new THREE.Vector3(1, 1, 1));
    flowers.setMatrixAt(fp, m);
    flowers.setColorAt(fp, flowerColors[fp % 4]);
    fp += 1;
  }
  flowers.count = fp;
  scene.add(flowers);

  // Boulders on the steep ground and along the river.
  const boulders = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), 1600);
  let bp = 0;
  for (let tries = 0; tries < 40000 && bp < 1600; tries += 1) {
    const river = rand() < 0.35;
    const z = river ? 200 + rand() * 1100 : (rand() - 0.5) * 2400 + 300;
    const x = river ? riverX(z) + (rand() < 0.5 ? -1 : 1) * (40 + rand() * 40) : (rand() - 0.5) * 2400;
    const y = ground(x, z);
    if (y < WATER - 2 || Math.hypot(x, z) < 70) continue;
    const e = cell;
    const slope = Math.hypot(ground(x + e, z) - ground(x - e, z), ground(x, z + e) - ground(x, z - e)) / (2 * e);
    if (!river && slope < 0.45) continue;
    const s = river ? 0.7 + rand() * 1.8 : 1 + rand() * 3;
    m.compose(sv.set(x, y + s * 0.3, z), q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3)), new THREE.Vector3(s * (0.8 + rand() * 0.5), s * (0.5 + rand() * 0.4), s));
    boulders.setMatrixAt(bp, m);
    boulders.setColorAt(bp, new THREE.Color().lerpColors(rock, rockLight, 0.35 + rand() * 0.6));
    bp += 1;
  }
  boulders.count = bp;
  scene.add(boulders);

  // The wooden bridge over the river.
  const wood = new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.3), roughness: 0.8 });
  const bridge = new THREE.Group();
  const bz = 380;
  const bx = riverX(bz);
  for (let i = -7; i <= 7; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 9), wood);
    plank.position.set(i * 2.8, WATER + 5 + Math.cos((i / 7) * 1.2) * 2.5, 0);
    bridge.add(plank);
  }
  for (const side of [-4.2, 4.2]) {
    for (let i = -7; i <= 7; i += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), wood);
      post.position.set(i * 2.8, WATER + 7.5 + Math.cos((i / 7) * 1.2) * 2.5, side);
      bridge.add(post);
    }
  }
  bridge.position.set(bx, 0, bz);
  bridge.rotation.y = Math.atan2(1, (riverX(bz + 1) - riverX(bz - 1)) / 2) + Math.PI / 2;
  scene.add(bridge);

  // Waterfalls on the valley walls, with mist at their feet.
  const fallTex = fallTexture();
  const falls = [];
  for (const [z, side] of [
    [470, 1],
    [760, -1],
    [1080, 1],
  ]) {
    const xTop = riverX(z) + side * 250;
    const yTop = height(xTop, z);
    const yBot = Math.max(WATER, height(riverX(z) + side * 120, z));
    const hgt = Math.max(30, yTop - yBot);
    const tex = fallTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, hgt / 60);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(16, hgt), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: col("practical"), depthWrite: false }));
    fall.position.set(riverX(z) + side * 190, yBot + hgt / 2, z);
    fall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(fall);
    falls.push(tex);
  }

  // The shrine on the summit: a three-tier pagoda on a railed stone plinth.
  const stone = new THREE.MeshStandardMaterial({ color: blend("iris", "sky", 0.42), roughness: 0.3, metalness: 0.05 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.35), roughness: 0.4 });
  const wall = new THREE.MeshStandardMaterial({ color: blend("practical", "skin", 0.2), roughness: 0.75 });
  const timber = new THREE.MeshStandardMaterial({ color: blend("hair", "iris", 0.45), roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: col("accent"), roughness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: blend("sky", "iris", 0.25), roughness: 0.25, metalness: 0.85 });
  const lanternMat = new THREE.MeshStandardMaterial({ color: blend("sky", "practical", 0.5), emissive: blend("sky", "accent", 0.25), emissiveIntensity: 1.6 });
  const roofMats = {
    roof: new THREE.MeshStandardMaterial({ color: blend("hair", "accent", 0.28), roughness: 0.5, side: THREE.DoubleSide }),
    rib: new THREE.LineBasicMaterial({ color: blend("hair", "ink", 0.5) }),
    gold,
    lantern: lanternMat,
  };
  const shrine = new THREE.Group();
  const add = (geo, mat, x, y, z, ry = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    shrine.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);

  // Plinth: three stone tiers, each capped with a darker course.
  const tiers = [
    [104, 0],
    [88, 4],
    [72, 8],
  ];
  for (const [size, y0] of tiers) {
    box(size, 4, size, stone, 0, TOP + y0, 0);
    box(size + 1.2, 0.8, size + 1.2, stoneDark, 0, TOP + y0 + 3.6, 0);
  }
  const deck = TOP + 12;
  // A red railing around the top tier.
  for (let i = -7; i <= 7; i += 1) {
    for (const [x, z] of [
      [i * 5, 35],
      [i * 5, -35],
      [35, i * 5],
      [-35, i * 5],
    ]) {
      if (Math.abs(x) < 8 && z > 30) continue;
      box(0.7, 3.2, 0.7, red, x, deck, z);
    }
  }
  for (const [w, d, x, z] of [
    [27, 0.6, -21.5, 35],
    [27, 0.6, 21.5, 35],
    [70, 0.6, 0, -35],
    [0.6, 70, 35, 0],
    [0.6, 70, -35, 0],
  ])
    box(w, 0.6, d, red, x, deck + 3, z);
  // Stairs up the plinth on the south side.
  for (let i = 0; i < 6; i += 1) box(14, 2, 4, stone, 0, TOP + i * 2, 52 - i * 3.2);

  // The hall: whitewashed walls in a timber frame, lattice windows, a carved red-and-gold door.
  const hallW = 40;
  const hallD = 30;
  const hallH = 15;
  box(hallW, hallH, hallD, wall, 0, deck, 0);
  for (const y of [deck, deck + 6.5, deck + hallH - 1.2]) {
    box(hallW + 1, 1.2, 1.2, timber, 0, y, hallD / 2 + 0.2);
    box(hallW + 1, 1.2, 1.2, timber, 0, y, -hallD / 2 - 0.2);
    box(1.2, 1.2, hallD + 1, timber, hallW / 2 + 0.2, y, 0);
    box(1.2, 1.2, hallD + 1, timber, -hallW / 2 - 0.2, y, 0);
  }
  for (const x of [-20, -10, 10, 20]) {
    box(1.2, hallH, 1.2, timber, x, deck, hallD / 2 + 0.2);
    box(1.2, hallH, 1.2, timber, x, deck, -hallD / 2 - 0.2);
  }
  const lattice = (x, z, ry) => {
    const win = new THREE.Group();
    const part = (w, h, mat, px, py, pz) => {
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), mat);
      m2.position.set(px, py, pz);
      win.add(m2);
    };
    part(6.2, 5.4, red, 0, 0, 0);
    part(6.8, 0.7, timber, 0, 2.9, 0.2);
    part(6.8, 0.7, timber, 0, -2.9, 0.2);
    for (const bx of [-2.6, -1.3, 0, 1.3, 2.6]) part(0.35, 5.4, timber, bx, 0, 0.3);
    for (const by of [-1.4, 0, 1.4]) part(6.2, 0.35, timber, 0, by, 0.3);
    win.position.set(x, deck + 9.5, z);
    win.rotation.y = ry;
    shrine.add(win);
  };
  for (const x of [-15, 15]) lattice(x, hallD / 2 + 0.3, 0);
  for (const x of [-12, 0, 12]) lattice(x, -hallD / 2 - 0.3, Math.PI);
  for (const z of [-7, 7]) {
    lattice(hallW / 2 + 0.3, z, Math.PI / 2);
    lattice(-hallW / 2 - 0.3, z, -Math.PI / 2);
  }
  box(10, 12.5, 0.8, red, 0, deck, hallD / 2 + 0.3);
  box(7.6, 10.5, 0.9, gold, 0, deck, hallD / 2 + 0.4);
  box(0.4, 10.5, 1, timber, 0, deck, hallD / 2 + 0.7);
  box(13, 1.6, 1.4, gold, 0, deck + 12.5, hallD / 2 + 0.5);
  // The porch: red columns with gold capitals.
  box(hallW + 6, 0.8, 8, stone, 0, deck, hallD / 2 + 4);
  for (const x of [-21, -13, -5, 5, 13, 21]) {
    add(new THREE.CylinderGeometry(0.8, 0.95, 15, 12), red, x, deck + 7.5, hallD / 2 + 7);
    box(2.2, 1, 2.2, gold, x, deck + 14.8, hallD / 2 + 7);
  }
  // Carved struts under the eaves.
  for (let i = -5; i <= 5; i += 1) {
    for (const [x, z, ry] of [
      [i * 4, hallD / 2 + 8.5, 0],
      [i * 4, -hallD / 2 - 1.5, Math.PI],
    ]) {
      const strut = box(0.8, 5, 0.8, timber, x, deck + 11, z, ry);
      strut.rotation.x = ry === 0 ? -0.6 : 0.6;
    }
  }
  // The bell under the porch eave.
  const bell = add(new THREE.LatheGeometry([[0, 0], [3, 0.3], [2.6, 2], [1.8, 4], [0.5, 4.6], [0, 4.7]].map(([x, y]) => new THREE.Vector2(x, y)), 18), gold, 0, deck + 15.5, hallD / 2 + 7);
  bell.rotation.x = Math.PI;

  // Three tiers of roofs, each over a smaller whitewashed drum.
  const roof1 = pagodaRoof(hallW + 6, hallD + 16, 9, 9, 6, roofMats);
  roof1.position.set(0, deck + hallH, 4);
  shrine.add(roof1);
  box(24, 8, 18, wall, 0, deck + hallH + 7, 0);
  box(25, 1, 19, timber, 0, deck + hallH + 7, 0);
  box(25, 1, 19, red, 0, deck + hallH + 14, 0);
  const roof2 = pagodaRoof(24, 18, 7.5, 7, 4.5, roofMats);
  roof2.position.set(0, deck + hallH + 15, 0);
  shrine.add(roof2);
  box(13, 6, 10, wall, 0, deck + hallH + 20, 0);
  box(14, 1, 11, red, 0, deck + hallH + 25, 0);
  const roof3 = pagodaRoof(13, 10, 6, 5, 3.2, roofMats);
  roof3.position.set(0, deck + hallH + 26, 0);
  shrine.add(roof3);
  // The gold spire: rings, a parasol, a mast, a jewel.
  const spireBase = deck + hallH + 32;
  add(new THREE.CylinderGeometry(2.2, 2.8, 2.5, 16), gold, 0, spireBase + 1.2, 0);
  for (let i = 0; i < 5; i += 1) add(new THREE.TorusGeometry(1.8 - i * 0.25, 0.45, 8, 20), gold, 0, spireBase + 3.2 + i * 1.3, 0).rotation.x = Math.PI / 2;
  add(new THREE.ConeGeometry(4, 2.2, 16, 1, true), gold, 0, spireBase + 10.5, 0);
  add(new THREE.CylinderGeometry(0.35, 0.45, 6, 8), gold, 0, spireBase + 13.5, 0);
  add(new THREE.SphereGeometry(1.5, 16, 12), gold, 0, spireBase + 17, 0);

  // A chorten beside the hall, prayer wheels along the walls, two banners at the stairs.
  const chorten = new THREE.LatheGeometry(
    [
      [0, 0],
      [9, 0],
      [9, 4],
      [7, 5],
      [7, 8],
      [6.5, 9],
      [7.5, 13],
      [5, 17],
      [2, 18],
      [1.5, 24],
      [0.8, 30],
      [0, 31],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  );
  add(chorten, wall, 28, deck, -26);
  add(new THREE.SphereGeometry(1.4, 10, 8), gold, 28, deck + 31.5, -26);
  for (let i = 0; i < 8; i += 1) {
    for (const x of [hallW / 2 + 2.5, -hallW / 2 - 2.5]) {
      add(new THREE.CylinderGeometry(1, 1, 2.6, 12), i % 2 ? gold : red, x, deck + 1.6, -11 + i * 3.1);
    }
  }
  for (const x of [-10, 10]) {
    add(new THREE.CylinderGeometry(0.3, 0.3, 22, 6), timber, x, TOP + 11, 56);
    add(new THREE.CylinderGeometry(1.6, 1.6, 7, 12, 1, true), red, x, TOP + 17, 56);
    add(new THREE.CylinderGeometry(1.65, 1.65, 1.4, 12, 1, true), gold, x, TOP + 13.5, 56);
  }

  // Stone steps down the south slope, lanterns beside them.
  const glowTex = puffTexture(PAINT.sky);
  for (let i = 0; i < 44; i += 1) {
    const z = 58 + i * 4.2;
    const y = Math.max(height(0, z), height(-6, z), height(6, z));
    const step = new THREE.Mesh(new THREE.BoxGeometry(13, 1.4, 4.4), stone);
    step.position.set(0, y + 0.4, z);
    scene.add(step);
    if (i % 5 === 0) {
      for (const sx of [-8.5, 8.5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), stone);
        post.position.set(sx, y + 2, z);
        scene.add(post);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2, 1.8), lanternMat);
        lamp.position.set(sx, y + 4.6, z);
        scene.add(lamp);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        halo.scale.set(9, 9, 1);
        halo.position.copy(lamp.position);
        scene.add(halo);
      }
    }
  }
  // Flag poles at the platform corners; strings of prayer flags from the finial.
  const pole = new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.4), roughness: 0.8 });
  const flagColors = ["glacier", "practical", "accent", "meadow", "sky"].map((k) => new THREE.MeshStandardMaterial({ color: col(k), roughness: 0.8, side: THREE.DoubleSide }));
  const flags = [];
  const finial = new THREE.Vector3(0, spireBase + 12, 0);
  for (const [cx, cz] of [
    [48, 48],
    [-48, 48],
    [48, -48],
    [-48, -48],
  ]) {
    const p = add(new THREE.CylinderGeometry(0.5, 0.6, 28, 8), pole, cx, TOP + 18, cz);
    const top = new THREE.Vector3(cx, TOP + 32, cz);
    for (let i = 1; i < 26; i += 1) {
      const u = i / 26;
      const at = new THREE.Vector3().lerpVectors(finial, top, u);
      at.y -= Math.sin(u * Math.PI) * 9;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2), flagColors[i % 5]);
      flag.geometry.translate(0, -1.1, 0);
      flag.position.copy(at);
      flag.lookAt(top.x, at.y, top.z);
      flag.rotateY(Math.PI / 2);
      shrine.add(flag);
      flags.push({ flag, phase: i * 0.7 + cx * 0.01, base: flag.rotation.x });
    }
    void p;
  }
  scene.add(shrine);

  // Clouds: cumulus clusters around the peaks, kept out of the valley corridor; wisps on the slopes.
  const puffs = [0, 1, 2, 3].map((v) => cumulusTexture(PAINT, v));
  const clouds = [];
  const cloudRand = mulberry32(17);
  const addCloud = (x, y, z, s, opacity, extra = {}) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffs[Math.floor(cloudRand() * 4)], transparent: true, opacity, depthWrite: false }));
    sp.scale.set(s, s * 0.5, 1);
    sp.position.set(x, y, z);
    scene.add(sp);
    clouds.push({ sp, x, y, z, base: opacity, speed: extra.speed ?? 2 + cloudRand() * 3, near: extra.near ?? 70, ...extra });
  };
  for (let i = 0; i < 150; i += 1) {
    const x = (cloudRand() - 0.5) * 3600;
    const z = (cloudRand() - 0.5) * 3600 + 400;
    const corridor = Math.abs(x - riverX(z)) < 260 && z > 120 && z < 1250;
    if (corridor || Math.hypot(x, z) < 170) continue;
    const y = 160 + cloudRand() * 80 + smoothstep(900, 1600, Math.hypot(x, z)) * 160;
    const size = 180 + cloudRand() * 220;
    // A cluster: a big body and smaller puffs around it, so each cloud has a shape.
    const parts = 3 + Math.floor(cloudRand() * 4);
    for (let k = 0; k < parts; k += 1) {
      const s = size * (k === 0 ? 1 : 0.45 + cloudRand() * 0.4);
      addCloud(x + (cloudRand() - 0.5) * size * 0.9, y + (k === 0 ? 0 : (cloudRand() - 0.3) * size * 0.18), z + (cloudRand() - 0.5) * size * 0.5, s, 0.92);
    }
  }
  for (let i = 0; i < 40; i += 1) {
    const a = cloudRand() * 6.28;
    const r = 110 + cloudRand() * 140;
    addCloud(0, 0, 0, 90, 0.5, { wisp: true, a, r, y: 190 + cloudRand() * 50, speed: 0.012 + cloudRand() * 0.01 });
  }
  // The bank on the climb: one compact soft cloud the camera flies into below the summit
  // and comes out of facing the shrine. Round puffs, no flat base, so nothing reads as a seam.
  const bankTex = puffTexture(PAINT.practical);
  const [bankX, bankY, bankZ] = CAM(38.8);
  for (let k = 0; k < 26; k += 1) {
    const a = cloudRand() * 6.28;
    const r = cloudRand() * 70;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bankTex, transparent: true, opacity: 0.9, depthWrite: false }));
    const s = 90 + cloudRand() * 110;
    sp.scale.set(s, s * 0.7, 1);
    const x = bankX + Math.cos(a) * r;
    const y = bankY + (cloudRand() - 0.5) * 50;
    const z = bankZ + Math.sin(a) * r;
    sp.position.set(x, y, z);
    scene.add(sp);
    clouds.push({ sp, x, y, z, base: 0.9, speed: 0.6, near: 10, far: 260 });
  }
  // The veil, worn by the camera while it is inside the bank.
  const veilTex = veilTexture(PAINT);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: veilTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  veil.position.set(0, 0, -1);
  veil.renderOrder = 999;
  camera.add(veil);
  scene.add(camera);
  const veilAt = (t) => smoothstep(37.9, 38.6, t) * (1 - smoothstep(39.2, 40.2, t));

  // Light shafts through the clouds, from the sun.
  const rays = [];
  const rayMat = new THREE.MeshBasicMaterial({ color: blend("sky", "practical", 0.5), transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 7; i += 1) {
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(6, 70, 1400, 16, 1, true), rayMat);
    rays.push({ ray, x: (cloudRand() - 0.5) * 900, z: 300 + cloudRand() * 900 });
    scene.add(ray);
  }

  // Birds: a flock over the valley, a flock circling the summit, eagles soaring high.
  const birdMat = new THREE.MeshBasicMaterial({ color: col("ink"), side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.6, 0, 0, 0.6, 3.6, 0.3, 0], 3));
  const birds = [];
  const bird = (spec) => {
    const g = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, birdMat);
    const r = new THREE.Mesh(wingGeo, birdMat);
    r.scale.x = -1;
    g.add(l, r);
    g.scale.setScalar(spec.size ?? 1);
    scene.add(g);
    birds.push({ g, l, r, ...spec });
  };
  for (let i = 0; i < 12; i += 1) bird({ phase: i * 0.9, radius: 160 + i * 18, cx: riverX(620 + (i % 3) * 120), cz: 620 + (i % 3) * 120, h: 95 + (i % 4) * 14, speed: 0.11 + (i % 3) * 0.02, flap: 9 });
  for (let i = 0; i < 16; i += 1) bird({ phase: i * 0.45, radius: 95 + (i % 5) * 16, cx: 0, cz: 0, h: 345 + (i % 4) * 12, speed: 0.16 + (i % 4) * 0.015, flap: 10, size: 0.8 });
  for (let i = 0; i < 3; i += 1) bird({ phase: i * 2.1, radius: 420 + i * 90, cx: 60, cz: 700, h: 470 + i * 30, speed: 0.045, flap: 0, glide: true, size: 2.6 });

  // Animals: yaks grazing and wandering by the river, goats on the rocky slopes.
  const hide = new THREE.MeshStandardMaterial({ color: blend("hair", "iris", 0.25), roughness: 0.95 });
  const hideLight = new THREE.MeshStandardMaterial({ color: blend("practical", "skin", 0.35), roughness: 0.95 });
  const horn = new THREE.MeshStandardMaterial({ color: blend("practical", "sky", 0.4), roughness: 0.5 });
  const animals = [];
  const animal = (kind, spec) => {
    const goat = kind === "goat";
    const s = goat ? 0.55 : 1;
    const mat = goat ? hideLight : hide;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat);
    body.scale.set(1.3 * s, 1.05 * s, 2.3 * s);
    body.position.y = 2.7 * s;
    g.add(body);
    if (!goat) {
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), mat);
      hump.position.set(0, 3.5, 0.9);
      g.add(hump);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 1.3, 12, 1, true), mat);
      skirt.scale.z = 1.9;
      skirt.position.y = 1.9;
      g.add(skirt);
    }
    const neck = new THREE.Group();
    neck.position.set(0, 3 * s, 2.1 * s);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 10, 8), mat);
    head.scale.set(0.9, 0.95, 1.35);
    head.position.set(0, -0.3 * s, 0.7 * s);
    neck.add(head);
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 1.3 * s, 6), horn);
      h.position.set(side * 0.55 * s, 0.25 * s, 0.6 * s);
      h.rotation.z = -side * (goat ? 0.3 : 1.1);
      h.rotation.x = goat ? -0.6 : 0.2;
      neck.add(h);
    }
    g.add(neck);
    const legs = [];
    for (const [lx, lz] of [
      [-0.7, 1.4],
      [0.7, 1.4],
      [-0.7, -1.4],
      [0.7, -1.4],
    ]) {
      const leg = new THREE.Group();
      leg.position.set(lx * s, 2 * s, lz * s);
      const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.17 * s, 2 * s, 6), mat);
      m2.position.y = -1 * s;
      leg.add(m2);
      g.add(leg);
      legs.push(leg);
    }
    g.scale.setScalar(spec.scale ?? 1.4);
    scene.add(g);
    animals.push({ g, neck, legs, ...spec });
  };
  const herdRand = mulberry32(41);
  for (let i = 0; i < 16; i += 1) {
    const z = 400 + herdRand() * 480;
    const side = i % 2 ? -1 : 1;
    animal("yak", { x: riverX(z) + side * (24 + herdRand() * 30), z, heading: herdRand() * 6.28, walk: i % 3 === 0 ? 1.3 : 0, phase: herdRand() * 6.28, scale: 1.9 });
  }
  for (let i = 0; i < 8; i += 1) {
    const a = 0.2 + herdRand() * 1.2;
    const r = 120 + herdRand() * 80;
    animal("goat", { x: Math.sin(a) * r, z: Math.cos(a) * r + 30, heading: herdRand() * 6.28, walk: i % 2 ? 0.9 : 0, phase: herdRand() * 6.28 });
  }

  // People: pilgrims in maroon and saffron climbing the stairs, monks on the platform.
  const robes = [col("accent"), blend("sky", "accent", 0.35), blend("accent", "hair", 0.35)].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
  const skinMat = new THREE.MeshStandardMaterial({ color: col("skin"), roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: col("hair"), roughness: 0.8 });
  const people = [];
  const person = (spec) => {
    const robe = robes[spec.robe % robes.length];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 2.6, 10), robe);
    body.position.y = 2.6;
    g.add(body);
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.35, 10), robes[(spec.robe + 1) % robes.length]);
    sash.position.y = 2.6;
    g.add(sash);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), skinMat);
    head.position.y = 4.25;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    cap.position.y = 4.3;
    g.add(cap);
    const limb = (x, y, len, mat) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, len, 6), mat);
      m2.position.y = -len / 2;
      pivot.add(m2);
      g.add(pivot);
      return pivot;
    };
    const legL = limb(-0.3, 1.4, 1.4, hairMat);
    const legR = limb(0.3, 1.4, 1.4, hairMat);
    const armL = limb(-0.75, 3.6, 1.5, robe);
    const armR = limb(0.75, 3.6, 1.5, robe);
    if (spec.staff) {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 5), new THREE.MeshStandardMaterial({ color: blend("iris", "sky", 0.3) }));
      staff.position.set(0, -1.2, 0.3);
      armR.add(staff);
    }
    scene.add(g);
    people.push({ g, legL, legR, armL, armR, ...spec });
  };
  // The climbers start spread down the stairs and walk up at their own pace.
  const stairTop = 58;
  const stairBottom = 58 + 43 * 4.2;
  for (let i = 0; i < 9; i += 1) person({ climb: true, z0: stairBottom - i * 19, speed: 0.9 + (i % 3) * 0.25, x: (i % 2 ? 2.6 : -2.6) + (i % 3) * 0.6, robe: i, phase: i * 1.7, staff: i % 3 === 0 });
  for (let i = 0; i < 3; i += 1) person({ climb: false, x: -12 + i * 12, z: hallD / 2 + 11, y: deck, robe: 0, phase: i * 2.2, facing: Math.PI });
  const stairY = (z) => Math.max(height(0, z), height(-6, z), height(6, z)) + 1.1;

  const look = new THREE.Vector3();

  /** The frame at film time t, from t alone. */
  function render(t) {
    const [cx, cy, cz] = CAM(t);
    const ground = height(cx, cz) + 18;
    const y = ground + Math.log1p(Math.exp((cy - ground) / 6)) * 6;
    camera.position.set(cx, y, cz);
    const [lx, ly, lz] = LOOK(t);
    camera.lookAt(look.set(lx, ly, lz));

    const sd = sunAt(t);
    sun.position.copy(sd).multiplyScalar(1000);
    sunDisc.position.copy(sd).multiplyScalar(5200);
    sky.position.copy(camera.position);
    sunDisc.position.add(camera.position);

    ripples.offset.set(t * 0.004, t * 0.0025);
    for (const tex of falls) tex.offset.y = t * 0.9;
    for (const f of flags) {
      f.flag.rotation.x = f.base + Math.sin(t * 4.2 + f.phase) * 0.35;
      f.flag.rotation.z = Math.sin(t * 3.1 + f.phase * 1.3) * 0.18;
    }
    for (const c of clouds) {
      if (c.wisp) {
        const a = c.a + t * c.speed;
        c.sp.position.set(Math.sin(a) * c.r, c.y + Math.sin(t * 0.2 + c.a) * 6, Math.cos(a) * c.r);
      } else c.sp.position.x = c.x + t * c.speed;
      // Fade a cloud as the camera reaches it, so no blur ever smears across the lens.
      const dist = c.sp.position.distanceTo(camera.position);
      // The climb's bank only gathers as the camera nears it; from afar it is never a lone bright puff.
      c.sp.material.opacity = c.base * smoothstep(c.near, c.near * 2.4, dist) * (c.far ? 1 - smoothstep(c.far * 0.75, c.far, dist) : 1);
    }
    const v = veilAt(t);
    veil.material.opacity = v * 0.97;
    veil.visible = v > 0.002;
    veilTex.offset.set(t * 0.05, t * 0.012);
    for (const r of rays) {
      r.ray.position.set(r.x + sd.x * 500, 260 + sd.y * 500, r.z + sd.z * 500);
      r.ray.lookAt(r.x, 0, r.z);
      r.ray.rotateX(Math.PI / 2);
      r.ray.material.opacity = 0.012 * (1 - smoothstep(16, 24, t)) + 0.003;
    }
    for (const b of birds) {
      const a = t * b.speed + b.phase;
      b.g.position.set(b.cx + Math.sin(a) * b.radius, b.h + Math.sin(t * 0.7 + b.phase) * 6, b.cz + Math.cos(a) * b.radius * 0.6);
      b.g.rotation.y = a + Math.PI / 2;
      // Eagles hold their wings and tilt into the turn; small birds flap.
      const flap = b.glide ? 0.12 + Math.sin(t * 0.8 + b.phase) * 0.05 : Math.sin(t * b.flap + b.phase * 3) * 0.55;
      b.l.rotation.z = flap;
      b.r.rotation.z = -flap;
      b.g.rotation.z = b.glide ? 0.25 : 0;
    }
    for (const an of animals) {
      // Walkers drift slowly along their heading; grazers stay and lower their heads.
      const along = an.walk * t * 0.9;
      const x = an.x + Math.sin(an.heading) * along;
      const z = an.z + Math.cos(an.heading) * along;
      an.g.position.set(x, height(x, z), z);
      an.g.rotation.y = an.heading;
      const stride = an.walk ? Math.sin(t * 4.5 + an.phase) * 0.45 : 0;
      an.legs.forEach((leg, k) => (leg.rotation.x = (k === 0 || k === 3 ? 1 : -1) * stride));
      an.neck.rotation.x = an.walk ? 0.1 : 0.55 + Math.sin(t * 0.9 + an.phase) * 0.25;
    }
    for (const p of people) {
      let x = p.x;
      let z = p.z;
      let y = p.y;
      let walking = false;
      if (p.climb) {
        z = Math.max(stairTop + 2, p.z0 - p.speed * t);
        walking = z > stairTop + 2;
        y = stairY(z);
      }
      p.g.position.set(x, y, z);
      p.g.rotation.y = p.climb ? Math.PI : p.facing;
      const w = walking ? Math.sin(t * 6 + p.phase) : 0;
      p.legL.rotation.x = w * 0.5;
      p.legR.rotation.x = -w * 0.5;
      p.armL.rotation.x = -w * 0.4;
      p.armR.rotation.x = w * 0.4 + (p.climb ? 0 : Math.sin(t * 0.8 + p.phase) * 0.08);
      p.g.position.y += walking ? Math.abs(Math.sin(t * 6 + p.phase)) * 0.15 : 0;
    }
    renderer.render(scene, camera);
  }

  return { render, canvas };
}
