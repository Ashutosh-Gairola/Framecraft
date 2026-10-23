/**
 * Frame sizes and the closed color scripts.
 * A color script is the only paint an agent may use, plus at most
 * MAX_DESIGN_COLORS design colors the designer adds for a reference.
 */

export const FPS = 24;

export const ASPECTS = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

export const MAX_DESIGN_COLORS = 3;

export const SCRIPTS = {
  indigo: {
    id: "indigo",
    name: "Indigo moon",
    colors: {
      sky: "#1b2d6b",
      ink: "#101628",
      moon: "#d5e2ff",
      accent: "#e23b4a",
      practical: "#f0c36a",
      iris: "#e7a04a",
      skin: "#f0c2ae",
      hair: "#16141c",
      sclera: "#f6f3ee",
      line: "#e7eefc",
    },
  },
  eclipse: {
    id: "eclipse",
    name: "Vermilion eclipse",
    colors: {
      sky: "#2a1016",
      ink: "#14080c",
      moon: "#100608",
      accent: "#ff3b3b",
      practical: "#f3f6ff",
      iris: "#ff5a4a",
      skin: "#e8b8a8",
      hair: "#1a1014",
      sclera: "#f6f3ee",
      line: "#f6e4e4",
    },
  },
  noon: {
    id: "noon",
    name: "Paper noon",
    colors: {
      sky: "#f2d7ae",
      ink: "#2c261f",
      moon: "#fff6e4",
      accent: "#c4452d",
      practical: "#fffaf2",
      iris: "#5c3d32",
      skin: "#f0c2ae",
      hair: "#241c16",
      sclera: "#f6f3ee",
      line: "#241c16",
    },
  },
  festival: {
    id: "festival",
    name: "Festival",
    colors: {
      sky: "#24143a",
      ink: "#140c1c",
      moon: "#ffd7a1",
      accent: "#ff4d6d",
      practical: "#ffb020",
      iris: "#ffd0a1",
      skin: "#f0c2ae",
      hair: "#1a1020",
      sclera: "#f6f3ee",
      line: "#fff1ea",
    },
  },
};

const HEX = /^#[0-9a-f]{6}$/;

/**
 * Validate the designer's extra colors against a script.
 * @param {Record<string,string>|undefined} input name → hex
 * @param {{colors: Record<string,string>}} script
 * @returns {{ok: true, colors: Record<string,string>} | {ok: false, error: string}}
 */
export function designColors(input, script) {
  const entries = Object.entries(input ?? {});
  if (entries.length > MAX_DESIGN_COLORS) {
    return { ok: false, error: `At most ${MAX_DESIGN_COLORS} design colors.` };
  }
  const colors = {};
  for (const [rawName, rawHex] of entries) {
    const name = String(rawName).trim().toLowerCase();
    const hex = String(rawHex).trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(name)) {
      return { ok: false, error: `Design color name "${rawName}" must be a short lowercase word.` };
    }
    if (name in script.colors) {
      return { ok: false, error: `"${name}" is already a paint on the script.` };
    }
    if (!HEX.test(hex)) {
      return { ok: false, error: `Design color "${name}" must be a #rrggbb hex.` };
    }
    colors[name] = hex;
  }
  return { ok: true, colors };
}
