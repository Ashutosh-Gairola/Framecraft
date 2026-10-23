/**
 * The forest: towering broadleaves and conifers round a misty clearing, a giant tree by the
 * stream, ferns, moss on rocks and fallen logs, mushrooms, flowers; light shafts through the
 * leaves; deer crossing the trail, a doe drinking, a fox in the undergrowth, rabbits,
 * squirrels on the trunks, a woodpecker, songbirds that take flight, an eagle over the canopy,
 * trout in the stream, frogs on the stones, dragonflies, butterflies — and one leaf with dew.
 */

import { THREE, mulberry32, fbm, smoothstep, mix, clamp, xf, merge, drawn, css, puff, crowd, herd, flock, loopFlight, swarm, insects, fishGeometry, school, along, timedPath, glow } from "./lib.js";
import { riverZ, riverW, riverY, CLEARING, FOREST_X, interior } from "./geo.js";
import { broadleaf, conifers, ferns, rocks, bushes, tufts, flowers } from "./flora.js";

export function forest(ctx) {
  const { scene, PAINT, col, blend, ground } = ctx;
  const rand = mulberry32(404);
  const updates = [];
  const CL = CLEARING;
  const S = riverZ(CL.x);
  const streamHalf = (x) => riverW(x) * 0.5;
  const inStream = (x, z, m = 0) => Math.abs(z - riverZ(x)) < streamHalf(x) + m;
  // The deer trail crosses the glade toward the stream.
  const T0 = { x: CL.x - 14, z: CL.z - 26 };
  const TD = { x: 0.76, z: 0.64 };
  const onTrail = (x, z) => Math.abs((x - T0.x) * TD.z - (z - T0.z) * TD.x) < 2.2;
  const dist = (x, z) => Math.hypot(x - CL.x, z - CL.z);
  // The clearing's edge wobbles, so it reads as a glade, not a circle.
  const edge = (x, z) => CL.r + 10 * Math.sin(Math.atan2(z - CL.z, x - CL.x) * 3 + 1) + 6 * Math.sin(Math.atan2(z - CL.z, x - CL.x) * 7);
  const GIANT = { x: CL.x + 3.4, z: S - 11.8 };
  // The camera's ground track and its view of the deer stay clear of plants and stones.
  const track = [
    [CL.x - 22, S - 26],
    [CL.x - 21, S - 25],
    [CL.x - 6.5, S - 12.5],
    [CL.x - 1.4, S - 8.7],
    [CL.x + 0.8, S - 9.8],
  ];
  const segDist = (x, z, [ax, az], [bx, bz]) => {
    const dx = bx - ax;
    const dz = bz - az;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - dx * u, z - az - dz * u);
  };
  const clearOf = (x, z, r = 1.4) => {
    for (let i = 0; i < track.length - 1; i += 1) if (segDist(x, z, track[i], track[i + 1]) < r) return false;
    return segDist(x, z, track[0], [CL.x - 3, CL.z - 15]) > 2.4;
  };
  const LEAF = { x: CL.x - 1.05, z: S - 8.42 };
  LEAF.y = ground(LEAF.x, LEAF.z) + 0.95;

  /* --- trees --- */
  const leaf = () => new THREE.Color().lerpColors(blend("land", "ink", 0.25), blend("land", "practical", 0.18), rand());
  const broad = [];
  const pines = [];
  for (let tries = 0; tries < 26000 && broad.length + pines.length < 3200; tries += 1) {
    const a = rand() * Math.PI * 2;
    const r = 30 + Math.sqrt(rand()) * 410;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    const inside = dist(x, z) < edge(x, z);
    if (inside && !(inStream(x, z, 9) && rand() < 0.25)) continue;
    if (inStream(x, z, 2.5) || onTrail(x, z)) continue;
    if (Math.hypot(x - GIANT.x, z - GIANT.z) < 9) continue;
    const y = ground(x, z);
    const h = 18 + rand() * 16;
    if (rand() < 0.3) pines.push([x, y, z, h + 4, blend("land", "ink", 0.4 + rand() * 0.15)]);
    else broad.push([x, y, z, h, leaf()]);
  }
  // The forest edge facing the suburbs: real trees in front of the canopy.
  for (let i = 0; i < 2600; i += 1) {
    const x = FOREST_X - 30 + rand() * 230;
    const z = -1100 + rand() * 2200;
    if (inStream(x, z, 3)) continue;
    const y = ground(x, z);
    if (rand() < 0.3) pines.push([x, y, z, 20 + rand() * 12, blend("land", "ink", 0.4 + rand() * 0.15)]);
    else broad.push([x, y, z, 16 + rand() * 12, leaf()]);
  }
  // Trees near the glade get leaf cards on their crowns, so they read as foliage up close.
  const near = broad.filter(([x, , z]) => dist(x, z) < 190);
  const far = broad.filter(([x, , z]) => dist(x, z) >= 190);
  broadleaf(scene, near, PAINT, { variants: 5, seed: 23, sway: 0.004, cards: 34 });
  broadleaf(scene, far, PAINT, { variants: 5, seed: 31, sway: 0.004 });
  conifers(scene, pines, PAINT);
  // The giant: a broad trunk with buttress roots and a vast crown.
  const bark = new THREE.MeshStandardMaterial({ color: blend("hair", "iris", 0.32).lerp(col("moon"), 0.12), roughness: 0.95, map: drawn(64, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 2) {
      const k = 0.75 + 0.25 * fbm(x / 6, 0, 2);
      g.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(255 * k)},${Math.round(255 * k)},1)`;
      g.fillRect(x, 0, 2, h);
    }
    for (let i = 0; i < 160; i += 1) {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect((i * 37) % w, (i * 53) % h, 2, 10 + (i % 7) * 3);
    }
  }, { repeat: true }) });
  bark.map.repeat.set(3, 6);
  const gy = ground(GIANT.x, GIANT.z);
  const giant = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 44, 16, 8), bark);
  trunk.position.y = 22;
  giant.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 6), bark);
    const a = (i / 6) * Math.PI * 2 + 0.3;
    root.position.set(Math.cos(a) * 1.5, 1.2, Math.sin(a) * 1.5);
    root.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    root.scale.set(1, 1, 0.45);
    giant.add(root);
  }
  for (let i = 0; i < 7; i += 1) {
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 9, 8), bark);
    const a = (i / 7) * Math.PI * 2;
    limb.position.set(Math.cos(a) * 3.2, 33 + (i % 3) * 3, Math.sin(a) * 3.2);
    limb.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    giant.add(limb);
  }
  giant.position.set(GIANT.x, gy - 0.4, GIANT.z);
  giant.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  scene.add(giant);
  broadleaf(scene, [
    [GIANT.x, gy + 18, GIANT.z, 34, blend("land", "ink", 0.2)],
    [GIANT.x + 5, gy + 16, GIANT.z - 4, 28, blend("land", "practical", 0.1)],
    [GIANT.x - 5, gy + 17, GIANT.z + 3, 28, blend("land", "ink", 0.3)],
  ], PAINT, { variants: 1, seed: 29, sway: 0.002, cards: 260 });

  /* --- the floor: ferns, moss, logs, mushrooms, flowers, grass --- */
  const fernList = [];
  for (let i = 0; i < 9000; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 15 + rand() * 200;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    const inside = dist(x, z) < edge(x, z) - 6;
    if (inside && !inStream(x, z, 10) && rand() < 0.85) continue;
    if (inStream(x, z, 0.8) || onTrail(x, z) || !clearOf(x, z)) continue;
    fernList.push([x, ground(x, z), z, 0.6 + rand() * 0.9, leaf()]);
  }
  // A dense bed of ferns along the camera's low track to the stream.
  for (let i = 0; i < 1400; i += 1) {
    const x = CL.x - 26 + rand() * 30;
    const z = S - 30 + rand() * 24;
    if (inStream(x, z, 0.6) || Math.hypot(x - LEAF.x, z - LEAF.z) < 0.6 || !clearOf(x, z, 1.1)) continue;
    fernList.push([x, ground(x, z), z, 0.55 + rand() * 0.7, leaf()]);
  }
  ferns(scene, fernList, PAINT);
  const moss = [];
  for (let i = 0; i < 360; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 25 + rand() * 260;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    if (inStream(x, z, -0.5) || onTrail(x, z) || !clearOf(x, z, 3)) continue;
    moss.push([x, ground(x, z), z, 0.4 + rand() * 1.3, blend("land", "iris", 0.3 + rand() * 0.15).lerp(col("moon"), 0.1)]);
  }
  for (let x = CL.x - 60; x < CL.x + 60; x += 1.6) {
    if (rand() < 0.4) continue;
    const z = riverZ(x) + (rand() - 0.5) * streamHalf(x) * 2.2;
    moss.push([x, riverY(x) - 0.3, z, 0.25 + rand() * 0.55, blend("moon", "hair", 0.35 + rand() * 0.2)]);
  }
  rocks(scene, moss, { mossy: true });
  const logs = [];
  for (let i = 0; i < 30; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 30 + rand() * 160;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    if (inStream(x, z, 3) || onTrail(x, z) || !clearOf(x, z, 8)) continue;
    logs.push([x, ground(x, z) + 0.3, z, rand() * 3.14, 0.38 + rand() * 0.2, 6 + rand() * 6]);
  }
  const logGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  logGeo.rotateZ(Math.PI / 2);
  const logMesh = new THREE.InstancedMesh(logGeo, new THREE.MeshStandardMaterial({ color: blend("hair", "land", 0.3).lerp(col("iris"), 0.2), roughness: 1, map: bark.map }), logs.length);
  const mm = new THREE.Matrix4();
  logs.forEach(([x, y, z, ry, r, l], i) => logMesh.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0.05)), new THREE.Vector3(l, r, r))));
  logMesh.castShadow = logMesh.receiveShadow = true;
  logMesh.frustumCulled = false;
  scene.add(logMesh);
  const mushroom = merge([xf(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 6), [0, 0.035, 0]), xf(new THREE.SphereGeometry(0.04, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.065, 0], [0, 0, 0], [1, 0.7, 1])]);
  const shrooms = [];
  logs.forEach(([x, y, z, ry, r, l]) => {
    for (let k = 0; k < 12; k += 1) {
      const u = (rand() - 0.5) * l;
      const px = x + Math.cos(ry) * u + Math.sin(ry) * (r + 0.1) * (k % 2 ? 1 : -1);
      const pz = z - Math.sin(ry) * u + Math.cos(ry) * (r + 0.1) * (k % 2 ? 1 : -1);
      shrooms.push([px, ground(px, pz), pz, rand() * 6, 1 + rand(), 1 + rand(), 1 + rand(), k % 3 ? blend("sclera", "practical", 0.3) : blend("accent", "iris", 0.3)]);
    }
  });
  for (let i = 0; i < 40; i += 1) {
    const x = LEAF.x - 4 + rand() * 6;
    const z = LEAF.z - 6 + rand() * 4;
    shrooms.push([x, ground(x, z), z, rand() * 6, 1.2, 1.2, 1.2, blend("sclera", "iris", 0.3)]);
  }
  const shroomMesh = new THREE.InstancedMesh(mushroom, new THREE.MeshStandardMaterial({ roughness: 0.6 }), shrooms.length);
  shrooms.forEach(([x, y, z, ry, a, b, c, k], i) => {
    shroomMesh.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(a, b, c)));
    shroomMesh.setColorAt(i, k);
  });
  shroomMesh.frustumCulled = false;
  scene.add(shroomMesh);
  const grass = [];
  const blooms = [];
  for (let i = 0; i < 14000; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 80;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    if (dist(x, z) > edge(x, z) || inStream(x, z, 0.3) || onTrail(x, z)) continue;
    if (!clearOf(x, z, 0.6) && rand() < 0.8) continue;
    if (rand() < 0.12) blooms.push([x, ground(x, z), z, 0.7 + rand() * 0.7, [col("sclera"), col("practical"), blend("sky", "skin", 0.5), blend("accent", "skin", 0.5)][i % 4]]);
    else grass.push([x, ground(x, z), z, 0.3 + rand() * 0.35, blend("land", "practical", 0.1 + rand() * 0.3)]);
  }
  tufts(scene, grass, { amp: 0.3 });
  flowers(scene, blooms);
  const under = [];
  for (let i = 0; i < 1800; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 50 + rand() * 360;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    if (dist(x, z) < edge(x, z) + 2 || inStream(x, z, 1.5) || onTrail(x, z) || !clearOf(x, z, 2.5)) continue;
    under.push([x, ground(x, z), z, 0.8 + rand() * 1.6, blend("land", "ink", 0.2 + rand() * 0.2)]);
  }
  bushes(scene, under);
  // The trail through the glade.
  {
    const verts = [];
    const ind = [];
    let row = 0;
    for (let u = -90; u <= 60; u += 1.5) {
      const x = T0.x + TD.x * u + Math.sin(u / 9) * 0.8;
      const z = T0.z + TD.z * u;
      if (inStream(x, z, 1)) break;
      for (const sd of [-1, 1]) verts.push(x + TD.z * sd * 0.9, ground(x + TD.z * sd * 0.9, z - TD.x * sd * 0.9) + 0.04, z - TD.x * sd * 0.9);
      if (row) ind.push((row - 1) * 2, row * 2, (row - 1) * 2 + 1, (row - 1) * 2 + 1, row * 2, row * 2 + 1);
      row += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(ind);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.45), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    scene.add(m);
  }

  /* --- the leaf with dew, for the macro shot --- */
  {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.05, 0.04, 0.07, 0.12, 0, 0.2);
    shape.bezierCurveTo(-0.07, 0.12, -0.05, 0.04, 0, 0);
    const g = new THREE.ShapeGeometry(shape, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, -Math.abs(x) * 0.5 + y * y * 0.6);
    }
    g.computeVertexNormals();
    const veins = drawn(128, 128, (c, w, h) => {
      c.fillStyle = css(blend("land", "cyan", 0.08));
      c.fillRect(0, 0, w, h);
      c.strokeStyle = css(blend("land", "sclera", 0.45));
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(w / 2, h);
      c.lineTo(w / 2, 0);
      c.stroke();
      c.lineWidth = 1;
      for (let y = 10; y < h; y += 14) {
        c.beginPath();
        c.moveTo(w / 2, y + 8);
        c.lineTo(w * 0.1, y);
        c.moveTo(w / 2, y + 8);
        c.lineTo(w * 0.9, y);
        c.stroke();
      }
    });
    // ShapeGeometry UVs are positions; remap to the leaf's box.
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, p.getX(i) / 0.14 + 0.5, p.getY(i) / 0.2);
    const leafMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: veins, roughness: 0.45, side: THREE.DoubleSide }));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.9, 5), new THREE.MeshStandardMaterial({ color: blend("land", "practical", 0.2) }));
    stem.position.set(LEAF.x, ground(LEAF.x, LEAF.z) + 0.45, LEAF.z);
    scene.add(stem);
    leafMesh.position.set(LEAF.x, LEAF.y, LEAF.z);
    leafMesh.rotation.set(-1.15, -0.5, 0);
    scene.add(leafMesh);
    const dropMat = new THREE.MeshStandardMaterial({ color: col("sclera"), roughness: 0.02, metalness: 0.15, transparent: true, opacity: 0.55, envMapIntensity: 2.5 });
    const drops = [
      [0.012, 0.06, 0.009],
      [-0.018, 0.1, 0.007],
      [0.004, 0.14, 0.011],
      [0.02, 0.12, 0.005],
      [-0.01, 0.04, 0.006],
      [0.0, 0.085, 0.004],
    ];
    for (const [x, y, r] of drops) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), dropMat);
      d.scale.set(1, 1, 0.75);
      const z = -Math.abs(x) * 0.5 + y * y * 0.6 + r * 0.6;
      d.position.set(x, y, z);
      leafMesh.add(d);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 8, 6), new THREE.MeshBasicMaterial({ color: col("sclera") }));
      glint.position.set(x - r * 0.35, y + r * 0.35, z + r * 0.6);
      leafMesh.add(glint);
    }
    for (let i = 0; i < 5; i += 1) {
      const l2 = leafMesh.clone();
      l2.position.set(LEAF.x + (rand() - 0.5) * 0.5, LEAF.y - 0.1 - rand() * 0.25, LEAF.z + (rand() - 0.5) * 0.4);
      l2.rotation.set(-0.9 - rand() * 0.5, rand() * 6, 0);
      l2.scale.setScalar(0.8 + rand() * 0.6);
      scene.add(l2);
    }
  }

  /* --- mist and light --- */
  const mistTex = puff(blend("moon", "sclera", 0.5), 61, 12);
  const mist = [];
  for (let i = 0; i < 90; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 20 + rand() * 180;
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
    const s = 14 + rand() * 22;
    sp.scale.set(s, s * 0.35, 1);
    sp.position.set(x, ground(x, z) + 1.5 + rand() * 5, z);
    scene.add(sp);
    mist.push({ sp, x, base: 0.05 + rand() * 0.07, ph: rand() * 6.28 });
  }
  const shaftTex = drawn(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in";
    const v = g.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(0,0,0,0.2)");
    v.addColorStop(0.3, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  });
  const shafts = [];
  for (let i = 0; i < 16; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 60;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5 + rand() * 5, 46), new THREE.MeshBasicMaterial({ map: shaftTex, color: blend("practical", "sclera", 0.4), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.geometry.translate(0, -23, 0);
    const x = CL.x + Math.cos(a) * r;
    const z = CL.z + Math.sin(a) * r;
    scene.add(m);
    shafts.push({ m, x, z, y: ground(x, z) + 34, ph: rand() * 6.28, base: 0.05 + rand() * 0.07, ry: rand() * Math.PI });
  }

  /* --- animals --- */
  const beasts = [];
  const tan = blend("iris", "hair", 0.28);
  // The family of deer crossing the trail, a stag leading.
  const crossing = (t, lag) => {
    const u = (t - 82 - lag) * 1.25;
    return { x: T0.x + TD.x * u + Math.sin(u / 9) * 0.8, z: T0.z + TD.z * u };
  };
  [
    ["stag", 0, 1.1],
    ["deer", 2.6, 1],
    ["deer", 4.6, 0.95],
    ["deer", 6.0, 0.62],
    ["deer", 7.2, 0.6],
  ].forEach(([kind, lag, scale], i) => {
    beasts.push({ kind, scale, color: tan, legColor: blend("iris", "hair", 0.3), hornColor: blend("practical", "iris", 0.45), phase: i * 1.3, cadence: 0.8, pose: (t) => {
      const p = crossing(t, lag);
      const p2 = crossing(t + 0.1, lag);
      const pause = Math.max(0, Math.sin((t - lag) * 0.35)) > 0.92;
      return { x: p.x, y: ground(p.x, p.z), z: p.z, heading: Math.atan2(p2.x - p.x, p2.z - p.z), gait: pause ? 0 : 0.75, graze: pause ? 0.2 : 0 };
    } });
  });
  // A doe drinking at the stream.
  {
    const x = CL.x + 6;
    const z = S - streamHalf(CL.x) - 1.2;
    beasts.push({ kind: "deer", color: tan, legColor: blend("iris", "hair", 0.3), phase: 3, pose: (t) => ({ x, y: ground(x, z), z, heading: 0.2, graze: 0.85 + Math.sin(t * 0.7) * 0.1 }) });
  }
  // A fox slipping through the undergrowth; rabbits that hop and stop; squirrels on the trunks.
  const foxPath = timedPath([
    [92, CL.x + 8, 0, S - 21],
    [95, CL.x + 1, 0, S - 20],
    [98, CL.x - 7, 0, S - 18.5],
    [101, CL.x - 15, 0, S - 17],
    [106, CL.x - 30, 0, S - 22],
  ]);
  beasts.push({ kind: "fox", color: blend("iris", "accent", 0.3), headColor: blend("iris", "accent", 0.25), tailColor: blend("iris", "accent", 0.3), legColor: col("hair"), phase: 1, cadence: 1.4, pose: (t) => {
    const p = along(foxPath, t);
    return { x: p.x, y: ground(p.x, p.z), z: p.z, heading: p.heading, gait: t > 92 && t < 106 ? 1 : 0 };
  } });
  for (let i = 0; i < 7; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = CL.r * (0.6 + rand() * 0.5);
    const x0 = CL.x + Math.cos(a) * r;
    const z0 = CL.z + Math.sin(a) * r;
    const hd = rand() * 6.28;
    const ph = rand() * 6.28;
    beasts.push({ kind: "rabbit", color: blend("iris", "moon", 0.45), phase: ph, cadence: 1.6, pose: (t) => {
      const k = (t * 0.25 + ph) % 1;
      const hops = Math.floor(t * 0.25 + ph) + smoothstep(0.75, 1, k);
      const x = x0 + Math.sin(hd + hops) * hops * 0.25;
      const z = z0 + Math.cos(hd + hops) * hops * 0.25;
      return { x, y: ground(x, z), z, heading: hd + hops, gait: k > 0.75 ? 1 : 0, graze: k < 0.75 ? 0.6 : 0 };
    } });
  }
  for (let i = 0; i < 5; i += 1) {
    const tr = broad[(i * 37) % broad.length];
    if (!tr) continue;
    const [x, y, z] = tr;
    const ph = rand() * 6.28;
    const side = rand() * 6.28;
    beasts.push({ kind: "squirrel", color: blend("iris", "accent", 0.2), phase: ph, cadence: 2, pose: (t) => {
      const climb = 1.2 + ((Math.sin(t * 0.4 + ph) + 1) / 2) * 6;
      const up = Math.cos(t * 0.4 + ph) > 0;
      return { x: x + Math.cos(side) * 0.55, y: y + climb, z: z + Math.sin(side) * 0.55, heading: side + Math.PI / 2, pitch: up ? -Math.PI / 2 : Math.PI / 2, gait: 1 };
    } });
  }
  const herdUpdate = herd(scene, beasts);
  updates.push((t) => herdUpdate(t));

  // Trout holding against the current; frogs on the stones; dragonflies and butterflies.
  const trout = fishGeometry(1, 0.22, 0.1, (x, y) => (y > 0.04 ? blend("land", "hair", 0.4) : blend("skin", "moon", 0.4)));
  const fish = [];
  for (let i = 0; i < 18; i += 1) {
    const x = CL.x - 30 + rand() * 50;
    const z = riverZ(x) + (rand() - 0.5) * streamHalf(x) * 1.2;
    const ph = rand() * 6.28;
    fish.push({ size: 0.28 + rand() * 0.12, color: new THREE.Color(1, 1, 1), pose: (t) => ({ x: x + Math.sin(t * 0.3 + ph) * 0.6, y: riverY(x) - 0.45, z: z + Math.sin(t * 0.7 + ph) * 0.25, heading: -Math.PI / 2 + Math.sin(t * 0.9 + ph) * 0.15, pitch: 0 }) });
  }
  updates.push(school(scene, trout, fish, { amp: 0.08, freq: 7 }));
  const frog = merge([xf(new THREE.SphereGeometry(1, 8, 6), [0, 0.4, 0], [0, 0, 0], [0.7, 0.45, 1]), xf(new THREE.SphereGeometry(0.25, 6, 5), [0.35, 0.75, 0.5]), xf(new THREE.SphereGeometry(0.25, 6, 5), [-0.35, 0.75, 0.5]), xf(new THREE.BoxGeometry(0.3, 0.2, 0.9), [0.7, 0.15, -0.3]), xf(new THREE.BoxGeometry(0.3, 0.2, 0.9), [-0.7, 0.15, -0.3])]);
  const frogs = [];
  for (let i = 0; i < 9; i += 1) {
    const x = CL.x - 12 + i * 3 + rand();
    const z = riverZ(x) + (i % 2 ? 1 : -1) * (streamHalf(x) + 0.3);
    const ph = rand() * 6.28;
    frogs.push({ size: 0.05, color: blend("land", "practical", 0.3), pose: (t) => {
      const k = (t * 0.15 + ph) % 1;
      const hop = k > 0.9 ? Math.sin(((k - 0.9) / 0.1) * Math.PI) : 0;
      return { x, y: Math.max(ground(x, z), riverY(x)) + hop * 0.15, z: z + (k > 0.9 ? (k - 0.9) * 2 : 0), heading: Math.PI + (i % 2 ? 0 : Math.PI), pitch: -hop * 0.4 };
    } });
  }
  updates.push(swarm(scene, frog, new THREE.MeshStandardMaterial({ roughness: 0.4 }), frogs, false));
  const dragonflies = [];
  for (let i = 0; i < 16; i += 1) {
    const x0 = CL.x - 20 + rand() * 30;
    const ph = rand() * 6.28;
    dragonflies.push({ size: 1.1, color: blend("cyan", "sclera", 0.4), phase: ph, pose: (t) => {
      // Dart, hover, dart.
      const k = Math.floor(t * 0.8 + ph);
      const f = smoothstep(0, 0.3, (t * 0.8 + ph) % 1);
      const at = (n) => [x0 + Math.sin(n * 12.9 + ph) * 3, riverZ(x0) + Math.cos(n * 7.3 + ph) * 2];
      const [ax, az] = at(k);
      const [bx, bz] = at(k + 1);
      return { x: mix(ax, bx, f), y: riverY(x0) + 0.5 + Math.sin(k * 3.1) * 0.25, z: mix(az, bz, f), heading: Math.atan2(bx - ax, bz - az) };
    } });
  }
  updates.push(insects(scene, dragonflies, { wingShape: "dragonfly" }));
  const butterflies = [];
  for (let i = 0; i < 36; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = rand() * CL.r * 0.8;
    const cx = CL.x + Math.cos(a) * r;
    const cz = CL.z + Math.sin(a) * r;
    const ph = rand() * 6.28;
    butterflies.push({ size: 1, color: [col("practical"), col("sclera"), blend("sky", "cyan", 0.4), col("iris")][i % 4], phase: ph, pose: (t) => ({ x: cx + Math.sin(t * 0.6 + ph) * 2, y: ground(cx, cz) + 0.9 + Math.sin(t * 1.7 + ph) * 0.4, z: cz + Math.cos(t * 0.5 + ph) * 2, heading: t * 0.6 + ph }) });
  }
  updates.push(insects(scene, butterflies));

  // Birds: songbirds on low branches and the ground that burst up as the camera passes; a
  // woodpecker on a trunk; the eagle over the canopy; the flock from the city coming in.
  const birds = [];
  for (let i = 0; i < 22; i += 1) {
    const x = CL.x - 30 + rand() * 40;
    const z = S - 34 + rand() * 20;
    const y = ground(x, z) + (i % 3 ? 0.05 : 1.6 + rand() * 2);
    const go = 96.6 + rand() * 1.6;
    const dir = rand() * 6.28;
    const ph = rand() * 6.28;
    birds.push({ size: 0.075, color: [blend("iris", "hair", 0.3), blend("accent", "iris", 0.4), blend("practical", "land", 0.4), blend("sky", "cyan", 0.4)][i % 4], beat: 24, phase: ph, pose: (t) => {
      if (t < go) return { x, y: y + Math.max(0, Math.sin(t * 3 + ph)) ** 8 * 0.05, z, heading: ph + Math.sin(t * 0.8 + ph), pitch: i % 3 ? -(Math.max(0, Math.sin(t * 2.2 + ph)) ** 4) * 0.6 : 0, perched: true };
      const u = t - go;
      return { x: x + Math.sin(dir) * u * 5, y: y + u * 3 + u * u * 0.6, z: z + Math.cos(dir) * u * 5, heading: dir, pitch: 0.5, flap: 1 };
    } });
  }
  {
    const tr = broad.find(([x, , z]) => Math.hypot(x - (CL.x - 25), z - (S - 30)) < 25) ?? broad[0];
    const [x, y, z, h] = tr;
    birds.push({ size: 0.1, color: col("hair"), wingColor: col("sclera"), phase: 0, pose: (t) => {
      const tap = Math.max(0, Math.sin(t * 22)) * (Math.sin(t * 0.9) > 0.2 ? 1 : 0);
      return { x: x + 0.35, y: y + h * 0.3, z, heading: -Math.PI / 2, pitch: -1.3 + tap * 0.25, perched: true };
    } });
  }
  const eagle = loopFlight(CL.x - 60, ground(CL.x, CL.z) + 72, CL.z + 30, 120, 90, 0.11, 2.4, 6);
  birds.push({ size: 0.45, color: blend("iris", "hair", 0.55), wingColor: blend("iris", "hair", 0.5), beat: 3, phase: 0, pose: (t) => ({ ...eagle(t), flap: 0.08, bank: 0.3 }) });
  // A second eagle that the camera rises beside.
  const eagle2 = timedPath([
    [101, CL.x - 30, ground(CL.x, CL.z) + 46, S - 40],
    [106, CL.x + 30, ground(CL.x, CL.z) + 58, S - 10],
    [112, CL.x + 140, ground(CL.x, CL.z) + 80, S + 60],
    [122, CL.x + 320, ground(CL.x, CL.z) + 110, S + 200],
  ]);
  birds.push({ size: 0.5, color: blend("iris", "hair", 0.5), wingColor: blend("iris", "hair", 0.45), beat: 2.5, phase: 1, pose: (t) => ({ ...along(eagle2, t), flap: 0.1, bank: Math.sin(t * 0.3) * 0.2 }) });
  // Finale: flocks crossing over the treetops at golden hour.
  for (let i = 0; i < 40; i += 1) {
    const off = [(rand() - 0.5) * 40, (rand() - 0.5) * 12, (rand() - 0.5) * 30];
    const ph = rand() * 6.28;
    birds.push({ size: 0.22, color: col("hair"), beat: 9, phase: ph, pose: (t) => {
      const u = t - 104;
      return { x: CL.x + 150 - u * 16 + off[0], y: ground(CL.x, CL.z) + 70 + u * 3 + off[1] + Math.sin(t + ph) * 1.5, z: CL.z + 160 + u * 4 + off[2], heading: Math.atan2(-16, 4), flap: 0.75 };
    } });
  }
  // The flock from the city settles into the trees round the glade.
  if (ctx.flockAt) {
    for (let i = 0; i < 20; i += 1) {
      const tr = broad[(i * 53) % broad.length];
      const off = [(rand() - 0.5) * 16, (rand() - 0.5) * 5, (rand() - 0.5) * 10];
      const ph = rand() * 6.28;
      const path = timedPath([
        [88, CL.x - 300 + off[0], ground(CL.x, CL.z) + 60 + off[1], CL.z - 40 + off[2]],
        [92, CL.x - 120 + off[0], ground(CL.x, CL.z) + 38 + off[1], CL.z - 20 + off[2]],
        [95 + rand(), tr[0], tr[1] + tr[3] * 0.85, tr[2]],
      ]);
      birds.push({ size: 0.19, color: col("sclera"), wingColor: blend("sclera", "moon", 0.4), beat: 11, phase: ph, pose: (t) => {
        if (t < 88) return null;
        const p = along(path, t);
        const landed = t > 96;
        return { ...p, pitch: landed ? 0 : p.pitch, flap: landed ? 0 : 0.85, perched: landed };
      } });
    }
  }
  updates.push(flock(scene, birds));

  return (t, cam) => {
    for (const u of updates) u(t, cam);
    for (const m of mist) {
      m.sp.position.x = m.x + Math.sin(t * 0.05 + m.ph) * 6 + t * 0.3;
      const d = m.sp.position.distanceTo(cam);
      m.sp.material.opacity = m.base * smoothstep(6, 22, d) * (1 - smoothstep(88, 120, t) * 0.5);
    }
    const sd = ctx.sunDirAt ? ctx.sunDirAt(t) : new THREE.Vector3(0, 1, 0);
    for (const s of shafts) {
      s.m.position.set(s.x + sd.x * 20, s.y, s.z + sd.z * 20);
      s.m.rotation.set(0, s.ry, 0);
      s.m.rotateZ(Math.atan2(sd.x, sd.y) * 0.8);
      const d = s.m.position.distanceTo(cam);
      s.m.material.opacity = s.base * (0.7 + 0.3 * Math.sin(t * 0.4 + s.ph)) * smoothstep(8, 25, d) * smoothstep(84, 92, t);
    }
    void clamp;
    void interior;
    void glow;
    void crowd;
  };
}
