/**
 * The test cast for the character system (skills/html-anime-character/SKILL.md):
 * one design from a reference photo, drawn real and anime, and Goku from the anime.
 */

// From references/man-reference.jpg ("David Nikulin", Innovation Lab, CC BY 2.0): a slim man in a black
// button-up with the sleeves rolled, dark jeans, black sneakers with white soles, short brown hair.
// Colours sampled with harness/refs.js (studio-lit skin #d6b39d → a warmer #d4a68c under our key).
export const MAN = {
  height: 1.8,
  sex: 0,
  build: 0.4,
  muscle: 0.4,
  fat: 0.15,
  skin: "#d4a68c",
  eyes: "#5a6e7a",
  face: { jaw: 0.55, chin: 0.5, nose: 0.5, lips: 0.45 },
  hair: { style: "short", color: "#3a2a22" },
  brows: "#2e211b",
  top: { type: "shirt", color: "#1f1d1d" },
  bottom: { type: "jeans", color: "#262b38" },
  shoes: { type: "sneaker", color: "#1e1a18", sole: "#eeeae4" },
};

// Goku (Dragon Ball Z, base form): spiked black hair with bangs and a front tuft; an orange gi over a
// blue undershirt; a blue sash, wristbands and boots with red ties; a heavily muscled build; black eyes
// under angled brows. No symbol on the gi (no text in films).
export const GOKU = {
  style: "anime",
  height: 1.75,
  sex: 0,
  build: 0.95,
  muscle: 1.0,
  fat: 0.1,
  skin: "#f3c9a6",
  eyes: "#141414",
  face: { eyeSize: 0.2, eyeTall: 0.74, browTilt: 1, browWeight: 1.7, jaw: 0.7 },
  hair: { style: "goku", color: "#151518" },
  top: { type: "gi", color: "#f2851e", under: "#1f3f94" },
  belt: "#1f3f94",
  bands: "#1f3f94",
  bottom: { type: "gi", color: "#f2851e" },
  shoes: { type: "boot", color: "#1f3f94", sole: "#1f3f94", tie: "#c8302a" },
};
