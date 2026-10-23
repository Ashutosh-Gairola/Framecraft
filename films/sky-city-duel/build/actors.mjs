/**
 * The cast as actor specs: appearance, wardrobe, and movement, as data.
 * skills/html-anime-actor/SKILL.md explains every field. warriors.mjs draws any spec.
 *
 * Coordinates: torso-local points are [k, d]: k along the spine from the hip (0) to the
 * shoulders (1), d toward the front in px at scale 1 (negative = the back).
 * Chains are garments or hair that hang from an anchor and swing with physics:
 *   nodes × seg px, width w0 → w1, rest angle (0 = straight down, 90 = toward the
 *   facing side, -90 = behind), stiffness and damping of the spring, wind (how much the
 *   wind and the body's motion move it), curl (degrees added per node).
 */

export function createActors(C) {
  return {
    kuro: {
      name: "Kuro",
      skin: C.skin,
      eye: C.accent,
      aura: C.accent,
      outline: C.ink,
      body: { torso: C.hair, sleeve: C.hair, glove: C.hair, legs: C.ink, boots: C.hair },
      build: { chest: 24, back: 21, waist: 18, hips: 22, shoulder: 18, arm: [12, 9, 7.5], leg: [16, 12, 8] },
      hair: {
        fill: C.moon,
        shade: C.line,
        cap: true,
        spikes: [
          [30, 1.3, 0.45],
          [60, 1.55, 0.52],
          [95, 1.75, 0.5],
          [125, 1.55, 0.45],
          [150, 1.3, 0.4],
        ],
        bangs: [
          [25, 1.2],
          [55, 1.05],
          [80, 0.85],
        ],
        strands: [],
      },
      garments: [
        { id: "coat-back", type: "chain", anchor: "hipBack", layer: "back", nodes: 5, seg: 34, w0: 24, w1: 16, rest: -8, stiffness: 55, damping: 9, wind: 0.75, fill: C.hair, edge: C.accent },
        { id: "coat-mid", type: "chain", anchor: "hipMid", layer: "back", nodes: 5, seg: 31, w0: 22, w1: 14, rest: -2, stiffness: 60, damping: 9, wind: 0.65, fill: C.hair },
        { id: "coat-front", type: "chain", anchor: "hipFront", layer: "front", nodes: 4, seg: 30, w0: 16, w1: 11, rest: 8, stiffness: 70, damping: 10, wind: 0.45, fill: C.hair, edge: C.accent },
        { id: "collar", type: "plate", points: [[0.9, -16], [1.1, -12], [1.12, 4], [0.95, 10]], fill: C.hair },
        { id: "marks", type: "line", points: [[0.95, 14], [0.62, 21], [0.18, 16]], stroke: C.accent, width: 3 },
        { id: "sigil", type: "line", points: [[0.88, -6], [0.72, 4], [0.62, -8], [0.46, 2]], stroke: C.accent, width: 2.5 },
        { id: "belt", type: "line", points: [[0.2, -21], [0.2, 19]], stroke: C.accent, width: 3 },
      ],
      weapon: { hands: ["f"], fill: C.hair, edge: C.accent, glow: C.accent, len: 190, trim: C.accent },
      movement: {
        style: "Fast, aggressive, unpredictable. Low stance, weight forward. Attacks arrive on ones and stop dead; recoveries snap out.",
        lean: 1.2,
      },
    },
    seren: {
      name: "Seren",
      skin: C.skin,
      eye: C.iris,
      aura: C.practical,
      outline: C.ink,
      body: { torso: C.hair, sleeve: C.hair, glove: C.practical, legs: C.hair, boots: C.practical },
      build: { chest: 21, back: 18, waist: 14, hips: 20, shoulder: 15, arm: [10, 8, 6.5], leg: [14, 10.5, 7] },
      hair: {
        fill: C.sclera,
        shade: C.moon,
        cap: true,
        spikes: [],
        bangs: [
          [20, 1.05],
          [45, 0.95],
          [70, 0.8],
        ],
        strands: [
          { id: "hair-1", anchor: "headBack", nodes: 6, seg: 30, w0: 16, w1: 5, rest: -35, stiffness: 28, damping: 5, wind: 1.0, curl: 2 },
          { id: "hair-2", anchor: "headBack", nodes: 7, seg: 30, w0: 15, w1: 4, rest: -22, stiffness: 25, damping: 4.5, wind: 1.0, curl: 3 },
          { id: "hair-3", anchor: "headBack", nodes: 6, seg: 28, w0: 13, w1: 4, rest: -48, stiffness: 30, damping: 5, wind: 0.95, curl: -2 },
          { id: "hair-4", anchor: "headNape", nodes: 6, seg: 26, w0: 12, w1: 3, rest: -12, stiffness: 26, damping: 4.5, wind: 0.9, curl: 4 },
        ],
        locks: [{ id: "lock", anchor: "headSide", nodes: 3, seg: 14, w0: 6, w1: 2.5, rest: -4, stiffness: 45, damping: 6, wind: 0.4 }],
        circlet: C.practical,
      },
      garments: [
        { id: "cape-l", type: "chain", anchor: "shoulderBack", layer: "back", nodes: 6, seg: 38, w0: 26, w1: 22, rest: -6, stiffness: 35, damping: 6, wind: 0.9, fill: C.hair, edge: C.practical },
        { id: "cape-r", type: "chain", anchor: "shoulderBack", layer: "back", nodes: 6, seg: 36, w0: 24, w1: 20, rest: -18, stiffness: 32, damping: 6, wind: 1.0, fill: C.ink, edge: C.practical },
        { id: "skirt-b", type: "chain", anchor: "hipBack", layer: "back", nodes: 2, seg: 34, w0: 13, w1: 12, rest: -6, stiffness: 80, damping: 11, wind: 0.35, fill: C.hair, edge: C.practical },
        { id: "breastplate", type: "plate", points: [[0.95, -12], [0.98, 14], [0.66, 23], [0.42, 15], [0.48, -6], [0.7, -14]], fill: C.practical },
        { id: "breast-inner", type: "plate", points: [[0.9, -4], [0.92, 10], [0.68, 15], [0.52, 8], [0.6, -4]], fill: C.hair },
        { id: "belt", type: "plate", points: [[0.24, -19], [0.24, 18], [0.16, 19], [0.16, -19]], fill: C.practical },
        { id: "skirt-f", type: "chain", anchor: "hipFront", layer: "front", nodes: 2, seg: 34, w0: 13, w1: 12, rest: 10, stiffness: 80, damping: 11, wind: 0.3, fill: C.hair, edge: C.practical },
        { id: "skirt-m", type: "chain", anchor: "hipMid", layer: "front", nodes: 2, seg: 36, w0: 14, w1: 13, rest: 0, stiffness: 85, damping: 11, wind: 0.3, fill: C.ink, edge: C.practical },
        { id: "pauldron", type: "joint", joint: "sh", r: 15, fill: C.practical, inner: C.hair },
        { id: "gauntlet", type: "segment", from: "fe", to: "fh", start: 0.35, width: 8.5, fill: C.practical },
        { id: "greave", type: "segment", from: "fk", to: "ff", start: 0.15, width: 9, fill: C.practical },
        { id: "greave-back", type: "segment", from: "bk", to: "bf", start: 0.15, width: 8, fill: C.iris, back: true },
      ],
      weapon: { hands: ["f", "b"], fill: C.practical, edge: C.line, glow: C.practical, len: 150, trim: C.practical },
      movement: {
        style: "Precise, defensive, incredibly fast. Upright, economical; flows through keys on smooth arcs and only stops on a block.",
        lean: 0.8,
      },
    },
  };
}
