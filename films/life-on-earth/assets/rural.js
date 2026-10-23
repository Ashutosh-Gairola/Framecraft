/**
 * The countryside: a patchwork of fields (green rows, ripe wheat, ploughed earth, paddies,
 * mustard, fallow), a village of plastered houses with tiled and thatched roofs and smoking
 * chimneys, lanes, haystacks, a pond, a fenced pasture, the country road over its bridge; and
 * the life in it — farmers, villagers, children, cattle, buffaloes, goats, oxen at the plough,
 * horses, dogs, chickens, ducks, crows, geese, songbirds on the fence, butterflies and bees.
 */

import { THREE, mulberry32, fbm, smoothstep, mix, clamp, xf, merge, sway, drawn, css, crowd, herd, flock, loopFlight, swarm, insects, outfit, polyline, pingS, loopS, along, timedPath, puff } from "./lib.js";
import { coastX, riverZ, riverW, riverY, baseH, VILLAGE, POND, PASTURE, roadZ, roadW, ROAD_X0, ROAD_BRIDGE, CITY } from "./geo.js";
import { broadleaf, bushes, tufts, flowers } from "./flora.js";

export function rural(ctx) {
  const { scene, PAINT, col, blend, ground } = ctx;
  const rand = mulberry32(202);
  const updates = [];
  const nearRiver = (x, z, m) => Math.abs(z - riverZ(x)) < riverW(x) * 0.5 + m;
  const nearRoad = (x, z, m) => x > ROAD_X0 - 20 && x < CITY.x0 && Math.abs(z - roadZ(x)) < roadW(x) * 0.5 + m;
  const inVillage = (x, z, m = 0) => Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r + m;
  const inPasture = (x, z, m = 0) => x > PASTURE.x0 - m && x < PASTURE.x1 + m && z > PASTURE.z0 - m && z < PASTURE.z1 + m;
  const FARM = { x0: 930, x1: 1040, z0: -512, z1: -452 };

  /* ---------------- fields ---------------- */
  const soil = blend("iris", "hair", 0.55).lerp(col("moon"), 0.12);
  const fieldTex = {
    crop: drawn(256, 256, (g, w, h) => {
      g.fillStyle = css(soil);
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 25.6) {
        for (let x = 0; x < w; x += 3) {
          const k = fbm(x / 20, y / 20, 2);
          g.fillStyle = css(new THREE.Color().lerpColors(col("land"), blend("land", "practical", 0.35), k));
          g.fillRect(x, y + 1 + Math.sin(x * 0.7) * 1.5, 3, 22 + k * 2);
        }
      }
    }, { repeat: true }),
    wheat: drawn(256, 256, (g, w, h) => {
      for (let y = 0; y < h; y += 2)
        for (let x = 0; x < w; x += 2) {
          const k = fbm(x / 9, y / 30, 3);
          g.fillStyle = css(new THREE.Color().lerpColors(blend("practical", "land", 0.18).lerp(col("sclera"), 0.15), blend("practical", "sclera", 0.4), k).multiplyScalar(0.9 + 0.1 * Math.sin(y * 0.25)));
          g.fillRect(x, y, 2, 2);
        }
    }, { repeat: true }),
    plough: drawn(256, 256, (g, w, h) => {
      for (let y = 0; y < h; y += 1) {
        const k = 0.75 + 0.25 * Math.sin((y / h) * Math.PI * 20);
        g.fillStyle = css(soil.clone().multiplyScalar(k));
        g.fillRect(0, y, w, 1);
      }
    }, { repeat: true }),
    paddy: drawn(256, 256, (g, w, h) => {
      g.fillStyle = css(blend("land", "cyan", 0.3).lerp(col("moon"), 0.1));
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 12.8)
        for (let x = 0; x < w; x += 12.8) {
          g.fillStyle = css(blend("land", "practical", 0.25));
          g.beginPath();
          g.arc(x + 6, y + 6, 4.2, 0, Math.PI * 2);
          g.fill();
        }
    }, { repeat: true }),
    mustard: drawn(256, 256, (g, w, h) => {
      g.fillStyle = css(col("land"));
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i += 1) {
        const x = (i * 97.3) % w;
        const y = (i * 61.7 + Math.sin(i) * 9) % h;
        g.fillStyle = css(blend("practical", "sclera", 0.1 + (i % 5) * 0.04));
        g.fillRect(x, y, 3, 3);
      }
    }, { repeat: true }),
    fallow: drawn(256, 256, (g, w, h) => {
      for (let y = 0; y < h; y += 4)
        for (let x = 0; x < w; x += 4) {
          g.fillStyle = css(new THREE.Color().lerpColors(blend("land", "practical", 0.2), blend("land", "sclera", 0.15), fbm(x / 25, y / 25, 3)));
          g.fillRect(x, y, 4, 4);
        }
    }, { repeat: true }),
  };
  const fieldGeos = Object.fromEntries(Object.keys(fieldTex).map((k) => [k, []]));
  // Field corners: [x0z0, x1z0, x0z1, x1z1]; the boundaries wander, so the patchwork isn't a grid.
  function field(x0, x1, z0, z1, type, rot, corners) {
    const sx = 8;
    const sz = 8;
    const c = corners ?? [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
    ];
    const g = new THREE.PlaneGeometry(1, 1, sx, sz);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i += 1) {
      const u = p.getX(i) + 0.5;
      const v = p.getZ(i) + 0.5;
      const x = mix(mix(c[0][0], c[1][0], u), mix(c[2][0], c[3][0], u), v);
      const z = mix(mix(c[0][1], c[1][1], u), mix(c[2][1], c[3][1], u), v);
      p.setXYZ(i, x, ground(x, z) + 0.14, z);
      // One texture tile = 8 m; rows run along x or along z.
      uv.setXY(i, rot ? z / 8 : x / 8, rot ? x / 8 : z / 8);
    }
    g.computeVertexNormals();
    fieldGeos[type].push(g);
  }
  const types = ["crop", "crop", "crop", "fallow", "wheat", "wheat", "crop", "fallow", "paddy", "mustard", "crop", "wheat", "plough", "fallow"];
  const colsX = [];
  for (let x = 330; x < 1960; x += 62 + rand() * 46) colsX.push(x);
  const rowsZ = [];
  for (let z = -1150; z < 620; z += 48 + rand() * 40) rowsZ.push(z);
  for (let i = 0; i < colsX.length - 1; i += 1)
    for (let j = 0; j < rowsZ.length - 1; j += 1) {
      const x0 = colsX[i] + 1.6;
      const x1 = colsX[i + 1] - 1.6;
      const z0 = rowsZ[j] + 1.6;
      const z1 = rowsZ[j + 1] - 1.6;
      const pts = [
        [x0, z0],
        [x1, z0],
        [x0, z1],
        [x1, z1],
        [(x0 + x1) / 2, (z0 + z1) / 2],
      ];
      const bad = pts.some(([x, z]) => x - coastX(z) < 330 || nearRiver(x, z, 16) || nearRoad(x, z, 6) || inVillage(x, z, 10) || inPasture(x, z, 8) || (x < 1000 && z < -820) || (z > 250 && x < 700));
      if (bad) continue;
      if (x1 > FARM.x0 - 24 && x0 < FARM.x1 + 24 && z1 > FARM.z0 - 22 && z0 < FARM.z1 + 22) continue;
      const h = fbm(i * 0.71, j * 0.53, 2) * 9 + i * 1.3 + j * 2.1;
      // Grid nodes nudged by noise: shared corners keep neighbours flush.
      const node = (a, b) => [colsX[a] + (fbm(a * 3.1, b * 1.7, 2) - 0.5) * 110, rowsZ[b] + (fbm(a * 1.9 + 9, b * 2.3, 2) - 0.5) * 90];
      const inset = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
      const n00 = node(i, j);
      const n10 = node(i + 1, j);
      const n01 = node(i, j + 1);
      const n11 = node(i + 1, j + 1);
      const k = 1.6 / Math.max(40, x1 - x0);
      field(x0, x1, z0, z1, types[Math.floor(h * 7.7) % types.length], (i + j) % 3 === 0, [inset(n00, n11, k), inset(n10, n01, k), inset(n01, n10, k), inset(n11, n00, k)]);
    }
  field(FARM.x0, FARM.x1, FARM.z0, FARM.z1, "crop", false);
  for (const [type, list] of Object.entries(fieldGeos)) {
    if (!list.length) continue;
    const m = new THREE.Mesh(merge(list), new THREE.MeshStandardMaterial({ map: fieldTex[type], roughness: type === "paddy" ? 0.6 : 0.97, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.receiveShadow = true;
    scene.add(m);
  }
  // The farmer's field in 3D: rows of young plants he walks between.
  const plant = (() => {
    const leaves = [];
    for (let i = 0; i < 6; i += 1) {
      const g = new THREE.PlaneGeometry(0.07, 0.32, 1, 2);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k += 1) {
        const y = p.getY(k) + 0.16;
        p.setXYZ(k, p.getX(k), y, 0.25 * y * y * 3);
      }
      xf(g, [0, 0, 0], [0, (i / 6) * Math.PI * 2, 0]);
      leaves.push(g);
    }
    return merge(leaves);
  })();
  const plants = [];
  for (let z = FARM.z0 + 0.9; z < FARM.z1 - 0.5; z += 0.9)
    for (let x = 948; x < 1015; x += 0.34 + rand() * 0.06) {
      const s = 1.2 + rand() * 0.8;
      plants.push([x, ground(x, z) + 0.1, z, s, blend("land", "practical", rand() * 0.3)]);
    }
  {
    const m = new THREE.InstancedMesh(plant, sway(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), 0.35, 1.9, "crop"), plants.length);
    const mm = new THREE.Matrix4();
    plants.forEach(([x, y, z, s, c], i) => {
      m.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (i * 2.39) % 6.28, 0)), new THREE.Vector3(s, s, s)));
      m.setColorAt(i, c);
    });
    m.frustumCulled = false;
    m.castShadow = true;
    scene.add(m);
  }

  /* ---------------- the village ---------------- */
  const plaster = drawn(256, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i += 1) {
      g.fillStyle = `rgba(0,0,0,${0.02 + (i % 7) * 0.006})`;
      g.fillRect((i * 53.1) % w, (i * 29.7) % h, 4, 3);
    }
    // A plinth, a wooden door, two shuttered windows.
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, h * 0.9, w, h * 0.1);
    g.fillStyle = css(blend("iris", "hair", 0.45));
    g.fillRect(w * 0.42, h * 0.4, w * 0.17, h * 0.6);
    g.fillStyle = css(col("hair"), 0.8);
    g.fillRect(w * 0.12, h * 0.38, w * 0.15, h * 0.2);
    g.fillRect(w * 0.73, h * 0.38, w * 0.15, h * 0.2);
    g.fillStyle = css(blend("land", "hair", 0.3));
    g.fillRect(w * 0.08, h * 0.37, w * 0.04, h * 0.22);
    g.fillRect(w * 0.27, h * 0.37, w * 0.04, h * 0.22);
    g.fillRect(w * 0.69, h * 0.37, w * 0.04, h * 0.22);
    g.fillRect(w * 0.88, h * 0.37, w * 0.04, h * 0.22);
  });
  const tileTex = drawn(128, 128, (g, w, h) => {
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = `rgba(255,255,255,${0.85 + ((y / 8) % 2) * 0.15})`;
      g.fillRect(0, y, w, 8);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(0, y + 6, w, 2);
      for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) g.fillRect(x, y, 1.5, 8);
    }
  }, { repeat: true });
  const houses = [];
  const lanes = [];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    lanes.push(a);
  }
  for (let tries = 0; tries < 900 && houses.length < 46; tries += 1) {
    const a = lanes[tries % lanes.length] + (rand() - 0.5) * 0.35;
    const r = 18 + rand() * (VILLAGE.r - 18);
    const side = rand() < 0.5 ? -1 : 1;
    const x = VILLAGE.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * side * 9;
    const z = VILLAGE.z + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * side * 9;
    if (nearRiver(x, z, 16) || inPasture(x, z, 8) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 14) continue;
    if (houses.some((hh) => Math.hypot(hh.x - x, hh.z - z) < 12)) continue;
    const w = 6 + rand() * 4;
    const d = 5 + rand() * 2.5;
    const h = 2.9 + rand() * 1.6 + (rand() < 0.2 ? 2.6 : 0);
    houses.push({ x, z, y: ground(x, z), w, d, h, ry: a + Math.PI / 2 + (rand() - 0.5) * 0.2, thatch: rand() < 0.35, tint: rand() });
  }
  const wallList = houses.map((o) => [o.x, o.y + o.h / 2 - 0.3, o.z, o.ry, o.w, o.h + 0.6, o.d, new THREE.Color().lerpColors(col("sclera"), o.tint < 0.4 ? blend("practical", "iris", 0.3) : o.tint < 0.7 ? blend("skin", "sclera", 0.3) : col("sclera"), 0.55)]);
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  xf(roofGeo, [0, 0.25, 0], [Math.PI / 2, 0, Math.PI / 2], [1, 1, 0.5]);
  const roofList = houses.map((o) => [o.x, o.y + o.h + 0.25, o.z, o.ry, o.w * 0.72, 2.1 + o.d * 0.12, o.d * 1.25, o.thatch ? blend("practical", "hair", 0.35) : blend("accent", "iris", 0.45 + (o.tint - 0.5) * 0.3)]);
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
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92 }), wallList);
  staticInst(roofGeo, new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.85 }), roofList);
  // Chimneys, and smoke rising from a few of them.
  const chimneyHouses = houses.filter((_, i) => i % 4 === 1);
  staticInst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.4), roughness: 0.9 }), chimneyHouses.map((o) => [o.x + Math.cos(o.ry) * o.w * 0.25, o.y + o.h + 1.6, o.z - Math.sin(o.ry) * o.w * 0.25, o.ry, 0.7, 2.2, 0.7]));
  const smokeTex = puff(blend("moon", "sclera", 0.5), 41, 10);
  const smoke = [];
  chimneyHouses.slice(0, 8).forEach((o, k) => {
    const cx = o.x + Math.cos(o.ry) * o.w * 0.25;
    const cz = o.z - Math.sin(o.ry) * o.w * 0.25;
    const cy = o.y + o.h + 2.8;
    for (let i = 0; i < 10; i += 1) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
      scene.add(sp);
      smoke.push({ sp, cx, cy, cz, phase: i / 10, k });
    }
  });
  // Lanes: packed earth from the centre out between the houses.
  const laneGeos = [];
  const ribbon = (pts, w, lift = 0.09) => {
    const verts = [];
    const ind = [];
    for (let i = 0; i < pts.length; i += 1) {
      const [x, z] = pts[i];
      const [ax, az] = pts[Math.max(0, i - 1)];
      const [bx, bz] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = bx - ax;
      const dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l;
      const nz = dx / l;
      for (const s of [-1, 1]) {
        const px = x + nx * s * w * 0.5;
        const pz = z + nz * s * w * 0.5;
        verts.push(px, ground(px, pz) + lift, pz);
      }
      if (i) ind.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(ind);
    g.computeVertexNormals();
    return g;
  };
  for (const a of lanes) {
    const pts = [];
    for (let r = 0; r <= VILLAGE.r + 30; r += 4) pts.push([VILLAGE.x + Math.cos(a) * r + Math.sin(r / 13) * 1.5, VILLAGE.z + Math.sin(a) * r]);
    laneGeos.push(ribbon(pts.filter(([x, z]) => !nearRiver(x, z, 4)), 3.2));
  }
  const dirt = new THREE.MeshStandardMaterial({ color: blend("iris", "sclera", 0.25).lerp(soil, 0.35), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  {
    const m = new THREE.Mesh(merge(laneGeos.map((g) => g.toNonIndexed())), dirt);
    m.receiveShadow = true;
    scene.add(m);
  }

  /* ---------------- the road, over its bridge ---------------- */
  const asphaltTex = drawn(256, 64, (g, w, h) => {
    for (let y = 0; y < h; y += 2)
      for (let x = 0; x < w; x += 2) {
        const k = 0.85 + 0.15 * fbm(x / 6, y / 6, 2);
        g.fillStyle = css(blend("hair", "moon", 0.32).multiplyScalar(k));
        g.fillRect(x, y, 2, 2);
      }
    g.fillStyle = css(col("sclera"), 0.85);
    g.fillRect(0, 3, w, 2);
    g.fillRect(0, h - 5, w, 2);
    for (let x = 0; x < w; x += 64) g.fillRect(x, h / 2 - 1, 34, 2);
  }, { repeat: true });
  const deckY = Math.max(riverY(ROAD_BRIDGE) + 3.2, ground(ROAD_BRIDGE - 35, roadZ(ROAD_BRIDGE - 35)) + 1.6, ground(ROAD_BRIDGE + 35, roadZ(ROAD_BRIDGE + 35)) + 1.6);
  const roadY = (x) => {
    const z = roadZ(x);
    const g = ground(x, z) + 0.1;
    const w = 1 - smoothstep(20, 46, Math.abs(x - ROAD_BRIDGE));
    return Math.max(g, mix(g, deckY, w));
  };
  ctx.roadY = roadY;
  {
    const verts = [];
    const uv = [];
    const ind = [];
    let s = 0;
    let rows = 0;
    for (let x = ROAD_X0; x <= CITY.x0 + 1; x += 3) {
      const z = roadZ(x);
      const dz = (roadZ(x + 1) - roadZ(x - 1)) / 2;
      const l = Math.hypot(1, dz);
      const nx = -dz / l;
      const nz = 1 / l;
      const w = roadW(x) * 0.5;
      const y = roadY(x);
      if (rows) s += Math.hypot(3, roadZ(x) - roadZ(x - 3));
      for (const sd of [-1, 1]) {
        verts.push(x + nx * sd * w, y, z + nz * sd * w);
        uv.push(s / 16, sd > 0 ? 1 : 0);
      }
      if (rows) ind.push((rows - 1) * 2, rows * 2, (rows - 1) * 2 + 1, (rows - 1) * 2 + 1, rows * 2, rows * 2 + 1);
      rows += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    g.computeVertexNormals();
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    road.receiveShadow = true;
    scene.add(road);
    // Bridge: a deck slab, rails, two piers.
    const bz = roadZ(ROAD_BRIDGE);
    const ang = Math.atan2(roadZ(ROAD_BRIDGE + 1) - roadZ(ROAD_BRIDGE - 1), 2);
    const stone = new THREE.MeshStandardMaterial({ color: blend("moon", "iris", 0.3), roughness: 0.85 });
    const span = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, roadW(ROAD_BRIDGE) + 1.2), stone);
    slab.position.y = deckY - 0.7;
    span.add(slab);
    for (const sd of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(70, 0.9, 0.35), stone);
      rail.position.set(0, deckY + 0.45, sd * (roadW(ROAD_BRIDGE) / 2 + 0.4));
      span.add(rail);
    }
    for (const px of [-12, 12]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8, roadW(ROAD_BRIDGE)), stone);
      pier.position.set(px, deckY - 5, 0);
      span.add(pier);
    }
    span.position.set(ROAD_BRIDGE, 0, bz);
    span.rotation.y = -ang;
    span.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    scene.add(span);
  }

  /* ---------------- trees, hedges, haystacks, fences, flowers ---------------- */
  const treeList = [];
  const leaf = () => new THREE.Color().lerpColors(blend("land", "ink", 0.15), blend("land", "practical", 0.25), rand());
  for (let i = 0; i < 260; i += 1) {
    const a = rand() * 6.28;
    const r = 20 + rand() * (VILLAGE.r + 40);
    const x = VILLAGE.x + Math.cos(a) * r;
    const z = VILLAGE.z + Math.sin(a) * r;
    if (nearRiver(x, z, 4) || inPasture(x, z, 2) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 3 || houses.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
    treeList.push([x, ground(x, z), z, 7 + rand() * 9, leaf()]);
  }
  // Rows of trees along the river and the road, scattered field trees.
  for (let x = 320; x < 2280; x += 9 + rand() * 14) {
    for (const sd of [-1, 1]) {
      if (rand() < 0.35) continue;
      const z = riverZ(x) + sd * (riverW(x) * 0.5 + 7 + rand() * 6);
      if (x > 2250) continue;
      treeList.push([x, ground(x, z), z, 9 + rand() * 9, leaf()]);
    }
  }
  for (let x = ROAD_X0 + 30; x < 2200; x += 14 + rand() * 10) {
    if (Math.abs(x - ROAD_BRIDGE) < 50) continue;
    const z = roadZ(x) + (rand() < 0.5 ? -1 : 1) * (roadW(x) / 2 + 3.5);
    treeList.push([x, ground(x, z), z, 8 + rand() * 6, leaf()]);
  }
  for (let i = 0; i < 260; i += 1) {
    const x = 340 + rand() * 1600;
    const z = -1150 + rand() * 1750;
    if (x - coastX(z) < 300 || nearRiver(x, z, 8) || nearRoad(x, z, 4) || inVillage(x, z) || (x > FARM.x0 - 10 && x < FARM.x1 + 10 && z > FARM.z0 - 10 && z < FARM.z1 + 10)) continue;
    // Along field edges.
    const cx = colsX.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), colsX[0]);
    treeList.push([cx, ground(cx, z), z, 8 + rand() * 8, leaf()]);
  }
  broadleaf(scene, treeList, PAINT, { variants: 4, seed: 7 });
  const hedge = [];
  for (let i = 0; i < colsX.length; i += 1)
    for (let z = -1100; z < 560; z += 3.5) {
      const x = colsX[i];
      if (fbm(x / 50, z / 90, 2) < 0.46 || nearRiver(x, z, 6) || nearRoad(x, z, 3) || inVillage(x, z) || x - coastX(z) < 320) continue;
      hedge.push([x + (rand() - 0.5), ground(x, z), z, 1.3 + rand() * 0.8, blend("land", "ink", 0.25 + rand() * 0.15)]);
    }
  bushes(scene, hedge);
  const hayGeo = merge([xf(new THREE.CylinderGeometry(1, 1.1, 1.4, 12), [0, 0.7, 0]), xf(new THREE.ConeGeometry(1.15, 1.3, 12), [0, 2.0, 0])]);
  const hays = [];
  for (let i = 0; i < 18; i += 1) {
    const o = houses[(i * 7) % houses.length];
    const x = o.x + Math.cos(o.ry + 1.2) * 9;
    const z = o.z + Math.sin(o.ry + 1.2) * 9;
    hays.push([x, ground(x, z), z, 0, 1.3, 1.3, 1.3, blend("practical", "iris", 0.35)]);
  }
  staticInst(hayGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), hays);
  // The pasture fence: posts and two rails.
  const fence = [];
  const rails = [];
  const edges = [
    [PASTURE.x0, PASTURE.z0, PASTURE.x1, PASTURE.z0],
    [PASTURE.x1, PASTURE.z0, PASTURE.x1, PASTURE.z1],
    [PASTURE.x1, PASTURE.z1, PASTURE.x0, PASTURE.z1],
    [PASTURE.x0, PASTURE.z1, PASTURE.x0, PASTURE.z0],
  ];
  for (const [ax, az, bx, bz] of edges) {
    const len = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bx - ax, bz - az);
    for (let s = 0; s < len; s += 3) {
      const x = ax + ((bx - ax) * s) / len;
      const z = az + ((bz - az) * s) / len;
      const y = ground(x, z);
      fence.push([x, y + 0.6, z, 0, 0.1, 1.2, 0.1]);
      for (const ry of [0.55, 1.0]) rails.push([x + ((bx - ax) * 1.5) / len, y + ry, z + ((bz - az) * 1.5) / len, ang, 0.06, 0.08, 3.05]);
    }
  }
  const fenceWood = new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.3).lerp(col("moon"), 0.15), roughness: 0.9 });
  staticInst(new THREE.BoxGeometry(1, 1, 1), fenceWood, fence);
  staticInst(new THREE.BoxGeometry(1, 1, 1), fenceWood, rails);
  const grassList = [];
  const flowerList = [];
  for (let i = 0; i < 9000; i += 1) {
    const x = PASTURE.x0 - 40 + rand() * 180;
    const z = PASTURE.z0 - 190 + rand() * 360;
    if (x > FARM.x0 - 1 && x < FARM.x1 + 1 && z > FARM.z0 - 1 && z < FARM.z1 + 1) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1) continue;
    const y = ground(x, z);
    if (rand() < 0.16) flowerList.push([x, y, z, 0.8 + rand() * 0.8, [col("practical"), col("sclera"), blend("accent", "skin", 0.4), blend("sky", "skin", 0.5)][i % 4]]);
    else grassList.push([x, y, z, 0.25 + rand() * 0.3, blend("land", "practical", rand() * 0.35)]);
  }
  tufts(scene, grassList, { amp: 0.3 });
  flowers(scene, flowerList);

  /* ---------------- people ---------------- */
  const people = [];
  const farm = (o) => ({ ...outfit(rand, PAINT, "farm"), phase: rand() * 6.28, ...o });
  // The farmer the camera follows, walking down the furrow with a hoe over his shoulder.
  const furrowZ = FARM.z0 + 0.9 * 32 + 0.45;
  people.push(farm({ shirt: blend("sclera", "iris", 0.15), sleeves: blend("sclera", "iris", 0.15), trousers: blend("ocean", "hair", 0.5), pose: (t) => {
    const x = 962 + Math.max(0, t - 44) * 1.05;
    return { x, y: ground(x, furrowZ), z: furrowZ, heading: Math.PI / 2, gait: 1 };
  } }));
  for (const [x, z] of [
    [1001, FARM.z0 + 0.9 * 28 + 0.45],
    [988, FARM.z0 + 0.9 * 38 + 0.45],
    [1010, FARM.z0 + 0.9 * 35 + 0.45],
  ])
    people.push(farm({ pose: () => ({ x, y: ground(x, z), z, heading: -Math.PI / 2 + 0.3, mode: "work" }) }));
  // Workers bent over other fields.
  for (let i = 0; i < 14; i += 1) {
    const x = 560 + rand() * 1300;
    const z = -900 + rand() * 1300;
    if (nearRiver(x, z, 20) || inVillage(x, z, 10) || nearRoad(x, z, 8) || x - coastX(z) < 340) continue;
    const hd = rand() * 6.28;
    people.push(farm({ pose: () => ({ x, y: ground(x, z), z, heading: hd, mode: "work" }) }));
  }
  // Villagers along the lanes.
  for (let i = 0; i < 22; i += 1) {
    const a = lanes[i % lanes.length];
    const pts = [];
    for (let r = 4; r <= VILLAGE.r + 20; r += 8) pts.push([VILLAGE.x + Math.cos(a) * r + Math.sin(r / 13) * 1.5 + (i % 2 ? 0.8 : -0.8), VILLAGE.z + Math.sin(a) * r]);
    const route = polyline(pts.filter(([x, z]) => !nearRiver(x, z, 4)));
    const s0 = rand() * route.length;
    const v = 0.9 + rand() * 0.45;
    people.push(farm({ pose: (t) => {
      const [s, dir] = pingS(t, v, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: ground(x, z), z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } }));
  }
  // Children playing tag near the houses.
  for (let i = 0; i < 8; i += 1) {
    const o = houses[(i * 5 + 2) % houses.length];
    const cx = o.x + Math.cos(o.ry) * 9;
    const cz = o.z - Math.sin(o.ry) * 9;
    const ph = rand() * 6.28;
    const r = 2.5 + rand() * 2;
    people.push(farm({ scale: 0.6, pose: (t) => {
      const a = t * 1.25 + ph;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a * 1.3) * r * 0.7;
      const dx = -Math.sin(a) * r;
      const dz = Math.cos(a * 1.3) * 1.3 * r * 0.7;
      return { x, y: ground(x, z), z, heading: Math.atan2(dx, dz), gait: 2 };
    } }));
  }
  // Washing at the river, walking the bank, sitting in the shade.
  const bankZ = (x) => riverZ(x) - riverW(x) * 0.5 - 2.2;
  for (let i = 0; i < 5; i += 1) {
    const x = 1092 + i * 4.5;
    const z = bankZ(x);
    people.push(farm({ pose: () => ({ x, y: ground(x, z), z, heading: 0, mode: "work" }) }));
  }
  for (let i = 0; i < 6; i += 1) {
    const pts = [];
    for (let x = 1040; x < 1220; x += 6) pts.push([x, bankZ(x) - 5 - (i % 2) * 1.2]);
    const route = polyline(pts);
    const s0 = rand() * route.length;
    people.push(farm({ pose: (t) => {
      const [s, dir] = pingS(t, 1.05, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: ground(x, z), z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } }));
  }
  for (let i = 0; i < 3; i += 1) {
    const o = houses[(i * 11 + 4) % houses.length];
    const x = o.x + 6 + i * 0.9;
    const z = o.z + 5;
    people.push(farm({ pose: () => ({ x, y: ground(x, z) - 0.38, z, heading: 2.5 + i * 0.5, mode: "sit" }) }));
  }
  // The goatherd and the ploughman (their animals follow below).
  const goatRoute = polyline([
    [VILLAGE.x - 40, VILLAGE.z + 30],
    [VILLAGE.x - 70, VILLAGE.z - 10],
    [VILLAGE.x - 115, VILLAGE.z - 40],
    [VILLAGE.x - 160, VILLAGE.z - 60],
    [VILLAGE.x - 210, VILLAGE.z - 95],
  ]);
  const goatPos = (t, lag) => {
    const [s, dir] = pingS(t - lag / 0.85, 0.85, 40, goatRoute.length);
    const [x, z, hd] = goatRoute.at(s);
    return { x, z, heading: dir > 0 ? hd : hd + Math.PI };
  };
  people.push(farm({ scale: 0.75, pose: (t) => {
    const p = goatPos(t, 6);
    return { x: p.x, y: ground(p.x, p.z), z: p.z, heading: p.heading, gait: 1 };
  } }));
  const PLOUGH = { x0: 0, x1: 0, z: 0 };
  {
    // The nearest ploughed field to the farm.
    const g = fieldGeos.plough[0];
    if (g) {
      g.computeBoundingBox();
      PLOUGH.x0 = g.boundingBox.min.x + 6;
      PLOUGH.x1 = g.boundingBox.max.x - 6;
      PLOUGH.z = (g.boundingBox.min.z + g.boundingBox.max.z) / 2;
    }
  }
  const ploughAt = (t, back) => {
    const len = PLOUGH.x1 - PLOUGH.x0;
    const [s, dir] = pingS(t, 0.8, 5, Math.max(10, len));
    return { x: PLOUGH.x0 + s - dir * back, z: PLOUGH.z, heading: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
  };
  if (PLOUGH.x1 > PLOUGH.x0)
    people.push(farm({ pose: (t) => {
      const p = ploughAt(t, 4.5);
      return { x: p.x, y: ground(p.x, p.z), z: p.z, heading: p.heading, gait: 0.8 };
    } }));
  updates.push(crowd(scene, people, { metal: blend("moon", "hair", 0.4), tyre: col("hair") }));

  /* ---------------- animals ---------------- */
  const beasts = [];
  const brown = blend("iris", "hair", 0.5);
  const cowColors = [brown, col("sclera"), blend("iris", "sclera", 0.35), blend("hair", "moon", 0.15), blend("iris", "hair", 0.25)];
  for (let i = 0; i < 14; i += 1) {
    const x0 = PASTURE.x0 + 10 + rand() * (PASTURE.x1 - PASTURE.x0 - 20);
    const z0 = PASTURE.z0 + 10 + rand() * (PASTURE.z1 - PASTURE.z0 - 20);
    if (Math.hypot(x0 - POND.x, z0 - POND.z) < POND.r + 6) continue;
    const hd = rand() * 6.28;
    const ph = rand() * 6.28;
    const c = cowColors[i % cowColors.length];
    beasts.push({ kind: "cow", color: c, headColor: i % 3 === 0 ? col("sclera") : c, legColor: c, hornColor: blend("sclera", "practical", 0.3), phase: ph, pose: (t) => {
      // Graze, then take a few steps to fresh grass.
      const cyc = (t * 0.07 + ph) % 1;
      const walking = cyc > 0.82;
      const along = (Math.floor(t * 0.07 + ph) + smoothstep(0.82, 1, cyc)) * 2.2;
      const x = x0 + Math.sin(hd) * along;
      const z = z0 + Math.cos(hd) * along;
      return { x, y: ground(x, z), z, heading: hd, gait: walking ? 0.7 : 0, graze: walking ? 0 : 1 };
    } });
  }
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI * (0.15 + i * 0.22);
    const inWater = i < 2;
    const r = inWater ? POND.r - 7 + i * 3 : POND.r + 4 + rand() * 4;
    const x = POND.x + Math.cos(a) * r;
    const z = POND.z + Math.sin(a) * r;
    const hd = a + Math.PI / 2 + rand();
    beasts.push({ kind: "buffalo", color: blend("hair", "sky", 0.2), hornColor: blend("hair", "moon", 0.3), phase: rand() * 6.28, pose: () => ({ x, y: inWater ? baseH(POND.x) - 0.9 - 0.8 : ground(x, z), z, heading: hd, lie: inWater ? 0 : 1, gait: 0, graze: 0 }) });
  }
  for (let i = 0; i < 10; i += 1) {
    const lag = 1 + i * 0.9;
    const side = ((i * 7) % 5) * 0.6 - 1.2;
    beasts.push({ kind: "goat", color: i % 3 ? col("sclera") : blend("iris", "hair", 0.35), hornColor: blend("moon", "hair", 0.3), scale: 1, phase: i, pose: (t) => {
      const p = goatPos(t, -lag + 6);
      return { x: p.x + Math.cos(p.heading) * side, y: ground(p.x, p.z), z: p.z - Math.sin(p.heading) * side, heading: p.heading, gait: 1, graze: Math.max(0, Math.sin(t * 0.5 + i)) * 0.6 };
    } });
  }
  if (PLOUGH.x1 > PLOUGH.x0)
    for (const sd of [-0.85, 0.85])
      beasts.push({ kind: "ox", color: blend("sclera", "iris", 0.25), hornColor: blend("sclera", "practical", 0.3), pose: (t) => {
        const p = ploughAt(t, 0);
        return { x: p.x, y: ground(p.x, p.z + sd), z: p.z + sd, heading: p.heading, gait: 0.8 };
      } });
  for (let i = 0; i < 3; i += 1) {
    const x = VILLAGE.x + 150 + i * 7;
    const z = VILLAGE.z - 120 + i * 9;
    const hd = rand() * 6.28;
    beasts.push({ kind: "horse", color: i === 1 ? col("hair") : blend("iris", "hair", 0.55), headColor: i === 1 ? col("hair") : blend("iris", "hair", 0.55), phase: rand() * 6.28, pose: (t) => ({ x, y: ground(x, z), z, heading: hd + Math.sin(t * 0.05 + i) * 0.4, graze: 0.8 + Math.sin(t * 0.3 + i) * 0.2 }) });
  }
  for (let i = 0; i < 4; i += 1) {
    const o = houses[(i * 9 + 1) % houses.length];
    const ph = rand() * 6.28;
    const dog = i === 0;
    beasts.push({ kind: "dog", color: [blend("iris", "practical", 0.3), col("hair"), col("sclera"), blend("iris", "hair", 0.3)][i], phase: ph, pose: (t) => {
      if (dog) {
        const p = goatPos(t, 7.5);
        return { x: p.x + 1.4, y: ground(p.x + 1.4, p.z), z: p.z, heading: p.heading, gait: 1 };
      }
      const x = o.x + 7;
      const z = o.z - 4;
      return { x, y: ground(x, z), z, heading: ph + Math.sin(t * 0.4) * 0.5, lie: 1 };
    } });
  }
  updates.push(herd(scene, beasts));

  // Chickens in the farmyards, pecking; ducks paddling on the pond and the river.
  const hen = merge([
    xf(new THREE.SphereGeometry(1, 8, 6), [0, 0.5, 0], [0, 0, 0], [0.55, 0.55, 0.8]),
    xf(new THREE.SphereGeometry(0.32, 7, 5), [0, 0.95, 0.55]),
    xf(new THREE.ConeGeometry(0.1, 0.25, 4), [0, 0.92, 0.9], [Math.PI / 2, 0, 0]),
    xf(new THREE.ConeGeometry(0.35, 0.6, 4), [0, 0.75, -0.7], [-0.8, 0, 0]),
  ]);
  const hens = [];
  for (let i = 0; i < 36; i += 1) {
    const o = houses[(i * 3) % houses.length];
    const cx = o.x - Math.cos(o.ry) * 6 + (rand() - 0.5) * 6;
    const cz = o.z + Math.sin(o.ry) * 6 + (rand() - 0.5) * 6;
    const ph = rand() * 6.28;
    hens.push({ size: 0.24, color: [col("sclera"), blend("iris", "accent", 0.3), blend("iris", "hair", 0.4)][i % 3], pose: (t) => {
      const x = cx + Math.sin(t * 0.3 + ph) * 1.4;
      const z = cz + Math.cos(t * 0.23 + ph * 2) * 1.2;
      const peck = Math.max(0, Math.sin(t * 3.1 + ph)) ** 6;
      return { x, y: ground(x, z), z, heading: t * 0.3 + ph, pitch: peck * 0.7 };
    } });
  }
  updates.push(swarm(scene, hen, new THREE.MeshStandardMaterial({ roughness: 0.9 }), hens, true));
  const duck = merge([
    xf(new THREE.SphereGeometry(1, 8, 6), [0, 0.25, 0], [0, 0, 0], [0.5, 0.38, 0.85]),
    xf(new THREE.SphereGeometry(0.3, 7, 5), [0, 0.7, 0.6]),
    xf(new THREE.BoxGeometry(0.16, 0.06, 0.3), [0, 0.66, 0.92]),
  ]);
  const ducks = [];
  for (let i = 0; i < 26; i += 1) {
    const inPond = i < 14;
    const ph = rand() * 6.28;
    const r = 3 + rand() * (POND.r - 6);
    const xr = 1060 + rand() * 120;
    ducks.push({ size: 0.33, color: i % 4 === 0 ? col("sclera") : blend("iris", "hair", 0.35), pose: (t) => {
      if (inPond) {
        const a = ph + t * (0.06 + (i % 3) * 0.02) * (i % 2 ? 1 : -1);
        return { x: POND.x + Math.cos(a) * r, y: baseH(POND.x) - 0.9, z: POND.z + Math.sin(a) * r, heading: -a + (i % 2 ? 0 : Math.PI) };
      }
      const x = xr + Math.sin(t * 0.05 + ph) * 8;
      const z = riverZ(x) + Math.sin(ph) * 4;
      return { x, y: riverY(x), z, heading: Math.cos(t * 0.05 + ph) > 0 ? Math.PI / 2 : -Math.PI / 2 };
    } });
  }
  updates.push(swarm(scene, duck, new THREE.MeshStandardMaterial({ roughness: 0.8 }), ducks, false));

  /* ---------------- birds and insects ---------------- */
  const birds = [];
  // Geese in a V across the morning sky.
  for (let i = 0; i < 17; i += 1) {
    const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
    birds.push({ size: 0.42, color: blend("moon", "hair", 0.45), wingColor: blend("moon", "hair", 0.55), beat: 5.5, phase: i * 0.4, pose: (t) => {
      const u = t - 36;
      const x = 380 + u * 15 - Math.abs(k) * 3.2;
      const z = -1080 + u * 11 + k * 3.4;
      return { x, y: 125 + Math.sin(u * 0.3) * 3 - Math.abs(k) * 0.4, z, heading: Math.atan2(15, 11), flap: 0.8 };
    } });
  }
  // Crows over the fields.
  for (let i = 0; i < 14; i += 1) {
    const f = loopFlight(700 + rand() * 900, 22 + rand() * 25, -700 + rand() * 900, 50 + rand() * 60, 40 + rand() * 50, (0.22 + rand() * 0.1) * (rand() < 0.5 ? 1 : -1), rand() * 6.28, 3);
    birds.push({ size: 0.22, color: col("hair"), beat: 8, phase: rand() * 6.28, pose: f });
  }
  // Songbirds on the south rail of the pasture; they lift off as the camera comes near.
  for (let i = 0; i < 7; i += 1) {
    const x = 984 + i * 1.6 + rand() * 0.5;
    const z = PASTURE.z0;
    const y = ground(x, z) + 1.05;
    const go = 54.2 + i * 0.12;
    const dir = rand() * 0.8 - 0.4;
    birds.push({ size: 0.075, color: i % 2 ? blend("iris", "hair", 0.3) : blend("practical", "hair", 0.35), beat: 22, phase: i, pose: (t) => {
      if (t < go) return { x, y: y + Math.max(0, Math.sin(t * 2.3 + i)) * 0.03, z, heading: Math.PI + Math.sin(t * 0.7 + i), pitch: 0, perched: true };
      const u = t - go;
      return { x: x + Math.sin(dir) * u * 6, y: y + u * 2.4 + u * u * 0.4, z: z - Math.cos(dir) * u * 6, heading: Math.PI + dir, pitch: 0.3, flap: 1 };
    } });
  }
  updates.push(flock(scene, birds));
  const butterflies = [];
  for (let i = 0; i < 70; i += 1) {
    const cx = PASTURE.x0 - 20 + rand() * 160;
    const cz = PASTURE.z0 - 160 + rand() * 300;
    const cy = ground(cx, cz) + 0.5;
    const ph = rand() * 6.28;
    butterflies.push({ size: 1, color: [col("practical"), col("sclera"), col("iris"), blend("sky", "cyan", 0.4)][i % 4], phase: ph, pose: (t) => ({ x: cx + Math.sin(t * 0.7 + ph) * 1.5 + Math.sin(t * 2.3 + ph) * 0.3, y: cy + 0.3 + Math.sin(t * 1.9 + ph) * 0.25, z: cz + Math.cos(t * 0.6 + ph) * 1.5, heading: t * 0.7 + ph }) });
  }
  updates.push(insects(scene, butterflies));
  // Bees: tiny dark specks busy over the flowers.
  const beeN = 220;
  const beePos = new Float32Array(beeN * 3);
  const beeBase = Array.from({ length: beeN }, () => flowerList[Math.floor(rand() * flowerList.length)] ?? [1000, 0, -300]);
  const beeGeo = new THREE.BufferGeometry();
  beeGeo.setAttribute("position", new THREE.BufferAttribute(beePos, 3));
  scene.add(new THREE.Points(beeGeo, new THREE.PointsMaterial({ color: blend("hair", "practical", 0.3), size: 0.03 })));

  return (t, cam) => {
    for (const u of updates) u(t, cam);
    for (const s of smoke) {
      const u = (s.phase + t * 0.09 + s.k * 0.13) % 1;
      s.sp.position.set(s.cx + u * 6 + Math.sin(t * 0.5 + s.k + u * 3) * 0.8, s.cy + u * 14, s.cz + u * 3);
      const sz = 1.2 + u * 7;
      s.sp.scale.set(sz, sz, 1);
      s.sp.material.opacity = 0.42 * Math.sin(u * Math.PI) * (1 - u * 0.4);
    }
    beeBase.forEach(([x, y, z], i) => beePos.set([x + Math.sin(t * 7 + i) * 0.25, y + 0.45 + Math.sin(t * 9 + i * 2) * 0.12, z + Math.cos(t * 6 + i * 3) * 0.25], i * 3));
    beeGeo.attributes.position.needsUpdate = true;
    void clamp;
    void loopS;
    void along;
    void timedPath;
  };
}
