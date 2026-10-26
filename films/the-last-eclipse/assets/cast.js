/**
 * The Last Eclipse — the cast as character specs (skills/html-anime-character/SKILL.md) for
 * harness/templates/human.js. Consistency rules from the brief: Kael always silver-white hair, blue
 * eyes, black coat, cyan-edged katana, blue-white energy; Raizen always black hair with crimson tips,
 * red eyes, black armour, torn red cape, the greatsword, crimson-black energy.
 */

// Kael Arashi, the Azure Phantom, 24: tall, lean, athletic; long silver-white hair tied loosely at the
// back with strands over the face; pale; sharp features; glowing ice-blue eyes; a black high-collared
// combat coat; silver shoulder armour; dark fitted trousers; black boots; blue runes down the right arm.
export const KAEL = {
  style: "anime",
  heads: 7.4,
  height: 1.84,
  sex: 0,
  build: 0.5,
  muscle: 0.65,
  fat: 0.1,
  skin: "#f1d9c9",
  eyes: "#4fd8ff",
  face: { eyeSize: 0.35, eyeTall: 0.72, iris: 34, glow: true, browTilt: 0.7, browWeight: 1.1, browY: -0.002, jaw: 0.62, nose: 0.75 },
  hair: {
    style: "long",
    color: "#dfe6ee",
    tied: true,
    length: 0.44,
    locks: [
      // Loose strands falling over the face.
      [[0.62, 0.5, 0.6], [0.3, -1, 0.22], 0.15, 0.009],
      [[-0.6, 0.52, 0.6], [-0.28, -1, 0.24], 0.14, 0.009],
      [[0.25, 0.7, 0.66], [0.25, -1, 0.5], 0.09, 0.008],
      // The loose end of the tie, down the back.
      [[0, -0.15, -1], [0, -1, -0.3], 0.34, 0.026],
    ],
  },
  top: { type: "coat", color: "#15161c", glow: { kind: "runes", color: "#4fd8ff", strength: 2.2, side: -1, armX: 0.27 } },
  armor: { pauldrons: true, color: "#b7c0cc", size: 0.92, layers: 2 },
  bottom: { type: "jeans", color: "#1b1c22" },
  shoes: { type: "boot", color: "#0e0f13", sole: "#0a0a0c", tie: "#8a93a0" },
};

// Raizen Kuro, the Crimson Sovereign, 27: muscular, broad-shouldered; long jet-black hair with dark
// crimson tips; glowing red eyes; a scar across the left eyebrow; black segmented armour with crimson
// glowing cracks; a torn dark-red cape; armoured gauntlets; heavy boots.
export const RAIZEN = {
  style: "anime",
  heads: 7.4,
  height: 1.93,
  sex: 0,
  build: 1.0,
  muscle: 1.0,
  fat: 0.15,
  skin: "#e2bfa7",
  eyes: "#ff2a3c",
  face: { eyeSize: 0.3, eyeTall: 0.62, iris: 32, glow: true, browTilt: 1.2, browWeight: 1.7, browY: -0.006, jaw: 0.85, nose: 0.85, scar: "leftBrow" },
  hair: {
    style: "long",
    color: "#0c0b10",
    tip: "#8e0c1e",
    tipFrom: -0.2,
    length: 0.58,
    locks: [
      // Wild locks down the back and over the shoulders, ending in crimson.
      [[0.5, 0.3, -0.8], [0.35, -1, -0.35], 0.38, 0.034],
      [[-0.5, 0.3, -0.8], [-0.35, -1, -0.35], 0.38, 0.034],
      [[0, 0.5, -0.85], [0, -1, -0.45], 0.44, 0.04],
      [[0.9, 0.2, -0.2], [0.35, -1, -0.05], 0.3, 0.028],
      [[-0.9, 0.2, -0.2], [-0.35, -1, -0.05], 0.3, 0.028],
      // Crown swept back, a little volume.
      [[0.25, 1, -0.3], [0.2, 0.2, -1], 0.12, 0.034],
      [[-0.25, 1, -0.35], [-0.2, 0.2, -1], 0.12, 0.032],
      // Strands framing the face.
      [[0.62, 0.5, 0.6], [0.3, -1, 0.2], 0.17, 0.011],
      [[-0.6, 0.52, 0.6], [-0.3, -1, 0.2], 0.19, 0.011],
    ],
  },
  top: { type: "plate", color: "#141318", glow: { kind: "cracks", color: "#ff2a3c", strength: 2.4 } },
  armor: { pauldrons: true, gauntlets: true, color: "#1a1a21", size: 1.35, layers: 3, glow: { kind: "cracks", color: "#ff2a3c", strength: 2.4 } },
  bottom: { type: "jeans", color: "#121116" },
  shoes: { type: "boot", color: "#18171c", sole: "#0b0b0d", tie: "#5a0a14" },
  cape: { color: "#7a0f1a", torn: 0.85, length: 1.2, width: 0.66 },
};
