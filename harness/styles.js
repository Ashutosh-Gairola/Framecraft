/**
 * Art styles. A style is the house look the art skill enforces: line, shadow,
 * proportion, eyes, backgrounds, texture. skills/html-anime-art/SKILL.md owns
 * the full description of each one. If the user gives a style reference,
 * the reference wins and the style is the fallback for anything it doesn't show.
 */

export const STYLES = {
  "ink-cel": {
    id: "ink-cel",
    name: "Ink cel",
    summary: "Modern TV cel. Flat local color, one hard shadow, tapered line, silhouette backgrounds.",
    line: "Outer contour 6px, interior 3px at 1080px tall. Tapered by the path.",
    shadow: "One hard shadow shape per form, ink at about 20%.",
    heads: 7,
    eyes: "Large almond eyes, iris about half the eye height, two window catchlights.",
    background: "Silhouette layers with a few practical windows. No line on the background.",
  },
  retro: {
    id: "retro",
    name: "Retro cel",
    summary: "Late-80s and 90s OVA. Heavy line, two shadow tiers, hard hair highlights, dense city backgrounds.",
    line: "Outer contour 8px, interior 4px. Sharp corners on the jaw and nose.",
    shadow: "Two hard tiers: shadow at about 20% ink, deep shadow at about 40% ink inside it.",
    heads: 7.5,
    eyes: "Narrower eyes with a hard upper lid, small iris, one large catchlight.",
    background: "Dense silhouettes with many practical windows and one rim of line along the skyline.",
  },
  "painted-world": {
    id: "painted-world",
    name: "Painted world",
    summary: "Cel characters in front of painted backgrounds built from stacked flat washes.",
    line: "Characters: outer 5px, interior 2.5px. Background: no line at all.",
    shadow: "Characters: one hard shadow. Background forms: three to five stacked washes, each a palette hex at low opacity.",
    heads: 6.5,
    eyes: "Round eyes, iris about two thirds of the eye height, one soft-shaped catchlight drawn as a flat shape.",
    background: "Big cloud and foliage masses as layered flat shapes. Light comes from one side and every wash agrees with it.",
  },
  manga: {
    id: "manga",
    name: "Manga ink",
    summary: "Black and paper with one accent. Screentone, heavy blacks, speed lines.",
    line: "Outer 7px, interior 3px, hatching as straight strokes. Pure ink and paper.",
    shadow: "Shadow is screentone: an SVG dot pattern in ink. Deep shadow is solid ink.",
    heads: 7,
    eyes: "Large eyes drawn in line, iris in ink with paper catchlights. Color only on the accent.",
    background: "Paper, a horizon line, and screentone. Speed lines replace the background in the sakuga shot.",
  },
  chibi: {
    id: "chibi",
    name: "Chibi",
    summary: "Super-deformed. Round shapes, thick even line, huge eyes, squash and stretch.",
    line: "Even 8px line, round caps and joins everywhere.",
    shadow: "None, or one small hard shadow under the chin and hair.",
    heads: 2.5,
    eyes: "Eyes are 40% of the face height, iris fills most of the eye, two big catchlights.",
    background: "Simple flat shapes in two values. Props are drawn oversized.",
  },
};

/**
 * @param {string|undefined} id
 * @returns {object|undefined}
 */
export function styleFor(id) {
  return STYLES[id || "ink-cel"];
}
