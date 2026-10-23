/**
 * Stage 2 — the land: one continuous world from the beach to the mountains, lit by a sun that
 * climbs from morning to noon and sinks to golden hour, filmed by one camera path from the
 * surface break to the final pullback. The coast, the countryside, the city, and the forest
 * are built by their own modules on the same ground.
 */

import { THREE, W, H, mulberry32, fbm, vnoise, smoothstep, mix, clamp, timedPath, grainNormal, rippleNormal, cumulusTexture, glow, xf, merge, U, deg } from "./lib.js";
import { coastX, riverZ, riverW, riverY, baseH, landH, canopy, interior, forestMask, RIVER_END, POND, CITY, SUBURB, CLEARING } from "./geo.js";
import { coast } from "./coast.js";
import { rural } from "./rural.js";
import { city } from "./city.js";
import { forest } from "./forest.js";

/* The terrain grid is finest where the film is shot and stretches to the horizon. */
const SEGX = 640;
const SEGZ = 440;
const mapX = (u) => 3000 + 5600 * u + 24000 * u ** 7;
const mapZ = (v) => -300 + 4200 * v + 26000 * v ** 7;
const dmapX = (u) => 5600 + 168000 * u ** 6;
const dmapZ = (v) => 4200 + 182000 * v ** 6;

export function land(PAINT, renderer) {
  const col = (k) => new THREE.Color(PAINT[k]);
  const blend = (a, b, u) => new THREE.Color().lerpColors(col(a), col(b), u);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.25, 80000);

  /* ---------------- sun, sky, light ---------------- */
  const sunDir = new THREE.Vector3();
  const sunAt = (t) => {
    const el = (t < 70 ? mix(28, 50, smoothstep(20, 70, t)) : mix(50, 6.5, smoothstep(70, 122, t))) * deg;
    const az = mix(55, 168, smoothstep(18, 122, t)) * deg;
    return sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
  };
  // Golden hour comes in over the last thirty seconds.
  const gold = (t) => smoothstep(92, 118, t);
  const morning = (t) => 1 - smoothstep(30, 60, t);
  const C = {
    zenith: [blend("ocean", "moon", 0.3), blend("ocean", "moon", 0.22), blend("sky", "ocean", 0.55)],
    horizon: [blend("moon", "cyan", 0.3), blend("moon", "cyan", 0.22), blend("practical", "skin", 0.5)],
    glow: [blend("sclera", "practical", 0.45), blend("sclera", "practical", 0.2), blend("practical", "iris", 0.25)],
    sun: [blend("practical", "sclera", 0.55), blend("sclera", "practical", 0.18), blend("practical", "iris", 0.42)],
    hemiSky: [blend("cyan", "moon", 0.55), blend("cyan", "moon", 0.5), blend("skin", "moon", 0.45)],
    hemiGround: [blend("land", "hair", 0.45), blend("land", "hair", 0.4), blend("iris", "hair", 0.55)],
  };
  const tone = (key, t, out = new THREE.Color()) => {
    const [m, n, g] = C[key];
    out.lerpColors(n, m, morning(t));
    return out.lerp(g, gold(t));
  };

  const skyGeo = new THREE.SphereGeometry(60000, 40, 20);
  const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute("color", new THREE.BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);
  const skyDirs = [];
  {
    const p = skyGeo.attributes.position;
    for (let i = 0; i < p.count; i += 1) skyDirs.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize());
  }
  const zen = new THREE.Color();
  const hor = new THREE.Color();
  const glo = new THREE.Color();
  const tmpC = new THREE.Color();
  function paintSky(t, target = skyColors) {
    tone("zenith", t, zen);
    tone("horizon", t, hor);
    tone("glow", t, glo);
    const s = sunAt(t);
    const g = gold(t);
    skyDirs.forEach((v, i) => {
      tmpC.lerpColors(hor, zen, smoothstep(-0.02, mix(0.45, 0.6, g), v.y));
      const d = Math.max(0, v.dot(s));
      tmpC.lerp(glo, Math.pow(d, mix(6, 3, g)) * mix(0.7, 0.95, g));
      if (v.y < 0) tmpC.lerp(hor, 1);
      target.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    });
  }
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(col("sclera"), 2.2), color: col("sclera"), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(col("practical"), 1), transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  scene.add(sunDisc, sunHalo);

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xffffff, 0.00011);

  // Reflections from the sky at morning, noon, and golden hour.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envs = [32, 75, 114].map((t) => {
    const colors = new Float32Array(skyColors.length);
    paintSky(t, colors);
    const g = skyGeo.clone();
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    return pmrem.fromScene(s, 0.02, 1, 100000).texture;
  });

  /* ---------------- the ground ---------------- */
  const n = (SEGX + 1) * (SEGZ + 1);
  const heights = new Float32Array(n);
  const pos = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  const xs = new Float32Array(SEGX + 1);
  const zs = new Float32Array(SEGZ + 1);
  for (let i = 0; i <= SEGX; i += 1) xs[i] = mapX(-1 + (2 * i) / SEGX);
  for (let j = 0; j <= SEGZ; j += 1) zs[j] = mapZ(-1 + (2 * j) / SEGZ);
  for (let j = 0; j <= SEGZ; j += 1)
    for (let i = 0; i <= SEGX; i += 1) {
      const k = j * (SEGX + 1) + i;
      const x = xs[i];
      const z = zs[j];
      const h = landH(x, z);
      heights[k] = h;
      pos.set([x, h + canopy(x, z), z], k * 3);
      uvs.set([x / 7, z / 7], k * 2);
    }
  /** Ground height under (x, z), as the mesh draws it (canopy excluded). */
  function invX(x) {
    let u = clamp((x - 3000) / 5600, -1, 1);
    for (let it = 0; it < 8; it += 1) u = clamp(u - (mapX(u) - x) / dmapX(u), -1, 1);
    return u;
  }
  function invZ(z) {
    let v = clamp((z + 300) / 4200, -1, 1);
    for (let it = 0; it < 8; it += 1) v = clamp(v - (mapZ(v) - z) / dmapZ(v), -1, 1);
    return v;
  }
  const groundAt = (x, z) => {
    const fi = ((invX(x) + 1) / 2) * SEGX;
    const fj = ((invZ(z) + 1) / 2) * SEGZ;
    const i = clamp(Math.floor(fi), 0, SEGX - 1);
    const j = clamp(Math.floor(fj), 0, SEGZ - 1);
    const a = clamp(fi - i, 0, 1);
    const b = clamp(fj - j, 0, 1);
    const at = (ii, jj) => heights[jj * (SEGX + 1) + ii];
    // Match the mesh's triangle split (a, c, b / b, c, d) rather than bilinear.
    if (a + b <= 1) return at(i, j) + (at(i + 1, j) - at(i, j)) * a + (at(i, j + 1) - at(i, j)) * b;
    return at(i + 1, j + 1) + (at(i, j + 1) - at(i + 1, j + 1)) * (1 - a) + (at(i + 1, j) - at(i + 1, j + 1)) * (1 - b);
  };

  const idx = [];
  for (let j = 0; j < SEGZ; j += 1)
    for (let i = 0; i < SEGX; i += 1) {
      const a = j * (SEGX + 1) + i;
      const b = a + 1;
      const c = a + SEGX + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  tGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  tGeo.setIndex(idx);
  tGeo.computeVertexNormals();

  const sand = blend("practical", "sclera", 0.42).lerp(col("iris"), 0.18).multiplyScalar(0.86);
  const wetSand = blend("iris", "hair", 0.25).lerp(sand, 0.35);
  const shelf = blend("sclera", "cyan", 0.35);
  const deepBed = blend("ocean", "ink", 0.3);
  const grass = blend("land", "hair", 0.1);
  const grassLush = blend("land", "ink", 0.18);
  const grassDry = blend("land", "practical", 0.38);
  const earth = blend("iris", "hair", 0.5);
  const rock = blend("hair", "iris", 0.35).lerp(col("moon"), 0.2);
  const snow = col("sclera");
  const pine = blend("land", "ink", 0.45);
  const leafDark = blend("land", "ink", 0.32);
  const leafLight = blend("land", "practical", 0.22);
  const loam = blend("hair", "iris", 0.4).lerp(grassLush, 0.35);
  const cityGround = blend("moon", "hair", 0.45);
  const tn = tGeo.attributes.normal;
  const tc = new Float32Array(n * 3);
  for (let k = 0; k < n; k += 1) {
    const x = pos[k * 3];
    const y = heights[k];
    const z = pos[k * 3 + 2];
    const slope = 1 - tn.getY(k);
    const cz = canopy(x, z);
    const d = x - coastX(z);
    const nz = fbm(x / 70, z / 70, 3);
    const n2 = fbm(x / 23 + 40, z / 23 - 40, 2);
    let c;
    if (d < 0) {
      c = new THREE.Color().lerpColors(shelf, deepBed, smoothstep(-0.5, -14, y));
    } else {
      c = new THREE.Color().lerpColors(grass, grassLush, smoothstep(0.35, 0.65, nz));
      c.lerp(grassDry, smoothstep(0.55, 0.75, n2) * 0.55);
      c.lerp(earth, smoothstep(0.72, 0.85, n2) * 0.3);
      // The beach: dry sand, a darker wet band at the water, dunes easing into grass.
      const beach = 1 - smoothstep(38 + nz * 30, 70 + nz * 40, d);
      c.lerp(sand, beach);
      c.lerp(wetSand, (1 - smoothstep(1, 9, d)) * 0.8);
      // The river's banks: mud and pebbles.
      if (x < RIVER_END) {
        const dr = Math.abs(z - riverZ(x)) - riverW(x) * 0.5;
        c.lerp(blend("iris", "hair", 0.35).lerp(sand, 0.3), (1 - smoothstep(0, 7, dr)) * 0.75);
      }
      // City ground under the streets; forest floor; canopy from above.
      const inCity = x > CITY.x0 - 30 && x < CITY.x1 + 20 && Math.abs(z) < CITY.z1 + 30;
      if (inCity) c.lerp(cityGround, 0.65);
      const fm = forestMask(x);
      if (fm > 0) c.lerp(loam, fm * interior(x, z) * 0.6);
      if (cz > 0.5) {
        const crowns = fbm(x / 9, z / 9, 2);
        c = new THREE.Color().lerpColors(leafDark, leafLight, smoothstep(0.3, 0.75, crowns) * 0.8);
        c.lerp(pine, smoothstep(0.55, 0.75, fbm(x / 160, z / 160, 2)) * 0.6);
        c.multiplyScalar(0.75 + 0.35 * smoothstep(0.25, 0.7, fbm(x / 6, z / 6, 2)));
      }
      // Mountains: forest low, rock on the slopes, snow on the heights.
      const high = smoothstep(260, 520, y);
      c.lerp(pine, smoothstep(90, 220, y) * (1 - high) * 0.8);
      const strata = 0.85 + 0.15 * Math.sin(y / 9 + nz * 6);
      c.lerp(rock.clone().multiplyScalar(strata), Math.max(high * 0.9, smoothstep(0.3, 0.55, slope) * smoothstep(40, 140, y)));
      c.lerp(snow, smoothstep(680, 900, y + nz * 160) * (1 - smoothstep(0.45, 0.7, slope)));
    }
    // Hollows a touch darker.
    tc.set([c.r, c.g, c.b], k * 3);
  }
  tGeo.setAttribute("color", new THREE.BufferAttribute(tc, 3));
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, normalMap: grainNormal(1), normalScale: new THREE.Vector2(0.55, 0.55) });
  const terrain = new THREE.Mesh(tGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* ---------------- the sea ---------------- */
  const SS = 300;
  const seaGeo = new THREE.PlaneGeometry(2, 2, SS, SS);
  seaGeo.rotateX(-Math.PI / 2);
  {
    const p = seaGeo.attributes.position;
    const uv = seaGeo.attributes.uv;
    for (let i = 0; i < p.count; i += 1) {
      const u = p.getX(i);
      const v = p.getZ(i);
      const x = -150 + 1100 * u + 50000 * u ** 7;
      const z = -300 + 1100 * v + 50000 * v ** 7;
      p.setXYZ(i, x, 0, z);
      uv.setXY(i, x / 26, z / 26);
    }
  }
  seaGeo.computeVertexNormals();
  const ripples = rippleNormal(1);
  const seaDetail = 3.2;
  const seaUniforms = { uShallow: { value: blend("cyan", "land", 0.12) }, uMid: { value: blend("cyan", "ocean", 0.6) }, uDeep: { value: blend("ocean", "ink", 0.35) }, uFoam: { value: col("sclera") } };
  const seaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.14, metalness: 0.05, normalMap: ripples, normalScale: new THREE.Vector2(0.22, 0.22), transparent: true, envMapIntensity: 0.9 });
  void seaDetail;
  seaMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, seaUniforms, { uTime: U.uTime });
    const coast = "40.0 * sin(p.y / 310.0) + 25.0 * sin(p.y / 97.0 + 1.0)";
    sh.vertexShader = `uniform float uTime;\nvarying vec2 vSea;\n${sh.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec2 p = position.xz;
      float dc = p.x - (${coast});
      float swell = 0.22 * sin(dot(p, vec2(0.11, 0.05)) - uTime * 1.1) + 0.13 * sin(dot(p, vec2(-0.05, 0.19)) - uTime * 1.6) + 0.06 * sin(dot(p, vec2(0.37, 0.21)) - uTime * 2.3);
      float roll = 0.32 * sin(dc * 0.11 - uTime * 1.35) * smoothstep(-160.0, -25.0, dc) * (1.0 - smoothstep(-6.0, 2.0, dc));
      transformed.y += swell * smoothstep(-2.0, -40.0, dc) + roll;
      vSea = vec2(dc, uTime);`,
    );
    sh.fragmentShader = `uniform vec3 uShallow;\nuniform vec3 uMid;\nuniform vec3 uDeep;\nuniform vec3 uFoam;\nuniform float uTime;\nvarying vec2 vSea;\n${sh.fragmentShader}`.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `float dc = vSea.x;
      vec3 water = mix(uShallow, uMid, smoothstep(-2.0, -60.0, dc));
      water = mix(water, uDeep, smoothstep(-120.0, -900.0, dc));
      float crest = sin(dc * 0.11 - uTime * 1.35);
      float breakers = smoothstep(0.82, 1.0, crest) * smoothstep(-70.0, -8.0, dc) * (1.0 - smoothstep(-4.0, 0.0, dc));
      float wash = smoothstep(-6.0, -0.5, dc) * (0.55 + 0.45 * sin(dc * 1.7 + uTime * 0.8 + vNormal.x * 3.0));
      float foam = clamp(breakers * 0.9 + wash * 0.8, 0.0, 1.0);
      vec4 diffuseColor = vec4(mix(water, uFoam, foam), mix(mix(0.35, 0.82, smoothstep(-0.5, -30.0, dc)), 0.98, smoothstep(-60.0, -300.0, dc)));
      diffuseColor.a = max(diffuseColor.a, foam);`,
    );
  };
  seaMat.customProgramCacheKey = () => "sea";
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.receiveShadow = true;
  sea.renderOrder = 1;
  scene.add(sea);

  /* ---------------- the river and the pond ---------------- */
  const riverMat = new THREE.MeshStandardMaterial({ color: blend("ocean", "land", 0.45).lerp(col("hair"), 0.15), roughness: 0.1, metalness: 0.1, normalMap: rippleNormal(1, 0.3), normalScale: new THREE.Vector2(0.3, 0.3), transparent: true, opacity: 0.94, envMapIntensity: 0.7 });
  {
    const verts = [];
    const uv = [];
    const ind = [];
    const x0 = coastX(riverZ(40)) + 26;
    let s = 0;
    let prev = null;
    let rows = 0;
    for (let x = x0; x <= RIVER_END; x += 5) {
      const z = riverZ(x);
      const w = riverW(x) * 0.5 + 3;
      const y = riverY(x);
      if (prev) s += Math.hypot(x - prev[0], z - prev[1]);
      prev = [x, z];
      for (let k = -2; k <= 2; k += 1) {
        verts.push(x, y, z + (k / 2) * w);
        uv.push(s / 10, (k / 2) * w / 10);
      }
      if (rows) {
        const a = (rows - 1) * 5;
        for (let k = 0; k < 4; k += 1) ind.push(a + k, a + k + 1, a + 5 + k, a + k + 1, a + 6 + k, a + 5 + k);
      }
      rows += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    g.computeVertexNormals();
    const river = new THREE.Mesh(g, riverMat);
    river.receiveShadow = true;
    scene.add(river);
  }
  const pondMat = riverMat.clone();
  pondMat.normalMap = rippleNormal(1, 0.6);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 3, 40), pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(POND.x, baseH(POND.x) - 0.9, POND.z);
  {
    const uv = pond.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4);
  }
  pond.receiveShadow = true;
  scene.add(pond);

  /* ---------------- clouds ---------------- */
  const cloudTex = [0, 1, 2, 3].map((v) => cumulusTexture(col("sclera"), blend("moon", "sky", 0.25), v));
  const clouds = [];
  const cr = mulberry32(17);
  for (let i = 0; i < 150; i += 1) {
    const x = -4000 + cr() * 14000;
    const z = -4500 + cr() * 9000;
    const y = 750 + cr() * 650;
    const size = 380 + cr() * 520;
    const parts = 3 + Math.floor(cr() * 3);
    for (let k = 0; k < parts; k += 1) {
      const s = size * (k === 0 ? 1 : 0.45 + cr() * 0.4);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[Math.floor(cr() * 4)], transparent: true, opacity: 0.92, depthWrite: false }));
      sp.scale.set(s, s * 0.5, 1);
      const px = x + (cr() - 0.5) * size * 0.9;
      const py = y + (k ? (cr() - 0.3) * size * 0.15 : 0);
      const pz = z + (cr() - 0.5) * size * 0.5;
      sp.position.set(px, py, pz);
      scene.add(sp);
      clouds.push({ sp, x: px, base: 0.92 });
    }
  }

  /* ---------------- the inhabited world ---------------- */
  const ctx = { scene, PAINT, col, blend, ground: groundAt, renderer, sunDirAt: (t) => sunAt(t).clone() };
  const parts = [coast(ctx), rural(ctx), city(ctx), forest(ctx)];

  /* ---------------- the camera ---------------- */
  const CL = CLEARING;
  const S = riverZ(CL.x);
  const GY = groundAt(CL.x, CL.z);
  const LY = groundAt(CL.x - 1.05, S - 8.42);
  const CAM = timedPath([
    [19.6, -232, 0.7, 62],
    [21.6, -214, 1.5, 55],
    [24.5, -140, 2.6, 24],
    [28, -62, 42, -195],
    [31.5, -22, 58, -465],
    [34.5, -2, 3.8, -612],
    [37, 10, 4.2, -690],
    [40, 150, 52, -705],
    [43.5, 420, 230, -715],
    [47, 878, 46, -545],
    [49.5, 961.5, 2.5, -486.5],
    [52, 966.5, 2.3, -485.5],
    [54.5, 1002, 2.4, -342],
    [57, 1040, 18, -330],
    [60, 1130, 66, -265],
    [63, 1420, 46, -205],
    [65.5, 1800, 62, -45],
    [68.5, 2120, 205, -120],
    [71.5, 2560, 108, -8],
    [74.5, 2758, 6.5, -3],
    [77, 2786, 3.2, -1.5],
    [78.6, 2898, 30, -2],
    [80, 2900, 56, -112],
    [81.2, 2955, 50, -172],
    [82.5, 3040, 30, riverZ(3040) + 7],
    [85, 3098, 32, riverZ(3098) + 6],
    [88, 3460, 120, riverZ(3460)],
    [90.8, CL.x - 40, 30, S - 40],
    [93, CL.x - 22, 3.2, S - 26],
    [94.8, CL.x - 21, 2.9, S - 25],
    [98.2, CL.x - 6.5, 0.95, S - 12.5],
    [99.6, CL.x - 1.4, 1.12, S - 8.7],
    [100.4, CL.x - 1.33, 1.11, S - 8.66],
    [101.6, CL.x + 0.8, 2.2, S - 9.8],
    [103.4, CL.x + 1.5, 24, S - 10],
    [105.4, CL.x + 8, 52, S - 2],
    [111, CL.x + 240, 250, 300],
    [116.5, CL.x + 540, 680, 700],
    [120, CL.x + 660, 900, 900],
  ]);
  const LOOK = timedPath([
    [19.6, -200, 24, 50],
    [21.6, 20, 9, 32],
    [24.5, 20, 6, -40],
    [28, 20, 4, -560],
    [31.5, 92, 6, -742],
    [34.5, 6, 1.6, -705],
    [37, 120, 12, -720],
    [40, 700, 20, -520],
    [43.5, 1050, 0, -260],
    [47, 975, 2, -485],
    [49.5, 990, 1.3, -481],
    [52, 995, 1.2, -479],
    [54.5, 1026, 1.1, -302],
    [57, 1110, 3, -140],
    [60, 1350, 10, -60],
    [63, 1800, 15, -40],
    [65.5, 2350, 60, 0],
    [68.5, 2900, 110, 0],
    [71.5, 2850, 40, 0],
    [74.5, 2850, 4, -1.5],
    [77, 2832, 72, 28],
    [78.6, 2902, 45, -60],
    [80, 2990, 0, -175],
    [81.2, 3040, 4, -195],
    [82.5, 3092, 26, riverZ(3092)],
    [85, 3150, 28, riverZ(3150)],
    [88, 4100, 40, -60],
    [90.8, CL.x, 2, CL.z],
    [93, CL.x - 4.5, 0.9, CL.z - 17.5],
    [94.8, CL.x - 2.5, 0.9, CL.z - 15.5],
    [98.2, CL.x + 3, 0.3, S],
    [99.6, CL.x - 1.05, 0.95, S - 8.42],
    [100.4, CL.x - 1.04, 0.95, S - 8.42],
    [101.6, CL.x + 4, 30, S - 12],
    [103.4, CL.x + 4, 52, S - 12],
    [105.4, CL.x - 280, 34, CL.z],
    [111, 3000, 0, -100],
    [116.5, 2000, 0, -60],
    [120, 1550, 0, 40],
  ]);
  const FOV = timedPath([
    [19.6, 58],
    [24.5, 52],
    [43.5, 50],
    [49.5, 52],
    [65.5, 50],
    [74.5, 58],
    [77, 66],
    [80, 52],
    [90.8, 50],
    [93, 16],
    [94.8, 16],
    [96.6, 48],
    [98.2, 46],
    [99.6, 30],
    [100.4, 30],
    [101.6, 58],
    [103.4, 62],
    [105.4, 50],
    [120, 52],
  ]);

  const camXZ = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const surfaceAt = (x, z) => Math.max(groundAt(x, z) + canopy(x, z), 0.35);
  ctx.surfaceAt = surfaceAt;
  const reference = (x, z, h) => {
    const g = surfaceAt(x, z);
    if (h < 6) return g;
    const r = Math.min(160, h * 0.8);
    const avg = (surfaceAt(x + r, z) + surfaceAt(x - r, z) + surfaceAt(x, z + r) + surfaceAt(x, z - r) + g) / 5;
    return mix(g, avg, smoothstep(6, 40, h));
  };
  function update(t) {
    U.uTime.value = t;
    // Heights on the path are above the ground (smoothed under high shots, so the camera doesn't
    // bob over every hill), with a soft floor so it glides over the ground instead of touching it.
    const [cx, ch, cz] = CAM(t);
    const cy = reference(cx, cz, ch) + ch;
    const floor = surfaceAt(cx, cz) + 0.55;
    const k = (cy - floor) / 0.35;
    const y = floor + (k > 30 ? k : Math.log1p(Math.exp(k))) * 0.35;
    camera.position.set(cx, y, cz);
    const [lx, lh, lz] = LOOK(t);
    camera.lookAt(lx, reference(lx, lz, lh) + lh, lz);
    if (typeof window !== "undefined") window.__debugCam = { t, x: cx, y, z: cz, ground: groundAt(cx, cz), surface: surfaceAt(cx, cz), look: [lx, reference(lx, lz, lh) + lh, lz] };
    camera.fov = FOV(t)[0];
    camera.updateProjectionMatrix();
    camXZ.copy(camera.position);

    // Sun, sky, light, fog.
    const s = sunAt(t);
    paintSky(t);
    skyGeo.attributes.color.needsUpdate = true;
    sky.position.copy(camera.position);
    tone("sun", t, sun.color);
    sun.intensity = mix(3.1, 2.4, gold(t));
    tone("hemiSky", t, hemi.color);
    tone("hemiGround", t, hemi.groundColor);
    hemi.intensity = mix(1.05, 0.75, gold(t));
    tone("horizon", t, scene.fog.color);
    scene.fog.density = mix(0.00019, 0.000105, smoothstep(103, 116, t));
    scene.environment = envs[t < 58 ? 0 : t < 96 ? 1 : 2];
    sunDisc.position.copy(camera.position).addScaledVector(s, 40000);
    sunDisc.scale.setScalar(2600);
    sunHalo.position.copy(sunDisc.position);
    sunHalo.scale.setScalar(mix(9000, 16000, gold(t)));
    tone("glow", t, sunHalo.material.color);

    // The shadow frustum follows what the camera sees, sized to its height.
    camera.getWorldDirection(fwd);
    const span = clamp((y - surfaceAt(cx, cz)) * 1.6 + 70, 90, 1400);
    const centre = new THREE.Vector3(cx + fwd.x * span * 0.7, 0, cz + fwd.z * span * 0.7);
    centre.y = groundAt(centre.x, centre.z);
    sun.target.position.copy(centre);
    sun.position.copy(centre).addScaledVector(s, 4000);
    const sc = sun.shadow.camera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.near = 100;
    sc.far = 9000;
    sc.updateProjectionMatrix();
    sun.shadow.normalBias = span * 0.0008;

    ripples.offset.set(t * 0.012, t * 0.008);
    riverMat.normalMap.offset.set(-t * 0.09, 0);
    pondMat.normalMap.offset.set(t * 0.01, t * 0.013);
    const warm = gold(t);
    for (const c of clouds) {
      c.sp.position.x = c.x + t * 3;
      c.sp.material.color.lerpColors(col("sclera"), blend("practical", "skin", 0.35), warm * 0.8);
      const d = c.sp.position.distanceTo(camera.position);
      c.sp.material.opacity = c.base * smoothstep(150, 500, d);
    }
    for (const p of parts) p(t, camera.position);
  }
  return { scene, camera, update };
}
