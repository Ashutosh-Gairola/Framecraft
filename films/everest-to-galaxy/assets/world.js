/**
 * Everest to the Galaxy — one continuous journey, as a pure function of film time.
 *
 * Five stages share one WebGL renderer: Everest, the volcano, Earth and near space, the solar
 * system, and the Milky Way. Each has its own scene and camera path in film time. The seams
 * are hidden the way the script asks: a cloud veil (Everest → volcano), smoke that becomes
 * cloud (volcano → Earth), one continuous pull-away (Earth → space), and scale crossfades
 * through the starfield (→ solar system → galaxy). No cuts, no clock, no Math.random().
 * skills/html-anime-3d-actor/SKILL.md describes the method.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const W = 1920;
const H = 1080;
export const DURATION = 120;

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
function hash3(i, j, k) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise3(x, y, z) {
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
const vnoise = (x, z) => vnoise3(x, 0.5, z);
function fbm3(x, y, z, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    s += amp * vnoise3(x * f + i * 17.3, y * f - i * 3.7, z * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
const fbm = (x, z, oct = 5) => fbm3(x, 0.37, z, oct);
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
const deg = Math.PI / 180;

/** Hermite through timed points: velocity carries through every point; at rest at the ends. */
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
      if (k <= 0 || k >= n - 1) return p0.map(() => 0);
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

/* ---------------- textures made once ---------------- */

function canvas2d(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function texture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rgbOf = (col) => [Math.round(col.r * 255), Math.round(col.g * 255), Math.round(col.b * 255)];

/** A soft round puff, tinted. */
function puff(col, seed = 11, lobes = 14) {
  const rand = mulberry32(seed);
  const c = canvas2d(256, 256);
  const g = c.getContext("2d");
  const [r, gg, b] = rgbOf(col);
  for (let i = 0; i < lobes; i += 1) {
    const x = 256 * (0.28 + rand() * 0.44);
    const y = 256 * (0.3 + rand() * 0.4);
    const rr = 256 * (0.14 + rand() * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, `rgba(${r},${gg},${b},0.5)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  return texture(c);
}
/** A radial glow. */
function glow(col, falloff = 1) {
  const c = canvas2d(256, 256);
  const g = c.getContext("2d");
  const [r, gg, b] = rgbOf(col);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.2 / falloff, `rgba(${r},${gg},${b},0.45)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return texture(c);
}
/** A planet surface on a sphere: f(x, y, z, lat) → [r, g, b] (0–1), sampled seamlessly. */
function planetTexture(w, h, f) {
  const c = canvas2d(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const lat = (0.5 - y / h) * Math.PI;
    const cl = Math.cos(lat);
    const sy = Math.sin(lat);
    for (let x = 0; x < w; x += 1) {
      const lon = (x / w) * Math.PI * 2;
      const [r, gg, b, a = 1] = f(cl * Math.cos(lon), sy, cl * Math.sin(lon), lat, lon);
      const k = (y * w + x) * 4;
      img.data[k] = Math.max(0, Math.min(255, r * 255));
      img.data[k + 1] = Math.max(0, Math.min(255, gg * 255));
      img.data[k + 2] = Math.max(0, Math.min(255, b * 255));
      img.data[k + 3] = Math.max(0, Math.min(255, a * 255));
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
/** A full-frame veil: drifting cloud or smoke, drawn over the picture in 2D. */
function veilImage(col, seed, lo, hi) {
  const w = 640;
  const h = 360;
  const c = canvas2d(w * 2, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w * 2, h);
  const [r, gg, b] = rgbOf(col);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w * 2; x += 1) {
      const n = fbm(x / 90 + seed, y / 90 - seed, 5);
      const k = (y * w * 2 + x) * 4;
      img.data[k] = r;
      img.data[k + 1] = gg;
      img.data[k + 2] = b;
      img.data[k + 3] = smoothstep(lo, hi, n) * 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}

/* ---------------- shared pieces ---------------- */

function starField(PAINT, n, radius, seed) {
  const rand = mulberry32(seed);
  const pos = new Float32Array(n * 3);
  const colr = new Float32Array(n * 3);
  const warm = new THREE.Color(PAINT.practical);
  const cool = new THREE.Color(PAINT.moon);
  const white = new THREE.Color(PAINT.line);
  for (let i = 0; i < n; i += 1) {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos.set([radius * s * Math.cos(a), radius * u, radius * s * Math.sin(a)], i * 3);
    const c = rand() < 0.15 ? warm : rand() < 0.4 ? cool : white;
    const k = 0.35 + rand() ** 3 * 0.9;
    colr.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false }));
}

function heightTerrain(size, seg, heightFn, colorFn, roughness = 0.9) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 1) p.setY(i, heightFn(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const row = seg + 1;
  const colors = [];
  for (let i = 0; i < p.count; i += 1) {
    const c = colorFn(p.getX(i), p.getY(i), p.getZ(i), 1 - n.getY(i));
    const gi = i % row;
    const gk = Math.floor(i / row);
    if (gi > 2 && gk > 2 && gi < row - 3 && gk < row - 3) {
      const around = (p.getY(i - 3) + p.getY(i + 3) + p.getY(i - 3 * row) + p.getY(i + 3 * row)) / 4;
      c.multiplyScalar(1 - Math.min(0.35, Math.max(0, (around - p.getY(i)) / 60)));
    }
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 }));
}

/** A sky dome: zenith to horizon, a glow toward the sun. */
function skyDome(zenith, horizon, sunGlow, sunDir) {
  const geo = new THREE.SphereGeometry(20000, 48, 24);
  const colors = [];
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const c = new THREE.Color().lerpColors(horizon, zenith, smoothstep(-0.02, 0.32, v.y));
    c.lerp(sunGlow, Math.pow(Math.max(0, v.dot(sunDir)), 5) * 0.85);
    if (v.y < 0) c.copy(horizon);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
}

/* ---------------- stage 1: Everest ---------------- */

function everest(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  const sunDirE = new THREE.Vector3(0.75, 0.28, 0.6).normalize();
  const sky = skyDome(blend("sky", "ocean", 0.55), blend("moon", "skin", 0.45), blend("practical", "skin", 0.4), sunDirE);
  scene.add(sky);
  scene.fog = new THREE.FogExp2(blend("moon", "skin", 0.35), 0.00024);
  const camera = new THREE.PerspectiveCamera(38, W / H, 2, 30000);

  const peaks = [
    [0, 0, 1250, 520],
    [520, -260, 980, 380],
    [-560, -200, 900, 360],
    [300, 520, 760, 340],
    [-420, 600, 700, 300],
  ];
  const height = (x, z) => {
    let h = 180 + ridged(x / 700, z / 700) * 420 * smoothstep(400, 1400, Math.hypot(x, z));
    for (const [px, pz, ph, pr] of peaks) {
      const dx = x - px;
      const dz = z - pz;
      // Pyramidal peaks: faces and ridges, sharpened by ridged noise.
      const r = Math.max(Math.abs(dx * 0.86 + dz * 0.5), Math.abs(dz), Math.abs(dx * 0.86 - dz * 0.5));
      const cone = Math.max(0, 1 - r / (pr * 1.9));
      h = Math.max(h, ph * Math.pow(cone, 1.35) * (0.82 + 0.18 * ridged(x / 160, z / 160, 4)) + 120);
    }
    h += (fbm(x / 60, z / 60, 3) - 0.5) * 30;
    return h;
  };
  const snow = col("sclera");
  const snowShade = blend("moon", "cyan", 0.35);
  const rock = blend("hair", "iris", 0.25);
  const glacier = blend("cyan", "moon", 0.55);
  const terrain = heightTerrain(6000, 340, height, (x, y, z, slope) => {
    const n = fbm(x / 80, z / 80, 3);
    const c = new THREE.Color().lerpColors(snow, snowShade, smoothstep(0.2, 0.6, n));
    c.lerp(rock, smoothstep(0.42, 0.62, slope + (n - 0.5) * 0.25));
    c.lerp(glacier, (1 - smoothstep(260, 420, y)) * (1 - smoothstep(0.1, 0.3, slope)) * 0.7);
    return c;
  });
  scene.add(terrain);
  // Crevasses on the glaciers: thin dark strokes in the low ice.
  const crev = [];
  const cr = mulberry32(3);
  for (let i = 0; i < 220; i += 1) {
    const x = (cr() - 0.5) * 2600;
    const z = (cr() - 0.5) * 2600;
    const y = height(x, z);
    if (y > 400) continue;
    const a = cr() * Math.PI;
    const l = 10 + cr() * 30;
    crev.push(x, y + 1, z, x + Math.cos(a) * l, height(x + Math.cos(a) * l, z + Math.sin(a) * l) + 1, z + Math.sin(a) * l);
  }
  const crevGeo = new THREE.BufferGeometry();
  crevGeo.setAttribute("position", new THREE.Float32BufferAttribute(crev, 3));
  scene.add(new THREE.LineSegments(crevGeo, new THREE.LineBasicMaterial({ color: blend("ink", "sky", 0.4) })));

  const sun = new THREE.DirectionalLight(blend("practical", "skin", 0.3), 3.0);
  sun.position.set(900, 420, 700);
  scene.add(sun, new THREE.HemisphereLight(blend("moon", "cyan", 0.3), blend("sky", "ink", 0.4), 0.8));
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(col("practical")), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunDisc.scale.set(2600, 2600, 1);
  sunDisc.position.set(9000, 3200, 7000);
  scene.add(sunDisc);

  // A sea of clouds below the peaks, and a thin layer above them to climb into.
  const cloudTex = [11, 13, 17].map((s, i) => puff(i === 2 ? blend("sclera", "skin", 0.25) : col("sclera"), s));
  const clouds = [];
  const rand = mulberry32(21);
  for (let i = 0; i < 420; i += 1) {
    const x = (rand() - 0.5) * 6000;
    const z = (rand() - 0.5) * 6000;
    if (height(x, z) > 560) continue;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], transparent: true, opacity: 0.9, depthWrite: false }));
    const s = 260 + rand() * 420;
    sp.scale.set(s, s * 0.45, 1);
    sp.position.set(x, 470 + rand() * 90, z);
    scene.add(sp);
    clouds.push({ sp, x, speed: 3 + rand() * 4 });
  }
  for (let i = 0; i < 90; i += 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], transparent: true, opacity: 0.7, depthWrite: false }));
    const s = 300 + rand() * 300;
    sp.scale.set(s, s * 0.4, 1);
    const x = (rand() - 0.5) * 1800;
    const z = -400 - rand() * 1600;
    sp.position.set(x, 1650 + rand() * 260, z);
    scene.add(sp);
    clouds.push({ sp, x, speed: 6 });
  }

  // Blowing snow near the summit, and the plume streaming off it.
  const snowN = 5000;
  const snowPos = new Float32Array(snowN * 3);
  const snowBase = [];
  for (let i = 0; i < snowN; i += 1) snowBase.push([rand() * 900 - 450, 900 + rand() * 520, rand() * 900 - 450]);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: col("line"), size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(snowPts);
  const plumeTex = puff(col("line"), 31, 10);
  const plume = [];
  for (let i = 0; i < 70; i += 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTex, transparent: true, opacity: 0.3, depthWrite: false }));
    scene.add(sp);
    plume.push({ sp, phase: i / 70, wob: rand() });
  }

  const CAM = timedPath([
    [0, 260, 1150, 2900],
    [5, 180, 1180, 2100],
    [10, 90, 1260, 1250],
    [14, 30, 1360, 420],
    [16.5, 0, 1420, 40],
    [19, -40, 1700, -560],
    [21.6, -60, 1900, -900],
  ]);
  const LOOK = timedPath([
    [0, 0, 1180, 0],
    [12, 0, 1220, 0],
    [15, 0, 1150, -320],
    [17, -20, 1400, -900],
    [19, -40, 1900, -1300],
    [21.6, -60, 2150, -1500],
  ]);

  function update(t) {
    const [x, y, z] = CAM(t);
    camera.position.set(x, Math.max(y, height(x, z) + 40), z);
    camera.lookAt(...LOOK(t));
    sky.position.copy(camera.position);
    for (const c of clouds) c.sp.position.x = c.x + t * c.speed;
    // Snow blows through a box that travels with the camera, so it never shows as a cube.
    const wind = [-62, 6, -24];
    const cp = camera.position;
    const wrap = (v, s) => ((((v + s / 2) % s) + s) % s) - s / 2;
    for (let i = 0; i < snowN; i += 1) {
      const [bx, by, bz] = snowBase[i];
      snowPos[i * 3] = cp.x + wrap(bx + wind[0] * t - cp.x, 900);
      snowPos[i * 3 + 1] = cp.y + wrap(by - 1150 + Math.sin(t * 1.3 + i) * 6 - cp.y + 1150, 520) ;
      snowPos[i * 3 + 2] = cp.z + wrap(bz + wind[2] * t - cp.z, 900);
    }
    snowGeo.attributes.position.needsUpdate = true;
    for (const p of plume) {
      const u = (p.phase + t * 0.09) % 1;
      p.sp.position.set(-u * 700, 1262 + u * 140 + (p.wob - 0.5) * 60 * u, -u * 260 + (p.wob - 0.5) * 120 * u);
      const s = 60 + u * 300;
      p.sp.scale.set(s, s * 0.6, 1);
      p.sp.material.opacity = 0.32 * Math.sin(u * Math.PI);
    }
  }
  return { scene, camera, update };
}

/* ---------------- stage 2: the volcano ---------------- */

function volcano(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  const sunDirV = new THREE.Vector3(-0.8, 0.18, -0.55).normalize();
  const sky = skyDome(blend("ink", "accent", 0.12), blend("accent", "iris", 0.45), blend("iris", "practical", 0.5), sunDirV);
  scene.add(sky);
  scene.fog = new THREE.FogExp2(blend("hair", "accent", 0.35), 0.00026);
  const camera = new THREE.PerspectiveCamera(40, W / H, 2, 30000);
  const RIM = 130;
  const height = (x, z) => {
    const r = Math.hypot(x, z);
    let h = 60 + (fbm(x / 120, z / 120, 4) - 0.4) * 60 + ridged(x / 900, z / 900) * 520 * smoothstep(1500, 2600, r);
    const cone = 960 * Math.pow(Math.max(0, 1 - r / 1150), 1.25);
    h = Math.max(h, cone + (fbm(x / 70, z / 70, 3) - 0.5) * 40);
    // The crater: a bowl inside the rim.
    const rimH = 960 * Math.pow(1 - RIM / 1150, 1.25);
    if (r < RIM * 1.3) h = mix(h, rimH - 110 + (r / RIM) ** 2 * 110, smoothstep(RIM * 1.3, RIM * 0.9, r));
    return h;
  };
  const rimH = height(RIM, 0);
  const black = blend("hair", "ink", 0.3);
  const ash = blend("hair", "line", 0.28);
  const crust = blend("hair", "accent", 0.25);
  const terrain = heightTerrain(6000, 320, height, (x, y, z, slope) => {
    const n = fbm(x / 50, z / 50, 3);
    const c = new THREE.Color().lerpColors(black, crust, smoothstep(0.55, 0.75, n) * 0.6);
    c.lerp(ash, smoothstep(500, 850, y) * 0.7);
    return c;
  }, 0.97);
  scene.add(terrain);

  // Lava: a crater lake and flows down the slopes, glowing and moving.
  const lavaCanvas = canvas2d(256, 512);
  {
    const g = lavaCanvas.getContext("2d");
    const img = g.createImageData(256, 512);
    const hot = new THREE.Color(PAINT.practical);
    const mid = new THREE.Color(PAINT.iris);
    const dark = new THREE.Color(PAINT.accent);
    for (let y = 0; y < 512; y += 1)
      for (let x = 0; x < 256; x += 1) {
        const a = (x / 256) * Math.PI * 2;
        const n = fbm3(Math.cos(a) * 1.5, y / 40, Math.sin(a) * 1.5, 5);
        const c = n > 0.62 ? hot : n > 0.45 ? new THREE.Color().lerpColors(dark, mid, (n - 0.45) / 0.17) : new THREE.Color().lerpColors(new THREE.Color(PAINT.hair), dark, n / 0.45);
        const k = (y * 256 + x) * 4;
        img.data[k] = c.r * 255;
        img.data[k + 1] = c.g * 255;
        img.data[k + 2] = c.b * 255;
        img.data[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }
  const lavaTex = texture(lavaCanvas);
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  const lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex, fog: true });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(RIM * 0.85, 48), lavaMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.y = rimH - 100;
  scene.add(lake);
  const flows = [];
  const fr = mulberry32(9);
  for (let f = 0; f < 6; f += 1) {
    const a0 = f * 1.05 + fr() * 0.4;
    const pts = [];
    let x = Math.cos(a0) * RIM * 1.05;
    let z = Math.sin(a0) * RIM * 1.05;
    for (let k = 0; k < 60; k += 1) {
      const y = height(x, z);
      pts.push(new THREE.Vector3(x, y + 2, z));
      const r = Math.hypot(x, z);
      const ang = Math.atan2(z, x) + (vnoise(f * 3 + k * 0.2, 1) - 0.5) * 0.18;
      x = Math.cos(ang) * (r + 16);
      z = Math.sin(ang) * (r + 16);
      if (r > 820 + f * 40) break;
    }
    // A ribbon laid on the ground along the flow, widening as it spreads downhill.
    const left = [];
    const right = [];
    const uvs = [];
    const width0 = 6 + fr() * 4;
    for (let k = 0; k < pts.length; k += 1) {
      const a = pts[Math.max(0, k - 1)];
      const b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      const w = width0 + k * 0.35;
      const nx = -dz / l;
      const nz = dx / l;
      for (const [arr, s2] of [
        [left, 1],
        [right, -1],
      ]) {
        const x = pts[k].x + nx * w * s2;
        const z = pts[k].z + nz * w * s2;
        arr.push(x, height(x, z) + 2.5, z);
      }
      uvs.push(k / 8);
    }
    const posArr = [];
    const uvArr = [];
    const idx = [];
    for (let k = 0; k < pts.length; k += 1) {
      posArr.push(left[k * 3], left[k * 3 + 1], left[k * 3 + 2], right[k * 3], right[k * 3 + 1], right[k * 3 + 2]);
      uvArr.push(0, uvs[k], 1, uvs[k]);
      if (k > 0) idx.push((k - 1) * 2, k * 2, (k - 1) * 2 + 1, (k - 1) * 2 + 1, k * 2, k * 2 + 1);
    }
    const ribGeo = new THREE.BufferGeometry();
    ribGeo.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    ribGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
    ribGeo.setIndex(idx);
    const ribbon = new THREE.Mesh(ribGeo, new THREE.MeshBasicMaterial({ map: lavaTex.clone(), fog: true, side: THREE.DoubleSide }));
    ribbon.material.map.needsUpdate = true;
    scene.add(ribbon);
    flows.push({ ribbon, speed: 0.04 + f * 0.006 });
  }
  const glowTex = glow(col("iris"));
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.scale.set(700, 700, 1);
    g.position.set(Math.cos(i) * 300, rimH + 40 - i * 120, Math.sin(i) * 300);
    scene.add(g);
  }
  // Bubbles in the lake.
  const bubbles = [];
  const bubMat = new THREE.MeshBasicMaterial({ color: col("practical") });
  for (let i = 0; i < 24; i += 1) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bubMat);
    const a = fr() * 6.28;
    const r = fr() * RIM * 0.7;
    b.position.set(Math.cos(a) * r, rimH - 100, Math.sin(a) * r);
    scene.add(b);
    bubbles.push({ b, phase: fr() * 6.28, speed: 1.2 + fr() * 1.5, size: 5 + fr() * 9 });
  }

  // Light: a low sunset key, the lava's own fire from below.
  const sun = new THREE.DirectionalLight(blend("iris", "accent", 0.3), 1.8);
  sun.position.set(-900, 500, -600);
  const fire = new THREE.PointLight(col("iris"), 9, 2600, 1.2);
  fire.position.set(0, rimH + 80, 0);
  scene.add(sun, fire, new THREE.HemisphereLight(blend("accent", "iris", 0.3), col("ink"), 0.35));

  // The plume: smoke rising and spreading, lit orange from below; ash in the air.
  const smokeTex = [puff(blend("hair", "line", 0.25), 41), puff(blend("hair", "line", 0.4), 43)];
  const smoke = [];
  const sr = mulberry32(51);
  for (let i = 0; i < 260; i += 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex[i % 2], transparent: true, opacity: 0.8, depthWrite: false }));
    scene.add(sp);
    smoke.push({ sp, phase: sr(), a: sr() * 6.28, spread: 0.6 + sr() * 0.8, life: 14 + sr() * 6 });
  }
  const ashN = 4000;
  const ashPos = new Float32Array(ashN * 3);
  const ashBase = [];
  for (let i = 0; i < ashN; i += 1) ashBase.push([sr() * 3000 - 1500, 200 + sr() * 2200, sr() * 3000 - 1500]);
  const ashGeo = new THREE.BufferGeometry();
  ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPos, 3));
  scene.add(new THREE.Points(ashGeo, new THREE.PointsMaterial({ color: blend("line", "iris", 0.3), size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false })));

  const T0 = 20;
  const CAM = timedPath([
    [T0 - 1, 0, 2100, 2600],
    [T0 + 3, 200, 1500, 1800],
    [T0 + 7, 700, 1180, 900],
    [T0 + 10, 760, 1150, 0],
    [T0 + 13, 520, 1160, -620],
    [T0 + 16, -200, 1220, -620],
    [T0 + 18, -120, 1500, -160],
    [T0 + 20, -20, 2300, 0],
    [T0 + 22, 0, 3000, 40],
  ]);
  const LOOK = timedPath([
    [T0 - 1, 0, 900, 0],
    [T0 + 8, 0, rimH - 40, 0],
    [T0 + 16, 0, rimH, 0],
    [T0 + 19, 0, 2600, 0],
    [T0 + 22, 0, 4200, 60],
  ]);

  function update(t) {
    const [x, y, z] = CAM(t);
    camera.position.set(x, Math.max(y, height(x, z) + 60), z);
    camera.lookAt(...LOOK(t));
    sky.position.copy(camera.position);
    lavaTex.offset.set(t * 0.01, t * 0.02);
    for (const f of flows) f.ribbon.material.map.offset.y = -t * f.speed;
    fire.intensity = 9 + Math.sin(t * 7) * 0.8 + Math.sin(t * 13) * 0.5;
    for (const b of bubbles) {
      const u = (t * b.speed + b.phase) % 6.28;
      const s = u < 3.14 ? Math.sin(u) * b.size : 0.01;
      b.b.scale.set(s, s * 0.6, s);
    }
    for (const s of smoke) {
      const u = ((t + s.phase * s.life) % s.life) / s.life;
      const r = 30 + u * 520 * s.spread;
      s.sp.position.set(Math.cos(s.a) * r + u * 600, rimH + 20 + u * 2600, Math.sin(s.a) * r + u * 200);
      const size = 160 + u * 900;
      s.sp.scale.set(size, size, 1);
      s.sp.material.opacity = 0.85 * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.6;
    }
    for (let i = 0; i < ashN; i += 1) {
      const [bx, by, bz] = ashBase[i];
      const wrap = (v, s, o) => ((((v - o) % s) + s) % s) + o;
      ashPos[i * 3] = wrap(bx + t * 25, 3000, -1500);
      ashPos[i * 3 + 1] = wrap(by - t * 8, 2200, 200);
      ashPos[i * 3 + 2] = bz + Math.sin(t * 0.7 + i) * 20;
    }
    ashGeo.attributes.position.needsUpdate = true;
  }
  return { scene, camera, update };
}

/* ---------------- stage 3–4: Earth and near space ---------------- */

const R = 1000;

function earthTextures(PAINT) {
  const ocean = new THREE.Color(PAINT.ocean);
  const deep = new THREE.Color().lerpColors(ocean, new THREE.Color(PAINT.ink), 0.45);
  const shelf = new THREE.Color().lerpColors(ocean, new THREE.Color(PAINT.cyan), 0.45);
  const green = new THREE.Color(PAINT.land);
  const desert = new THREE.Color().lerpColors(new THREE.Color(PAINT.iris), new THREE.Color(PAINT.skin), 0.35);
  const brown = new THREE.Color().lerpColors(new THREE.Color(PAINT.iris), new THREE.Color(PAINT.hair), 0.45);
  const ice = new THREE.Color(PAINT.sclera);
  const landAt = (x, y, z) => fbm3(x * 1.8 + 3, y * 1.8, z * 1.8 - 2, 6) + 0.1 * fbm3(x * 9, y * 9, z * 9, 2);
  const day = planetTexture(2048, 1024, (x, y, z, lat) => {
    const n = landAt(x, y, z);
    const polar = Math.abs(lat) > 1.2 + (n - 0.5) * 0.3;
    if (polar) return [ice.r, ice.g, ice.b];
    if (n < 0.535) {
      const c = new THREE.Color().lerpColors(deep, shelf, smoothstep(0.45, 0.535, n));
      return [c.r, c.g, c.b];
    }
    const dry = smoothstep(0.15, 0.55, 1 - Math.abs(Math.abs(lat) - 0.42) * 3) * smoothstep(0.58, 0.66, n) * 0.75;
    const c = new THREE.Color().lerpColors(green, brown, smoothstep(0.62, 0.72, n));
    c.lerp(desert, dry * 0.85);
    c.lerp(ice, smoothstep(0.75, 0.82, n) * 0.6);
    return [c.r, c.g, c.b];
  });
  const city = new THREE.Color(PAINT.practical);
  const nightRand = mulberry32(61);
  const night = planetTexture(2048, 1024, (x, y, z, lat) => {
    const n = landAt(x, y, z);
    if (n < 0.535 || Math.abs(lat) > 1.1) return [0, 0, 0];
    const cluster = fbm3(x * 14, y * 14, z * 14, 3);
    const lit = cluster > 0.58 && nightRand() < 0.35 + (1 - smoothstep(0.5, 0.6, n)) * 0.4;
    const k = lit ? 0.6 + nightRand() * 0.4 : 0;
    return [city.r * k, city.g * k, city.b * k];
  });
  const clouds = planetTexture(2048, 1024, (x, y, z, lat) => {
    const swirl = fbm3(x * 3 + 7, y * 6, z * 3, 3);
    const n = fbm3(x * 4 + swirl * 2, y * 4, z * 4 - swirl, 6);
    const band = 0.08 * Math.cos(lat * 6);
    const a = smoothstep(0.52 - band, 0.68 - band, n);
    return [1, 1, 1, a];
  });
  return { day, night, clouds };
}

function earthAndSpace(PAINT, textures) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  scene.background = col("ink").multiplyScalar(0.12);
  const camera = new THREE.PerspectiveCamera(42, W / H, 1, 400000);
  const sunDir = new THREE.Vector3(0.82, 0.22, 0.53).normalize();

  const dayTex = texture(textures.day);
  const nightTex = texture(textures.night);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 160, 100),
    new THREE.ShaderMaterial({
      uniforms: { dayTex: { value: dayTex }, nightTex: { value: nightTex }, sunDir: { value: sunDir }, camPos: { value: new THREE.Vector3() } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform sampler2D dayTex; uniform sampler2D nightTex; uniform vec3 sunDir; uniform vec3 camPos;
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main() {
          vec3 n = normalize(vN);
          float l = dot(n, sunDir);
          vec3 day = texture2D(dayTex, vUv).rgb;
          vec3 night = texture2D(nightTex, vUv).rgb;
          float lit = smoothstep(-0.12, 0.22, l);
          vec3 c = day * (0.04 + 1.25 * max(l, 0.0));
          vec3 v = normalize(camPos - vP);
          float ocean = smoothstep(0.02, 0.1, day.b - day.g);
          float spec = pow(max(dot(n, normalize(sunDir + v)), 0.0), 70.0);
          c += vec3(1.0, 0.85, 0.6) * spec * ocean * 0.9 * lit;
          c = mix(night * 2.2, c, lit);
          float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          c += vec3(0.25, 0.55, 1.0) * rim * 0.6 * smoothstep(-0.3, 0.4, l);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(earth);
  const cloudTex = texture(textures.clouds);
  const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 160, 100), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, roughness: 1 }));
  scene.add(cloudSphere);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.028, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: sunDir }, glowColor: { value: blend("cyan", "ocean", 0.45) } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec3 sunDir; uniform vec3 glowColor; varying vec3 vN; varying vec3 vP;
        void main() {
          vec3 v = normalize(cameraPosition - vP);
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 1.6);
          float lit = smoothstep(-0.35, 0.5, dot(normalize(vN), sunDir));
          gl_FragColor = vec4(glowColor * f * lit * 2.2, f * lit);
        }`,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(atmo);
  const sun = new THREE.DirectionalLight(col("line"), 2.6);
  sun.position.copy(sunDir).multiplyScalar(5000);
  scene.add(sun, new THREE.AmbientLight(col("sky"), 0.15));
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(col("practical")), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlow.scale.set(30000, 30000, 1);
  sunGlow.position.copy(sunDir).multiplyScalar(180000);
  scene.add(sunGlow);
  scene.add(starField(PAINT, 9000, 300000, 71));

  // The Moon.
  const moonCanvas = planetTexture(1024, 512, (x, y, z) => {
    let n = fbm3(x * 3, y * 3, z * 3, 5);
    for (let i = 0; i < 3; i += 1) n -= 0.12 * smoothstep(0.62, 0.7, vnoise3(x * (8 + i * 6) + i, y * (8 + i * 6), z * (8 + i * 6)));
    const k = 0.35 + n * 0.55;
    return [k, k, k * 1.02];
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(R * 0.27, 64, 48), new THREE.MeshStandardMaterial({ map: texture(moonCanvas), roughness: 1 }));
  moon.position.set(-2900, 700, 5200);
  scene.add(moon);

  // Satellites: a body, two solar panels, in low orbit.
  const panel = new THREE.MeshStandardMaterial({ color: blend("ocean", "ink", 0.5), metalness: 0.7, roughness: 0.3, emissive: blend("ocean", "ink", 0.6), emissiveIntensity: 0.3 });
  const foil = new THREE.MeshStandardMaterial({ color: col("practical"), metalness: 0.9, roughness: 0.25 });
  const sats = [];
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 7), foil));
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 5), panel);
      p.position.x = s * 11;
      g.add(p);
    }
    scene.add(g);
    sats.push({ g, r: R * (1.09 + i * 0.03), phase: i * 1.4, tilt: 0.3 + i * 0.35, speed: 0.012 + i * 0.002 });
  }

  const T0 = 40;
  const CAM = timedPath([
    [T0 - 1, 0, 30, R + 70],
    [T0 + 3, 40, 160, R + 220],
    [T0 + 8, 300, 600, R * 1.9],
    [T0 + 14, 700, 900, R * 3.2],
    [T0 + 20, 1100, 1000, R * 4.8],
    [T0 + 28, 4200, 1500, R * 7.8],
    [T0 + 35, 7800, 2300, R * 13],
    [T0 + 42, 6000, 3200, R * 26],
  ]);
  const LOOK = timedPath([
    [T0 - 1, 0, 520, R * 0.85],
    [T0 + 3, 0, 700, R * 0.6],
    [T0 + 9, 0, 300, 0],
    [T0 + 20, 0, 0, 0],
    [T0 + 30, -500, 150, 1200],
    [T0 + 42, -400, 120, 900],
  ]);

  function update(t) {
    const [x, y, z] = CAM(t);
    camera.position.set(x, y, z);
    camera.lookAt(...LOOK(t));
    earth.material.uniforms.camPos.value.copy(camera.position);
    earth.rotation.y = t * 0.006;
    cloudSphere.rotation.y = t * 0.0085;
    moon.rotation.y = t * 0.002;
    for (const s of sats) {
      const a = s.phase + t * s.speed;
      s.g.position.set(Math.cos(a) * s.r, Math.sin(a) * Math.sin(s.tilt) * s.r, Math.sin(a) * Math.cos(s.tilt) * s.r + R * 0.05);
      s.g.lookAt(0, 0, 0);
    }
  }
  return { scene, camera, update };
}

/* ---------------- stage 5: the solar system ---------------- */

function solarSystem(PAINT, textures) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  scene.background = col("ink").multiplyScalar(0.1);
  const camera = new THREE.PerspectiveCamera(42, W / H, 1, 600000);
  scene.add(starField(PAINT, 9000, 400000, 81));

  // The Sun: a blazing body, a corona, a wide glow.
  // A blazing surface: granulation in gold and white, pushed past white so it burns through tone mapping.
  const sunSurface = texture(
    planetTexture(512, 256, (x, y, z) => {
      const n = fbm3(x * 9, y * 9, z * 9, 5);
      const c = new THREE.Color().lerpColors(blend("iris", "practical", 0.6), blend("practical", "line", 0.7), smoothstep(0.35, 0.7, n));
      return [c.r, c.g, c.b];
    }),
  );
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(420, 64, 48), new THREE.MeshBasicMaterial({ map: sunSurface, color: new THREE.Color(1, 1, 1).multiplyScalar(4.5) }));
  scene.add(sunMesh);
  const corona = [];
  for (const [s, c, o] of [
    [1600, "practical", 0.95],
    [3400, "iris", 0.5],
    [7000, "practical", 0.22],
  ]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(col(c)), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(s, s, 1);
    scene.add(sp);
    corona.push({ sp, s });
  }
  const light = new THREE.PointLight(blend("practical", "line", 0.6), 4.5, 0, 0);
  scene.add(light, new THREE.AmbientLight(col("sky"), 0.25));

  const banded = (bands, warp, spot) => (x, y, z, lat) => {
    const w = fbm3(x * 3, y * 3, z * 3, 4) * warp;
    const b = Math.sin((lat + w) * bands) * 0.5 + 0.5;
    const n = fbm3(x * 12, y * 30, z * 12, 3);
    let k = b * 0.7 + n * 0.3;
    let s = 0;
    if (spot) {
      const [sx, sy, sz, r] = spot;
      s = smoothstep(r, r * 0.4, Math.hypot(x - sx, (y - sy) * 1.8, z - sz));
    }
    return [k, s, n];
  };
  const mk = (name, f) => texture(planetTexture(1024, 512, f));
  const mercury = mk("mercury", (x, y, z) => {
    let n = fbm3(x * 4, y * 4, z * 4, 5);
    for (let i = 0; i < 4; i += 1) n -= 0.14 * smoothstep(0.6, 0.68, vnoise3(x * (6 + i * 7), y * (6 + i * 7), z * (6 + i * 7)));
    const c = blend("iris", "line", 0.55).multiplyScalar(0.4 + n * 0.6);
    return [c.r, c.g, c.b];
  });
  const venus = mk("venus", (x, y, z, lat) => {
    const [k] = banded(5, 1.6)(x, y, z, lat);
    const c = new THREE.Color().lerpColors(blend("practical", "skin", 0.4), blend("iris", "practical", 0.5), k);
    return [c.r, c.g, c.b];
  });
  const mars = mk("mars", (x, y, z, lat) => {
    const n = fbm3(x * 3, y * 3, z * 3, 6);
    let c = new THREE.Color().lerpColors(blend("accent", "iris", 0.5), blend("accent", "hair", 0.45), smoothstep(0.45, 0.65, n));
    const canyon = smoothstep(0.03, 0.0, Math.abs(y + 0.1 + (vnoise3(x * 4, 0, z * 4) - 0.5) * 0.08)) * smoothstep(-0.2, 0.6, x);
    c.lerp(col("hair"), canyon * 0.7);
    if (Math.abs(lat) > 1.3) c = col("sclera");
    return [c.r, c.g, c.b];
  });
  const jupiter = mk("jupiter", (x, y, z, lat) => {
    const [k, s] = banded(14, 0.5, [0.55, -0.35, 0.55, 0.22])(x, y, z, lat);
    const c = new THREE.Color().lerpColors(blend("skin", "practical", 0.3), blend("iris", "hair", 0.35), k);
    c.lerp(blend("accent", "iris", 0.4), s * 0.85);
    return [c.r, c.g, c.b];
  });
  const saturn = mk("saturn", (x, y, z, lat) => {
    const [k] = banded(18, 0.25)(x, y, z, lat);
    const c = new THREE.Color().lerpColors(blend("practical", "skin", 0.25), blend("iris", "practical", 0.55), k * 0.8);
    return [c.r, c.g, c.b];
  });
  const uranus = mk("uranus", (x, y, z, lat) => {
    const [k] = banded(8, 0.1)(x, y, z, lat);
    const c = new THREE.Color().lerpColors(blend("cyan", "moon", 0.35), blend("cyan", "ocean", 0.25), k * 0.35);
    return [c.r, c.g, c.b];
  });
  const neptune = mk("neptune", (x, y, z, lat) => {
    const [k, s] = banded(9, 0.35, [0.7, 0.3, 0.2, 0.18])(x, y, z, lat);
    const c = new THREE.Color().lerpColors(col("ocean"), blend("ocean", "cyan", 0.4), k * 0.6);
    c.lerp(blend("ocean", "ink", 0.55), s * 0.7);
    return [c.r, c.g, c.b];
  });
  const earthTex = texture(textures.day);

  // A compressed layout along a gentle arc, so one camera path passes every planet in order.
  const planets = [];
  const place = (name, map, radius, dist, angle, spin, extra = () => {}) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
    m.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    m.rotation.z = 0.2;
    scene.add(m);
    extra(m);
    planets.push({ name, m, spin });
    return m;
  };
  const merc = place("Mercury", mercury, 40, 1100, 0.15, 0.02);
  const ven = place("Venus", venus, 85, 1800, 0.75, -0.008);
  const ear = place("Earth", earthTex, 90, 2500, -0.45, 0.03);
  const mar = place("Mars", mars, 55, 3300, 1.25, 0.03);
  const jup = place("Jupiter", jupiter, 360, 5200, 1.85, 0.05);
  const sat = place("Saturn", saturn, 300, 7600, 2.45, 0.045, (m) => {
    const inner = 380;
    const outer = 720;
    const ringCanvas = canvas2d(512, 8);
    const g = ringCanvas.getContext("2d");
    const rr = mulberry32(91);
    for (let x = 0; x < 512; x += 1) {
      const u = x / 512;
      const gap = Math.abs(u - 0.62) < 0.025 ? 0.1 : 1;
      const a = (0.35 + 0.65 * vnoise(u * 60, 1)) * gap * smoothstep(0, 0.05, u) * smoothstep(1, 0.92, u);
      const c = blend("practical", "skin", 0.3 + rr() * 0.2);
      g.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
      g.fillRect(x, 0, 1, 8);
    }
    const ringGeo = new THREE.RingGeometry(inner, outer, 160, 1);
    const p = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    for (let i = 0; i < p.count; i += 1) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - inner) / (outer - inner), 0.5);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: texture(ringCanvas), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2 + 0.42;
    ring.rotation.y = 0.15;
    m.add(ring);
  });
  const ura = place("Uranus", uranus, 170, 9600, 3.0, 0.03);
  const nep = place("Neptune", neptune, 165, 11400, 3.55, 0.032);
  const moonling = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 24), new THREE.MeshStandardMaterial({ color: blend("line", "iris", 0.3), roughness: 1 }));
  scene.add(moonling);
  // Faint orbit lines, revealed as the camera rises at the end.
  const orbitMat = new THREE.LineBasicMaterial({ color: col("moon"), transparent: true, opacity: 0 });
  for (const p of planets) {
    const d = Math.hypot(p.m.position.x, p.m.position.z);
    const pts = [];
    for (let i = 0; i <= 256; i += 1) pts.push(new THREE.Vector3(Math.cos((i / 256) * 6.283) * d, 0, Math.sin((i / 256) * 6.283) * d));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
  }

  const T0 = 80;
  /** A viewpoint on the planet's sunlit side: toward the Sun, swung aside by `swing` degrees. */
  const near = (m, dist, up, swing) => {
    const toSun = new THREE.Vector3().sub(m.position).setY(0).normalize();
    toSun.applyAxisAngle(new THREE.Vector3(0, 1, 0), swing * deg);
    return [m.position.x + toSun.x * dist, up, m.position.z + toSun.z * dist];
  };
  const CAM = timedPath([
    [T0 - 2, -900, 500, 3900],
    [T0 + 1, ...near(merc, 230, 50, 60)],
    [T0 + 3.5, ...near(ven, 380, 70, -60)],
    [T0 + 6, ...near(mar, 230, 40, 60)],
    [T0 + 9.5, ...near(jup, 1300, 260, -55)],
    [T0 + 12.5, ...near(sat, 1250, 420, 55)],
    [T0 + 15.5, ...near(ura, 900, 420, -55)],
    [T0 + 18, ...near(nep, 520, 260, 55)],
    [T0 + 21, -2000, 26000, -16000],
    [T0 + 23, -3000, 44000, -22000],
  ]);
  // The eye leads the camera: it turns to each planet well before the camera reaches it.
  // First, the Sun itself, blazing beyond Mercury.
  const LOOK = timedPath([
    [T0 - 2, 0, 0, 0],
    [T0 + 0.2, 0, 0, 0],
    [T0 + 1.2, ...merc.position.toArray()],
    [T0 + 2.4, ...ven.position.toArray()],
    [T0 + 5.4, ...mar.position.toArray()],
    [T0 + 8.2, ...jup.position.toArray()],
    [T0 + 11.6, ...sat.position.toArray()],
    [T0 + 14.8, ...ura.position.toArray()],
    [T0 + 17.4, ...nep.position.toArray()],
    [T0 + 21, -3000, 0, 3000],
    [T0 + 23, 0, 0, 0],
  ]);

  function update(t) {
    camera.position.set(...CAM(t));
    camera.lookAt(...LOOK(t));
    for (const p of planets) p.m.rotation.y = t * p.spin;
    moonling.position.set(ear.position.x + Math.cos(t * 0.4) * 180, 20, ear.position.z + Math.sin(t * 0.4) * 180);
    corona.forEach((c, i) => {
      const s = c.s * (1 + Math.sin(t * (1.3 + i) + i) * 0.03);
      c.sp.scale.set(s, s, 1);
    });
    orbitMat.opacity = 0.35 * smoothstep(T0 + 17, T0 + 21, t);
  }
  return { scene, camera, update };
}

/* ---------------- stage 6: the Milky Way ---------------- */

function galaxy(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  scene.background = col("ink").multiplyScalar(0.06);
  const camera = new THREE.PerspectiveCamera(42, W / H, 10, 2000000);
  scene.add(starField(PAINT, 6000, 900000, 101));
  const G = new THREE.Group();
  scene.add(G);
  const rand = mulberry32(111);
  const gauss = () => {
    let s = 0;
    for (let i = 0; i < 4; i += 1) s += rand();
    return (s - 2) / 0.58;
  };
  const N = 210000;
  const pos = new Float32Array(N * 3);
  const colr = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const RG = 50000;
  const core = blend("practical", "line", 0.4);
  const coreDeep = blend("practical", "iris", 0.35);
  const armBlue = blend("cyan", "line", 0.55);
  const armWhite = col("line");
  const pink = blend("accent", "skin", 0.45);
  for (let i = 0; i < N; i += 1) {
    let x;
    let y;
    let z;
    let c;
    if (i < N * 0.22) {
      // The bulge: a warm ellipsoid.
      const r = Math.abs(gauss()) * RG * 0.09;
      const a = rand() * 6.283;
      const b = Math.acos(rand() * 2 - 1);
      x = r * Math.sin(b) * Math.cos(a);
      z = r * Math.sin(b) * Math.sin(a);
      y = r * Math.cos(b) * 0.55;
      c = new THREE.Color().lerpColors(core, coreDeep, rand() * 0.6);
    } else {
      // Four logarithmic arms, plus a diffuse disk between them.
      const arm = i % 4;
      const u = Math.pow(rand(), 0.62);
      const r = RG * (0.06 + u * 0.94);
      const diffuse = rand() < 0.3;
      const spread = (diffuse ? 0.9 : 0.16 + u * 0.12) * gauss();
      const a = Math.log(r / (RG * 0.05)) * 1.95 + (arm * Math.PI) / 2 + spread;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = gauss() * RG * 0.012 * (1.2 - u);
      c = new THREE.Color().lerpColors(armWhite, armBlue, rand());
      if (!diffuse && rand() < 0.05) c = pink;
      if (u < 0.2) c.lerp(core, 0.5 * (1 - u / 0.2));
      c.multiplyScalar(diffuse ? 0.5 : 0.85);
    }
    pos.set([x, y, z], i * 3);
    colr.set([c.r, c.g, c.b], i * 3);
    size[i] = 1 + rand() ** 6 * 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colr, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const stars = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { scale: { value: 2600 } },
      vertexShader: `
        attribute float size; attribute vec3 color; varying vec3 vC; uniform float scale;
        void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(size * scale / -mv.z * 40.0, 1.2, 18.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying vec3 vC;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a, a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  G.add(stars);
  // Nebulae along the arms, dust lanes on their inner edges, a glowing core.
  const neb = [glow(pink, 1.5), glow(blend("cyan", "ocean", 0.3), 1.5), glow(blend("accent", "practical", 0.4), 1.5)];
  for (let i = 0; i < 260; i += 1) {
    const arm = i % 4;
    const u = 0.15 + rand() * 0.8;
    const r = RG * u;
    const a = Math.log(r / (RG * 0.05)) * 1.95 + (arm * Math.PI) / 2 + gauss() * 0.22;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: neb[i % 3], transparent: true, opacity: 0.12 + rand() * 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    const s = RG * (0.02 + rand() ** 2 * 0.09);
    sp.scale.set(s, s, 1);
    sp.position.set(Math.cos(a) * r, gauss() * 200, Math.sin(a) * r);
    G.add(sp);
  }
  const dustTex = puff(col("ink"), 121, 12);
  for (let i = 0; i < 520; i += 1) {
    const arm = i % 4;
    const u = 0.22 + rand() * 0.65;
    const r = RG * u;
    const a = Math.log(r / (RG * 0.05)) * 1.95 + (arm * Math.PI) / 2 - 0.22 + gauss() * 0.05;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, opacity: 0.22, depthWrite: false }));
    const s = RG * (0.04 + rand() * 0.04);
    sp.scale.set(s, s * 0.6, 1);
    sp.position.set(Math.cos(a) * r, 120, Math.sin(a) * r);
    G.add(sp);
  }
  for (const [s, o, c] of [
    [RG * 0.5, 0.6, core],
    [RG * 0.22, 0.9, blend("practical", "line", 0.6)],
  ]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(c), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(s, s, 1);
    G.add(sp);
  }

  const T0 = 100;
  const CAM = timedPath([
    [T0 - 2, 34000, 1200, 6000],
    [T0 + 3, 36000, 9000, 22000],
    [T0 + 9, 22000, 34000, 52000],
    [T0 + 15, 6000, 62000, 70000],
    [T0 + 20, 0, 82000, 74000],
  ]);
  const LOOK = timedPath([
    [T0 - 2, 0, 0, 0],
    [T0 + 20, 0, 0, 0],
  ]);
  function update(t) {
    camera.position.set(...CAM(t));
    camera.lookAt(...LOOK(t));
    G.rotation.y = -t * 0.008;
  }
  return { scene, camera, update };
}

/* ---------------- the journey ---------------- */

let shared = null;

/** A scene's view: the journey is built once per page; each scene's canvas copies the frame. */
export function createWorld(canvas, PAINT) {
  if (!shared) shared = buildJourney(PAINT);
  const ctx = canvas.getContext("2d");
  return {
    render(t) {
      shared.render(t);
      ctx.drawImage(shared.frame, 0, 0, canvas.width, canvas.height);
    },
  };
}

function buildJourney(PAINT) {
  const glCanvas = canvas2d(W, H);
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const frame = canvas2d(W, H);
  const fx = frame.getContext("2d");

  const textures = earthTextures(PAINT);
  const stages = {
    everest: everest(PAINT),
    volcano: volcano(PAINT),
    earth: earthAndSpace(PAINT, textures),
    solar: solarSystem(PAINT, textures),
    galaxy: galaxy(PAINT),
  };
  const cloudVeil = veilImage(new THREE.Color(PAINT.sclera), 3, 0.25, 0.55);
  const smokeColor = new THREE.Color().lerpColors(new THREE.Color(PAINT.hair), new THREE.Color(PAINT.line), 0.3);
  const smokeVeil = veilImage(smokeColor, 9, 0.2, 0.5);
  const smokeFill = `#${new THREE.Color().lerpColors(new THREE.Color(PAINT.hair), new THREE.Color(PAINT.line), 0.22).getHexString()}`;

  /** Which stages show at t, at what opacity. Swaps happen under a full veil or as slow crossfades. */
  const plan = (t) => {
    if (t < 20.3) return [["everest", 1]];
    if (t < 40.5) return [["volcano", 1]];
    if (t < 79) return [["earth", 1]];
    if (t < 81.5) return [["earth", 1], ["solar", smoothstep(79, 81.5, t)]];
    if (t < 99) return [["solar", 1]];
    if (t < 101.5) return [["solar", 1], ["galaxy", smoothstep(99, 101.5, t)]];
    return [["galaxy", 1]];
  };
  // Veils: white cloud between Everest and the volcano; smoke, then cloud, out of the volcano.
  const cloudAt = (t) => Math.max(smoothstep(18.6, 19.7, t) * (1 - smoothstep(20.9, 22.2, t)), smoothstep(39.4, 40.2, t) * (1 - smoothstep(40.8, 42.4, t)));
  const smokeAt = (t) => smoothstep(36.8, 38.6, t) * (1 - smoothstep(39.6, 40.6, t));

  function drawVeil(img, alpha, t) {
    if (alpha <= 0.002) return;
    fx.globalAlpha = Math.min(1, alpha * 1.15);
    const shift = (t * 70) % (img.width / 2);
    fx.drawImage(img, shift, 0, img.width / 2, img.height, 0, 0, W, H);
    // A solid core under the texture, so a full veil hides the swap completely.
    fx.globalAlpha = img === cloudVeil ? Math.max(0, alpha - 0.35) / 0.65 : Math.max(0, alpha - 0.6) / 0.4 * 0.8;
    fx.fillStyle = img === cloudVeil ? PAINT.sclera : smokeFill;
    fx.fillRect(0, 0, W, H);
  }

  function render(t) {
    fx.globalAlpha = 1;
    fx.fillStyle = PAINT.ink;
    fx.fillRect(0, 0, W, H);
    for (const [name, alpha] of plan(t)) {
      const s = stages[name];
      s.update(t);
      renderer.render(s.scene, s.camera);
      fx.globalAlpha = alpha;
      fx.drawImage(glCanvas, 0, 0);
    }
    drawVeil(smokeVeil, smokeAt(t), t);
    drawVeil(cloudVeil, cloudAt(t), t);
    fx.globalAlpha = 1;
  }
  return { render, frame };
}
