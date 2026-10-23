/**
 * Stage 1 — the reef. Turquoise water, light rays and caustics, coral, sea grass, a rock arch,
 * reef fish, a silver school milling in a ball, clownfish in anemones, eagle rays, a sea
 * turtle, a whale in the blue, and a column of bubbles the camera follows to the surface.
 */

import {
  THREE,
  W,
  H,
  mulberry32,
  fbm,
  vnoise,
  smoothstep,
  mix,
  timedPath,
  drawn,
  css,
  causticTexture,
  rippleNormal,
  xf,
  merge,
  paint,
  instances,
  sway,
  flapWings,
  U,
  fishGeometry,
  school,
  along,
  swarm,
  torusNoise,
} from "./lib.js";

export function sea(PAINT) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const rand = mulberry32(9);
  const scene = new THREE.Scene();
  const water = blend("cyan", "ocean", 0.62);
  scene.fog = new THREE.FogExp2(water, 0.03);
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 900);

  // The blue: bright overhead, deep below.
  const domeGeo = new THREE.SphereGeometry(600, 32, 16);
  const dc = [];
  const dp = domeGeo.attributes.position;
  const up = blend("cyan", "sclera", 0.28);
  const deep = blend("ocean", "ink", 0.55);
  for (let i = 0; i < dp.count; i += 1) {
    const y = dp.getY(i) / 600;
    const c = y > 0 ? new THREE.Color().lerpColors(water, up, smoothstep(0, 0.9, y)) : new THREE.Color().lerpColors(water, deep, smoothstep(0, 0.6, -y));
    dc.push(c.r, c.g, c.b);
  }
  domeGeo.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(dome);

  const sunDir = new THREE.Vector3(0.35, 1, 0.25).normalize();
  const key = new THREE.DirectionalLight(blend("cyan", "sclera", 0.65), 2.6);
  key.position.copy(sunDir).multiplyScalar(100);
  scene.add(key, new THREE.HemisphereLight(blend("cyan", "sclera", 0.4), blend("ocean", "ink", 0.3), 1.25));

  /* --- the seabed: sand, mounds of reef on both sides of a channel --- */
  const mound = (x, z) => {
    const side = smoothstep(4, 14, Math.abs(x)) * (1 - smoothstep(40, 70, Math.abs(x)));
    return side * (5 + 4 * fbm(x / 14, z / 14, 3)) + 2.5 * smoothstep(0.55, 0.8, fbm(x / 9 + 5, z / 9, 2));
  };
  const bed = (x, z) => -30 + mound(x, z) + (fbm(x / 6, z / 6, 3) - 0.5) * 0.8 + (vnoise(x / 2.2, z / 2.2) - 0.5) * 0.25;
  const bedGeo = new THREE.PlaneGeometry(420, 420, 260, 260);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position;
  const sand = blend("practical", "sclera", 0.45).lerp(col("iris"), 0.2).multiplyScalar(0.82);
  const sandDark = blend("iris", "ocean", 0.5);
  const rubble = blend("skin", "iris", 0.4);
  const bc = [];
  for (let i = 0; i < bp.count; i += 1) {
    const x = bp.getX(i);
    const z = bp.getZ(i) - 60;
    bp.setZ(i, z);
    const y = bed(x, z);
    bp.setY(i, y);
    const n = fbm(x / 5, z / 5, 3);
    const c = new THREE.Color().lerpColors(sand, sandDark, smoothstep(0.35, 0.7, n) * 0.6);
    c.lerp(rubble, smoothstep(-27.5, -24, y) * 0.5);
    // Sand ripples: fine bands across the channel.
    c.multiplyScalar(0.93 + 0.07 * Math.sin(z * 2.1 + Math.sin(x * 0.4) * 2));
    bc.push(c.r, c.g, c.b);
  }
  bedGeo.setAttribute("color", new THREE.Float32BufferAttribute(bc, 3));
  bedGeo.computeVertexNormals();
  const caustic = causticTexture(blend("cyan", "sclera", 0.7), 70, 2.4, 14);
  caustic.repeat.set(150, 150);
  const caustic2 = caustic.clone();
  caustic2.needsUpdate = true;
  caustic2.repeat.set(37, 37);
  const bedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: new THREE.Color(1, 1, 1), emissiveMap: caustic, emissiveIntensity: 0.32 });
  scene.add(new THREE.Mesh(bedGeo, bedMat));

  /* --- the rock arch over the channel --- */
  const rockMat = new THREE.MeshStandardMaterial({ color: blend("iris", "land", 0.4).lerp(col("moon"), 0.25), roughness: 0.95, flatShading: true });
  const archGeo = new THREE.TorusGeometry(11.5, 2.6, 10, 30, Math.PI);
  const ap = archGeo.attributes.position;
  for (let i = 0; i < ap.count; i += 1) {
    const k = 1 + (fbm(ap.getX(i) / 2 + 3, ap.getY(i) / 2 + ap.getZ(i) / 2, 3) - 0.5) * 0.35;
    ap.setXYZ(i, ap.getX(i) * mix(1, k, 0.4), ap.getY(i) * mix(1, k, 0.4), ap.getZ(i) * k);
  }
  archGeo.computeVertexNormals();
  const arch = new THREE.Mesh(archGeo, rockMat);
  arch.position.set(0, -31.5, -60);
  scene.add(arch);

  /* --- coral: branching, brain, table, fans, tubes, whips; sea grass; rocks; starfish --- */
  const coralColors = [col("accent"), blend("accent", "skin", 0.5), col("iris"), blend("practical", "iris", 0.4), blend("sky", "accent", 0.45), blend("cyan", "land", 0.5), blend("skin", "sclera", 0.3), blend("sky", "skin", 0.5), blend("land", "practical", 0.5)];
  const pick = () => coralColors[Math.floor(rand() * coralColors.length)].clone().multiplyScalar(0.85 + rand() * 0.3);
  // Coral grows in heads (bommies) along both sides of the channel, densest near the camera.
  const heads = [];
  for (let i = 0; i < 90; i += 1) {
    const side = i % 2 ? 1 : -1;
    const x = side * (6 + Math.pow(rand(), 1.6) * 40);
    const z = 45 - rand() * 250;
    heads.push([x, z, 2.5 + rand() * 4.5]);
  }
  const reefSpot = (minX = 5.5) => {
    for (let k = 0; k < 40; k += 1) {
      const [hx, hz, hr] = heads[Math.floor(rand() * heads.length)];
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * hr;
      const x = hx + Math.cos(a) * r;
      const z = hz + Math.sin(a) * r;
      if (Math.abs(x) < minX) continue;
      return [x, bed(x, z), z];
    }
    return [10, bed(10, -50), -50];
  };
  const branch = (() => {
    const parts = [];
    const r = mulberry32(5);
    const grow = (x, y, z, ax, az, len, rad, depth) => {
      const dir = new THREE.Vector3(Math.sin(ax) * Math.cos(az), Math.cos(ax), Math.sin(ax) * Math.sin(az));
      const c = new THREE.CylinderGeometry(rad * 0.7, rad, len, 5);
      c.translate(0, len / 2, 0);
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      c.translate(x, y, z);
      parts.push(c);
      if (depth === 0) return;
      const e = [x + dir.x * len, y + dir.y * len, z + dir.z * len];
      for (let i = 0; i < 3; i += 1) grow(...e, ax * 0.6 + 0.35 + r() * 0.5, az + (i - 1) * 2.1 + r(), len * 0.72, rad * 0.7, depth - 1);
    };
    grow(0, 0, 0, 0, 0, 0.35, 0.09, 3);
    return merge(parts);
  })();
  const brain = (() => {
    const g = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const k = 1 + 0.05 * Math.sin(v.x * 18 + Math.sin(v.z * 9) * 2.5);
      p.setXYZ(i, v.x * k, v.y * k * 0.75, v.z * k);
    }
    g.computeVertexNormals();
    return g;
  })();
  const table = merge([xf(new THREE.CylinderGeometry(0.1, 0.16, 0.6, 6), [0, 0.3, 0]), xf(new THREE.CylinderGeometry(1, 0.85, 0.12, 16), [0, 0.65, 0])]);
  const tubes = merge(
    [0, 1, 2, 3, 4].map((i) => {
      const a = i * 1.3;
      const h = 0.5 + (i % 3) * 0.3;
      return xf(new THREE.CylinderGeometry(0.1, 0.08, h, 8, 1, true), [Math.cos(a) * 0.16, h / 2, Math.sin(a) * 0.16], [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15]);
    }),
  );
  const whip = merge(
    [0, 1, 2, 3, 4, 5].map((i) => {
      const a = i * 1.05;
      return xf(new THREE.CylinderGeometry(0.012, 0.025, 1.4, 4, 4), [Math.cos(a) * 0.08, 0.7, Math.sin(a) * 0.08], [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12]);
    }),
  );
  const fanTex = drawn(256, 256, (g, w, h) => {
    const r = mulberry32(3);
    g.strokeStyle = "rgba(255,255,255,1)";
    g.lineCap = "round";
    const twig = (x, y, a, len, wid, d) => {
      const x2 = x + Math.sin(a) * len;
      const y2 = y - Math.cos(a) * len;
      g.lineWidth = wid;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      if (d > 0) {
        twig(x2, y2, a - 0.25 - r() * 0.2, len * 0.78, wid * 0.72, d - 1);
        twig(x2, y2, a + 0.25 + r() * 0.2, len * 0.78, wid * 0.72, d - 1);
      }
    };
    twig(w / 2, h, 0, 60, 7, 7);
    // A fine mesh between the twigs.
    g.globalAlpha = 0.35;
    for (let i = 0; i < 400; i += 1) {
      const a = (r() - 0.5) * 2.2;
      const d = 40 + r() * 170;
      g.fillRect(w / 2 + Math.sin(a) * d, h - Math.cos(a) * d, 2, 2);
    }
  });
  const fan = new THREE.PlaneGeometry(1.6, 1.6, 3, 3);
  fan.translate(0, 0.8, 0);
  const anemone = merge(
    Array.from({ length: 46 }, (_, i) => {
      const a = i * 2.4;
      const r = 0.05 + (i % 7) * 0.025;
      return xf(new THREE.CylinderGeometry(0.008, 0.02, 0.32, 4, 3), [Math.cos(a) * r, 0.16, Math.sin(a) * r], [Math.cos(a) * r * 3, 0, Math.sin(a) * r * 3]);
    }).concat([xf(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 12), [0, 0.03, 0])]),
  );
  const blade = new THREE.PlaneGeometry(0.035, 0.9, 1, 4);
  blade.translate(0, 0.45, 0);
  const coralMat = (extra = {}) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...extra });
  const branchList = [];
  for (let i = 0; i < 1500; i += 1) {
    const [x, y, z] = reefSpot();
    const s = 0.7 + rand() * 1.4;
    branchList.push([x, y - 0.1, z, rand() * 6.28, s, s * (0.8 + rand() * 0.5), s, pick()]);
  }
  scene.add(instances(branch, coralMat(), branchList, { shadow: false }));
  const brainList = [];
  for (let i = 0; i < 520; i += 1) {
    const [x, y, z] = reefSpot();
    const s = 0.4 + rand() * 1.3;
    brainList.push([x, y - 0.15, z, rand() * 6.28, s * (1 + rand() * 0.4), s, s, pick()]);
  }
  scene.add(instances(brain, coralMat({ roughness: 0.9 }), brainList, { shadow: false }));
  const tableList = [];
  for (let i = 0; i < 110; i += 1) {
    const [x, y, z] = reefSpot(9);
    const s = 0.8 + rand() * 1.5;
    tableList.push([x, y - 0.1, z, rand() * 6.28, s, s * 0.8, s, pick()]);
  }
  scene.add(instances(table, coralMat(), tableList, { shadow: false }));
  const tubeList = [];
  for (let i = 0; i < 320; i += 1) {
    const [x, y, z] = reefSpot();
    const s = 0.7 + rand() * 1.2;
    tubeList.push([x, y - 0.1, z, rand() * 6.28, s, s, s, rand() < 0.5 ? blend("sky", "accent", 0.5) : blend("practical", "iris", 0.3)]);
  }
  scene.add(instances(tubes, coralMat({ side: THREE.DoubleSide }), tubeList, { shadow: false }));
  const whipList = [];
  for (let i = 0; i < 380; i += 1) {
    const [x, y, z] = reefSpot();
    const s = 0.8 + rand() * 1.3;
    whipList.push([x, y - 0.1, z, rand() * 6.28, s, s, s, rand() < 0.5 ? col("accent") : blend("practical", "skin", 0.4)]);
  }
  scene.add(instances(whip, sway(coralMat(), 0.08, 1.3, "whip"), whipList, { shadow: false }));
  const fanList = [];
  for (let i = 0; i < 240; i += 1) {
    const [x, y, z] = reefSpot(7);
    const s = 0.7 + rand() * 1.5;
    fanList.push([x, y - 0.1, z, rand() * 6.28, s, s, s, rand() < 0.6 ? blend("sky", "accent", 0.55) : blend("accent", "iris", 0.4)]);
  }
  scene.add(instances(fan, sway(coralMat({ map: fanTex, alphaTest: 0.4, side: THREE.DoubleSide }), 0.03, 1.1, "fan"), fanList, { shadow: false }));
  // Sea grass meadows on the sand, swaying in the swell.
  const grassList = [];
  for (let i = 0; i < 7000; i += 1) {
    const cx = (rand() - 0.5) * 140;
    const cz = 60 - rand() * 280;
    if (Math.abs(cx) < 3 || fbm(cx / 18, cz / 18, 2) < 0.48) continue;
    const y = bed(cx, cz);
    if (y > -27.5) continue;
    const s = 0.6 + rand() * 0.9;
    grassList.push([cx, y - 0.05, cz, rand() * 6.28, 1, s, 1, blend("land", "cyan", 0.2 + rand() * 0.3)]);
  }
  scene.add(instances(blade, sway(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), 0.22, 1.4, "grass"), grassList, { shadow: false }));
  // Rocks, half buried.
  const rocks = [];
  for (let i = 0; i < 140; i += 1) {
    const [x, y, z] = reefSpot(5);
    const s = 0.4 + rand() * 1.6;
    rocks.push([x, y - s * 0.25, z, rand() * 6.28, s * 1.3, s * 0.7, s, blend("land", "ocean", 0.45 + rand() * 0.2).lerp(col("iris"), 0.2)]);
  }
  scene.add(instances(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, { shadow: false }));
  // Starfish on the sand.
  const star = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 ? 0.05 : 0.14;
      s[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  const stars = [];
  for (let i = 0; i < 70; i += 1) {
    const x = (rand() < 0.5 ? -1 : 1) * (2 + rand() * 12);
    const z = 30 - rand() * 200;
    stars.push([x, bed(x, z) + 0.02, z, rand() * 6.28, 1.2, 1, 1.2, rand() < 0.5 ? col("accent") : col("iris")]);
  }
  scene.add(instances(star, new THREE.MeshStandardMaterial({ roughness: 0.7 }), stars, { shadow: false }));

  /* --- anemones with clownfish --- */
  const anemones = [
    [-4.2, -118],
    [5.5, -109],
    [-7.5, -101],
    [3.8, -127],
    [-9, -86],
  ].map(([x, z]) => [x, bed(x, z), z]);
  scene.add(
    instances(
      anemone,
      sway(new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: blend("skin", "sclera", 0.4), emissiveIntensity: 0.15 }), 1.6, 2.1, "anemone"),
      anemones.map(([x, y, z], i) => [x, y - 0.03, z, i, 3.2, 3.2, 3.2, i % 2 ? blend("skin", "sclera", 0.35) : blend("practical", "cyan", 0.3)]),
      { shadow: false },
    ),
  );

  /* --- surface, light rays, drifting particles --- */
  // The underside of the waves: soft bright ripples, not a hard net.
  const surfTex = drawn(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const n = torusNoise(x / w, y / h, 3, 4);
        const k = 0.72 + 0.28 * Math.pow(Math.abs(Math.sin(n * 9)), 0.6);
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 * k;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
  surfTex.repeat.set(70, 70);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: blend("cyan", "sclera", 0.5), map: surfTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  surface.rotation.x = Math.PI / 2;
  surface.position.y = 0;
  scene.add(surface);
  const rayTex = drawn(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in";
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(0,0,0,0)");
    side.addColorStop(0.5, "rgba(0,0,0,1)");
    side.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = side;
    g.fillRect(0, 0, w, h);
  });
  const rays = [];
  for (let i = 0; i < 46; i += 1) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2 + rand() * 5, 46),
      new THREE.MeshBasicMaterial({ map: rayTex, color: blend("cyan", "sclera", 0.6), transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
    );
    m.geometry.translate(0, -23, 0);
    const x = (rand() - 0.5) * 70;
    const z = 50 - rand() * 230;
    m.position.set(x, 0, z);
    m.rotation.set(-sunDir.z * 0.4, rand() * Math.PI, sunDir.x * 0.4);
    scene.add(m);
    rays.push({ m, phase: rand() * 6.28, base: 0.05 + rand() * 0.08 });
  }
  const snowN = 2500;
  const snowPos = new Float32Array(snowN * 3);
  const snowBase = Array.from({ length: snowN }, () => [rand() * 40 - 20, rand() * 24 - 12, rand() * 40 - 20]);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  scene.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: blend("sclera", "cyan", 0.3), size: 0.045, transparent: true, opacity: 0.55, depthWrite: false })));

  /* --- fish --- */
  const silver = fishGeometry(1, 0.2, 0.07, (x, y) => (y > 0.05 ? blend("ocean", "moon", 0.5) : y < -0.05 ? col("sclera") : blend("moon", "sclera", 0.5)));
  // The bait ball: a school milling in a slow torus, seen best from above.
  const ballC = (t) => [6 + Math.sin(t * 0.12) * 4, -19 + Math.sin(t * 0.2) * 0.8, -104 + Math.cos(t * 0.1) * 3];
  const ballSpecs = [];
  for (let i = 0; i < 1500; i += 1) {
    const r = 2.5 + Math.sqrt(rand()) * 7;
    const y = (rand() - 0.5) * 3.2 * (1 - (r - 2.5) / 12);
    const a0 = rand() * Math.PI * 2;
    const w = (1.5 / r) * (0.92 + rand() * 0.16);
    const wob = rand() * 6.28;
    ballSpecs.push({
      size: 0.2 + rand() * 0.06,
      color: new THREE.Color(1, 1, 1),
      pose: (t) => {
        const [cx, cy, cz] = ballC(t);
        const a = a0 + w * t;
        const rr = r + Math.sin(t * 0.6 + wob) * 0.4;
        const x = cx + Math.cos(a) * rr;
        const z = cz + Math.sin(a) * rr;
        return { x, y: cy + y + Math.sin(a * 2 + wob) * 0.35, z, heading: Math.atan2(-Math.sin(a), Math.cos(a)), pitch: Math.cos(a * 2 + wob) * 0.12 };
      },
    });
  }
  // A travelling school: a river of fish crossing the reef.
  const streamPath = (t) => [-40 + t * 3.2, -16 + Math.sin(t * 0.4) * 2, -30 - t * 1.4 + Math.sin(t * 0.3) * 8];
  for (let i = 0; i < 700; i += 1) {
    const lag = rand() * 7;
    const off = [(rand() - 0.5) * 4, (rand() - 0.5) * 2.2, (rand() - 0.5) * 4];
    ballSpecs.push({
      size: 0.17 + rand() * 0.05,
      color: new THREE.Color(1, 1, 1),
      pose: (t) => {
        const f = (u) => {
          const [x, y, z] = streamPath(u - lag);
          return [x + off[0] + Math.sin(u * 1.3 + lag) * 0.3, y + off[1], z + off[2]];
        };
        return along(f, t);
      },
    });
  }
  const updates = [school(scene, silver, ballSpecs, { amp: 0.08, freq: 14, length: 1, metal: 0.65, rough: 0.3 })];

  // Reef fish: small and bright, each wandering around its own coral head.
  const reefGeo = fishGeometry(1, 0.42, 0.12, (x, y, z) => (z < -0.55 ? blend("sclera", "practical", 0.3) : new THREE.Color(1, 1, 1)));
  const reefColors = [col("practical"), blend("practical", "cyan", 0.4), col("cyan"), blend("sky", "cyan", 0.4), col("accent"), blend("sky", "accent", 0.4), blend("iris", "practical", 0.3), blend("land", "practical", 0.5)];
  const reefSpecs = [];
  for (let i = 0; i < 520; i += 1) {
    const [hx, hy, hz] = reefSpot(6);
    const A = 0.8 + rand() * 2.2;
    const w1 = 0.25 + rand() * 0.35;
    const p1 = rand() * 6.28;
    const p2 = rand() * 6.28;
    const lift = 0.6 + rand() * 2.2;
    reefSpecs.push({
      size: 0.12 + rand() * 0.18,
      color: reefColors[i % reefColors.length],
      pose: (t) => along((u) => [hx + Math.sin(u * w1 + p1) * A, hy + lift + Math.sin(u * w1 * 1.7 + p2) * 0.3, hz + Math.sin(u * w1 * 0.8 + p2) * A * 0.7], t),
    });
  }
  updates.push(school(scene, reefGeo, reefSpecs, { amp: 0.1, freq: 11, length: 1 }));

  // Clownfish: orange with white bands edged in black, darting around their anemone.
  const orange = blend("iris", "accent", 0.35);
  const clownGeo = fishGeometry(1, 0.45, 0.16, (x, y, z) => {
    const bands = [0.55, 0.0, -0.6];
    for (const b of bands) {
      const d = Math.abs(z - b);
      if (d < 0.09) return col("sclera");
      if (d < 0.13) return col("hair");
    }
    return z < -0.85 ? col("hair") : orange;
  });
  const clownSpecs = [];
  anemones.forEach(([ax, ay, az], k) => {
    for (let i = 0; i < 4; i += 1) {
      const p = rand() * 6.28;
      const w = 0.6 + rand() * 0.6;
      clownSpecs.push({
        size: 0.1 + rand() * 0.03,
        color: new THREE.Color(1, 1, 1),
        pose: (t) => along((u) => [ax + Math.sin(u * w + p) * 0.45, ay + 0.55 + Math.sin(u * w * 2.1 + p + k) * 0.18, az + Math.cos(u * w * 1.3 + p) * 0.4], t),
      });
    }
  });
  updates.push(school(scene, clownGeo, clownSpecs, { amp: 0.14, freq: 16, length: 1 }));

  /* --- eagle rays --- */
  const rayGeo = (() => {
    const g = new THREE.BufferGeometry();
    const v = [];
    const tri = (...p) => v.push(...p);
    // A diamond body with broad wings (x), nose at +z.
    const pts = [
      [0, 0.06, 0.55],
      [1.2, 0, -0.1],
      [0, 0.04, -0.45],
      [-1.2, 0, -0.1],
    ];
    const c = [0, 0.1, 0.05];
    for (let i = 0; i < 4; i += 1) tri(...c, ...pts[i], ...pts[(i + 1) % 4]);
    const under = [0, -0.06, 0.05];
    for (let i = 0; i < 4; i += 1) tri(...under, ...pts[(i + 1) % 4], ...pts[i]);
    tri(0.02, 0, -0.4, -0.02, 0, -0.4, 0, 0, -2.2);
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    // Subdivide wing triangles enough for the flap to bend them.
    g.computeVertexNormals();
    return g;
  })();
  const rayMat = flapWings(new THREE.MeshStandardMaterial({ color: blend("hair", "ocean", 0.5), roughness: 0.6, side: THREE.DoubleSide }), 0.28, 2.4);
  const raySpecs = [0, 1, 2].map((i) => {
    const path = timedPath([
      [0, -36 + i * 3, -17 - i * 0.8, -40 - i * 4],
      [6, -10 + i * 3, -19 - i * 0.6, -55 - i * 4],
      [12, 18 + i * 3, -18 - i * 0.8, -70 - i * 4],
      [20, 52 + i * 3, -16, -85 - i * 4],
    ]);
    return { size: 1.3 - i * 0.15, pose: (t) => ({ ...along(path, t), roll: Math.sin(t * 0.5 + i) * 0.08 }) };
  });
  updates.push(swarm(scene, rayGeo, rayMat, raySpecs));

  /* --- the sea turtle --- */
  const turtle = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ roughness: 0.6, map: drawn(256, 256, (g, w, h) => {
    g.fillStyle = css(blend("iris", "land", 0.45));
    g.fillRect(0, 0, w, h);
    // Scutes: plates with pale seams.
    g.strokeStyle = css(blend("practical", "sclera", 0.4), 0.8);
    g.lineWidth = 5;
    for (let y = 0; y < 4; y += 1)
      for (let x = 0; x < 5; x += 1) {
        const cx = (x + (y % 2) * 0.5) * (w / 4.5);
        const cy = (y + 0.5) * (h / 4);
        g.beginPath();
        for (let k = 0; k <= 6; k += 1) {
          const a = (k / 6) * Math.PI * 2;
          g[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * 30, cy + Math.sin(a) * 26);
        }
        g.stroke();
        const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 28);
        grad.addColorStop(0, css(blend("practical", "iris", 0.5), 0.7));
        grad.addColorStop(1, css(blend("practical", "iris", 0.5), 0));
        g.fillStyle = grad;
        g.fillRect(cx - 30, cy - 30, 60, 60);
      }
  }) });
  const skinT = new THREE.MeshStandardMaterial({ color: blend("land", "sclera", 0.35), roughness: 0.8 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), shellMat);
  shell.scale.set(0.42, 0.16, 0.55);
  turtle.add(shell);
  const plastron = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), skinT);
  plastron.scale.set(0.38, 0.08, 0.5);
  plastron.position.y = -0.04;
  turtle.add(plastron);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), skinT);
  head.scale.set(1, 0.85, 1.4);
  head.position.set(0, 0.02, 0.62);
  turtle.add(head);
  const flippers = [];
  for (const [sx, sz, len] of [
    [1, 0.25, 0.55],
    [-1, 0.25, 0.55],
    [1, -0.4, 0.22],
    [-1, -0.4, 0.22],
  ]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.33, -0.02, sz);
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), skinT);
    f.scale.set(len * 0.5, 0.025, len * 0.18);
    f.position.x = sx * len * 0.45;
    f.rotation.y = sx * -0.5;
    pivot.add(f);
    turtle.add(pivot);
    flippers.push({ pivot, sx, front: sz > 0 });
  }
  turtle.scale.setScalar(1.6);
  scene.add(turtle);
  const turtlePath = timedPath([
    [9, 16, -20.5, -116],
    [13, 7, -19.5, -121],
    [16, -1, -19.2, -124.5],
    [19, -8, -18, -128],
    [22, -14, -17, -132],
  ]);

  /* --- the whale, far off in the blue --- */
  const whale = new THREE.Group();
  const whaleMat = new THREE.MeshStandardMaterial({ color: blend("hair", "ocean", 0.55), roughness: 0.55 });
  const whaleBelly = new THREE.MeshStandardMaterial({ color: blend("moon", "ocean", 0.4), roughness: 0.6 });
  const profile = [
    [0, -7.5],
    [0.5, -7],
    [1.4, -5],
    [2.0, -2],
    [2.2, 0.5],
    [2.0, 3],
    [1.6, 5],
    [0.9, 6.6],
    [0, 7.2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bodyGeo = new THREE.LatheGeometry(profile, 20);
  bodyGeo.rotateX(Math.PI / 2);
  const front = new THREE.Mesh(bodyGeo, whaleMat);
  front.scale.set(1, 0.85, 1);
  whale.add(front);
  const belly = new THREE.Mesh(bodyGeo, whaleBelly);
  belly.scale.set(0.92, 0.7, 0.96);
  belly.position.y = -0.35;
  whale.add(belly);
  const tailPivot = new THREE.Group();
  tailPivot.position.z = -6.8;
  const fluke = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 6), whaleMat);
  fluke.scale.set(3.2, 0.15, 0.9);
  fluke.position.z = -0.9;
  const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 1.6, 10), whaleMat);
  stock.rotation.x = Math.PI / 2;
  stock.position.z = -0.4;
  tailPivot.add(stock, fluke);
  whale.add(tailPivot);
  const fins = [];
  for (const sx of [1, -1]) {
    const fin = new THREE.Group();
    fin.position.set(sx * 1.6, -0.6, 3.2);
    const fm = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), whaleMat);
    fm.scale.set(2.4, 0.12, 0.45);
    fm.position.x = sx * 2.2;
    fm.rotation.y = sx * 0.5;
    fin.add(fm);
    whale.add(fin);
    fins.push({ fin, sx });
  }
  scene.add(whale);
  const whalePath = timedPath([
    [8, -95, -15, -155],
    [14, -55, -13, -172],
    [20, -10, -11, -192],
    [26, 30, -9, -210],
  ]);

  /* --- bubbles: a column rising from a vent in the rocks --- */
  const bubbleTex = drawn(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.48);
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(0.8, "rgba(255,255,255,0.75)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.arc(w * 0.38, h * 0.36, w * 0.08, 0, Math.PI * 2);
    g.fill();
  });
  const vent = [2.2, bed(2.2, -133), -133];
  const bubbles = [];
  const bubbleMat = new THREE.SpriteMaterial({ map: bubbleTex, color: blend("sclera", "cyan", 0.2), transparent: true, depthWrite: false });
  for (let i = 0; i < 260; i += 1) {
    const sp = new THREE.Sprite(bubbleMat);
    scene.add(sp);
    bubbles.push({ sp, phase: rand(), speed: 1.3 + rand() * 0.9, size: 0.05 + rand() ** 2 * 0.3, wob: rand() * 6.28, spread: rand() * 0.6 });
  }

  /* --- the camera --- */
  const CAM = timedPath([
    [0, 0, -10, 62],
    [4, 0.5, -18.5, 22],
    [7, 0.6, -26.6, -28],
    [8.8, 0.4, -26.4, -64],
    [10.2, 3.5, -15, -86],
    [11.5, 5.5, -7.5, -98],
    [13.6, -1.6, -24.6, -112.8],
    [16, 2.2, -20.5, -118.5],
    [18, 1.6, -13, -129],
    [19.7, 1.8, -0.5, -131.5],
  ]);
  const LOOK = timedPath([
    [0, 0, -20, -40],
    [4, 0, -24, -30],
    [7, 0, -25.5, -70],
    [8.8, 1.5, -25, -96],
    [10.2, 5, -23, -104],
    [11.5, 7.5, -21, -104.5],
    [13.6, -4.2, -26.2, -118],
    [16, -26, -15, -176],
    [18, 2.4, 0, -133],
    [19.7, 2.2, 12, -133.5],
  ]);
  const FOV = timedPath([
    [0, 66],
    [9, 60],
    [11.5, 62],
    [13.6, 36],
    [15.6, 56],
    [19.7, 64],
  ]);

  const camPos = new THREE.Vector3();
  function update(t) {
    U.uTime.value = t;
    const [x, y, z] = CAM(t);
    camera.position.set(x, Math.max(y, bed(x, z) + 1.2), z);
    camera.lookAt(...LOOK(t));
    camera.fov = FOV(t)[0];
    camera.updateProjectionMatrix();
    camPos.copy(camera.position);
    dome.position.copy(camPos);
    caustic.offset.set(t * 0.021 + Math.sin(t * 0.7) * 0.004, t * 0.013);
    caustic2.offset.set(-t * 0.017, t * 0.019);
    bedMat.emissiveIntensity = 0.3 + 0.05 * Math.sin(t * 2.3);
    surfTex.offset.set(t * 0.012, -t * 0.009);
    for (const r of rays) {
      const d = r.m.position.distanceTo(camPos);
      r.m.material.opacity = r.base * (0.6 + 0.4 * Math.sin(t * 0.8 + r.phase)) * smoothstep(4, 14, d) * (1 - smoothstep(60, 110, d));
    }
    // Particles drift in a box that travels with the camera.
    const wrap = (v, s) => ((((v + s / 2) % s) + s) % s) - s / 2;
    for (let i = 0; i < snowN; i += 1) {
      const [bx, by, bz] = snowBase[i];
      snowPos[i * 3] = camPos.x + wrap(bx + t * 0.25 - camPos.x, 40);
      snowPos[i * 3 + 1] = camPos.y + wrap(by - t * 0.05 + Math.sin(t * 0.5 + i) * 0.2 - camPos.y, 24);
      snowPos[i * 3 + 2] = camPos.z + wrap(bz + t * 0.1 - camPos.z, 40);
    }
    snowGeo.attributes.position.needsUpdate = true;
    for (const u of updates) u(t);
    // Turtle: long strokes of the front flippers, the back ones steering.
    const tp = along(turtlePath, t);
    turtle.position.set(tp.x, tp.y, tp.z);
    turtle.rotation.set(0, 0, 0);
    turtle.rotateY(tp.heading);
    turtle.rotateX(-tp.pitch - Math.sin(t * 1.6) * 0.04);
    for (const f of flippers) {
      const stroke = Math.sin(t * 1.6 + (f.front ? 0 : 1.2));
      f.pivot.rotation.z = f.sx * (f.front ? stroke * 0.55 : stroke * 0.2);
      f.pivot.rotation.y = f.sx * (f.front ? Math.cos(t * 1.6) * 0.3 : 0.2);
    }
    head.rotation.y = Math.sin(t * 0.7) * 0.15;
    // Whale: the fluke drives it; the body answers.
    const wp = along(whalePath, t);
    whale.position.set(wp.x, wp.y, wp.z);
    whale.rotation.set(0, wp.heading, 0);
    whale.rotateX(-wp.pitch + Math.sin(t * 0.55) * 0.04);
    tailPivot.rotation.x = Math.sin(t * 0.55 - 0.6) * 0.35;
    for (const f of fins) f.fin.rotation.z = f.sx * (-0.25 + Math.sin(t * 0.4) * 0.12);
    for (const b of bubbles) {
      const span = 32;
      const u = (b.phase * span + t * b.speed) % span;
      const yy = vent[1] + u;
      const r = b.spread * (0.3 + u * 0.03);
      b.sp.position.set(vent[0] + Math.sin(t * 3 + b.wob) * 0.12 + Math.cos(b.wob) * r, yy, vent[2] + Math.cos(t * 2.6 + b.wob) * 0.12 + Math.sin(b.wob) * r);
      // Bubbles grow as they rise and the pressure falls.
      const s = b.size * (1 + u * 0.02);
      b.sp.scale.set(s, s * (0.85 + Math.sin(t * 9 + b.wob) * 0.1), 1);
      b.sp.material.opacity = 0.9;
      b.sp.visible = yy < -0.05;
    }
  }
  return { scene, camera, update };
}
