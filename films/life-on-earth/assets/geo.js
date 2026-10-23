/**
 * The geography of the land, as plain functions shared by every part of the world.
 *
 *   west (−x)                                                                east (+x)
 *   ocean │ beach, fishing village │ fields, village, pond │ road │ city │ suburbs │ forest │ mountains
 *
 * One river runs from the eastern hills through the forest, the city and the farmland to the
 * sea; a mountain range runs along the north (−z). Heights are in metres, sea level 0.
 */

import { fbm, ridged, smoothstep, mix } from "./lib.js";

export const coastX = (z) => 40 * Math.sin(z / 310) + 25 * Math.sin(z / 97 + 1);
export const riverZ = (x) => -160 + 150 * Math.sin(x / 640 + 0.6) + 55 * Math.sin(x / 233 + 1.3);
export const riverW = (x) => (x < 260 ? mix(52, 24, smoothstep(0, 260, x)) : mix(24, 9, smoothstep(3700, 4400, x)));
export const baseH = (x) => 1.5 + 6.5 * smoothstep(20, 520, x) + Math.max(0, x - 520) * 0.0028;
export const riverY = (x) => Math.max(0.04, baseH(x) - 1.6);
export const RIVER_END = 7300;

export const VILLAGE = { x: 1100, z: -170, r: 135 };
export const POND = { x: 1020, z: -262, r: 20 };
export const PASTURE = { x0: 955, x1: 1085, z0: -335, z1: -212 };
export const FISHING = { x0: 70, x1: 240, z0: -790, z1: -630 };
export const CITY = { x0: 2300, x1: 3500, z0: -650, z1: 650 };
export const SUBURB = { x0: 3530, x1: 3800 };
export const FOREST_X = 3830;
export const CLEARING = { x: 4420, z: -15, r: 62 };
export const AVENUES = [-560, -440, -120, 0, 120, 240, 360, 480, 600];
export const avenueW = (z) => (z === 0 ? 36 : 20);
export const CROSS = Array.from({ length: 13 }, (_, k) => 2300 + k * 100);
export const CROSS_W = 20;
export const PARK = { x0: 2910, x1: 3090, z0: -212, z1: -131 };

/** The country road: out of the village, over the river, onto the city's main avenue. */
export const roadZ = (x) => -170 + 170 * smoothstep(1230, 1900, x) + 8 * Math.sin(x / 70) * (1 - smoothstep(1300, 1480, x));
export const roadW = (x) => mix(5.5, 18, smoothstep(1750, 2300, x));
export const ROAD_X0 = 1180;

/** Where the river crosses the road (for the bridge). */
export const ROAD_BRIDGE = (() => {
  let best = 1500;
  let d = 1e9;
  for (let x = 1350; x < 1750; x += 0.5) {
    const e = Math.abs(roadZ(x) - riverZ(x));
    if (e < d) {
      d = e;
      best = x;
    }
  }
  return best;
})();

const inCity = (x, z) => smoothstep(CITY.x0 - 140, CITY.x0, x) * (1 - smoothstep(SUBURB.x1, SUBURB.x1 + 120, x)) * (1 - smoothstep(CITY.z1, CITY.z1 + 140, Math.abs(z)));
export const forestMask = (x) => smoothstep(FOREST_X, FOREST_X + 160, x) * (1 - smoothstep(7600, 8200, x));
/** Inside the walkable forest (the clearing, the stream, the giant tree) trees are real, not canopy. */
export const interior = (x, z) => 1 - smoothstep(330, 420, Math.hypot(x - CLEARING.x, z - CLEARING.z));
/** The roof of the forest seen from above: a raised, lumpy surface of crowns. */
export const canopy = (x, z) => {
  const near = Math.abs(z - riverZ(x)) - riverW(x) * 0.5;
  const m = forestMask(x, z) * (1 - interior(x, z)) * smoothstep(6, 26, near) * (1 - smoothstep(-2300, -2900, z) * 0.7);
  return m * (17 + 7 * fbm(x / 45, z / 45, 3) + 4 * fbm(x / 13, z / 13, 2));
};

/** Ground height (without the canopy). */
export function landH(x, z) {
  const d = x - coastX(z);
  if (d < 0) {
    // The shelf: shallow turquoise over sand, deepening offshore.
    return Math.max(-60, d * 0.045 - Math.max(0, -d - 300) * 0.06) - 0.35 + (fbm(x / 120, z / 120, 3) - 0.5) * 2 * smoothstep(-20, -200, d);
  }
  const shore = smoothstep(0, 150, d);
  let h = mix(d * 0.035, baseH(x), shore);
  // Gentle undulation inland, coastal hills north and south of the fishing village.
  h += (fbm(x / 420, z / 420, 4) - 0.5) * 16 * smoothstep(150, 600, d);
  const hills = smoothstep(150, 650, d) * (1 - smoothstep(700, 1100, x)) * (smoothstep(-800, -1400, z) + smoothstep(300, 900, z));
  h += hills * (22 + 34 * fbm(x / 300, z / 300, 4));
  // Forest hills and the eastern range.
  h += smoothstep(FOREST_X - 100, FOREST_X + 500, x) * (fbm(x / 600, z / 600, 4) - 0.38) * 70 * (1 - interior(x, z) * 0.75);
  const inland = smoothstep(200, 1400, d);
  h += ridged(x / 900 + 3, z / 900, 5) * 950 * smoothstep(7400, 9000, x);
  // The northern range.
  h += (ridged(x / 1000, z / 1000 + 7, 5) * 950 * smoothstep(-2800, -4300, z) + smoothstep(-1700, -2900, z) * 110 * fbm(x / 500, z / 500, 3)) * inland;
  // Keep the land above the river away from its banks, so the water never floods a hollow.
  if (x > 40 && x < RIVER_END) {
    const dr = Math.abs(z - riverZ(x)) - riverW(x) * 0.5;
    if (dr > 0 && dr < 400) h = Math.max(h, riverY(x) + 0.9 * smoothstep(0, 6, dr));
  }
  // Flat ground for the city, the village, the farmland.
  const city = inCity(x, z);
  h = mix(h, baseH(x) + 0.0, city);
  const village = 1 - smoothstep(VILLAGE.r, VILLAGE.r + 120, Math.hypot(x - VILLAGE.x, z - VILLAGE.z));
  h = mix(h, baseH(x) + 0.4 + (fbm(x / 90, z / 90, 2) - 0.5) * 2, village);
  const fields = smoothstep(260, 420, x) * (1 - smoothstep(1950, 2150, x)) * (1 - smoothstep(-1150, -1350, z)) * (1 - smoothstep(560, 760, z));
  h = mix(h, baseH(x) + (fbm(x / 300, z / 300, 3) - 0.5) * 4, fields * 0.85);
  // The pond.
  const pd = Math.hypot(x - POND.x, z - POND.z);
  if (pd < POND.r + 10) h = mix(baseH(x) - 2.6, h, smoothstep(POND.r - 6, POND.r + 10, pd));
  // The river: a bed below the water, banks easing up to the land.
  if (x < RIVER_END + 200) {
    const dr = Math.abs(z - riverZ(x));
    const w = riverW(x) * 0.5;
    const bank = city > 0.5 ? 3 : 14;
    const bedY = riverY(x) - (x < 300 ? 3 : 2.2);
    h = mix(bedY, h, smoothstep(w - 2, w + bank, dr) * (x < RIVER_END ? 1 : smoothstep(RIVER_END, RIVER_END + 200, x)));
  }
  return h;
}

/** Inside a block of the city grid? Returns the block's rectangle or null. */
export function cityBlocks() {
  const blocks = [];
  for (let k = 0; k < CROSS.length - 1; k += 1) {
    const x0 = CROSS[k] + CROSS_W / 2;
    const x1 = CROSS[k + 1] - CROSS_W / 2;
    for (let a = 0; a < AVENUES.length - 1; a += 1) {
      const z0 = AVENUES[a] + avenueW(AVENUES[a]) / 2;
      const z1 = AVENUES[a + 1] - avenueW(AVENUES[a + 1]) / 2;
      if (z1 - z0 < 30) continue;
      blocks.push({ x0, x1, z0, z1 });
    }
  }
  return blocks;
}
/** Too close to the river for a building (the riverside walk and its trees). */
export const riverside = (x, z, margin = 0) => Math.abs(z - riverZ(x)) < riverW(x) * 0.5 + 26 + margin;
