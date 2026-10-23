/**
 * The coast: a golden beach, dunes and palms, a fishing village on the slope, boats on the sand
 * and on the water, a jetty, nets, fishermen, people walking the beach, children at the
 * waterline, crabs, tide pools with small fish, gulls, and pelicans diving for fish.
 */

import { THREE, mulberry32, fbm, smoothstep, mix, timedPath, xf, merge, crowd, flock, loopFlight, swarm, fishGeometry, school, along, outfit, polyline, pingS, drawn, css, glow } from "./lib.js";
import { coastX, FISHING, riverZ } from "./geo.js";
import { palms, tufts, rocks, bushes } from "./flora.js";

export function coast(ctx) {
  const { scene, PAINT, col, blend, ground } = ctx;
  const rand = mulberry32(101);
  const at = (d, z) => {
    const x = coastX(z) + d;
    return [x, ground(x, z), z];
  };

  /* --- dunes, palms, rocks --- */
  const palmList = [];
  for (let i = 0; i < 90; i += 1) {
    const z = -980 + rand() * 1300;
    if (z > -800 && z < -610 && rand() < 0.6) continue;
    if (Math.abs(z - riverZ(0)) < 45) continue;
    const [x, y] = at(44 + rand() * 40, z);
    palmList.push([x, y, z, 7 + rand() * 6, Math.PI + (rand() - 0.5) * 1.4]);
  }
  palms(scene, palmList, PAINT);
  const tuftList = [];
  for (let i = 0; i < 9000; i += 1) {
    const z = -1000 + rand() * 1350;
    const d = 32 + rand() * 120;
    if (fbm(d / 14, z / 14, 2) < 0.42) continue;
    const [x, y] = at(d, z);
    tuftList.push([x, y, z, 0.35 + rand() * 0.45, blend("land", "practical", 0.25 + rand() * 0.35)]);
  }
  tufts(scene, tuftList, { amp: 0.25 });
  const rockList = [];
  for (let i = 0; i < 70; i += 1) {
    const z = -665 + rand() * 30;
    const [x, y] = at(-2 + rand() * 11, z);
    rockList.push([x, y, z, 0.3 + rand() * 1.1, blend("hair", "iris", 0.3 + rand() * 0.3)]);
  }
  for (let i = 0; i < 60; i += 1) {
    const z = rand() < 0.5 ? -980 + rand() * 120 : 180 + rand() * 120;
    const [x, y] = at(-6 + rand() * 20, z);
    rockList.push([x, y, z, 0.8 + rand() * 2.5, blend("hair", "iris", 0.35 + rand() * 0.25)]);
  }
  rocks(scene, rockList);
  // Tide pools: still water in the rocks, a few small fish.
  const poolMat = new THREE.MeshStandardMaterial({ color: blend("cyan", "ocean", 0.3), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.7 });
  const pools = [];
  for (let i = 0; i < 6; i += 1) {
    const z = -662 + i * 4.5 + rand() * 2;
    const [x, y] = at(2 + rand() * 6, z);
    const r = 0.8 + rand() * 1.2;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), poolMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.06, z);
    m.scale.set(1, 0.7 + rand() * 0.4, 1);
    scene.add(m);
    pools.push([x, y, z, r]);
  }
  const tiny = fishGeometry(1, 0.3, 0.1, () => new THREE.Color(1, 1, 1));
  const poolFish = [];
  pools.forEach(([x, y, z, r], k) => {
    for (let i = 0; i < 3; i += 1) {
      const p = rand() * 6.28;
      const w = 0.4 + rand() * 0.5;
      poolFish.push({ size: 0.05, color: k % 2 ? blend("practical", "iris", 0.3) : blend("moon", "ocean", 0.4), pose: (t) => along((u) => [x + Math.sin(u * w + p) * r * 0.55, y - 0.02, z + Math.cos(u * w * 1.3 + p) * r * 0.4], t) });
    }
  });
  const updates = [school(scene, tiny, poolFish, { amp: 0.1, freq: 14 })];

  /* --- the fishing village: whitewashed houses with blue and terracotta roofs --- */
  const wallTex = drawn(256, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < 300; i += 1) g.fillRect((i * 37) % w, (i * 91) % h, 3, 2);
    g.fillStyle = css(new THREE.Color(PAINT.ocean).lerp(new THREE.Color(PAINT.hair), 0.3));
    g.fillRect(w * 0.42, h * 0.38, w * 0.16, h * 0.62);
    g.fillStyle = css(new THREE.Color(PAINT.hair), 0.85);
    g.fillRect(w * 0.12, h * 0.36, w * 0.16, h * 0.2);
    g.fillRect(w * 0.72, h * 0.36, w * 0.16, h * 0.2);
    g.fillStyle = css(new THREE.Color(PAINT.cyan));
    g.fillRect(w * 0.1, h * 0.34, w * 0.03, h * 0.24);
    g.fillRect(w * 0.27, h * 0.34, w * 0.03, h * 0.24);
    g.fillRect(w * 0.7, h * 0.34, w * 0.03, h * 0.24);
    g.fillRect(w * 0.87, h * 0.34, w * 0.03, h * 0.24);
  });
  const houseList = [];
  const roofList = [];
  for (let i = 0; i < 22; i += 1) {
    const x = FISHING.x0 + rand() * (FISHING.x1 - FISHING.x0);
    const z = FISHING.z0 + rand() * (FISHING.z1 - FISHING.z0);
    if (houseList.some(([hx, , hz]) => Math.hypot(hx - x, hz - z) < 14)) continue;
    const y = ground(x, z);
    const w = 6 + rand() * 4;
    const d = 5 + rand() * 3;
    const h = 3 + rand() * 1.5;
    const ry = Math.round(rand() * 2) * (Math.PI / 2) + (rand() - 0.5) * 0.2;
    houseList.push([x, y + h / 2 - 0.4, z, ry, w, h + 0.8, d, blend("sclera", "practical", rand() * 0.15)]);
    roofList.push([x, y + h + 0.4, z, ry, w * 0.62, 1.8, d * 1.18, rand() < 0.5 ? blend("accent", "iris", 0.45) : blend("ocean", "sky", 0.3)]);
  }
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  xf(roofGeo, [0, 0.25, 0], [Math.PI / 2, 0, Math.PI / 2], [1, 1, 0.5]);
  const mkStatic = (geo, mat, list) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    const mm = new THREE.Matrix4();
    list.forEach(([x, y, z, ry, sx, sy, sz, c], i) => {
      m.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)));
      if (c) m.setColorAt(i, c);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  mkStatic(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }), houseList);
  mkStatic(roofGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), roofList.map(([x, y, z, ry, sx, sy, sz, c]) => [x, y, z, ry, sx * 1.15, sy, sz, c]));
  bushes(
    scene,
    Array.from({ length: 60 }, () => {
      const x = FISHING.x0 - 10 + rand() * 200;
      const z = FISHING.z0 - 20 + rand() * 200;
      return [x, ground(x, z), z, 1 + rand() * 1.8, blend("land", "ink", rand() * 0.3)];
    }),
  );

  /* --- boats: on the sand, and rocking on the water --- */
  const hull = (() => {
    const g = new THREE.BoxGeometry(1.7, 0.75, 7, 4, 3, 14);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const band = blend("accent", "iris", 0.2);
    const body = col("sclera");
    const bottom = blend("ocean", "hair", 0.3);
    for (let i = 0; i < p.count; i += 1) {
      let x = p.getX(i);
      let y = p.getY(i);
      const z = p.getZ(i);
      const u = Math.abs(z) / 3.5;
      // Taper to a pointed bow and stern; a round bottom; the sheer rising at the ends.
      x *= (1 - u * u * 0.85) * (y < 0 ? 0.75 + (y + 0.375) * 0.6 : 1);
      y += u * u * 0.35 * (y > 0 ? 1 : 0.3);
      p.setXYZ(i, x, y, z);
      const k = y > 0.3 ? band : y > -0.2 ? body : bottom;
      c.set([k.r, k.g, k.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    g.computeVertexNormals();
    const mast = xf(new THREE.CylinderGeometry(0.05, 0.07, 4, 5), [0, 2.2, 1]);
    const mc = new Float32Array(mast.attributes.position.count * 3).fill(0.55);
    mast.setAttribute("color", new THREE.BufferAttribute(mc, 3));
    return merge([g, mast]);
  })();
  const boatSpecs = [];
  for (let i = 0; i < 8; i += 1) {
    const z = -770 + i * 13 + rand() * 4;
    const [x, y] = at(9 + rand() * 9, z);
    const heading = Math.PI / 2 + (rand() - 0.5) * 0.5;
    boatSpecs.push({ color: i % 2 ? col("sclera") : blend("cyan", "sclera", 0.4), pose: () => ({ x, y: y + 0.35, z, heading, roll: 0.12 }) });
  }
  for (let i = 0; i < 7; i += 1) {
    const z = i < 3 ? -60 + i * 70 : -880 + i * 55;
    const [x] = at(-50 - rand() * 160, z);
    const head = rand() * 6.28;
    const ph = rand() * 6.28;
    boatSpecs.push({ color: i % 2 ? blend("practical", "sclera", 0.5) : col("sclera"), pose: (t) => ({ x, y: 0.25 + Math.sin(t * 1.3 + ph) * 0.18, z, heading: head, roll: Math.sin(t * 1.1 + ph) * 0.07, pitch: Math.sin(t * 0.9 + ph * 2) * 0.04 }) });
  }
  // swarm poses take Euler (pitch, heading, roll).
  updates.push(swarm(scene, hull, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), boatSpecs.map((s) => ({ ...s, pose: (t) => { const p = s.pose(t); return { ...p, pitch: p.pitch ?? 0 }; } })), true));

  // The jetty: planks on posts from the beach into the water.
  const jettyZ = -718;
  const jx0 = coastX(jettyZ) + 6;
  const wood = new THREE.MeshStandardMaterial({ color: blend("iris", "hair", 0.35), roughness: 0.85 });
  const planks = [];
  for (let k = 0; k < 34; k += 1) planks.push([jx0 - k * 2, 1.4, jettyZ, 0, 1.9, 0.18, 3.2]);
  const posts = [];
  for (let k = 0; k < 34; k += 3)
    for (const s of [-1.4, 1.4]) posts.push([jx0 - k * 2, -1, jettyZ + s, 0, 0.22, 5, 0.22]);
  mkStatic(new THREE.BoxGeometry(1, 1, 1), wood, planks);
  mkStatic(new THREE.CylinderGeometry(1, 1, 1, 6), wood, posts.map(([x, y, z, r, a, b, c]) => [x, y, z, r, a, b, c]));
  // Nets drying on poles near the boats.
  const netTex = drawn(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,1)";
    g.lineWidth = 1.5;
    for (let i = 0; i <= w; i += 8) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 30, h);
      g.stroke();
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i - 30, h);
      g.stroke();
    }
  });
  for (let k = 0; k < 3; k += 1) {
    const z = -690 + k * 9;
    const [x, y] = at(26, z);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2, 6, 2), new THREE.MeshStandardMaterial({ map: netTex, color: blend("ocean", "cyan", 0.4), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    const p = net.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 1) p.setY(i, p.getY(i) - Math.cos((p.getX(i) / 6) * Math.PI) * 0.4);
    net.position.set(x, y + 1.5, z);
    net.rotation.y = Math.PI / 2;
    scene.add(net);
    mkStatic(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), wood, [
      [x, y + 1.3, z - 3, 0, 1, 2.6, 1],
      [x, y + 1.3, z + 3, 0, 1, 2.6, 1],
    ]);
  }

  /* --- people --- */
  const people = [];
  // Fishermen at the boats and the nets.
  for (let i = 0; i < 7; i += 1) {
    const z = -765 + i * 12;
    const [x, y] = at(13 + rand() * 6, z);
    const heading = Math.PI / 2 + (rand() - 0.5);
    people.push({ ...outfit(rand, PAINT, "coast"), phase: rand() * 6.28, pose: () => ({ x, y, z, heading, mode: i % 3 === 0 ? "pull" : i % 3 === 1 ? "work" : "walk", gait: 0 }) });
  }
  // Beach walkers, both ways; a couple sitting on the sand; children running at the waterline.
  for (let i = 0; i < 14; i += 1) {
    const d = 9 + rand() * 18;
    const pts = [];
    for (let z = -560; z >= -880; z -= 20) pts.push([coastX(z) + d + Math.sin(z / 30) * 1.5, z]);
    const route = polyline(i % 2 ? pts : pts.slice().reverse());
    const s0 = rand() * route.length;
    const v = 1.0 + rand() * 0.4;
    people.push({ ...outfit(rand, PAINT, "coast"), phase: rand() * 6.28, pose: (t) => {
      const [s] = pingS(t, v, s0, route.length);
      const [x, z, hd] = route.at(s);
      const [, dir] = pingS(t, v, s0, route.length);
      return { x, y: ground(x, z), z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } });
  }
  // Walkers coming up the beach toward the tracking camera.
  for (let i = 0; i < 5; i += 1) {
    const d0 = 16 + i * 3.2;
    const zStart = -738 - i * 6;
    const v = 1.05 + i * 0.08;
    people.push({ ...outfit(rand, PAINT, "coast"), phase: i * 1.3, pose: (t) => {
      const z = zStart + v * Math.max(0, t - 26);
      const x = coastX(z) + d0;
      return { x, y: ground(x, z), z, heading: 0, gait: 1 };
    } });
  }
  for (let i = 0; i < 2; i += 1) {
    const z = -650 - i * 1.1;
    const [x, y] = at(30, z);
    people.push({ ...outfit(rand, PAINT, "coast"), pose: () => ({ x, y: y - 0.32, z, heading: -Math.PI / 2, mode: "sit" }) });
  }
  for (let i = 0; i < 4; i += 1) {
    const zc = -700 - i * 6;
    const ph = rand() * 6.28;
    people.push({ ...outfit(rand, PAINT, "coast"), scale: 0.62, phase: ph, pose: (t) => {
      const a = t * 0.9 + ph;
      const z = zc + Math.sin(a) * 6;
      const [x, y] = at(4 + Math.cos(a * 2) * 2.5, z);
      return { x, y, z, heading: Math.cos(a) > 0 ? 0 : Math.PI, gait: 2 };
    } });
  }
  // Villagers on the lanes of the fishing village.
  for (let i = 0; i < 8; i += 1) {
    const pts = [
      [FISHING.x0 + rand() * 60, FISHING.z0 + rand() * 160],
      [FISHING.x0 + 60 + rand() * 100, FISHING.z0 + rand() * 160],
    ];
    const route = polyline(pts);
    const s0 = rand() * route.length;
    people.push({ ...outfit(rand, PAINT, "coast"), phase: rand() * 6.28, pose: (t) => {
      const [s, dir] = pingS(t, 1.1, s0, route.length);
      const [x, z, hd] = route.at(s);
      return { x, y: ground(x, z), z, heading: dir > 0 ? hd : hd + Math.PI, gait: 1 };
    } });
  }
  updates.push(crowd(scene, people, { metal: blend("moon", "hair", 0.4), tyre: col("hair") }));

  /* --- crabs scuttling sideways on the wet sand --- */
  const crabGeo = merge([
    xf(new THREE.SphereGeometry(1, 10, 6), [0, 0.35, 0], [0, 0, 0], [1, 0.45, 0.75]),
    xf(new THREE.SphereGeometry(0.32, 6, 5), [0.75, 0.45, 0.65], [0, 0, 0], [1, 0.7, 1.3]),
    xf(new THREE.SphereGeometry(0.32, 6, 5), [-0.75, 0.45, 0.65], [0, 0, 0], [1, 0.7, 1.3]),
    ...[-1, 1].flatMap((s) => [0, 1, 2].map((k) => xf(new THREE.CylinderGeometry(0.05, 0.05, 1, 4), [s * 1.1, 0.2, -0.3 + k * 0.3], [0, 0, s * 1.0])))
  ]);
  const crabs = [];
  for (let i = 0; i < 46; i += 1) {
    const z0 = -600 - rand() * 110;
    const d0 = 1.5 + rand() * 9;
    const ph = rand() * 6.28;
    const heading = rand() * 6.28;
    crabs.push({ size: 0.06 + rand() * 0.03, color: rand() < 0.5 ? blend("accent", "iris", 0.4) : blend("practical", "iris", 0.5), pose: (t) => {
      // Dash, stop, dash: sideways along the heading's right.
      const dash = Math.floor(t * 0.5 + ph);
      const f = (t * 0.5 + ph) % 1;
      const step = (dash + smoothstep(0, 0.35, f)) * 0.9 * (Math.sin(dash * 12.9 + ph) > 0 ? 1 : -1);
      const z = z0 + Math.cos(heading) * step * 0.6;
      const x = coastX(z) + d0 + Math.sin(heading) * step * 0.6;
      return { x, y: ground(x, z) + 0.01, z, heading: heading + Math.PI / 2 };
    } });
  }
  updates.push(swarm(scene, crabGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), crabs, false));

  /* --- gulls over the beach; pelicans diving for fish --- */
  const birds = [];
  for (let i = 0; i < 36; i += 1) {
    const cx = -80 + rand() * 120;
    const cz = -650 + rand() * 500;
    const f = loopFlight(cx, 18 + rand() * 30, cz, 60 + rand() * 90, 40 + rand() * 80, (0.18 + rand() * 0.12) * (rand() < 0.5 ? 1 : -1), rand() * 6.28, 5);
    birds.push({ size: 0.33, color: col("sclera"), wingColor: blend("moon", "hair", 0.35), beat: 7, phase: rand() * 6.28, pose: (t) => ({ ...f(t), flap: 0.35 + 0.35 * Math.max(0, Math.sin(t * 0.6 + i)) }) });
  }
  const splashes = [];
  [21.4, 22.6, 23.8, 25.1, 26.3].forEach((tDive, i) => {
    const sx = -125 + i * 14;
    const sz = 18 - i * 9;
    const path = timedPath([
      [tDive - 6, sx - 70, 22, sz + 40],
      [tDive - 2.2, sx - 22, 19, sz + 10],
      [tDive - 0.9, sx - 6, 14, sz + 2],
      [tDive, sx, 0.2, sz],
      [tDive + 30, sx + 18, 0.2, sz - 6],
    ]);
    birds.push({ size: 0.75, color: blend("sclera", "moon", 0.3), wingColor: blend("moon", "hair", 0.5), beat: 4, phase: i, pose: (t) => {
      const p = along(path, t);
      const diving = t > tDive - 0.9 && t < tDive;
      const floating = t >= tDive;
      return { ...p, y: floating ? 0.25 + Math.sin(t * 1.3 + i) * 0.15 : p.y, pitch: floating ? 0 : diving ? -1.2 : p.pitch, flap: diving || floating ? 0 : 0.55, perched: floating };
    } });
    splashes.push({ t: tDive, x: sx, z: sz });
  });
  updates.push(flock(scene, birds));
  const splashTex = glow(col("sclera"), 1.6);
  const splashSprites = splashes.map((s) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: splashTex, transparent: true, depthWrite: false }));
    sp.position.set(s.x, 0.8, s.z);
    scene.add(sp);
    return { sp, ...s };
  });

  return (t) => {
    for (const u of updates) u(t);
    for (const s of splashSprites) {
      const k = t - s.t;
      const on = k > 0 && k < 1.4;
      s.sp.visible = on;
      if (on) {
        const sz = 1 + k * 3.5;
        s.sp.scale.set(sz, sz * 1.4 * (1 - k / 1.6), 1);
        s.sp.position.y = 0.6 + sz * 0.4;
        s.sp.material.opacity = 0.85 * (1 - k / 1.4);
      }
    }
    void mix;
  };
}
