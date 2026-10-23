/**
 * The city: a grid of avenues and cross streets, glass towers at the centre stepping down to
 * offices and apartments, the river with its embankments, bridges and riverside walk, a park,
 * a market, a plaza, a tram stop; traffic that obeys the lights (simulated once at load),
 * pedestrians who wait at the kerb and cross on green, cyclists, dog walkers, families in the
 * park; pigeons, crows, sparrows; and the suburbs at the edge.
 */

import { THREE, mulberry32, fbm, smoothstep, mix, clamp, xf, merge, tiledBox, drawn, css, crowd, herd, flock, loopFlight, swarm, insects, outfit, polyline, pingS } from "./lib.js";
import { riverZ, riverW, riverY, baseH, CITY, SUBURB, AVENUES, avenueW, CROSS, CROSS_W, PARK, cityBlocks, riverside, roadZ, roadW, ROAD_X0, ROAD_BRIDGE } from "./geo.js";
import { broadleaf, bushes, tufts, flowers } from "./flora.js";

const FPS = 24;
// Traffic is only on screen from the country road to the flight out of town.
const T0 = 50;
const T1 = 107;
const FRAMES = (T1 - T0) * FPS + 1;

export function city(ctx) {
  const { scene, PAINT, col, blend, ground } = ctx;
  const rand = mulberry32(303);
  const updates = [];
  const top = (x) => baseH(x) + 0.2;
  const street = (x) => baseH(x) + 0.08;
  const centre = { x: 2900, z: 0 };
  const MARKET = { x0: 2610, x1: 2690, z0: 18, z1: 110 };
  const PLAZA = { x0: 2810, x1: 2890, z0: -110, z1: -18 };
  const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

  /* ---------------- materials and facades ---------------- */
  const facade = {
    glass: drawn(128, 128, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, css(blend("moon", "hair", 0.3).lerp(col("land"), 0.06)));
      grad.addColorStop(1, css(blend("moon", "hair", 0.4).lerp(col("ocean"), 0.06)));
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.fillStyle = css(blend("hair", "moon", 0.45));
      g.fillRect(0, 0, w, 10);
      g.fillRect(0, 0, 4, h);
      g.fillRect(w / 2 - 1, 10, 2, h);
    }, { repeat: true }),
    office: drawn(128, 128, (g, w, h) => {
      g.fillStyle = css(blend("moon", "practical", 0.18).lerp(col("sclera"), 0.3));
      g.fillRect(0, 0, w, h);
      g.fillStyle = css(blend("hair", "moon", 0.52).lerp(col("ocean"), 0.1));
      g.fillRect(12, 26, w - 24, h - 44);
      g.fillStyle = css(blend("moon", "ocean", 0.3), 0.55);
      g.fillRect(12, 26, w - 24, 10);
      g.fillStyle = css(blend("moon", "hair", 0.2));
      g.fillRect(w / 2 - 2, 26, 4, h - 44);
    }, { repeat: true }),
    flats: drawn(128, 128, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = css(blend("hair", "moon", 0.45));
      g.fillRect(18, 30, 36, 60);
      g.fillRect(74, 30, 36, 44);
      g.fillStyle = css(blend("moon", "sky", 0.2), 0.6);
      g.fillRect(18, 30, 36, 8);
      g.fillRect(74, 30, 36, 8);
      // A balcony slab and rail.
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(10, 90, 52, 6);
      g.fillStyle = "rgba(0,0,0,0.35)";
      for (let x = 12; x < 62; x += 5) g.fillRect(x, 74, 1.5, 16);
      g.fillRect(10, 74, 52, 2);
    }, { repeat: true }),
  };
  const facadeMat = {
    glass: new THREE.MeshStandardMaterial({ map: facade.glass, vertexColors: true, roughness: 0.18, metalness: 0.32, envMapIntensity: 0.6 }),
    office: new THREE.MeshStandardMaterial({ map: facade.office, vertexColors: true, roughness: 0.4, metalness: 0.3 }),
    flats: new THREE.MeshStandardMaterial({ map: facade.flats, vertexColors: true, roughness: 0.85 }),
  };
  const geos = { glass: [], office: [], flats: [] };
  const tint = (g, c) => {
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    return g;
  };
  const roofs = [];
  const gardens = [];
  function building(x, z, w, d, h, type) {
    const y = top(x);
    const c = type === "glass" ? new THREE.Color().lerpColors(col("sclera"), [blend("cyan", "sclera", 0.55), blend("practical", "sclera", 0.6), blend("land", "sclera", 0.7)][Math.floor(rand() * 3)], rand() * 0.8) : type === "office" ? new THREE.Color().lerpColors(col("sclera"), blend("practical", "sclera", 0.6), rand() * 0.6) : new THREE.Color().lerpColors(col("sclera"), [blend("skin", "sclera", 0.35), blend("practical", "sclera", 0.5), blend("iris", "sclera", 0.45), blend("moon", "sclera", 0.2)][Math.floor(rand() * 4)], 0.8);
    const tw = type === "glass" ? 3.2 : 4;
    const th = type === "glass" ? 3.8 : 3.4;
    const add = (bx, bz, bw, bd, bh, by) => {
      const g = tiledBox(bw, bh, bd, tw, th);
      g.translate(bx, by + bh / 2, bz);
      geos[type].push(tint(g, c));
    };
    if (h > 95 && rand() < 0.75) {
      // A stepped tower: base, shaft, crown, and a mast.
      const h1 = h * (0.55 + rand() * 0.15);
      add(x, z, w, d, h1, y);
      const w2 = w * (0.7 + rand() * 0.15);
      const d2 = d * (0.7 + rand() * 0.15);
      add(x, z, w2, d2, h - h1, y + h1);
      add(x, z, w2 * 0.6, d2 * 0.6, 6, y + h);
      roofs.push([x, y + h + 6, z, w2 * 0.6, d2 * 0.6, h > 140]);
    } else {
      add(x, z, w, d, h, y);
      roofs.push([x, y + h, z, w, d, false]);
      if (h < 45 && rand() < 0.25) gardens.push([x, y + h, z, w, d]);
    }
  }

  /* ---------------- blocks, lots, buildings ---------------- */
  const blocks = cityBlocks();
  const pads = [];
  const lots = [];
  for (const b of blocks) {
    // Split the block around the river band.
    const xc = (b.x0 + b.x1) / 2;
    const rz = riverZ(xc);
    const band = riverW(xc) * 0.5 + 26 + Math.abs(riverZ(b.x0) - riverZ(b.x1)) / 2;
    const spans = rz + band < b.z0 || rz - band > b.z1 ? [[b.z0, b.z1]] : [[b.z0, rz - band], [rz + band, b.z1]].filter(([a, c]) => c - a > 14);
    for (const [z0, z1] of spans) {
      pads.push({ x0: b.x0, x1: b.x1, z0, z1 });
      if (inRect(PARK, xc, (z0 + z1) / 2) || inRect(MARKET, xc, (z0 + z1) / 2) || inRect(PLAZA, xc, (z0 + z1) / 2)) continue;
      // Lots: one or two across, two to four deep.
      const nx = b.x1 - b.x0 > 70 && rand() < 0.6 ? 2 : 1;
      const nz = Math.max(1, Math.round((z1 - z0) / (40 + rand() * 25)));
      for (let i = 0; i < nx; i += 1)
        for (let k = 0; k < nz; k += 1) {
          const lx0 = mix(b.x0, b.x1, i / nx) + 5;
          const lx1 = mix(b.x0, b.x1, (i + 1) / nx) - 5;
          const lz0 = mix(z0, z1, k / nz) + 5;
          const lz1 = mix(z0, z1, (k + 1) / nz) - 5;
          if (lx1 - lx0 < 12 || lz1 - lz0 < 12) continue;
          lots.push([lx0, lx1, lz0, lz1]);
        }
    }
  }
  for (const [x0, x1, z0, z1] of lots) {
    const x = (x0 + x1) / 2;
    const z = (z0 + z1) / 2;
    if (riverside(x, z, 4)) continue;
    const d = Math.hypot((x - centre.x) / 1.15, z - centre.z);
    const base = 16 + 210 * Math.exp(-((d / 360) ** 2));
    let h = base * (0.55 + rand() * 0.9);
    if (rand() < 0.08) h *= 1.5;
    h = clamp(h, 9, 260);
    const type = h > 70 ? (rand() < 0.75 ? "glass" : "office") : h > 32 ? (rand() < 0.55 ? "office" : "flats") : "flats";
    const w = (x1 - x0) * (0.8 + rand() * 0.2);
    const dd = (z1 - z0) * (0.8 + rand() * 0.2);
    building(x, z, w, dd, h, type);
  }
  for (const [type, list] of Object.entries(geos)) {
    if (!list.length) continue;
    const m = new THREE.Mesh(merge(list), facadeMat[type]);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
  // Rooftops: plant rooms, a few masts, gardens with small trees.
  const roofKit = [];
  const masts = [];
  for (const [x, y, z, w, d, mast] of roofs) {
    roofKit.push([x + w * 0.15, y + 1.4, z - d * 0.1, 0, w * 0.35, 2.8, d * 0.3, blend("moon", "hair", 0.25)]);
    if (rand() < 0.5) roofKit.push([x - w * 0.25, y + 0.8, z + d * 0.2, 0, 3, 1.6, 2, blend("moon", "hair", 0.4)]);
    if (mast) masts.push([x, y + 18, z, 0, 0.5, 36, 0.5, blend("moon", "hair", 0.3)]);
  }
  const staticInst = (geo, mat, list, shadow = true) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const mm = new THREE.Matrix4();
    list.forEach(([x, y, z, ry, sx, sy, sz, c], i) => {
      m.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
      if (c) m.setColorAt(i, c);
    });
    m.count = list.length;
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), roofKit);
  staticInst(new THREE.CylinderGeometry(0.6, 1, 1, 6), new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.6 }), masts);
  const gardenBeds = [];
  const gardenTrees = [];
  for (const [x, y, z, w, d] of gardens) {
    gardenBeds.push([x, y + 0.25, z, 0, w * 0.7, 0.5, d * 0.7, blend("land", "practical", 0.15)]);
    for (let i = 0; i < 4; i += 1) gardenTrees.push([x + (rand() - 0.5) * w * 0.5, y + 0.5, z + (rand() - 0.5) * d * 0.5, 2.2 + rand() * 1.5, blend("land", "ink", rand() * 0.2)]);
  }
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), gardenBeds);
  bushes(scene, gardenTrees);

  /* ---------------- ground: streets, kerbs, pavements, bridges ---------------- */
  const asphalt = new THREE.MeshStandardMaterial({ color: blend("hair", "moon", 0.3), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2 });
  const paving = new THREE.MeshStandardMaterial({ color: blend("moon", "hair", 0.42).lerp(col("iris"), 0.08), roughness: 0.9 });
  const streetGeos = [];
  const strip = (x0, x1, z0, z1) => {
    const g = new THREE.PlaneGeometry(1, 1, Math.max(1, Math.round((x1 - x0) / 40)), 1);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const x = mix(x0, x1, p.getX(i) + 0.5);
      const z = mix(z0, z1, p.getZ(i) + 0.5);
      p.setXYZ(i, x, street(x), z);
    }
    g.computeVertexNormals();
    streetGeos.push(g);
  };
  const xEnd = SUBURB.x1;
  for (const z of AVENUES) strip(z === 0 ? CITY.x0 : CITY.x0 - 10, xEnd, z - avenueW(z) / 2, z + avenueW(z) / 2);
  const bridgesAt = [];
  for (const x of CROSS) {
    for (let a = 0; a < AVENUES.length - 1; a += 1) {
      const z0 = AVENUES[a] + avenueW(AVENUES[a]) / 2;
      const z1 = AVENUES[a + 1] - avenueW(AVENUES[a + 1]) / 2;
      const rz = riverZ(x);
      const band = riverW(x) * 0.5 + 6;
      if (rz > z0 && rz < z1) {
        strip(x - CROSS_W / 2, x + CROSS_W / 2, z0, rz - band);
        strip(x - CROSS_W / 2, x + CROSS_W / 2, rz + band, z1);
        bridgesAt.push([x, rz, band]);
      } else strip(x - CROSS_W / 2, x + CROSS_W / 2, z0, z1);
    }
    strip(x - CROSS_W / 2, x + CROSS_W / 2, CITY.z0, AVENUES[0] - avenueW(AVENUES[0]) / 2);
    strip(x - CROSS_W / 2, x + CROSS_W / 2, AVENUES[AVENUES.length - 1] + avenueW(AVENUES[AVENUES.length - 1]) / 2, CITY.z1);
  }
  {
    const m = new THREE.Mesh(merge(streetGeos), asphalt);
    m.receiveShadow = true;
    scene.add(m);
  }
  // Block pads: kerbed pavement the buildings stand on.
  const padList = pads.map((p) => {
    const x = (p.x0 + p.x1) / 2;
    return [x, top(x) - 0.6, (p.z0 + p.z1) / 2, 0, p.x1 - p.x0, 1.2, p.z1 - p.z0];
  });
  staticInst(new THREE.BoxGeometry(1, 1, 1), paving, padList, false);
  // The park, the market and the plaza get their own surfaces on top.
  const grassTop = new THREE.MeshStandardMaterial({ color: blend("land", "practical", 0.12), roughness: 1 });
  {
    const x = (PARK.x0 + PARK.x1) / 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(PARK.x1 - PARK.x0 - 8, 0.1, PARK.z1 - PARK.z0 - 8), grassTop);
    m.position.set(x, top(x) + 0.05, (PARK.z0 + PARK.z1) / 2);
    m.receiveShadow = true;
    scene.add(m);
  }
  // Bridges on the cross streets; embankment walls and the riverside walk.
  const stone = new THREE.MeshStandardMaterial({ color: blend("moon", "iris", 0.3).lerp(col("hair"), 0.3), roughness: 0.85 });
  const bridgeParts = [];
  for (const [x, rz, band] of bridgesAt) {
    const y = street(x);
    bridgeParts.push([x, y - 0.6, rz, 0, CROSS_W + 8, 1.3, band * 2 + 2]);
    for (const sd of [-1, 1]) bridgeParts.push([x + sd * (CROSS_W / 2 + 4), y + 0.55, rz, 0, 0.4, 1.1, band * 2 + 2]);
    for (const sd of [-0.45, 0.45]) bridgeParts.push([x, y - 4, rz + sd * band, 0, CROSS_W - 2, 7, 1.8]);
  }
  const walls = [];
  const walkGeos = [];
  for (let x = CITY.x0 - 30; x < xEnd + 20; x += 6) {
    const rz = riverZ(x);
    const rz2 = riverZ(x + 6);
    const ang = Math.atan2(rz2 - rz, 6);
    const w = riverW(x) * 0.5;
    const wy = riverY(x);
    for (const sd of [-1, 1]) {
      walls.push([x + 3, (wy - 1 + street(x)) / 2, (rz + rz2) / 2 + sd * (w + 0.6), -ang, 6.3, street(x) - wy + 1.5, 1.2]);
    }
  }
  staticInst(new THREE.BoxGeometry(1, 1, 1), stone, bridgeParts);
  staticInst(new THREE.BoxGeometry(1, 1, 1), stone, walls, false);
  for (const sd of [-1, 1]) {
    const pts = [];
    for (let x = CITY.x0 - 20; x < xEnd; x += 8) pts.push([x, riverZ(x) + sd * (riverW(x) * 0.5 + 6)]);
    const verts = [];
    const ind = [];
    pts.forEach(([x, z], i) => {
      for (const k of [-1, 1]) verts.push(x, street(x) + 0.05, z + k * 2.4);
      if (i) ind.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(ind);
    g.computeVertexNormals();
    walkGeos.push(g.toNonIndexed());
  }
  {
    const m = new THREE.Mesh(merge(walkGeos), new THREE.MeshStandardMaterial({ color: blend("practical", "moon", 0.45), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    scene.add(m);
  }
  // Lane lines and crossings.
  const marks = [];
  for (const z of AVENUES) {
    const offs = z === 0 ? [0, 5.25, -5.25, 8.75, -8.75] : [0];
    for (const o of offs)
      for (let x = CITY.x0 + 2; x < xEnd; x += 9) {
        if (CROSS.some((c) => Math.abs(x - c) < CROSS_W / 2 + 3)) continue;
        marks.push([x, street(x) + 0.03, z + o, 0, o === 0 && z !== 0 ? 4.5 : 3, 0.02, o === 0 ? 0.18 : 0.14, o === 0 ? col("practical") : col("sclera")]);
      }
  }
  for (const x of CROSS)
    for (const z of AVENUES) {
      const aw = avenueW(z);
      // Zebra crossings on all four sides.
      for (let k = -aw / 2 + 1; k < aw / 2 - 0.5; k += 1.2) for (const sd of [-1, 1]) marks.push([x + sd * (CROSS_W / 2 + 2), street(x) + 0.03, z + k, 0, 3, 0.02, 0.6, col("sclera")]);
      for (let k = -CROSS_W / 2 + 1; k < CROSS_W / 2 - 0.5; k += 1.2) for (const sd of [-1, 1]) marks.push([x + k, street(x) + 0.03, z + sd * (aw / 2 + 2), 0, 0.6, 0.02, 3, col("sclera")]);
    }
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), marks, false);
  // Street trees and lamps along every avenue; trees on the riverside walk.
  const trees = [];
  const lamps = [];
  const leaf = () => new THREE.Color().lerpColors(blend("land", "ink", 0.12), blend("land", "practical", 0.2), rand());
  for (const z of AVENUES) {
    const aw = avenueW(z);
    for (let x = CITY.x0 + 8; x < xEnd - 4; x += 13) {
      if (CROSS.some((c) => Math.abs(x - c) < CROSS_W / 2 + 4)) continue;
      for (const sd of [-1, 1]) {
        const tz = z + sd * (aw / 2 + 2);
        if (riverside(x, tz, -10)) continue;
        if ((x / 13 + sd) % 2 < 1) trees.push([x, top(x), tz, 7 + rand() * 4, leaf()]);
        else lamps.push([x, top(x), tz]);
      }
    }
  }
  for (let x = CITY.x0; x < xEnd; x += 11)
    for (const sd of [-1, 1]) {
      const z = riverZ(x) + sd * (riverW(x) * 0.5 + 10 + rand() * 3);
      trees.push([x + rand() * 4, street(x), z, 8 + rand() * 5, leaf()]);
    }
  // The park: trees in groups, flower beds, a pond with a fountain, paths, benches.
  const parkTrees = [];
  for (let i = 0; i < 46; i += 1) {
    const x = PARK.x0 + 8 + rand() * (PARK.x1 - PARK.x0 - 16);
    const z = PARK.z0 + 8 + rand() * (PARK.z1 - PARK.z0 - 16);
    if (Math.hypot(x - 3000, z - (PARK.z0 + PARK.z1) / 2) < 22) continue;
    parkTrees.push([x, top(x) + 0.1, z, 8 + rand() * 7, leaf()]);
  }
  broadleaf(scene, trees.concat(parkTrees), PAINT, { variants: 3, seed: 11 });
  const pole = new THREE.MeshStandardMaterial({ color: blend("hair", "moon", 0.35), roughness: 0.5, metalness: 0.6 });
  staticInst(new THREE.CylinderGeometry(0.08, 0.12, 1, 6), pole, lamps.map(([x, y, z]) => [x, y + 4, z, 0, 1, 8, 1]));
  staticInst(new THREE.BoxGeometry(1, 1, 1), pole, lamps.map(([x, y, z]) => [x, y + 7.9, z, 0, 0.4, 0.2, 1.6]));
  const pondC = [3000, top(3000) + 0.12, (PARK.z0 + PARK.z1) / 2];
  {
    const water = new THREE.Mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshStandardMaterial({ color: blend("ocean", "cyan", 0.35), roughness: 0.05, metalness: 0.15 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(...pondC);
    scene.add(water);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(12.3, 0.5, 6, 40), stone);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(pondC[0], pondC[1], pondC[2]);
    scene.add(rim);
  }
  const fountainN = 160;
  const fountainPos = new Float32Array(fountainN * 3);
  const fountainGeo = new THREE.BufferGeometry();
  fountainGeo.setAttribute("position", new THREE.BufferAttribute(fountainPos, 3));
  scene.add(new THREE.Points(fountainGeo, new THREE.PointsMaterial({ color: col("sclera"), size: 0.12, transparent: true, opacity: 0.8 })));
  const flowerBeds = [];
  const parkGrass = [];
  for (let i = 0; i < 2600; i += 1) {
    const x = PARK.x0 + 6 + rand() * (PARK.x1 - PARK.x0 - 12);
    const z = PARK.z0 + 6 + rand() * (PARK.z1 - PARK.z0 - 12);
    const y = top(x) + 0.1;
    if (Math.hypot(x - pondC[0], z - pondC[2]) < 13.5) continue;
    if (fbm(x / 9, z / 9, 2) > 0.62) flowerBeds.push([x, y, z, 0.9 + rand() * 0.5, [col("accent"), col("practical"), blend("sky", "skin", 0.5), col("sclera")][i % 4]]);
    else if (i % 3 === 0) parkGrass.push([x, y, z, 0.12 + rand() * 0.1, blend("land", "practical", rand() * 0.25)]);
  }
  flowers(scene, flowerBeds);
  tufts(scene, parkGrass, { amp: 0.4 });
  const benches = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    benches.push([pondC[0] + Math.cos(a) * 17, pondC[1] + 0.25, pondC[2] + Math.sin(a) * 17, -a + Math.PI / 2, 1.8, 0.5, 0.5, blend("iris", "hair", 0.35)]);
  }
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), benches);
  // The market: stalls with striped canopies; the tram stop shelter.
  const stalls = [];
  const canopies = [];
  for (let i = 0; i < 12; i += 1) {
    const x = MARKET.x0 + 10 + (i % 4) * 18;
    const z = MARKET.z0 + 14 + Math.floor(i / 4) * 26;
    stalls.push([x, top(x) + 0.5, z, 0, 4, 1, 2.2, blend("iris", "hair", 0.3)]);
    canopies.push([x, top(x) + 2.6, z, 0, 4.6, 0.15, 3, [col("accent"), col("cyan"), col("practical"), col("sclera"), col("land")][i % 5]]);
  }
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), stalls);
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), canopies);
  const STOP = { x: 2845, z: 14.5 };
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: blend("moon", "cyan", 0.3), roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.45 }), [[STOP.x, top(STOP.x) + 1.3, STOP.z + 1.4, 0, 8, 2.6, 0.08]]);
  staticInst(new THREE.BoxGeometry(1, 1, 1), pole, [[STOP.x, top(STOP.x) + 2.7, STOP.z + 0.5, 0, 8.4, 0.15, 2.2]]);

  /* ---------------- the suburbs ---------------- */
  const subHouses = [];
  const subRoofs = [];
  const subTrees = [];
  for (const z0 of AVENUES) {
    for (let x = SUBURB.x0 + 12; x < SUBURB.x1 - 8; x += 22 + rand() * 6) {
      for (const sd of [-1, 1]) {
        const z = z0 + sd * (avenueW(z0) / 2 + 14 + rand() * 4);
        if (riverside(x, z, 6)) continue;
        if (rand() < 0.15) continue;
        const w = 9 + rand() * 4;
        const d = 8 + rand() * 3;
        const h = 3.2 + (rand() < 0.5 ? 3 : 0);
        const y = ground(x, z);
        subHouses.push([x, y + h / 2 - 0.2, z, 0, w, h + 0.4, d, [col("sclera"), blend("practical", "sclera", 0.5), blend("skin", "sclera", 0.4), blend("moon", "sclera", 0.3)][Math.floor(rand() * 4)]]);
        subRoofs.push([x, y + h + 0.2, z, 0, w * 0.62, 2.2, d * 1.15, rand() < 0.5 ? blend("hair", "sky", 0.3) : blend("accent", "iris", 0.5)]);
        for (let k = 0; k < 2; k += 1) subTrees.push([x + (rand() - 0.5) * 18, y, z + sd * (8 + rand() * 6), 6 + rand() * 6, leaf()]);
      }
    }
  }
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  xf(roofGeo, [0, 0.25, 0], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
  const houseTex = drawn(256, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.15)";
    g.fillRect(0, h * 0.92, w, h * 0.08);
    g.fillStyle = css(blend("hair", "iris", 0.4));
    g.fillRect(w * 0.42, h * 0.45, w * 0.16, h * 0.55);
    g.fillStyle = css(blend("hair", "moon", 0.4));
    g.fillRect(w * 0.12, h * 0.4, w * 0.18, h * 0.22);
    g.fillRect(w * 0.7, h * 0.4, w * 0.18, h * 0.22);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillRect(w * 0.2, h * 0.4, w * 0.02, h * 0.22);
    g.fillRect(w * 0.78, h * 0.4, w * 0.02, h * 0.22);
  });
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: houseTex, roughness: 0.85 }), subHouses);
  staticInst(roofGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), subRoofs);
  broadleaf(scene, subTrees, PAINT, { variants: 2, seed: 17 });

  // Along the road in: farmhouses first, then houses, then low blocks, thickening toward the city.
  const edgeHouses = [];
  const edgeRoofs = [];
  const edgeBlocks = [];
  const edgeTrees = [];
  for (let x = 1460; x < CITY.x0 - 14; x += 8 + rand() * 12) {
    const p = smoothstep(1450, 2260, x);
    if (Math.abs(x - ROAD_BRIDGE) < 70 || rand() > 0.3 + p * 0.7) continue;
    for (const sd of [-1, 1]) {
      if (rand() > 0.45 + p * 0.55) continue;
      const z = roadZ(x) + sd * (roadW(x) / 2 + 9 + rand() * 10 + p * 8);
      if (riverside(x, z, 4)) continue;
      const y = ground(x, z);
      const ry = Math.atan2(roadZ(x + 1) - roadZ(x - 1), 2);
      if (p > 0.6 && rand() < p * 0.8) {
        const h = 9 + rand() * (12 + p * 26);
        edgeBlocks.push([x, y + h / 2 - 0.3, z + sd * 6, -ry, 14 + rand() * 10, h, 12 + rand() * 8, [col("sclera"), blend("practical", "sclera", 0.5), blend("skin", "sclera", 0.4), blend("moon", "sclera", 0.3)][Math.floor(rand() * 4)]]);
      } else {
        const w = 8 + rand() * 4;
        const d = 7 + rand() * 3;
        const h = 3.2 + (rand() < 0.4 ? 3 : 0);
        edgeHouses.push([x, y + h / 2 - 0.2, z, -ry, w, h + 0.4, d, [col("sclera"), blend("practical", "sclera", 0.5), blend("skin", "sclera", 0.4)][Math.floor(rand() * 3)]]);
        edgeRoofs.push([x, y + h + 0.2, z, -ry, w * 0.62, 2.1, d * 1.15, rand() < 0.5 ? blend("accent", "iris", 0.45) : blend("hair", "sky", 0.3)]);
      }
      if (rand() < 0.6) edgeTrees.push([x + (rand() - 0.5) * 10, y, z + sd * (6 + rand() * 8), 6 + rand() * 6, leaf()]);
    }
  }
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: houseTex, roughness: 0.85 }), edgeHouses);
  {
    // Low blocks carry the flats facade tiled per floor.
    const list = edgeBlocks.map(([x, y, z, ry, w, h, d, c]) => {
      const g = tiledBox(w, h, d, 4, 3.4);
      g.rotateY(ry);
      g.translate(x, y, z);
      return tint(g, c);
    });
    if (list.length) {
      const m = new THREE.Mesh(merge(list), facadeMat.flats);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
  }
  staticInst(roofGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), edgeRoofs);
  broadleaf(scene, edgeTrees, PAINT, { variants: 2, seed: 41 });
  // Trees in courtyards and round the city's edge.
  const fill = [];
  for (let i = 0; i < 700; i += 1) {
    const x = CITY.x0 - 120 + rand() * (SUBURB.x1 - CITY.x0 + 240);
    const z = CITY.z0 - 140 + rand() * (CITY.z1 - CITY.z0 + 280);
    const inside = x > CITY.x0 && x < SUBURB.x1 && z > CITY.z0 && z < CITY.z1;
    if (inside && rand() < 0.75) continue;
    if (riverside(x, z, -18) || AVENUES.some((a) => Math.abs(z - a) < avenueW(a) / 2 + 3) || CROSS.some((c) => Math.abs(x - c) < CROSS_W / 2 + 3)) continue;
    if (inside && lots.some(([x0, x1, z0, z1]) => x > x0 - 2 && x < x1 + 2 && z > z0 - 2 && z < z1 + 2)) continue;
    fill.push([x, inside ? top(x) : ground(x, z), z, 7 + rand() * 6, leaf()]);
  }
  broadleaf(scene, fill, PAINT, { variants: 2, seed: 43 });

  /* ---------------- traffic and pedestrians: simulated once ---------------- */
  // A lane is a polyline with stop lines; its users follow each other and obey the lights.
  const lanes = [];
  const lane = (pts, opt) => {
    const route = polyline(pts);
    lanes.push({ route, L: route.length, ...opt, users: [] });
    return lanes[lanes.length - 1];
  };
  const green = (phase, t, k, delay = 0) => {
    const c = (((t + k * 1.3 - delay) % 24) + 24) % 24;
    return phase === "A" ? c >= 0.3 && c < 10.5 : c >= 12.3 && c < 22.5;
  };
  // Avenues (phase A), both directions.
  for (const z0 of AVENUES) {
    const offs = z0 === 0 ? [3.5, 7] : [3];
    for (const o of offs)
      for (const dir of [1, -1]) {
        const z = z0 + dir * o;
        let pts = [];
        if (z0 === 0 && o === 3.5) {
          // The inner lanes of the main avenue run on out along the country road.
          for (let x = ROAD_X0 + 10; x < CITY.x0; x += 12) {
            const dz = (roadZ(x + 1) - roadZ(x - 1)) / 2;
            const l = Math.hypot(1, dz);
            const off = Math.min(o, roadW(x) / 4);
            pts.push([x - (dz / l) * dir * off * 0, roadZ(x) + (dir * off) / l]);
          }
        }
        for (let x = CITY.x0; x <= xEnd; x += 50) pts.push([x, z]);
        if (dir < 0) pts = pts.reverse();
        const ln = lane(pts, { kind: "car", phase: "A", y: (x) => (x < CITY.x0 ? ctx.roadY(x) : street(x)) });
        ln.stops = [];
        CROSS.forEach((cx, k) => {
          // The stop line, in this lane's distance: find s where x = cx - dir*(CROSS_W/2 + 1.5).
          const sx = cx - dir * (CROSS_W / 2 + 1.5);
          let best = 0;
          let bd = 1e9;
          for (let s = 0; s < ln.L; s += 0.5) {
            const d = Math.abs(ln.route.at(s)[0] - sx);
            if (d < bd) {
              bd = d;
              best = s;
            }
          }
          ln.stops.push([best, k]);
        });
      }
  }
  // Cross streets (phase B), both directions.
  CROSS.forEach((x0, k) => {
    for (const dir of [1, -1]) {
      const x = x0 - dir * 3;
      let pts = [
        [x, CITY.z0],
        [x, CITY.z1],
      ];
      if (dir < 0) pts = pts.reverse();
      const ln = lane(pts, { kind: "car", phase: "B", y: () => street(x0) });
      ln.stops = AVENUES.map((za) => {
        const sz = za - dir * (avenueW(za) / 2 + 1.5);
        return [dir > 0 ? sz - CITY.z0 : CITY.z1 - sz, k];
      });
    }
  });
  // Vehicles.
  const vehicleColors = [col("sclera"), col("sclera"), blend("hair", "moon", 0.25), blend("moon", "hair", 0.4), col("accent"), blend("ocean", "moon", 0.25), blend("practical", "iris", 0.15), col("hair"), blend("cyan", "ocean", 0.4), blend("land", "hair", 0.4)];
  const vehicles = [];
  for (const ln of lanes) {
    const road = ln.L > 1500;
    const spacing = road ? 80 + rand() * 40 : 34 + rand() * 22;
    const count = Math.floor(ln.L / spacing);
    for (let i = 0; i < count; i += 1) {
      const kind = rand() < 0.06 ? "bus" : rand() < 0.12 ? "van" : "car";
      const len = kind === "bus" ? 12 : kind === "van" ? 6.2 : 4.5;
      const v = { lane: ln, s: i * spacing + rand() * 6, v: 0, v0: (road ? 16 : 12) * (0.85 + rand() * 0.3), len, kind, delay: rand() * 0.8, color: kind === "bus" ? col("accent") : vehicleColors[Math.floor(rand() * vehicleColors.length)] };
      ln.users.push(v);
      vehicles.push(v);
    }
  }
  // Pedestrians on the pavements (they wait at the kerb for their green), cyclists in the bike lanes.
  const walkers = [];
  const pedLanes = [];
  for (const z0 of AVENUES) {
    const aw = avenueW(z0);
    for (const sd of [-1, 1])
      for (const dir of [1, -1]) {
        const z = z0 + sd * (aw / 2 + 1.6 + (dir > 0 ? 0 : 1.6));
        if (CITY.z0 > z || z > CITY.z1) continue;
        let pts = [
          [CITY.x0 + 2, z],
          [xEnd - 2, z],
        ];
        if (dir < 0) pts = pts.reverse();
        const ln = lane(pts, { kind: "ped", phase: "A", y: (x) => top(x) });
        ln.stops = [];
        CROSS.forEach((cx, k) => {
          for (const e of [-1, 1]) {
            const sx = cx + e * (CROSS_W / 2 + 0.3);
            if (e !== -dir) continue;
            ln.stops.push([dir > 0 ? sx - (CITY.x0 + 2) : xEnd - 2 - sx, k]);
          }
        });
        // Skip stretches over the river band: walkers there use the bridges' pavements anyway.
        pedLanes.push(ln);
      }
  }
  CROSS.forEach((x0, k) => {
    for (const sd of [-1, 1])
      for (const dir of [1, -1]) {
        const x = x0 + sd * (CROSS_W / 2 + 1.6 + (dir > 0 ? 0 : 1.6));
        let pts = [
          [x, CITY.z0 + 2],
          [x, CITY.z1 - 2],
        ];
        if (dir < 0) pts = pts.reverse();
        const ln = lane(pts, { kind: "ped", phase: "B", y: () => top(x0) });
        ln.stops = [];
        AVENUES.forEach((za) => {
          const sz = za - dir * (avenueW(za) / 2 + 0.3);
          ln.stops.push([dir > 0 ? sz - (CITY.z0 + 2) : CITY.z1 - 2 - sz, k]);
        });
        pedLanes.push(ln);
      }
  });
  for (const ln of pedLanes) {
    const n = Math.floor(ln.L / (30 + rand() * 34));
    for (let i = 0; i < n; i += 1) {
      const w = { lane: ln, s: rand() * ln.L, v: 0, v0: 1.15 + rand() * 0.45, len: 0, delay: rand() * 2.5, side: (rand() - 0.5) * 1.1, look: outfit(rand, PAINT, "town") };
      ln.users.push(w);
      walkers.push(w);
    }
    ln.users.sort((a, b) => a.s - b.s);
  }
  for (const dir of [1, -1]) {
    let pts = [
      [CITY.x0, dir * 10.5],
      [xEnd, dir * 10.5],
    ];
    if (dir < 0) pts = pts.reverse();
    const ln = lane(pts, { kind: "bike", phase: "A", y: (x) => street(x) });
    ln.stops = CROSS.map((cx, k) => {
      const sx = cx - dir * (CROSS_W / 2 + 1.5);
      return [dir > 0 ? sx - CITY.x0 : xEnd - sx, k];
    });
    for (let i = 0; i < 14; i += 1) {
      const w = { lane: ln, s: (i / 14) * ln.L + rand() * 20, v: 0, v0: 4.5 + rand() * 1.5, len: 1.8, delay: rand(), side: 0, look: outfit(rand, PAINT, "town"), bike: true };
      ln.users.push(w);
      walkers.push(w);
    }
  }
  for (const ln of lanes) ln.users.sort((a, b) => a.s - b.s);

  // Run the simulation: a minute of warm-up, then every frame of the film.
  const users = lanes.flatMap((ln) => ln.users);
  users.forEach((u, i) => {
    u.id = i;
    u.v = u.v0;
  });
  const track = new Float32Array(FRAMES * users.length);
  const dt = 1 / FPS;
  for (let f = -60 * FPS; f < FRAMES; f += 1) {
    const t = T0 + f / FPS;
    for (const ln of lanes) {
      const us = ln.users;
      const n = us.length;
      for (let i = 0; i < n; i += 1) {
        const u = us[i];
        let gap = 1e9;
        let vLead = u.v0;
        if (ln.kind !== "ped" && n > 1) {
          const lead = us[(i + 1) % n];
          let ls = lead.s;
          if (ls <= u.s) ls += ln.L;
          gap = ls - u.s - lead.len - 1.5;
          vLead = lead.v;
        }
        for (const [ss, k] of ln.stops) {
          const ahead = ss - u.s;
          if (ahead < 0.2 || ahead > 60) continue;
          if (!green(ln.phase, t, k, u.delay)) {
            const brake = ln.kind === "ped" ? 0.1 : (u.v * u.v) / 7;
            if (ahead > brake) {
              if (ahead < gap) {
                gap = ahead - 0.6;
                vLead = 0;
              }
            }
          }
          break;
        }
        if (ln.kind === "ped") {
          u.v = gap < 0.4 ? 0 : Math.min(u.v0, u.v + 1.5 * dt);
        } else {
          // Intelligent driver model: smooth acceleration, keep a safe time gap.
          const a = 2;
          const b = 3;
          const s0 = 2;
          const T = 1.2;
          const sStar = s0 + Math.max(0, u.v * T + (u.v * (u.v - vLead)) / (2 * Math.sqrt(a * b)));
          const acc = a * (1 - (u.v / u.v0) ** 4 - (sStar / Math.max(0.1, gap)) ** 2);
          u.v = Math.max(0, u.v + Math.max(-8, acc) * dt);
        }
      }
      for (const u of us) {
        u.s += u.v * dt;
        if (u.s >= ln.L) u.s -= ln.L;
      }
      // Keep the order: whoever wrapped moves to the front of the queue.
      if (us.length > 1 && us[us.length - 1].s < us[0].s) us.unshift(us.pop());
    }
    if (f >= 0) for (const u of users) track[f * users.length + u.id] = u.s;
  }
  const sAt = (u, t) => {
    const fr = clamp((t - T0) * FPS, 0, FRAMES - 1.001);
    const f0 = Math.floor(fr);
    const a = fr - f0;
    let s0 = track[f0 * users.length + u.id];
    let s1 = track[(f0 + 1) * users.length + u.id];
    if (s1 < s0 - u.lane.L / 2) s1 += u.lane.L;
    return (s0 + (s1 - s0) * a) % u.lane.L;
  };
  const posOf = (u, t) => {
    const s = sAt(u, t);
    const [x, z, hd] = u.lane.route.at(s);
    // Fade in and out at the ends of a lane, where users wrap around.
    const edge = Math.min(s, u.lane.L - s);
    return { x, z, hd, s, fade: smoothstep(0, 10, edge) };
  };

  // Vehicle bodies: a lower body, a glass cabin, wheels.
  const carGeo = (len, w, h, cabin) => {
    const parts = [];
    const body = new THREE.BoxGeometry(w, h * 0.5, len, 1, 1, 1);
    body.translate(0, h * 0.25 + 0.3, 0);
    parts.push(paintAll(body, new THREE.Color(1, 1, 1)));
    const c = new THREE.BoxGeometry(w * 0.88, h * 0.42, len * cabin, 1, 1, 1);
    c.translate(0, h * 0.5 + 0.3 + h * 0.21, -len * 0.05);
    parts.push(paintAll(c, new THREE.Color(0.18, 0.22, 0.28)));
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const wh = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10);
      wh.rotateZ(Math.PI / 2);
      wh.translate(sx * w * 0.45, 0.34, sz * len * 0.33);
      parts.push(paintAll(wh, new THREE.Color(0.08, 0.08, 0.08)));
    }
    return merge(parts);
  };
  function paintAll(g, c) {
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    return g;
  }
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5, envMapIntensity: 1.2 });
  const kinds = { car: carGeo(4.5, 1.85, 1.45, 0.55), van: carGeo(6.2, 2.1, 2.4, 0.8), bus: carGeo(12, 2.55, 3.1, 0.92) };
  for (const kind of Object.keys(kinds)) {
    const list = vehicles.filter((v) => v.kind === kind);
    if (!list.length) continue;
    updates.push(
      swarm(
        scene,
        kinds[kind],
        bodyMat,
        list.map((v) => ({
          color: v.color,
          pose: (t) => {
            const p = posOf(v, t);
            const y = v.lane.y(p.x);
            return { x: p.x, y, z: p.z, heading: p.hd, scale: p.fade };
          },
        })),
        true,
      ),
    );
  }

  /* ---------------- people ---------------- */
  const people = [];
  for (const w of walkers)
    people.push({
      ...w.look,
      bike: w.bike,
      bikeColor: w.bike ? [col("accent"), col("cyan"), col("hair"), col("practical")][w.id % 4] : undefined,
      phase: (w.id * 1.7) % 6.28,
      pose: (t) => {
        const p = posOf(w, t);
        if (p.fade < 0.05) return null;
        const nx = Math.cos(p.hd);
        const nz = -Math.sin(p.hd);
        const x = p.x + nx * w.side;
        const z = p.z + nz * w.side;
        const moving = sAt(w, t + 0.25) !== sAt(w, t);
        const speed = Math.abs(sAt(w, t + 0.1) - sAt(w, t)) * 10;
        return { x, y: w.lane.y(x), z, heading: p.hd, gait: w.bike ? 1 : clamp(speed / 1.2, 0, 1), mode: w.bike ? "bike" : "walk", cycle: w.bike ? p.s * 1.9 : p.s * 4.1, moving };
      },
    });
  // The tram stop: people waiting.
  for (let i = 0; i < 7; i += 1) {
    const x = STOP.x - 3.5 + i * 1.1 + rand() * 0.3;
    const z = STOP.z + 0.3 + rand() * 0.8;
    const hd = Math.PI + (rand() - 0.5) * 1.4;
    people.push({ ...outfit(rand, PAINT, "town"), pose: () => ({ x, y: top(x), z, heading: hd, gait: 0 }) });
  }
  // Market shoppers and stallholders.
  for (let i = 0; i < 26; i += 1) {
    const pts = [
      [MARKET.x0 + 4 + rand() * 72, MARKET.z0 + 4 + rand() * 84],
      [MARKET.x0 + 4 + rand() * 72, MARKET.z0 + 4 + rand() * 84],
    ];
    const route = polyline(pts);
    const s0 = rand() * route.length;
    const v = 0.6 + rand() * 0.6;
    const still = i % 3 === 0;
    people.push({ ...outfit(rand, PAINT, "town"), phase: rand() * 6.28, pose: (t) => {
      const [s, dir] = pingS(still ? 0 : t, v, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: top(x), z, heading: dir > 0 ? hd : hd + Math.PI, gait: still ? 0 : 1 };
    } });
  }
  // The plaza: people crossing it and standing in twos.
  for (let i = 0; i < 18; i += 1) {
    const pts = [
      [PLAZA.x0 + rand() * 80, PLAZA.z0 + 2],
      [PLAZA.x0 + rand() * 80, PLAZA.z1 - 2],
    ];
    const route = polyline(i % 2 ? pts : pts.reverse());
    const s0 = rand() * route.length;
    const v = 1.1 + rand() * 0.4;
    people.push({ ...outfit(rand, PAINT, "town"), phase: rand() * 6.28, pose: (t) => {
      const [s, dir] = pingS(t, v, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: top(x), z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } });
  }
  // The park: strollers on the paths, people on benches, families on the grass, children running,
  // and dog walkers with their dogs.
  const parkLoop = polyline(Array.from({ length: 24 }, (_, i) => [pondC[0] + Math.cos((i / 24) * 6.283) * 21, pondC[2] + Math.sin((i / 24) * 6.283) * 21 * 0.8]), true);
  const dogs = [];
  for (let i = 0; i < 16; i += 1) {
    const s0 = (i / 16) * parkLoop.length;
    const dir = i % 2 ? 1 : -1;
    const v = 1.0 + rand() * 0.3;
    const walker = (t) => {
      const s = (((s0 + dir * v * t) % parkLoop.length) + parkLoop.length) % parkLoop.length;
      const [x, z, hd] = parkLoop.at(s);
      return { x, z, heading: dir > 0 ? hd : hd + Math.PI };
    };
    people.push({ ...outfit(rand, PAINT, "town"), phase: rand() * 6.28, pose: (t) => {
      const p = walker(t);
      return { x: p.x, y: top(p.x) + 0.1, z: p.z, heading: p.heading, gait: 1 };
    } });
    if (i % 5 === 0) dogs.push({ kind: "dog", color: [col("practical"), col("hair"), col("sclera"), blend("iris", "hair", 0.3)][dogs.length % 4], phase: i, pose: (t) => {
      const p = walker(t - 0.6);
      return { x: p.x + 0.8, y: top(p.x) + 0.1, z: p.z + 0.5, heading: p.heading, gait: 1.2 };
    } });
  }
  benches.forEach(([x, y, z, ry], i) => {
    if (i % 2) return;
    people.push({ ...outfit(rand, PAINT, "town"), pose: () => ({ x, y: y - 0.25, z, heading: ry + Math.PI / 2 * 0 - Math.PI / 2, mode: "sit" }) });
  });
  for (let f = 0; f < 5; f += 1) {
    const cx = PARK.x0 + 20 + f * 34;
    const cz = PARK.z0 + 12 + (f % 2) * 50;
    for (let k = 0; k < 3; k += 1) {
      const x = cx + k * 1.1;
      const z = cz + (k % 2) * 0.9;
      people.push({ ...outfit(rand, PAINT, "town"), scale: k === 2 ? 0.6 : 1, pose: () => ({ x, y: top(x) - 0.25, z, heading: 2 + k, mode: "sit" }) });
    }
    const ph = rand() * 6.28;
    people.push({ ...outfit(rand, PAINT, "town"), scale: 0.58, phase: ph, pose: (t) => {
      const a = t * 1.1 + ph;
      const x = cx + 4 + Math.cos(a) * 3;
      const z = cz + 4 + Math.sin(a) * 2.2;
      return { x, y: top(x) + 0.1, z, heading: Math.atan2(-Math.sin(a) * 3, Math.cos(a) * 2.2), gait: 2 };
    } });
  }
  // The riverside walk.
  for (let i = 0; i < 30; i += 1) {
    const sd = i % 2 ? 1 : -1;
    const pts = [];
    for (let x = CITY.x0; x < xEnd; x += 10) pts.push([x, riverZ(x) + sd * (riverW(x) * 0.5 + 6) + (rand() - 0.5) * 2]);
    const route = polyline(pts);
    const s0 = rand() * route.length;
    const v = 1.1 + rand() * 0.4;
    people.push({ ...outfit(rand, PAINT, "town"), phase: rand() * 6.28, pose: (t) => {
      const [s, dir] = pingS(t, v, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: street(x) + 0.05, z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } });
  }
  const crowdUpdate = crowd(scene, people, { metal: blend("moon", "hair", 0.35), tyre: col("hair") });
  updates.push((t, cam) => crowdUpdate(t, cam, 900));
  const dogUpdate = herd(scene, dogs);
  updates.push((t) => dogUpdate(t));

  /* ---------------- birds ---------------- */
  const birds = [];
  // Pigeons on the pavement and the plaza: pecking, then up and away as the camera passes.
  for (let i = 0; i < 34; i += 1) {
    const x = 2792 + rand() * 50;
    const z = -14 - rand() * 18;
    const go = 75.6 + (x - 2792) * 0.03 + rand() * 0.3;
    const ph = rand() * 6.28;
    const dir = -0.6 + rand() * 1.2;
    birds.push({ size: 0.16, color: blend("moon", "hair", 0.45), wingColor: blend("moon", "hair", 0.35), beat: 14, phase: ph, pose: (t) => {
      if (t < go) {
        const wx = x + Math.sin(t * 0.4 + ph) * 0.6;
        const wz = z + Math.cos(t * 0.33 + ph) * 0.6;
        const peck = Math.max(0, Math.sin(t * 2.7 + ph)) ** 4;
        return { x: wx, y: top(wx) + 0.08, z: wz, heading: t * 0.4 + ph, pitch: -peck * 0.6, perched: true };
      }
      const u = t - go;
      return { x: x + Math.cos(dir) * u * 7, y: top(x) + 0.08 + u * 4 + u * u * 1.2, z: z - Math.sin(dir) * u * 7 - u * 2, heading: Math.PI / 2 - dir, pitch: 0.5, flap: 1 };
    } });
  }
  // Crows between the rooftops.
  for (let i = 0; i < 12; i += 1) birds.push({ size: 0.24, color: col("hair"), beat: 7, phase: rand() * 6.28, pose: loopFlight(2700 + rand() * 500, 70 + rand() * 80, -200 + rand() * 400, 70 + rand() * 80, 50 + rand() * 60, (0.18 + rand() * 0.1) * (rand() < 0.5 ? 1 : -1), rand() * 6.28, 6) });
  // Sparrows in the park trees.
  for (const [x, y, z, h] of parkTrees.slice(0, 18)) {
    const ph = rand() * 6.28;
    birds.push({ size: 0.06, color: blend("iris", "hair", 0.4), beat: 22, phase: ph, pose: (t) => ({ x: x + Math.cos(ph) * h * 0.3, y: y + h * 0.55, z: z + Math.sin(ph) * h * 0.3, heading: ph + Math.sin(t * 0.8 + ph), perched: true }) });
  }
  // The flock that leaves the park and heads east, toward the forest.
  // It drops to the river and follows it east, clear of the towers.
  const flockAt = (t) => {
    const u = Math.max(0, t - 79.4);
    const x = 3010 + u * 22;
    const z = mix(-168, riverZ(x), smoothstep(0, 2.5, u));
    return [x, top(x) + 12 + 16 * (1 - Math.exp(-u / 1.8)) + u * 1.2, z];
  };
  ctx.flockAt = flockAt;
  for (let i = 0; i < 28; i += 1) {
    const off = [(rand() - 0.5) * 16, (rand() - 0.5) * 5, (rand() - 0.5) * 10];
    const lag = rand() * 0.8;
    const ph = rand() * 6.28;
    const perchX = 2985 + rand() * 40;
    const perchZ = -185 + rand() * 30;
    birds.push({ size: 0.19, color: col("sclera"), wingColor: blend("sclera", "moon", 0.4), beat: 11, phase: ph, pose: (t) => {
      if (t < 79.4 + lag) return { x: perchX, y: top(perchX) + 0.1, z: perchZ, heading: ph, perched: true };
      const [x, y, z] = flockAt(t - lag);
      const [x2, y2, z2] = flockAt(t - lag + 0.1);
      return { x: x + off[0] + Math.sin(t * 0.9 + ph) * 1.2, y: y + off[1] + Math.sin(t * 1.3 + ph) * 0.6, z: z + off[2], heading: Math.atan2(x2 - x, z2 - z), pitch: Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z)), flap: 0.85 };
    } });
  }
  updates.push(flock(scene, birds));
  const butterflies = [];
  for (let i = 0; i < 30; i += 1) {
    const [x, y, z] = flowerBeds[(i * 7) % Math.max(1, flowerBeds.length)] ?? [3000, top(3000), -170];
    const ph = rand() * 6.28;
    butterflies.push({ size: 0.9, color: [col("practical"), col("sclera"), col("iris")][i % 3], phase: ph, pose: (t) => ({ x: x + Math.sin(t * 0.8 + ph) * 1.2, y: y + 0.6 + Math.sin(t * 2 + ph) * 0.2, z: z + Math.cos(t * 0.7 + ph) * 1.2, heading: t + ph }) });
  }
  updates.push(insects(scene, butterflies));

  return (t, cam) => {
    for (const u of updates) u(t, cam);
    for (let i = 0; i < fountainN; i += 1) {
      const u = ((i / fountainN) * 1.6 + t) % 1.6;
      const a = i * 2.39;
      const r = u * 1.3;
      fountainPos.set([pondC[0] + Math.cos(a) * r, pondC[1] + 0.2 + u * 6.5 - 4.9 * u * u, pondC[2] + Math.sin(a) * r], i * 3);
    }
    fountainGeo.attributes.position.needsUpdate = true;
  };
}
