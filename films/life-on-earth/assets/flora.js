/**
 * Plants and stones, instanced: broadleaf trees, conifers, palms, bushes, grass tufts, flowers,
 * ferns, and rocks. Each takes a list of placements and the paints, and adds one or two
 * instanced meshes to the scene.
 */

import { THREE, mulberry32, fbm, xf, merge, sway, drawn, css } from "./lib.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

function place(mesh, list, f) {
  list.forEach((p, i) => {
    const [x, y, z, ry, sx, sy, sz, c] = f(p);
    mesh.setMatrixAt(i, _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(sx, sy, sz)));
    if (c) mesh.setColorAt(i, c);
  });
  mesh.count = list.length;
  mesh.frustumCulled = false;
  return mesh;
}

/** A lumpy crown of several overlapping lobes, lighter on top (vertex colours shade it). */
function crownGeometry(seed, lobes, flat = 1) {
  const r = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < lobes; i += 1) {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const a = r() * Math.PI * 2;
    const d = i === 0 ? 0 : 0.35 + r() * 0.35;
    const s = i === 0 ? 0.85 : 0.5 + r() * 0.35;
    xf(g, [Math.cos(a) * d, (i === 0 ? 0 : (r() - 0.35) * 0.5) * flat, Math.sin(a) * d], [r(), r(), r()], [s, s * 0.85 * flat, s]);
    parts.push(g);
  }
  const g = merge(parts);
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    // Leaf clumps: the surface pushed in and out, so the crown isn't a smooth ball.
    const k = 1 + (fbm(x * 2.6 + seed, z * 2.6 + y * 1.7, 3) - 0.5) * 0.45;
    p.setXYZ(i, x * k, y * k, z * k);
    const v = 0.62 + 0.38 * Math.min(1, Math.max(0, (y + 0.7) / 1.5)) + (fbm(x * 5, z * 5 + y * 3, 2) - 0.5) * 0.35;
    c.set([v, v, v], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Broadleaf trees. list: [x, y, z, height, crownColor]. Trunk and crown are separate meshes;
 * several crown shapes keep the forest from repeating.
 */
export function broadleaf(scene, list, PAINT, { variants = 3, sway: swayAmp = 0.006, seed = 1, shadow = true, cards = 0 } = {}) {
  const bark = new THREE.Color().lerpColors(new THREE.Color(PAINT.hair), new THREE.Color(PAINT.iris), 0.35);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: bark, roughness: 0.95 }), Math.max(1, list.length));
  place(trunks, list, ([x, y, z, h]) => [x, y - 0.3, z, 0, h * 0.06 + 0.15, h * 0.62, h * 0.06 + 0.15]);
  trunks.castShadow = shadow;
  scene.add(trunks);
  const groups = Array.from({ length: variants }, () => []);
  list.forEach((p, i) => groups[i % variants].push(p));
  const r = mulberry32(seed);
  groups.forEach((g, v) => {
    if (!g.length) return;
    const mat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), swayAmp, 0.9, `crown${swayAmp}`);
    const m = new THREE.InstancedMesh(crownGeometry(seed * 13 + v * 7, 5 + v, 0.9), mat, g.length);
    place(m, g, ([x, y, z, h, c]) => {
      const w = h * (0.36 + r() * 0.14);
      return [x, y + h * 0.68, z, r() * 6.28, w, h * (0.32 + r() * 0.08), w, c];
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
  });
  if (cards) leafCards(scene, list, cards, seed);
}

/** Clusters of leaves on alpha cards, scattered over each crown's surface: a soft, broken silhouette. */
let cardTex = null;
function leafCards(scene, list, per, seed) {
  if (!cardTex)
    cardTex = drawn(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = mulberry32(5);
      for (let i = 0; i < 46; i += 1) {
        const x = w * (0.15 + r() * 0.7);
        const y = h * (0.15 + r() * 0.7);
        const k = 150 + Math.floor(r() * 105);
        g.fillStyle = `rgba(${k},${k},${k},1)`;
        g.beginPath();
        g.ellipse(x, y, 5 + r() * 6, 2.5 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
    });
  const r = mulberry32(seed * 7 + 1);
  const n = list.length * per;
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), sway(new THREE.MeshStandardMaterial({ map: cardTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), 0.02, 1.2, "cards"), n);
  let k = 0;
  for (const [x, y, z, h, c] of list) {
    const w = h * 0.42;
    const cy = y + h * 0.68;
    for (let i = 0; i < per; i += 1) {
      const a = r() * Math.PI * 2;
      const b = Math.acos(2 * r() - 1);
      const s = 0.8 + r() * 0.3;
      const px = x + Math.sin(b) * Math.cos(a) * w * s;
      const py = cy + Math.cos(b) * h * 0.34 * s;
      const pz = z + Math.sin(b) * Math.sin(a) * w * s;
      const size = 1.4 + r() * 1.6;
      m.setMatrixAt(k, _m.compose(_v.set(px, py, pz), _q.setFromEuler(_e.set(r() * 3, r() * 6.28, r() * 3)), _s.set(size, size, size)));
      m.setColorAt(k, c.clone().multiplyScalar(0.75 + r() * 0.45));
      k += 1;
    }
  }
  m.count = k;
  m.frustumCulled = false;
  m.castShadow = true;
  scene.add(m);
}

/** Conifers: a trunk and a crown of stacked, drooping tiers. list: [x, y, z, height, color]. */
export function conifers(scene, list, PAINT, { shadow = true } = {}) {
  const tiers = [];
  for (let i = 0; i < 5; i += 1) {
    const g = new THREE.ConeGeometry(0.42 - i * 0.065, 0.36, 9, 1, true);
    g.translate(0, 0.25 + i * 0.16, 0);
    tiers.push(g);
  }
  const geo = merge(tiers);
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const v = 0.65 + 0.35 * (p.getY(i) / 1.1);
    c.set([v, v, v], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const crowns = new THREE.InstancedMesh(geo, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), 0.004, 0.8, "pine"), Math.max(1, list.length));
  const r = mulberry32(3);
  place(crowns, list, ([x, y, z, h, col]) => [x, y, z, r() * 6.28, h * 0.75, h, h * 0.75, col]);
  crowns.castShadow = shadow;
  scene.add(crowns);
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.2, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color().lerpColors(new THREE.Color(PAINT.hair), new THREE.Color(PAINT.iris), 0.4), roughness: 0.95 }), Math.max(1, list.length));
  place(trunks, list, ([x, y, z, h]) => [x, y - 0.2, z, 0, h * 0.04 + 0.1, h * 0.35, h * 0.04 + 0.1]);
  scene.add(trunks);
}

/** Coconut palms: a leaning, curved trunk and a crown of arching fronds. list: [x, y, z, height, lean]. */
export function palms(scene, list, PAINT) {
  const trunkParts = [];
  for (let i = 0; i < 8; i += 1) {
    const u = i / 8;
    const g = new THREE.CylinderGeometry(0.02 - u * 0.006, 0.026 - u * 0.006, 1 / 8 + 0.01, 7);
    xf(g, [u * u * 0.22, (i + 0.5) / 8, 0], [0, 0, -u * 0.22]);
    trunkParts.push(g);
  }
  const trunkGeo = merge(trunkParts);
  const leafTex = drawn(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,1)";
    g.fillRect(w / 2 - 2, 0, 4, h);
    for (let y = 8; y < h; y += 6) {
      const len = (w / 2 - 4) * Math.sin((y / h) * Math.PI) ** 0.6;
      g.fillRect(w / 2 - len, y, len, 3);
      g.fillRect(w / 2, y + 2, len, 3);
    }
  });
  const fronds = [];
  for (let i = 0; i < 9; i += 1) {
    const g = new THREE.PlaneGeometry(0.55, 2.6, 1, 6);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k += 1) {
      const y = p.getY(k) + 1.3;
      // Arch up and droop at the tip.
      p.setXYZ(k, p.getX(k), 0.5 * y - 0.32 * y * y, y);
    }
    g.computeVertexNormals();
    xf(g, [0, 0, 0], [0, (i / 9) * Math.PI * 2 + (i % 2) * 0.2, 0]);
    fronds.push(g);
  }
  const frondGeo = merge(fronds);
  const r = mulberry32(8);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color().lerpColors(new THREE.Color(PAINT.iris), new THREE.Color(PAINT.hair), 0.35).lerp(new THREE.Color(PAINT.moon), 0.25), roughness: 0.9 }), list.length);
  const crowns = new THREE.InstancedMesh(frondGeo, sway(new THREE.MeshStandardMaterial({ color: new THREE.Color().lerpColors(new THREE.Color(PAINT.land), new THREE.Color(PAINT.ink), 0.12), map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }), 0.025, 1.6, "palm"), list.length);
  list.forEach(([x, y, z, h, lean], i) => {
    const ry = lean ?? r() * 6.28;
    trunks.setMatrixAt(i, _m.compose(_v.set(x, y - 0.2, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(h, h, h)));
    const fs = 1.4 + r() * 0.4;
    crowns.setMatrixAt(i, _m.compose(_v.set(x + Math.cos(ry) * 0.19 * h, y - 0.3 + h, z - Math.sin(ry) * 0.19 * h), _q.setFromEuler(_e.set(0, r() * 6.28, 0)), _s.set(fs, fs, fs)));
  });
  trunks.castShadow = crowns.castShadow = true;
  trunks.frustumCulled = crowns.frustumCulled = false;
  scene.add(trunks, crowns);
}

/** Bushes and hedges: low lumpy crowns. list: [x, y, z, size, color]. */
export function bushes(scene, list, { shadow = true } = {}) {
  const m = new THREE.InstancedMesh(crownGeometry(91, 4, 0.7), sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 0.01, 1.1, "bush"), Math.max(1, list.length));
  const r = mulberry32(19);
  place(m, list, ([x, y, z, s, c]) => [x, y + s * 0.35, z, r() * 6.28, s, s * 0.75, s, c]);
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
}

/** Grass tufts: a fan of thin blades. list: [x, y, z, height, color]. */
export function tufts(scene, list, { amp = 0.12, blades = 7 } = {}) {
  const parts = [];
  for (let i = 0; i < blades; i += 1) {
    const g = new THREE.PlaneGeometry(0.035, 1, 1, 3);
    g.translate(0, 0.5, 0);
    xf(g, [(i - blades / 2) * 0.03, 0, 0], [((i % 3) - 1) * 0.12, (i / blades) * Math.PI, ((i % 2) * 2 - 1) * 0.25]);
    parts.push(g);
  }
  const m = new THREE.InstancedMesh(merge(parts), sway(new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), amp, 1.7, `tuft${amp}`), Math.max(1, list.length));
  const r = mulberry32(23);
  place(m, list, ([x, y, z, h, c]) => [x, y - 0.03, z, r() * 6.28, h * 1.3, h, h * 1.3, c]);
  m.receiveShadow = true;
  scene.add(m);
}

/** Flowers: a stem and a small bloom. list: [x, y, z, size, color]. */
export function flowers(scene, list) {
  const stem = new THREE.CylinderGeometry(0.006, 0.008, 0.3, 3);
  stem.translate(0, 0.15, 0);
  const bloom = new THREE.SphereGeometry(0.045, 6, 4);
  xf(bloom, [0, 0.31, 0], [0, 0, 0], [1, 0.45, 1]);
  const m = new THREE.InstancedMesh(merge([paint(stem, new THREE.Color(0.35, 0.55, 0.3)), paint(bloom, new THREE.Color(1, 1, 1))]), sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), 0.4, 2.1, "flower"), Math.max(1, list.length));
  const r = mulberry32(29);
  place(m, list, ([x, y, z, s, c]) => [x, y, z, r() * 6.28, s, s, s, c]);
  scene.add(m);
}
function paint(geo, c) {
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) a.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return geo;
}

/** Ferns: arching fronds in a rosette. list: [x, y, z, size, color]. */
export function ferns(scene, list, PAINT) {
  const tex = drawn(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,1)";
    g.fillRect(w / 2 - 1.5, 0, 3, h);
    for (let y = 6; y < h - 4; y += 7) {
      const len = (w / 2 - 3) * Math.sin(((h - y) / h) * Math.PI * 0.95) ** 0.7;
      g.beginPath();
      g.ellipse(w / 2 - len / 2, y, len / 2, 3.2, -0.25, 0, Math.PI * 2);
      g.ellipse(w / 2 + len / 2, y + 2, len / 2, 3.2, 0.25, 0, Math.PI * 2);
      g.fill();
    }
  });
  const fronds = [];
  for (let i = 0; i < 7; i += 1) {
    const g = new THREE.PlaneGeometry(0.32, 1, 1, 5);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k += 1) {
      const y = p.getY(k) + 0.5;
      p.setXYZ(k, p.getX(k), 0.75 * y - 0.6 * y * y, y * 0.85);
    }
    g.computeVertexNormals();
    xf(g, [0, 0, 0], [0, (i / 7) * Math.PI * 2 + (i % 2) * 0.3, 0]);
    fronds.push(g);
  }
  const m = new THREE.InstancedMesh(merge(fronds), sway(new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }), 0.05, 1.3, "fern"), Math.max(1, list.length));
  const r = mulberry32(31);
  place(m, list, ([x, y, z, s, c]) => [x, y, z, r() * 6.28, s, s * (0.8 + r() * 0.4), s, c]);
  m.receiveShadow = true;
  m.castShadow = true;
  scene.add(m);
  void PAINT;
  void css;
}

/** Rocks and boulders: flat-shaded, squashed, half sunk. list: [x, y, z, size, color]. */
export function rocks(scene, list, { mossy = false } = {}) {
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const k = 1 + (fbm(p.getX(i) * 2 + 4, p.getZ(i) * 2 + p.getY(i), 2) - 0.5) * 0.5;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: mossy ? 0.95 : 0.85, flatShading: true }), Math.max(1, list.length));
  const r = mulberry32(37);
  place(m, list, ([x, y, z, s, c]) => [x, y + s * 0.1, z, r() * 6.28, s * (1 + r() * 0.5), s * (0.5 + r() * 0.4), s, c]);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}
