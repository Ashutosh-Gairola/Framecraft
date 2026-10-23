#!/usr/bin/env node
/**
 * Draws Stickman Blade Fight. Writes compositions/<scene>.html and index.html.
 *
 *   node films/stickman-blade-fight/build/build.mjs
 *
 * Every drawing is written out as SVG: poses come from a stick rig (joint angles,
 * 0° = down, 90° = toward the facing side, 180° = up; torso and tilt lean toward
 * the facing side when positive), effects from seeded series. Key poses are
 * inbetweened by act(): eased, on twos for acting, on ones for fast action, and
 * holds breathe. The output is deterministic: same script, same film.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createKit } from "../../../harness/draw/kit.js";

const FILM = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEQ = JSON.parse(readFileSync(join(FILM, "sequence.json"), "utf8"));
const W = 1920;
const H = 1080;
const FPS = 24;
const F = 1 / FPS;

// The sheet's paints, plus the one design color.
const C = {
  sky: "#1b2d6b",
  ink: "#101628",
  moon: "#d5e2ff",
  accent: "#e23b4a",
  practical: "#f0c36a",
  skin: "#f0c2ae",
  hair: "#16141c",
  line: "#e7eefc",
  volt: "#38b6ff",
};

const K = createKit({ film: FILM, colors: C });
const { r1, r3, pt, seeded, L, along, rig, smear, sparks, shards, speedLines, hLines, bolt, arcs, petals, skyDefs, RAIN, rain, rainTl, clouds, PLANS, voiceOf, scene, swaps, flash, push, pan, shake, fullFlash, shotSvg, EASE, ANGLES, resolve, lerpPose, breathe, flicker, show, ringTl, debrisTl } = K;
const act = (id, who, keys, o = {}) => K.act(id, who, keys, { render: (p, w) => figure(p, w), step: 2 * F, interp: "ease", ...o });

const CAST = {
  shadow: { body: C.hair, rim: C.accent, blade: C.accent },
  phantom: { body: C.line, rim: C.volt, blade: C.volt },
};

function blade(hand, deg, len, color, s, { cracked = false, glow = 1 } = {}) {
  const tip = along(hand, deg, len);
  const n = along([0, 0], deg + 90, 1);
  const off = (p, k) => [p[0] + n[0] * k, p[1] + n[1] * k];
  const far = along(hand, deg, len + 18 * s);
  const butt = along(hand, deg + 180, 26 * s);
  const g1 = along(hand, deg, 8 * s);
  const parts = [
    `<path d="M${pt(hand)} L${pt(butt)}" stroke="${C.hair}" stroke-width="${r1(8 * s)}" stroke-linecap="round" />`,
    glow > 0
      ? `<polygon points="${pt(off(hand, 15 * s))} ${pt(far)} ${pt(off(hand, -15 * s))}" fill="${color}" opacity="${r3(0.3 * glow)}" />`
      : "",
    `<polygon points="${pt(off(hand, 5 * s))} ${pt(tip)} ${pt(off(hand, -5 * s))}" fill="${color}" />`,
    `<polygon points="${pt(off(hand, 1.6 * s))} ${pt(along(hand, deg, len * 0.86))} ${pt(off(hand, -1.6 * s))}" fill="${C.line}" />`,
    `<path d="M${pt(off(g1, 12 * s))} L${pt(off(g1, -12 * s))}" stroke="${C.line}" stroke-width="${r1(4 * s)}" stroke-linecap="round" />`,
  ];
  if (cracked) {
    const c = along(hand, deg, len * 0.55);
    parts.push(
      `<path d="M${pt(off(c, 6 * s))} L${pt(along(c, deg + 30, 10 * s))} L${pt(off(along(c, deg, 14 * s), -6 * s))}" stroke="${C.hair}" stroke-width="${r1(3 * s)}" fill="none" />`,
    );
  }
  return parts.join("");
}

/** A stick figure. who: shadow | phantom. */
function figure(p, who, id = "", cls = "") {
  const j = rig(p);
  const s = p.s ?? 1;
  const f = p.face ?? 1;
  const k = CAST[who];
  const line = (...ps) => `M${ps.map(pt).join(" L")}`;
  const back = [line(j.bh, j.be, j.sh), line(j.bf, j.bk, j.hip)].join(" ");
  const front = [line(j.hip, j.neck), line(j.ff, j.fk, j.hip), line(j.sh, j.fe, j.fh)].join(" ");
  const w = 15 * s;
  const hr = L.head * s;
  const blades = (p.blades ?? []).map((b) =>
    blade(b.hand === "b" ? j.bh : j.fh, b.a * f, (b.len ?? (who === "shadow" ? 175 : 128)) * s, k.blade, s, {
      cracked: b.cracked,
      glow: b.glow ?? 1,
    }),
  );
  const backBlades = blades.filter((_, i) => p.blades[i].hand === "b").join("");
  const frontBlades = blades.filter((_, i) => p.blades[i].hand !== "b").join("");
  const eye =
    p.eye === false
      ? `<path d="M${pt([j.head[0] + f * hr * 0.05, j.head[1] - 1 * s])} L${pt([j.head[0] + f * hr * 0.7, j.head[1] - 1 * s])}" stroke="${C.ink}" stroke-width="${r1(3 * s)}" />`
      : `<polygon points="${pt([j.head[0] + f * hr * 0.12, j.head[1] - 6 * s])} ${pt([j.head[0] + f * hr * 0.82, j.head[1] - 3 * s])} ${pt([j.head[0] + f * hr * 0.12, j.head[1] + 1 * s])}" fill="${k.blade}" />`;
  const rimAttrs = `fill="none" stroke="${k.rim}" stroke-width="${r1(w + 8 * s)}" stroke-linecap="round" stroke-linejoin="round" opacity="${p.rim ?? 0.9}"`;
  const bodyAttrs = `fill="none" stroke="${k.body}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"`;
  return [
    `<g${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}>`,
    backBlades,
    `<path d="${back}" ${rimAttrs} />`,
    `<path d="${back}" ${bodyAttrs} />`,
    `<path d="${front}" ${rimAttrs} />`,
    `<circle cx="${r1(j.head[0])}" cy="${r1(j.head[1])}" r="${r1(hr + 4 * s)}" fill="${k.rim}" opacity="${p.rim ?? 0.9}" />`,
    `<path d="${front}" ${bodyAttrs} />`,
    `<circle cx="${r1(j.head[0])}" cy="${r1(j.head[1])}" r="${r1(hr)}" fill="${k.body}" />`,
    p.eye === null ? "" : eye,
    frontBlades,
    `</g>`,
  ].join("");
}

/** A flat silhouette of a figure in one paint (afterimages, the white frame). */
function ghost(p, who, color, opacity, id = "", cls = "") {
  const j = rig(p);
  const s = p.s ?? 1;
  const line = (...ps) => `M${ps.map(pt).join(" L")}`;
  const d = [line(j.bh, j.be, j.sh), line(j.bf, j.bk, j.hip), line(j.hip, j.neck), line(j.ff, j.fk, j.hip), line(j.sh, j.fe, j.fh)].join(" ");
  const f = p.face ?? 1;
  const bl = (p.blades ?? [])
    .map((b) => {
      const hand = b.hand === "b" ? j.bh : j.fh;
      return `<path d="M${pt(hand)} L${pt(along(hand, b.a * f, (b.len ?? (who === "shadow" ? 175 : 128)) * s))}" stroke="${color}" stroke-width="${r1(7 * s)}" stroke-linecap="round" />`;
    })
    .join("");
  return `<g${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""} opacity="${opacity}"><path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(17 * s)}" stroke-linecap="round" stroke-linejoin="round" /><circle cx="${r1(j.head[0])}" cy="${r1(j.head[1])}" r="${r1(29 * s)}" fill="${color}" />${bl}</g>`;
}

function trees(seed, y, n, h, x0 = -60, x1 = W + 200, color = C.hair) {
  const rand = seeded(seed);
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n + rand() * 40;
    const th = h * (0.7 + rand() * 0.6);
    const tw = 60 + rand() * 50;
    d += `M${r1(x - tw)},${r1(y)} L${r1(x)},${r1(y - th)} L${r1(x + tw)},${r1(y)} Z `;
    d += `M${r1(x - tw * 0.8)},${r1(y - th * 0.35)} L${r1(x)},${r1(y - th * 1.12)} L${r1(x + tw * 0.8)},${r1(y - th * 0.35)} Z `;
  }
  return `<path d="${d}" fill="${color}" />`;
}

/** The temple hall: platform, pillars, two curved roofs, a broken gap. */
function temple(x, y, s, { broken = true, edge = 0.35 } = {}) {
  const P = (px, py) => `${r1(x + px * s)},${r1(y + py * s)}`;
  const roof1 = `M${P(-330, -150)} Q${P(-260, -160)} ${P(-200, -230)} L${P(200, -230)} Q${P(260, -160)} ${P(330, -150)} L${P(360, -170)} Q${P(250, -170)} ${P(170, -280)} L${P(-170, -280)} Q${P(-250, -170)} ${P(-360, -170)} Z`;
  const roof2 = `M${P(-200, -300)} Q${P(-150, -305)} ${P(-110, -360)} L${P(110, -360)} Q${P(150, -305)} ${P(200, -300)} L${P(225, -318)} Q${P(140, -318)} ${P(90, -400)} L${P(-90, -400)} Q${P(-140, -318)} ${P(-225, -318)} Z`;
  let out = `<rect x="${r1(x - 300 * s)}" y="${r1(y - 20 * s)}" width="${r1(600 * s)}" height="${r1(30 * s)}" fill="${C.ink}" />`;
  out += `<rect x="${r1(x - 250 * s)}" y="${r1(y - 290 * s)}" width="${r1(500 * s)}" height="${r1(270 * s)}" fill="${C.ink}" />`;
  for (const px of [-230, -120, 0, 120, 230]) {
    out += `<rect x="${r1(x + (px - 12) * s)}" y="${r1(y - 230 * s)}" width="${r1(24 * s)}" height="${r1(210 * s)}" fill="${C.hair}" />`;
  }
  out += `<rect x="${r1(x - 220 * s)}" y="${r1(y - 300 * s)}" width="${r1(440 * s)}" height="${r1(60 * s)}" fill="${C.hair}" />`;
  out += `<path d="${roof2}" fill="${C.hair}" stroke="${C.line}" stroke-opacity="${edge}" stroke-width="${r1(3 * s)}" />`;
  out += `<path d="${roof1}" fill="${C.hair}" stroke="${C.line}" stroke-opacity="${edge}" stroke-width="${r1(3 * s)}" />`;
  if (broken) {
    out += `<path d="M${P(60, -275)} L${P(95, -238)} L${P(130, -262)} L${P(150, -232)} L${P(120, -230)} L${P(85, -246)} L${P(62, -232)} Z" fill="${C.sky}" />`;
    out += `<path d="M${P(-40, -398)} L${P(-12, -370)} L${P(10, -392)} L${P(4, -360)} L${P(-30, -362)} Z" fill="${C.sky}" />`;
  }
  return out;
}

function courtyard(yh, edge = 0.08) {
  let d = "";
  for (let i = -8; i <= 8; i += 1) {
    d += `M${r1(W / 2 + i * 70)},${yh} L${r1(W / 2 + i * 340)},${H} `;
  }
  for (const y of [yh + 30, yh + 75, yh + 140, yh + 230, yh + 350]) d += `M-100,${y} L${W + 300},${y} `;
  return `<rect x="-200" y="${yh}" width="${W + 600}" height="${H - yh + 50}" fill="${C.ink}" /><path d="${d}" stroke="${C.line}" stroke-width="2" opacity="${edge}" /><path d="M-200,${yh} L${W + 400},${yh}" stroke="${C.line}" stroke-width="2" opacity="0.18" />`;
}

function pillar(x, y, h, w = 46, cracked = false) {
  let out = `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="${C.hair}" stroke="${C.line}" stroke-opacity="0.25" stroke-width="2" />`;
  if (cracked) out += `<path d="M${x - w / 2},${y - h * 0.6} L${x},${y - h * 0.55} L${x - 6},${y - h * 0.45} L${x + w / 2},${y - h * 0.4}" stroke="${C.line}" stroke-opacity="0.5" stroke-width="2" fill="none" />`;
  return out;
}

function stairs(x, y, n, w, step = 26) {
  let out = "";
  for (let i = 0; i < n; i += 1) {
    const yy = y - i * step;
    const ww = w - i * 26;
    out += `<rect x="${x - ww / 2}" y="${yy - step}" width="${ww}" height="${step}" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.22" stroke-width="2" />`;
  }
  out += `<path d="M${x + w / 2 - 70},${y - step} L${x + w / 2 - 40},${y - step * 2 + 6} L${x + w / 2 - 10},${y - step}" fill="${C.sky}" />`;
  return out;
}

function moonDisc(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r * 1.6}" fill="${C.moon}" opacity="0.08" /><circle cx="${x}" cy="${y}" r="${r}" fill="${C.moon}" opacity="0.9" />`;
}

/* ---------------- poses ---------------- */

const SH = {
  stand: { torso: 6, fua: 25, ffa: 50, bua: -20, bfa: -5, fth: 14, fsh: 4, bth: -14, bsh: -4, blades: [{ hand: "f", a: 40 }] },
  guard: { torso: 10, fua: 60, ffa: 110, bua: 45, bfa: 105, fth: 32, fsh: 0, bth: -26, bsh: -8, blades: [{ hand: "f", a: 135 }] },
  leanBack: { torso: -32, tilt: -10, fua: 50, ffa: 80, bua: -50, bfa: -30, fth: 38, fsh: 10, bth: -12, bsh: 18, blades: [{ hand: "f", a: 70 }] },
  coil: { torso: -18, fua: -100, ffa: -135, bua: -80, bfa: -115, fth: 28, fsh: 4, bth: -32, bsh: -10, blades: [{ hand: "f", a: -150 }] },
  swing: { torso: 22, fua: 95, ffa: 95, bua: 82, bfa: 92, fth: 42, fsh: 0, bth: -38, bsh: -12, blades: [{ hand: "f", a: 96 }] },
  overhead: { torso: -5, fua: 170, ffa: 185, bua: 160, bfa: 180, fth: 30, fsh: 0, bth: -30, bsh: -6, blades: [{ hand: "f", a: 200 }] },
  strikeDown: { torso: 42, tilt: 10, fua: 70, ffa: 45, bua: 62, bfa: 42, fth: 55, fsh: -5, bth: -42, bsh: -22, blades: [{ hand: "f", a: 22 }] },
  raise: { torso: 0, fua: 172, ffa: 180, bua: 162, bfa: 176, fth: 16, fsh: 0, bth: -16, bsh: 0, blades: [{ hand: "f", a: 180 }] },
  spin: { torso: 0, fua: 92, ffa: 92, bua: -92, bfa: -92, fth: 24, fsh: 0, bth: -24, bsh: 0, eye: false, blades: [{ hand: "f", a: 92 }] },
  eyesShut: { torso: 8, fua: 60, ffa: 110, bua: 45, bfa: 105, fth: 32, fsh: 0, bth: -26, bsh: -8, eye: false, blades: [{ hand: "f", a: 135 }] },
  dash: { torso: 48, fua: 100, ffa: 100, bua: -60, bfa: -40, fth: 62, fsh: 20, bth: -62, bsh: -22, blades: [{ hand: "f", a: 100 }] },
  air: { torso: 15, fua: 120, ffa: 140, bua: 40, bfa: 80, fth: 62, fsh: -20, bth: 10, bsh: 60, blades: [{ hand: "f", a: 135 }] },
  airStrike: { torso: 25, fua: 100, ffa: 90, bua: 80, bfa: 85, fth: 50, fsh: -30, bth: -20, bsh: 40, blades: [{ hand: "f", a: 80 }] },
  land: { torso: 30, fua: 60, ffa: 30, bua: -50, bfa: -70, fth: 80, fsh: -8, bth: -22, bsh: -90, blades: [{ hand: "f", a: 100 }] },
  breathe: { torso: 18, tilt: 8, fua: 30, ffa: 55, bua: -15, bfa: 0, fth: 22, fsh: 0, bth: -22, bsh: -4, blades: [{ hand: "f", a: 45 }] },
  still: { torso: 4, fua: 18, ffa: 30, bua: -12, bfa: -4, fth: 10, fsh: 2, bth: -10, bsh: -2, blades: [{ hand: "f", a: 30, cracked: true, glow: 0.35 }] },
  turned: { face: -1, torso: 4, fua: 18, ffa: 30, bua: -12, bfa: -4, fth: 10, fsh: 2, bth: -10, bsh: -2, blades: [{ hand: "f", a: 30, cracked: true, glow: 0.2 }] },
  backTo: { torso: 10, fua: 85, ffa: 95, bua: -40, bfa: -30, fth: 38, fsh: 0, bth: -30, bsh: -10, blades: [{ hand: "f", a: 95, cracked: true }] },
};

const PH = {
  crouch: { torso: 22, tilt: 10, fua: -20, ffa: -40, bua: -30, bfa: -50, fth: 78, fsh: -6, bth: -24, bsh: -82, blades: [{ hand: "f", a: -70 }, { hand: "b", a: -80 }] },
  drawAntic: { torso: 28, fua: -45, ffa: -70, bua: -55, bfa: -85, fth: 85, fsh: -4, bth: -20, bsh: -90, blades: [{ hand: "f", a: -95 }, { hand: "b", a: -105 }] },
  drawOut: { torso: 5, fua: 100, ffa: 125, bua: -100, bfa: -125, fth: 52, fsh: -5, bth: -42, bsh: -30, blades: [{ hand: "f", a: 115 }, { hand: "b", a: -115 }] },
  stance: { torso: 16, fua: 70, ffa: 100, bua: 50, bfa: 82, fth: 56, fsh: -10, bth: -46, bsh: -16, blades: [{ hand: "f", a: 110 }, { hand: "b", a: 95 }] },
  slash: { torso: 32, fua: 82, ffa: 60, bua: -70, bfa: -92, fth: 72, fsh: 0, bth: -62, bsh: -30, blades: [{ hand: "f", a: 45 }, { hand: "b", a: -120 }] },
  blockX: { torso: -12, fua: 112, ffa: 160, bua: 122, bfa: 172, fth: 42, fsh: 0, bth: -46, bsh: -18, blades: [{ hand: "f", a: 210 }, { hand: "b", a: 140 }] },
  slide: { torso: -26, fua: 100, ffa: 140, bua: 82, bfa: 122, fth: 52, fsh: 20, bth: -42, bsh: -52, blades: [{ hand: "f", a: 200 }, { hand: "b", a: 150 }] },
  flip: { torso: 150, fua: 30, ffa: 20, bua: -30, bfa: -10, fth: 172, fsh: 200, bth: 150, bsh: 172, blades: [{ hand: "f", a: 60 }, { hand: "b", a: -60 }] },
  land: { torso: 36, fua: 62, ffa: 30, bua: -62, bfa: -82, fth: 86, fsh: -10, bth: -20, bsh: -96, blades: [{ hand: "f", a: 100 }, { hand: "b", a: -120 }] },
  raiseTwin: { torso: 0, fua: 150, ffa: 160, bua: -150, bfa: -160, fth: 26, fsh: 0, bth: -26, bsh: 0, blades: [{ hand: "f", a: 150 }, { hand: "b", a: -150 }] },
  rush: { torso: 56, fua: -110, ffa: -100, bua: -122, bfa: -112, fth: 82, fsh: 10, bth: -72, bsh: -42, blades: [{ hand: "f", a: -100 }, { hand: "b", a: -88 }] },
  strikeHigh: { torso: 20, fua: 168, ffa: 150, bua: 158, bfa: 140, fth: 46, fsh: -6, bth: -40, bsh: -20, blades: [{ hand: "f", a: 122 }, { hand: "b", a: 102 }] },
  brace: { torso: -20, fua: 100, ffa: 150, bua: 92, bfa: 160, fth: 46, fsh: 0, bth: -52, bsh: -22, blades: [{ hand: "f", a: 205 }, { hand: "b", a: 145 }] },
  flyUp: { torso: 0, fua: 168, ffa: 175, bua: -168, bfa: -175, fth: 6, fsh: 0, bth: -6, bsh: 0, blades: [{ hand: "f", a: 205 }, { hand: "b", a: -205 }] },
  spinX: { torso: 10, fua: 120, ffa: 150, bua: 140, bfa: 165, fth: 40, fsh: -30, bth: -10, bsh: 30, blades: [{ hand: "f", a: 225 }, { hand: "b", a: 135 }] },
  air: { torso: 10, fua: 130, ffa: 150, bua: 60, bfa: 90, fth: 50, fsh: -30, bth: -5, bsh: 50, blades: [{ hand: "f", a: 150 }, { hand: "b", a: 100 }] },
  kneel: { torso: 26, tilt: 22, fua: 22, ffa: 12, bua: -12, bfa: -6, fth: 82, fsh: -10, bth: -10, bsh: -96, blades: [{ hand: "f", a: 14, len: 120 }] },
  rise: { torso: 30, tilt: 5, fua: -40, ffa: -60, bua: -20, bfa: -30, fth: 60, fsh: -10, bth: -30, bsh: -40, blades: [{ hand: "f", a: -70, len: 120 }] },
  dash: { torso: 58, fua: 100, ffa: 96, bua: -100, bfa: -90, fth: 84, fsh: 12, bth: -76, bsh: -42, blades: [{ hand: "f", a: 98, len: 120 }] },
  past: { torso: 12, fua: 90, ffa: 100, bua: -40, bfa: -30, fth: 40, fsh: 0, bth: -34, bsh: -10, blades: [{ hand: "f", a: 100, len: 120 }] },
};

const sh = (name, o) => ({ ...SH[name], ...o });
const ph = (name, o) => ({ face: -1, ...PH[name], ...o });

const out = {};

/* ================= Scene 1 — The Encounter (12s) ================= */
{
  const p = "s1";
  const T = Object.fromEntries(PLANS["s1-encounter"].shots.map((s) => [s.id, s]));
  const shots = {};

  // Establish: wide aerial over the temple, the trees, the storm. Shadow small on the stair.
  {
    const id = "establish";
    const k = `${p}-${id}`;
    const shadow = act(`${k}-sh`, "shadow", [[0, sh("stand", { x: 540, ground: 744, s: 0.42 })]], { end: T[id].end });
    const world = [
      `<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(11, 60, 7),
      trees(3, 700, 26, 260, -80, W + 120, C.ink),
      temple(980, 820, 1.25),
      trees(5, 1000, 18, 360),
      courtyard(820, 0.06),
      stairs(560, 900, 6, 300),
      shadow.svg,
      `<g id="${k}-petals">${petals(21, 26, 0, 120, W, 1000)}</g>`,
      bolt(1500, -20, 1320, 420, 8, `${k}-bolt`, "d"),
      rain(k, 0.3, 0.4),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.moon, 0.5)),
      tl: [
        `tl.fromTo("#${k}-cam", { scale: 1.06, y: -40 }, { scale: 1, y: 0, duration: ${T[id].end}, ease: "power1.inOut", transformOrigin: "50% 70%" }, 0);`,
        `tl.fromTo("#${k}-petals", { x: 0, y: 0 }, { x: -60, y: 90, duration: ${T[id].end}, ease: "none" }, 0);`,
        ...rainTl(k, 0, T[id].end),
        ...shadow.tl,
        ...flash(`${k}-bolt`, 1.2, 3),
        ...flash(`${k}-flash`, 1.2, 2),
      ],
    };
  }

  // Approach: Shadow on the broken stair, blade down, red energy flickering. He tilts his head. Line 1.
  {
    const id = "approach";
    const k = `${p}-${id}`;
    const g = 900;
    const s0 = T[id].start;
    const base = sh("stand", { x: 760, ground: g - 130, s: 1.05 });
    const shadow = act(`${k}-sh`, "shadow", [[s0, base], [s0 + 0.5, base], [s0 + 0.95, { ...base, tilt: 26 }, { ease: "inOut" }]], { end: T[id].end });
    const j = rig(base);
    const tip = along(j.fh, 40, 175 * 1.05);
    const world = [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(12, 80, 6),
      trees(7, 760, 20, 300, -100, W + 300, C.ink),
      pillar(1500, g - 20, 520, 70, true),
      pillar(1760, g - 20, 560, 70),
      courtyard(g - 40, 0.07),
      stairs(760, g + 60, 8, 760, 24),
      shadow.svg,
      `<g id="${k}-e1">${arcs(j.fh, tip, 3, C.accent)}</g><g id="${k}-e2" class="d">${arcs(j.fh, tip, 5, C.accent)}</g>`,
      `<g id="${k}-petals">${petals(23, 10, 0, 200, W, 900)}</g>`,
      rain(k, 0.3, 0.45),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...pan(`${k}-cam`, s0, T[id].end - s0, -110),
        `tl.fromTo("#${k}-petals", { x: 0, y: 0 }, { x: -40, y: 70, duration: ${r3(T[id].end - s0)}, ease: "none" }, ${s0});`,
        ...rainTl(k, s0, T[id].end - s0),
        ...shadow.tl,
        ...flicker(`${k}-e1`, `${k}-e2`, s0, T[id].end),
      ],
    };
  }

  // Sakuga: Phantom appears on the rooftop in blue lightning and draws both blades. SHING! SHING!
  {
    const id = "sakuga";
    const k = `${p}-${id}`;
    const roofY = 690;
    const s0 = T[id].start;
    const base = { x: 1150, ground: roofY, s: 1.0 };
    const appear = s0 + 0.35;
    const draw = s0 + 1.7;
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [appear, ph("crouch", base)],
        [s0 + 0.9, ph("crouch", base)],
        [draw - 0.25, ph("drawAntic", base), { ease: "inOut" }],
        [draw, ph("drawOut", base), { ease: "out", ones: true }],
        [draw + 0.9, ph("drawOut", base)],
        [s0 + 3.1, ph("stance", base), { ease: "inOut" }],
      ],
      { end: T[id].end, from: appear },
    );
    const hand = rig(ph("drawOut", base));
    const world = [
      `<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      moonDisc(560, 300, 90),
      clouds(13, 120, 6),
      `<path d="M-100,${roofY + 6} Q600,${roofY - 30} ${W + 100},${roofY + 40} L${W + 100},${H + 100} L-100,${H + 100} Z" fill="${C.hair}" stroke="${C.line}" stroke-opacity="0.3" stroke-width="3" />`,
      `<path d="M${W * 0.15},${roofY + 60} L${W * 0.95},${roofY + 120} M${W * 0.1},${roofY + 140} L${W},${roofY + 220} M0,${roofY + 230} L${W},${roofY + 320}" stroke="${C.line}" stroke-opacity="0.12" stroke-width="3" />`,
      `<path d="M1400,${roofY + 70} L1460,${roofY + 40} L1520,${roofY + 90} L1480,${roofY + 120} Z" fill="${C.sky}" />`,
      bolt(1180, -40, 1150, roofY - 300, 14, `${k}-bolt`, "d"),
      `<g id="${k}-smear" class="d">${smear(hand.sh, 40, 230, -150, -60, C.volt, 0.7)}${smear(hand.sh, 40, 230, 150, 60, C.volt, 0.7)}</g>`,
      phantom.svg,
      `<g id="${k}-spark1" class="d">${sparks(hand.fh, 12, 70, C.line, 31)}</g>`,
      `<g id="${k}-spark2" class="d">${sparks(hand.bh, 12, 70, C.volt, 37)}</g>`,
      `<g id="${k}-petals">${petals(29, 12, 0, 150, W, 800)}</g>`,
      rain(k, 0.3, 0.45),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.moon, 0.85)),
      dip: C.ink,
      tl: [
        ...rainTl(k, s0, T[id].end - s0),
        `tl.fromTo("#${k}-petals", { x: 0, y: 0 }, { x: -50, y: 80, duration: 4, ease: "none" }, ${s0});`,
        ...flash(`${k}-flash`, appear, 2),
        ...flash(`${k}-bolt`, appear, 4),
        ...phantom.tl,
        ...flash(`${k}-smear`, draw - 3 * F, 3),
        ...flash(`${k}-spark1`, draw, 5),
        ...flash(`${k}-spark2`, draw + 6 * F, 5),
        ...shake(`${k}-cam`, draw),
      ],
    };
  }

  // Button: close on both fighters, head and shoulders, glaring across the cut. "I came to end this."
  {
    const id = "button";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const shBust = sh("guard", { x: 470, y: 1060, s: 3.0, torso: 8, tilt: 6 });
    const phBust = ph("stance", { x: 1450, y: 1060, s: 3.0, torso: 10, tilt: 4 });
    const shadow = act(`${k}-sh`, "shadow", [[s0, shBust]], { end: T[id].end, breath: 0.6 });
    const phantom = act(`${k}-ph`, "phantom", [[s0, phBust]], { end: T[id].end, breath: 0.6 });
    const sj = rig(shBust);
    const pj = rig(phBust);
    const glint = (c, color, dir) => `<polygon points="${pt([c[0], c[1] - 18])} ${pt([c[0] + dir * 180, c[1]])} ${pt([c[0], c[1] + 18])}" fill="${color}" opacity="0.9" /><polygon points="${pt([c[0] - dir * 60, c[1]])} ${pt([c[0], c[1] - 50])} ${pt([c[0] + dir * 60, c[1]])} ${pt([c[0], c[1] + 50])}" fill="${C.line}" />`;
    const eyeS = [sj.head[0] + 0.5 * 27 * 3, sj.head[1] - 6];
    const eyeP = [pj.head[0] - 0.5 * 27 * 3, pj.head[1] - 6];
    const world = [
      `<defs><clipPath id="${k}-left"><rect x="0" y="0" width="${W / 2}" height="${H}" /></clipPath><clipPath id="${k}-right"><rect x="${W / 2}" y="0" width="${W / 2}" height="${H}" /></clipPath></defs>`,
      `<g clip-path="url(#${k}-left)"><rect x="0" y="0" width="${W / 2}" height="${H}" fill="url(#${k}-sky)" />${clouds(15, 200, 4, C.ink, 0.6)}${shadow.svg}<g id="${k}-g1" class="d">${glint(eyeS, C.accent, 1)}</g></g>`,
      `<g clip-path="url(#${k}-right)"><rect x="${W / 2}" y="0" width="${W / 2}" height="${H}" fill="${C.ink}" />${clouds(16, 160, 4, C.sky, 0.5)}${phantom.svg}<g id="${k}-g2" class="d">${glint(eyeP, C.volt, -1)}</g></g>`,
      `<rect x="${W / 2 - 3}" y="0" width="6" height="${H}" fill="${C.line}" />`,
      bolt(960, -40, 980, H + 40, 41, `${k}-bolt`, "d"),
      rain(k, 0.25, 0.35),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.moon, 0.9)),
      tl: [
        ...push(`${k}-cam`, s0, T[id].end - s0, "50% 40%"),
        ...rainTl(k, s0, T[id].end - s0),
        ...shadow.tl,
        ...phantom.tl,
        ...flash(`${k}-g1`, s0 + 1.7, 6),
        ...flash(`${k}-g2`, s0 + 1.75, 6),
        ...flash(`${k}-bolt`, 11.0, 3),
        ...flash(`${k}-flash`, 11.0, 2),
      ],
    };
  }
  out["s1-encounter"] = scene("s1-encounter", p, shots);
}

/* ================= Scene 2 — First Clash (20s) ================= */
{
  const p = "s2";
  const T = Object.fromEntries(PLANS["s2-first-clash"].shots.map((s) => [s.id, s]));
  const shots = {};
  const G = 880;
  const yard = (k) =>
    [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(17, 40, 7),
      trees(9, 560, 22, 260, -100, W + 300, C.ink),
      temple(960, 640, 0.9),
      pillar(260, G - 60, 380, 50, true),
      pillar(1700, G - 60, 400, 50),
      courtyard(G - 60, 0.08),
    ].join("");

  // Establish: low angle. Phantom sinks, the wet stone cracks, he launches as a blue streak.
  {
    const id = "establish";
    const k = `${p}-${id}`;
    const P = (n, o) => ph(n, { x: 1400, ground: G, s: 0.95, ...o });
    const shadow = act(`${k}-sh`, "shadow", [[0, sh("guard", { x: 560, ground: G, s: 0.95 })]], { end: 3 });
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [0, P("stance")],
        [1.4, P("stance")],
        [2.1, P("rush"), { ease: "inOut" }],
        [2.45, P("rush", { x: 1340 })],
      ],
      { end: 2.6 },
    );
    const world = [
      yard(k),
      shadow.svg,
      phantom.svg,
      `<path id="${k}-crack" class="d" d="M1330,${G} L1390,${G - 6} L1420,${G + 4} L1470,${G - 4} M1400,${G} L1380,${G + 30} L1410,${G + 50}" stroke="${C.line}" stroke-width="3" fill="none" />`,
      `<g id="${k}-streak" class="d"><polygon points="1500,${G - 150} 1100,${G - 120} 700,${G - 100} 1100,${G - 90} 1500,${G - 60}" fill="${C.volt}" opacity="0.85" />${hLines(G - 200, G - 40, 18, C.volt, 51, 0.7)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...push(`${k}-cam`, 0, 3, "50% 80%"),
        ...rainTl(k, 0, 3),
        ...shadow.tl,
        ...phantom.tl,
        ...show(`${k}-crack`, 2.1),
        ...show(`${k}-streak`, 2.6),
        `tl.fromTo("#${k}-streak", { x: 0 }, { x: -500, duration: 0.4, ease: "power2.in" }, 2.6);`,
      ],
    };
  }

  // Approach: Lightning dash. Phantom arrives at Shadow's left with a diagonal slash; Shadow pivots back. FWOOSH.
  {
    const id = "approach";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const S = (n, o) => sh(n, { x: 900, ground: G, s: 1.15, ...o });
    const P = (n, o) => ph(n, { x: 1280, ground: G, s: 1.15, ...o });
    const arrive = s0 + 0.3;
    const cut = arrive + 0.35;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, S("guard")],
        [cut - 0.12, S("guard")],
        [cut + 0.1, S("leanBack"), { ease: "out", ones: true }],
        [cut + 1.0, S("leanBack")],
        [cut + 1.7, S("guard"), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [arrive, P("strikeHigh", { x: 1340 })],
        [cut - 0.15, P("strikeHigh")],
        [cut, P("slash"), { ease: "out", ones: true }],
        [cut + 0.9, P("slash")],
        [cut + 1.7, P("stance", { x: 1330 }), { ease: "inOut" }],
      ],
      { end: T[id].end, from: arrive },
    );
    const world = [
      yard(k),
      `<g id="${k}-lines">${speedLines([1200, 600], 40, C.volt, 61, 0.35)}</g>`,
      shadow.svg,
      `<g id="${k}-smear" class="d">${smear(rig(P("slash")).sh, 70, 230, -170, -50, C.volt, 0.75)}</g>`,
      phantom.svg,
      `<g id="${k}-whoosh" class="d">${hLines(400, 800, 10, C.line, 63, 0.35)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...pan(`${k}-cam`, s0, 3, -100),
        ...rainTl(k, s0, 3),
        `tl.set("#${k}-lines", { opacity: 0 }, ${K.ft(arrive)});`,
        ...shadow.tl,
        ...phantom.tl,
        ...flash(`${k}-smear`, cut - 3 * F, 4),
        ...flash(`${k}-whoosh`, cut, 8),
      ],
    };
  }

  // Turn: close on Shadow coiling for the spin.
  {
    const id = "turn";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const S = (n, o) => sh(n, { x: 860, ground: 1000, s: 1.7, ...o });
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, S("leanBack")],
        [s0 + 0.8, S("guard"), { ease: "inOut" }],
        [s0 + 1.8, S("coil"), { ease: "inOut" }],
        [s0 + 2.6, S("coil", { torso: -26 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const world = [`<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#${k}-sky)" />`, clouds(19, 60, 6), courtyard(780, 0.08), shadow.svg, rain(k)].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...rainTl(k, s0, 3), ...shadow.tl] };
  }

  // Sakuga: cross-blade counter. KRAAANG. Sparks, shockwave, roof tiles; Phantom slides back.
  {
    const id = "sakuga";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const S = (n, o) => sh(n, { x: 760, ground: G, s: 1.2, ...o });
    const P = (n, o) => ph(n, { x: 1180, ground: G, s: 1.2, ...o });
    const hitT = s0 + 0.77;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, S("coil")],
        [s0 + 0.5, S("coil", { torso: -30 }), { ease: "inOut" }],
        [hitT, S("swing"), { ease: "in", ones: true }],
        [hitT + 1.6, S("swing", { torso: 26 }), { ease: "lin" }],
        [hitT + 2.6, S("guard", { x: 780 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, P("stance")],
        [s0 + 0.45, P("stance")],
        [hitT - 0.05, P("blockX"), { ease: "out", ones: true }],
        [hitT + 1.6, P("blockX", { x: 1200 }), { ease: "lin" }],
        [hitT + 2.0, P("slide", { x: 1380 }), { ease: "out", ones: true }],
        [hitT + 2.8, P("slide", { x: 1480 }), { ease: "out" }],
        [hitT + 3.5, P("stance", { x: 1480 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const hit = [990, 560];
    const world = [
      yard(k),
      `<g id="${k}-smear" class="d">${smear(rig(S("swing")).sh, 60, 330, -120, 96, C.accent, 0.7)}</g>`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-sparks" class="d">${sparks(hit, 18, 220, C.accent, 73, 6)}${sparks(hit, 18, 220, C.volt, 79, 6)}</g>`,
      `<g id="${k}-sparks2" class="d">${sparks(hit, 14, 380, C.accent, 83, 4)}${sparks(hit, 14, 380, C.volt, 89, 4)}</g>`,
      `<ellipse id="${k}-ring" class="d" cx="${hit[0]}" cy="${hit[1]}" rx="120" ry="60" fill="none" stroke="${C.line}" stroke-width="10" />`,
      `<g id="${k}-tiles" class="d">${shards([960, 330], 16, 300, C.hair, 97)}</g>`,
      `<g id="${k}-dust" class="d">${hLines(G - 120, G - 10, 8, C.line, 71, 0.5)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.line, 1)),
      tl: [
        ...rainTl(k, s0, 5),
        ...shadow.tl,
        ...phantom.tl,
        ...flash(`${k}-smear`, hitT - 4 * F, 4),
        ...flash(`${k}-flash`, hitT, 2),
        ...flash(`${k}-sparks`, hitT + 2 * F, 12),
        ...flash(`${k}-sparks2`, hitT + 14 * F, 14),
        `tl.fromTo("#${k}-sparks2", { scale: 0.8, transformOrigin: "50% 50%" }, { scale: 1.2, duration: ${r3(14 * F)}, ease: "power2.out" }, ${r3(hitT + 14 * F)});`,
        ...ringTl(`${k}-ring`, hitT + 2 * F, 6, 1.4),
        ...debrisTl(`${k}-tiles`, hitT + 6 * F),
        ...flash(`${k}-dust`, hitT + 2.0, 12),
        ...shake(`${k}-cam`, hitT),
      ],
    };
  }

  // Aftermath: the overhead strike splits the courtyard; Phantom flips away and lands.
  {
    const id = "aftermath";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const strike = s0 + 0.9;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("guard", { x: 800, ground: G, s: 1.1 })],
        [s0 + 0.55, sh("overhead", { x: 800, ground: G, s: 1.1 }), { ease: "inOut" }],
        [strike, sh("strikeDown", { x: 820, ground: G, s: 1.1 }), { ease: "in", ones: true }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("stance", { x: 1150, ground: G, s: 1.1 })],
        [s0 + 0.4, ph("land", { x: 1150, ground: G, s: 1.1 }), { ease: "inOut" }],
        [s0 + 0.8, ph("flip", { x: 1280, y: 330, s: 1.1 }), { ease: "out" }],
        [s0 + 1.4, ph("air", { x: 1440, y: 520, s: 1.1 }), { ease: "lin" }],
        [s0 + 1.7, ph("land", { x: 1500, ground: G, s: 1.1 }), { ease: "in" }],
        [s0 + 2.5, ph("stance", { x: 1500, ground: G, s: 1.1 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const crack = `M960,${G} L1040,${G - 12} L1120,${G + 8} L1260,${G - 6} L1420,${G + 10}`;
    const world = [
      yard(k),
      `<g id="${k}-smear" class="d">${smear(rig(sh("strikeDown", { x: 820, ground: G, s: 1.1 })).sh, 40, 300, 200, 20, C.accent, 0.7)}</g>`,
      `<path id="${k}-crack" class="d" d="${crack}" stroke="${C.accent}" stroke-width="7" fill="none" />`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-rocks" class="d">${shards([1050, G], 18, 260, C.ink, 101)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...rainTl(k, s0, 3.5),
        ...shadow.tl,
        ...phantom.tl,
        ...flash(`${k}-smear`, strike - 3 * F, 3),
        ...show(`${k}-crack`, strike),
        ...debrisTl(`${k}-rocks`, strike, 160, 300),
        ...shake(`${k}-cam`, strike),
      ],
    };
  }

  // Button: the split courtyard, both fighters apart.
  {
    const id = "button";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const shadow = act(`${k}-sh`, "shadow", [[s0, sh("guard", { x: 520, ground: G + 40, s: 0.9 })]], { end: T[id].end });
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("land", { x: 1500, ground: G + 40, s: 0.9 })],
        [s0 + 0.9, ph("stance", { x: 1500, ground: G + 40, s: 0.9 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const world = [
      yard(k),
      `<path d="M700,${G + 40} L880,${G + 10} L1040,${G + 50} L1240,${G + 20} L1420,${G + 60}" stroke="${C.accent}" stroke-width="6" fill="none" opacity="0.6" />`,
      shadow.svg,
      phantom.svg,
      rain(k),
    ].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...rainTl(k, s0, 2.5), ...shadow.tl, ...phantom.tl] };
  }
  out["s2-first-clash"] = scene("s2-first-clash", p, shots);
}

/* ================= Scene 3 — Blades of the Storm (20s) ================= */
{
  const p = "s3";
  const T = Object.fromEntries(PLANS["s3-blades-of-the-storm"].shots.map((s) => [s.id, s]));
  const shots = {};
  const G = 880;
  const yard = (k, pillarId = "") =>
    [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(23, 40, 8),
      trees(13, 580, 22, 240, -100, W + 300, C.ink),
      temple(960, 650, 0.85),
      `<g${pillarId ? ` id="${pillarId}"` : ""}>${pillar(1600, G - 60, 420, 60)}</g>`,
      courtyard(G - 60, 0.08),
    ].join("");

  // Establish: both land at opposite ends of the courtyard.
  {
    const id = "establish";
    const k = `${p}-${id}`;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [0, sh("air", { x: 300, y: 300, s: 0.85 })],
        [0.55, sh("land", { x: 360, ground: G, s: 0.85 }), { ease: "in" }],
        [1.3, sh("guard", { x: 360, ground: G, s: 0.85 }), { ease: "inOut" }],
      ],
      { end: 3 },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [0, ph("air", { x: 1660, y: 290, s: 0.85 })],
        [0.6, ph("land", { x: 1600, ground: G, s: 0.85 }), { ease: "in" }],
        [1.35, ph("stance", { x: 1600, ground: G, s: 0.85 }), { ease: "inOut" }],
      ],
      { end: 3 },
    );
    const world = [yard(k), shadow.svg, phantom.svg, rain(k)].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...push(`${k}-cam`, 0, 3), ...rainTl(k, 0, 3), ...shadow.tl, ...phantom.tl] };
  }

  // Approach: lightning crawls along Phantom's raised blades; crimson spirals around Shadow.
  {
    const id = "approach";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const raised = ph("raiseTwin", { x: 1340, ground: G, s: 1.25 });
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("stance", { x: 1340, ground: G, s: 1.25 })],
        [s0 + 0.9, raised, { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("guard", { x: 560, ground: G, s: 1.25 })],
        [s0 + 1.2, sh("guard", { x: 560, ground: G, s: 1.25, torso: 4, fua: 70, bua: 55 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const j = rig(raised);
    const tipF = along(j.fh, PH.raiseTwin.blades[0].a * -1, 128 * 1.25);
    const tipB = along(j.bh, PH.raiseTwin.blades[1].a * -1, 128 * 1.25);
    const spiral = (seed) => {
      const rand = seeded(seed);
      let d = "M560,880";
      for (let i = 1; i <= 26; i += 1) {
        const a = i * 40 + rand() * 10;
        const r = 120 - i * 2;
        d += ` L${r1(560 + Math.sin((a * Math.PI) / 180) * r)},${r1(880 - i * 16)}`;
      }
      return `<path d="${d}" stroke="${C.accent}" stroke-width="7" fill="none" opacity="0.85" />`;
    };
    const world = [
      yard(k),
      `<g id="${k}-sp1">${spiral(7)}</g><g id="${k}-sp2" class="d">${spiral(13)}</g>`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-a1" class="d">${arcs(j.fh, tipF, 3, C.volt)}${arcs(j.bh, tipB, 5, C.volt)}</g>`,
      `<g id="${k}-a2" class="d">${arcs(j.fh, tipF, 9, C.line)}${arcs(j.bh, tipB, 11, C.volt)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [...pan(`${k}-cam`, s0, 3, -90), ...rainTl(k, s0, 3), ...shadow.tl, ...phantom.tl, ...flicker(`${k}-sp1`, `${k}-sp2`, s0, T[id].end), ...flicker(`${k}-a1`, `${k}-a2`, s0 + 0.9, T[id].end)],
    };
  }

  // Turn: the rain freezes. Phantom, close: "Let's see if you can follow this."
  {
    const id = "turn";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const phantom = act(`${k}-ph`, "phantom", [[s0, ph("raiseTwin", { x: 1180, ground: 1500, s: 2.6 })]], { end: T[id].end, breath: 0.7 });
    const world = [`<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#${k}-sky)" />`, phantom.svg, rain(k, 0.4, 0.6)].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...push(`${k}-cam`, s0, 3, "60% 30%"), ...phantom.tl] };
  }

  // Sakuga: afterimage rush; Shadow listens, eyes closed, blocks — CLANG — and the crimson spiral throws Phantom through a pillar.
  {
    const id = "sakuga";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const S = (n, o) => sh(n, { x: 900, ground: G, s: 1.15, ...o });
    const clang = s0 + 1.4;
    const spin = s0 + 2.1;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, S("eyesShut")],
        [clang - 0.12, S("eyesShut")],
        [clang, S("guard", { torso: -10 }), { ease: "out", ones: true }],
        [spin - 0.25, S("coil"), { ease: "inOut" }],
        [spin, S("spin"), { ease: "in", ones: true }],
        [spin + 0.15, S("swing"), { ease: "out", ones: true }],
        [spin + 1.0, S("swing")],
        [spin + 1.7, S("guard"), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [clang - 0.15, ph("strikeHigh", { x: 1240, ground: G, s: 1.15 })],
        [clang, ph("strikeHigh", { x: 1130, ground: G, s: 1.15 }), { ease: "in", ones: true }],
        [spin - 0.2, ph("brace", { x: 1240, ground: G, s: 1.15 }), { ease: "out" }],
        [spin + 0.15, ph("brace", { x: 1290, ground: G, s: 1.15 })],
        [spin + 0.6, ph("brace", { x: 1580, ground: G, s: 1.15 }), { ease: "out", ones: true }],
        [spin + 1.1, ph("slide", { x: 1700, ground: G, s: 1.15 }), { ease: "out" }],
      ],
      { end: T[id].end, from: clang - 0.15 },
    );
    const ghosts = [
      [s0, ph("rush", { x: 1500, ground: G, s: 1.15 })],
      [s0 + 0.35, ph("strikeHigh", { x: 1260, ground: G - 40, s: 1.15 })],
      [s0 + 0.7, ph("slash", { face: 1, x: 420, ground: G, s: 1.15 })],
      [s0 + 1.0, ph("rush", { x: 1150, ground: G, s: 1.15 })],
    ];
    const ring = [900, G - 200];
    const world = [
      yard(k, `${k}-pillar`),
      ...ghosts.map(([, pose], i) => `<g id="${k}-gh${i}" class="d">${ghost(pose, "phantom", C.volt, 0.55)}</g>`),
      `<g id="${k}-smear" class="d">${smear(rig(S("spin")).sh, 80, 340, -170, 190, C.accent, 0.7)}</g>`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-shards" class="d">${shards([1600, G - 280], 20, 260, C.hair, 131)}</g>`,
      `<ellipse id="${k}-ring" class="d" cx="${ring[0]}" cy="${ring[1]}" rx="140" ry="50" fill="none" stroke="${C.accent}" stroke-width="16" />`,
      `<g id="${k}-clang" class="d">${sparks([1010, 600], 14, 150, C.line, 137)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.line, 1)),
      tl: [
        ...rainTl(k, s0, 5),
        ...ghosts.flatMap(([t], i) => [`tl.set("#${k}-gh${i}", { opacity: 1 }, ${K.ft(t)});`, `tl.to("#${k}-gh${i}", { opacity: 0, duration: 0.5, ease: "power1.in" }, ${r3(t + 0.1)});`]),
        ...shadow.tl,
        ...phantom.tl,
        ...flash(`${k}-flash`, clang, 2),
        ...flash(`${k}-clang`, clang + 2 * F, 8),
        ...flash(`${k}-smear`, spin - 2 * F, 5),
        ...ringTl(`${k}-ring`, spin + 2 * F, 7, 1.1),
        `tl.set("#${k}-pillar", { opacity: 0 }, ${K.ft(spin + 0.55)});`,
        ...debrisTl(`${k}-shards`, spin + 0.55, 120, 380),
        ...shake(`${k}-cam`, clang),
        ...shake(`${k}-cam`, spin + 0.55),
      ],
    };
  }

  // Aftermath: six midair clashes in front of the moon; one frame of black silhouettes on white.
  {
    const id = "aftermath";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const hits = [0.25, 0.75, 1.25, 1.75, 2.15, 2.5].map((h) => s0 + h);
    const shKeys = [[s0, sh("air", { x: 620, y: 520, s: 1.0 })]];
    const phKeys = [[s0, ph("air", { x: 1300, y: 500, s: 1.0 })]];
    hits.forEach((h, i) => {
      const hy = 470 + (i % 2) * 60;
      shKeys.push([h, sh(i % 2 ? "air" : "airStrike", { x: 830 + (i % 3) * 20, y: hy + 40, s: 1.0 }), { ease: "in", ones: true }]);
      phKeys.push([h, ph(i % 2 ? "strikeHigh" : "air", { x: 1090 + (i % 3) * 20, y: hy + 30, s: 1.0 }), { ease: "in", ones: true }]);
      const apart = h + (i < 5 ? Math.min(0.22, (hits[i + 1] - h) * 0.55) : 0.4);
      shKeys.push([apart, sh("air", { x: 700, y: hy + 20, s: 1.0 }), { ease: "out" }]);
      phKeys.push([apart, ph("air", { x: 1230, y: hy + 10, s: 1.0 }), { ease: "out" }]);
    });
    const shadow = act(`${k}-sh`, "shadow", shKeys, { end: T[id].end });
    const phantom = act(`${k}-ph`, "phantom", phKeys, { end: T[id].end });
    const world = [
      `<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      moonDisc(960, 420, 220),
      clouds(29, 760, 9, C.ink, 0.9),
      shadow.svg,
      phantom.svg,
      ...hits.map((_, i) => `<g id="${k}-sp${i}" class="d">${sparks([960 + (i % 3) * 20, 500 + (i % 2) * 60], 12, 140, i % 2 ? C.volt : C.accent, 151 + i)}</g>`),
      `<g id="${k}-white" class="d"><rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="${C.line}" />${ghost(sh("airStrike", { x: 830, y: 510, s: 1.0 }), "shadow", C.hair, 1)}${ghost(ph("strikeHigh", { x: 1090, y: 500, s: 1.0 }), "phantom", C.hair, 1)}</g>`,
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.line, 0.85)),
      tl: [...shadow.tl, ...phantom.tl, ...hits.flatMap((h, i) => [...flash(`${k}-flash`, h, 1), ...flash(`${k}-sp${i}`, h + F, 5)]), ...flash(`${k}-white`, s0 + 3.0, 1)],
    };
  }

  // Button: they land apart; the sound returns.
  {
    const id = "button";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("air", { x: 380, y: 420, s: 0.85 })],
        [s0 + 0.45, sh("land", { x: 420, ground: G, s: 0.85 }), { ease: "in" }],
        [s0 + 1.3, sh("guard", { x: 420, ground: G, s: 0.85 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("air", { x: 1580, y: 410, s: 0.85 })],
        [s0 + 0.5, ph("land", { x: 1540, ground: G, s: 0.85 }), { ease: "in" }],
        [s0 + 1.35, ph("stance", { x: 1540, ground: G, s: 0.85 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const world = [yard(k).replace(pillar(1600, G - 60, 420, 60), ""), `<g>${shards([1620, G + 10], 10, 120, C.hair, 171)}</g>`, shadow.svg, phantom.svg, rain(k)].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...rainTl(k, s0, 2.5), ...shadow.tl, ...phantom.tl] };
  }
  out["s3-blades-of-the-storm"] = scene("s3-blades-of-the-storm", p, shots);
}

/* ================= Scene 4 — Ultimate Techniques (20s) ================= */
{
  const p = "s4";
  const T = Object.fromEntries(PLANS["s4-ultimate-techniques"].shots.map((s) => [s.id, s]));
  const shots = {};
  const G = 880;
  const ruin = (k) =>
    [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(37, 30, 9),
      trees(17, 600, 20, 230, -100, W + 300, C.ink),
      temple(960, 660, 0.85),
      pillar(300, G - 60, 300, 50, true),
      pillar(1650, G - 60, 260, 50, true),
      courtyard(G - 60, 0.08),
      `<path d="M700,${G + 40} L880,${G + 10} L1040,${G + 50} L1240,${G + 20} L1420,${G + 60}" stroke="${C.accent}" stroke-width="5" fill="none" opacity="0.4" />`,
    ].join("");

  // Establish: opposite sides, heavy breathing, blades flickering.
  {
    const id = "establish";
    const k = `${p}-${id}`;
    const pant = (make, a, b) => {
      const keys = [];
      for (let t = 0, i = 0; t <= 3; t += 0.55, i += 1) keys.push([t, make(i % 2 ? b : a), { ease: "inOut" }]);
      return keys;
    };
    const shadow = act(`${k}-sh`, "shadow", pant((o) => sh("breathe", { x: 420, ground: G, s: 0.85, ...o }), { torso: 16 }, { torso: 26, fua: 36 }), { end: 3, breath: 0 });
    const phantom = act(`${k}-ph`, "phantom", pant((o) => ph("stance", { x: 1540, ground: G, s: 0.85, ...o }), { torso: 24 }, { torso: 32, fua: 76 }), { end: 3, breath: 0 });
    const world = [ruin(k), shadow.svg, phantom.svg, rain(k)].join("");
    shots[id] = { svg: shotSvg(p, id, world), tl: [...push(`${k}-cam`, 0, 3), ...rainTl(k, 0, 3), ...shadow.tl, ...phantom.tl] };
  }

  // Approach: Shadow's hand tightening around the katana handle. "Enough."
  {
    const id = "approach";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const world = [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="${C.sky}" />`,
      clouds(41, 120, 6, C.ink, 0.6),
      `<rect x="560" y="470" width="900" height="70" rx="12" fill="${C.hair}" stroke="${C.accent}" stroke-width="6" />`,
      `<rect x="1440" y="430" width="22" height="150" fill="${C.line}" />`,
      `<polygon points="1462,488 2300,470 2300,540 1462,522" fill="${C.accent}" /><polygon points="1462,500 2300,494 2300,510 1462,510" fill="${C.line}" />`,
      `<g id="${k}-fist"><ellipse cx="960" cy="505" rx="270" ry="140" fill="${C.accent}" opacity="0.9" /><ellipse cx="960" cy="505" rx="258" ry="128" fill="${C.hair}" />${[0, 1, 2, 3].map((i) => `<path d="M${790 + i * 110},400 L${790 + i * 110},610" stroke="${C.ink}" stroke-width="8" />`).join("")}</g>`,
      `<g id="${k}-sp" class="d">${sparks([1700, 505], 8, 90, C.accent, 43)}</g>`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...pan(`${k}-cam`, s0, 3, -80),
        ...rainTl(k, s0, 3),
        `tl.fromTo("#${k}-fist", { scaleY: 1, scaleX: 1, transformOrigin: "50% 50%" }, { scaleY: 0.86, scaleX: 0.95, duration: 0.3, ease: "power2.out" }, ${r3(s0 + 0.35)});`,
        ...flash(`${k}-sp`, s0 + 0.55, 6),
      ],
    };
  }

  // Turn: Shadow raises the blade; a crimson crescent grows; stones lift. Phantom braces: "Not this time."
  {
    const id = "turn";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("guard", { x: 560, ground: G, s: 1.15 })],
        [s0 + 0.9, sh("raise", { x: 560, ground: G, s: 1.15 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("stance", { x: 1460, ground: G, s: 1.15 })],
        [s0 + 0.4, ph("brace", { x: 1460, ground: G, s: 1.15 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const phJ = rig(ph("brace", { x: 1460, ground: G, s: 1.15 }));
    const stones = (() => {
      const rand = seeded(181);
      let o = "";
      for (let i = 0; i < 9; i += 1) {
        const x = 300 + rand() * 600;
        const y = G - 10;
        o += `<polygon points="${r1(x)},${r1(y)} ${r1(x + 26)},${r1(y - 10)} ${r1(x + 34)},${r1(y + 14)} ${r1(x + 6)},${r1(y + 20)}" fill="${C.hair}" stroke="${C.accent}" stroke-width="2" />`;
      }
      return o;
    })();
    const world = [
      ruin(k),
      `<path id="${k}-moon" d="M260,520 A300,300 0 1 1 860,520 A250,230 0 1 0 260,520 Z" fill="${C.accent}" opacity="0.85" />`,
      `<g id="${k}-stones">${stones}</g>`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-e1">${arcs(phJ.fh, along(phJ.fh, -205, 140), 191, C.volt)}${arcs(phJ.bh, along(phJ.bh, -145, 140), 193, C.line)}</g>`,
      `<g id="${k}-e2" class="d">${arcs(phJ.fh, along(phJ.fh, -205, 140), 197, C.line)}${arcs(phJ.bh, along(phJ.bh, -145, 140), 199, C.volt)}</g>`,
      `<rect id="${k}-red" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.accent}" opacity="0" />`,
      rain(k),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...rainTl(k, s0, 3),
        ...shadow.tl,
        ...phantom.tl,
        `tl.fromTo("#${k}-moon", { scale: 0.2, opacity: 0, transformOrigin: "50% 100%" }, { scale: 1.1, opacity: 0.85, duration: 1.9, ease: "power2.out" }, ${r3(s0 + 0.8)});`,
        `tl.fromTo("#${k}-stones", { y: 0 }, { y: -140, duration: 2.0, ease: "power1.inOut" }, ${r3(s0 + 0.8)});`,
        ...flicker(`${k}-e1`, `${k}-e2`, s0, T[id].end),
        `tl.to("#${k}-red", { opacity: 0.25, duration: 0.6, ease: "power2.in" }, ${r3(s0 + 2.3)});`,
      ],
    };
  }

  // Sakuga: Shadow vanishes, the courtyard goes red; Phantom rises in a lightning column, crosses an X; collision. Silence, then DOOM.
  {
    const id = "sakuga";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const silence = s0 + 2.0;
    const doom = silence + 0.5;
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("brace", { x: 1300, ground: G, s: 1.0 })],
        [s0 + 0.45, ph("land", { x: 1300, ground: G, s: 1.0 }), { ease: "inOut" }],
        [s0 + 0.75, ph("flyUp", { x: 1300, y: 560, s: 1.0 }), { ease: "out", ones: true }],
        [s0 + 1.2, ph("spinX", { x: 1280, y: 500, s: 1.0 }), { ease: "out" }],
        [silence, ph("strikeHigh", { x: 1090, y: 470, s: 1.0 }), { ease: "in", ones: true }],
        [doom + 0.6, ph("strikeHigh", { x: 1090, y: 470, s: 1.0 }), { freeze: true }],
        [doom + 1.4, ph("air", { x: 1300, y: 420, s: 1.0 }), { ease: "out" }],
      ],
      { end: T[id].end },
    );
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0 + 1.3, sh("dash", { x: 160, y: 620, s: 1.0 })],
        [s0 + 1.55, sh("dash", { x: 640, y: 520, s: 1.0 }), { ease: "out", ones: true }],
        [silence, sh("airStrike", { x: 840, y: 470, s: 1.0 }), { ease: "in", ones: true }],
        [doom + 0.6, sh("airStrike", { x: 840, y: 470, s: 1.0 }), { freeze: true }],
        [doom + 1.4, sh("air", { x: 620, y: 420, s: 1.0 }), { ease: "out" }],
      ],
      { end: T[id].end, from: s0 + 1.3 },
    );
    const center = [960, 380];
    const world = [
      ruin(k),
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.accent}" opacity="0.28" />`,
      `<g id="${k}-column" class="d"><rect x="1240" y="-100" width="120" height="${G + 100}" fill="${C.volt}" opacity="0.8" /><rect x="1285" y="-100" width="30" height="${G + 100}" fill="${C.line}" /></g>`,
      `<g id="${k}-x" class="d"><path d="M1060,180 L1500,620 M1500,180 L1060,620" stroke="${C.volt}" stroke-width="40" opacity="0.85" /><path d="M1060,180 L1500,620 M1500,180 L1060,620" stroke="${C.line}" stroke-width="10" /></g>`,
      `<g id="${k}-arc" class="d">${smear([660, 420], 60, 420, -170, 20, C.accent, 0.85)}</g>`,
      `<circle id="${k}-core" class="d" cx="${center[0]}" cy="${center[1]}" r="120" fill="${C.line}" />`,
      shadow.svg,
      phantom.svg,
      `<ellipse id="${k}-ring" class="d" cx="${center[0]}" cy="${center[1]}" rx="160" ry="90" fill="none" stroke="${C.line}" stroke-width="30" />`,
      `<ellipse id="${k}-ring2" class="d" cx="${center[0]}" cy="${center[1]}" rx="110" ry="60" fill="none" stroke="${C.accent}" stroke-width="18" />`,
      `<g id="${k}-tiles" class="d">${shards([960, 600], 26, 600, C.hair, 211)}</g>`,
      `<g id="${k}-rainbox">${rain(k)}</g>`,
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.line, 1)),
      dip: C.accent,
      tl: [
        ...rainTl(k, s0, 5),
        ...phantom.tl,
        ...shadow.tl,
        ...show(`${k}-column`, s0 + 0.6, s0 + 1.2),
        `tl.fromTo("#${k}-column", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.15, ease: "power2.out" }, ${r3(s0 + 0.6)});`,
        ...show(`${k}-x`, s0 + 1.2, silence),
        ...show(`${k}-arc`, s0 + 1.4, silence),
        `tl.fromTo("#${k}-arc", { opacity: 0.9 }, { opacity: 0.4, duration: 0.6, ease: "none" }, ${r3(s0 + 1.4)});`,
        ...show(`${k}-core`, silence, doom),
        ...flash(`${k}-flash`, doom, 3),
        ...ringTl(`${k}-ring`, doom, 9, 1.6),
        ...ringTl(`${k}-ring2`, doom + 4 * F, 6, 1.6),
        ...debrisTl(`${k}-tiles`, doom + 2 * F, 260, 600),
        `tl.to("#${k}-rainbox", { opacity: 0, duration: 0.3, ease: "power2.out" }, ${r3(doom)});`,
        ...shake(`${k}-cam`, doom),
      ],
    };
  }

  // Aftermath: from above, the red and blue energy spiraling around each other.
  {
    const id = "aftermath";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const spiralArm = (color, rot) => {
      let d = "M960,540";
      for (let i = 1; i <= 40; i += 1) {
        const a = rot + i * 14;
        const r = i * 11;
        d += ` L${r1(960 + Math.sin((a * Math.PI) / 180) * r)},${r1(540 + Math.cos((a * Math.PI) / 180) * r)}`;
      }
      return `<path d="${d}" stroke="${color}" stroke-width="22" fill="none" stroke-linecap="round" />`;
    };
    const world = [
      `<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="${C.ink}" />`,
      `<rect x="560" y="320" width="800" height="440" fill="${C.hair}" stroke="${C.line}" stroke-opacity="0.3" stroke-width="4" />`,
      `<path d="M560,320 L960,200 L1360,320 M560,760 L960,880 L1360,760" stroke="${C.line}" stroke-opacity="0.3" stroke-width="4" fill="none" />`,
      `<ellipse cx="960" cy="540" rx="760" ry="420" fill="none" stroke="${C.line}" stroke-width="6" opacity="0.4" />`,
      `<g transform="translate(0 0) scale(1 0.75)" transform-origin="960 540"><g id="${k}-spin">${spiralArm(C.accent, 0)}${spiralArm(C.volt, 180)}</g></g>`,
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        `tl.fromTo("#${k}-spin", { rotation: 0, svgOrigin: "960 540" }, { rotation: 300, duration: 3.5, ease: "none", svgOrigin: "960 540" }, ${r3(s0)});`,
        `tl.fromTo("#${k}-spin", { scale: 0.85, svgOrigin: "960 540" }, { scale: 1.1, duration: 3.5, ease: "power1.inOut", svgOrigin: "960 540" }, ${r3(s0)});`,
      ],
    };
  }

  // Button: the screen flashes white and holds.
  {
    const id = "button";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const world = [`<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="${C.line}" />`, `<ellipse id="${k}-ring" cx="960" cy="540" rx="900" ry="500" fill="none" stroke="${C.moon}" stroke-width="40" />`].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      dip: C.line,
      tl: [`tl.fromTo("#${k}-ring", { scale: 0.7, opacity: 1, transformOrigin: "50% 50%" }, { scale: 1.3, opacity: 0, duration: 2.0, ease: "power2.out" }, ${r3(s0)});`],
    };
  }
  out["s4-ultimate-techniques"] = scene("s4-ultimate-techniques", p, shots);
}

/* ================= Scene 5 — The Final Frame (12s) ================= */
{
  const p = "s5";
  const T = Object.fromEntries(PLANS["s5-final-frame"].shots.map((s) => [s.id, s]));
  const shots = {};
  const G = 880;
  const ruin = (k, smokeId = "") =>
    [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      clouds(53, 30, 6),
      trees(19, 620, 18, 220, -100, W + 300, C.ink),
      temple(960, 680, 0.8),
      pillar(260, G - 60, 220, 50, true),
      courtyard(G - 60, 0.08),
      smokeId ? `<g id="${smokeId}">${clouds(59, G - 260, 6, C.sky, 0.45)}</g>` : "",
    ].join("");

  // Establish: smoke drifts; Shadow motionless, his cracked blade's glow fading; Phantom kneels, one blade in the stone.
  {
    const id = "establish";
    const k = `${p}-${id}`;
    const S = (glow) => sh("still", { x: 560, ground: G, s: 0.95, blades: [{ hand: "f", a: 30, cracked: true, glow }] });
    const shadow = act(`${k}-sh`, "shadow", [[0, S(0.9)], [2.4, S(0), { ease: "lin" }]], { end: 2.5, breath: 0.4 });
    const phantom = act(`${k}-ph`, "phantom", [[0, ph("kneel", { x: 1420, ground: G, s: 0.95 })]], { end: 2.5, breath: 1.4 });
    const world = [ruin(k, `${k}-smoke`), shadow.svg, phantom.svg, blade([1540, G - 70], 170, 120, C.volt, 0.95), rain(k, 0.2, 0.3)].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [...push(`${k}-cam`, 0, 2.5), ...rainTl(k, 0, 2.5), `tl.fromTo("#${k}-smoke", { x: 0 }, { x: -140, duration: 2.5, ease: "none" }, 0);`, ...shadow.tl, ...phantom.tl],
    };
  }

  // Approach: a tiny blue spark runs along Phantom's sword; behind him, Shadow turns.
  {
    const id = "approach";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const hand = [700, 640];
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("still", { x: 1560, ground: 790, s: 0.6 })],
        [s0 + 1.5, sh("still", { x: 1560, ground: 790, s: 0.6 })],
        [s0 + 2.1, sh("turned", { x: 1560, ground: 790, s: 0.6 }), { ease: "inOut" }],
      ],
      { end: T[id].end },
    );
    const world = [
      `<rect x="-100" y="-100" width="${W + 400}" height="${H + 200}" fill="url(#${k}-sky)" />`,
      courtyard(760, 0.08),
      shadow.svg,
      blade(hand, 95, 900, C.volt, 2.2, { glow: 0.3 }),
      `<rect x="${hand[0] - 210}" y="${hand[1] - 26}" width="190" height="52" rx="10" fill="${C.hair}" stroke="${C.volt}" stroke-width="4" />`,
      `<rect x="${hand[0] - 170}" y="${hand[1] - 80}" width="170" height="160" rx="60" fill="${C.volt}" />`,
      `<rect x="${hand[0] - 162}" y="${hand[1] - 72}" width="154" height="144" rx="54" fill="${C.line}" />`,
      `<circle id="${k}-spark" cx="${hand[0] + 80}" cy="${hand[1]}" r="12" fill="${C.line}" /><circle id="${k}-spark2" cx="${hand[0] + 80}" cy="${hand[1]}" r="26" fill="${C.volt}" opacity="0.5" />`,
      rain(k, 0.2, 0.3),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...pan(`${k}-cam`, s0, 2.5, -80),
        ...rainTl(k, s0, 2.5),
        `tl.to(["#${k}-spark", "#${k}-spark2"], { x: 820, y: -70, duration: 1.8, ease: "power1.inOut" }, ${r3(s0 + 0.2)});`,
        ...shadow.tl,
      ],
    };
  }

  // Sakuga: Phantom rises and dashes; extreme slow motion as they pass; a thin red line crosses the screen.
  {
    const id = "sakuga";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const slowFrom = s0 + 1.0;
    const slowTo = s0 + 2.2;
    const lineT = s0 + 2.6;
    const phantom = act(
      `${k}-ph`,
      "phantom",
      [
        [s0, ph("kneel", { x: 1400, ground: G, s: 1.1 })],
        [s0 + 0.5, ph("rise", { x: 1400, ground: G, s: 1.1 }), { ease: "inOut" }],
        [s0 + 0.8, ph("dash", { x: 1360, ground: G, s: 1.1 }), { ease: "in" }],
        [slowFrom, ph("dash", { x: 1120, ground: G, s: 1.1 }), { ease: "in", ones: true }],
        [slowTo, ph("dash", { x: 980, ground: G, s: 1.1 }), { ease: "lin", ones: true }],
        [slowTo + 0.12, ph("past", { x: 560, ground: G, s: 1.1 }), { ease: "out", ones: true }],
        [lineT + 0.4, ph("past", { x: 560, ground: G, s: 1.1 }), { freeze: true }],
      ],
      { end: T[id].end },
    );
    const shadow = act(
      `${k}-sh`,
      "shadow",
      [
        [s0, sh("turned", { face: 1, x: 700, ground: G, s: 1.1 })],
        [s0 + 0.6, sh("guard", { x: 700, ground: G, s: 1.1 }), { ease: "inOut" }],
        [slowFrom, sh("dash", { x: 820, ground: G, s: 1.1 }), { ease: "in", ones: true }],
        [slowTo, sh("dash", { x: 940, ground: G, s: 1.1 }), { ease: "lin", ones: true }],
        [slowTo + 0.12, sh("backTo", { x: 1260, ground: G, s: 1.1 }), { ease: "out", ones: true }],
        [lineT + 0.4, sh("backTo", { x: 1260, ground: G, s: 1.1 }), { freeze: true }],
      ],
      { end: T[id].end },
    );
    const world = [
      ruin(k),
      `<g id="${k}-slow" class="d">${hLines(300, 820, 30, C.line, 223, 0.4)}</g>`,
      shadow.svg,
      phantom.svg,
      `<g id="${k}-line" class="d"><rect x="-200" y="566" width="${W + 400}" height="8" fill="${C.accent}" /><rect x="-200" y="560" width="${W + 400}" height="20" fill="${C.accent}" opacity="0.35" /></g>`,
      rain(k, 0.2, 0.3),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world),
      tl: [
        ...shadow.tl,
        ...phantom.tl,
        ...show(`${k}-slow`, slowFrom, slowTo + 0.12),
        `tl.fromTo("#${k}-line", { scaleX: 0, opacity: 1, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.12, ease: "power2.out" }, ${r3(lineT)});`,
        `tl.to("#${k}-line", { opacity: 0, duration: 1.0, ease: "power2.in" }, ${r3(lineT + 0.3)});`,
        ...rainTl(k, s0, slowFrom - s0, { exact: true }),
        `tl.fromTo("#${k}-rf", { x: 0, y: 0 }, { x: -6, y: 18, duration: ${r3(slowTo - slowFrom)}, ease: "none" }, ${r3(slowFrom)});`,
        `tl.fromTo("#${k}-rn", { x: 0, y: 0 }, { x: -9, y: 27, duration: ${r3(slowTo - slowFrom)}, ease: "none" }, ${r3(slowFrom)});`,
        ...rainTl(k, slowTo, T[id].end - slowTo),
      ],
    };
  }

  // Button: one blade falls. TING. Lightning shows the temple. THE BATTLE IS NOT OVER.
  {
    const id = "button";
    const k = `${p}-${id}`;
    const s0 = T[id].start;
    const shadow = act(`${k}-sh`, "shadow", [[s0, sh("backTo", { face: 1, x: 1300, ground: G, s: 0.75 })]], { end: T[id].end, breath: 0.5 });
    const phantom = act(`${k}-ph`, "phantom", [[s0, ph("past", { x: 620, ground: G, s: 0.75 })]], { end: T[id].end, breath: 0.5 });
    const world = [
      ruin(k),
      shadow.svg,
      phantom.svg,
      `<g id="${k}-fall">${blade([960, 360], 200, 130, C.moon, 1, { glow: 0.2 })}</g>`,
      `<g id="${k}-ting" class="d">${sparks([960, G - 10], 10, 50, C.line, 241, 3)}</g>`,
      bolt(1500, -40, 1360, 520, 247, `${k}-bolt`, "d"),
      rain(k, 0.25, 0.35),
    ].join("");
    shots[id] = {
      svg: shotSvg(p, id, world, fullFlash(`${k}-flash`, C.moon, 0.5)),
      tl: [
        ...rainTl(k, s0, 3),
        ...shadow.tl,
        ...phantom.tl,
        `tl.to("#${k}-fall", { y: ${G - 10 - 360 - 130}, rotation: 70, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.in" }, ${r3(s0 + 0.3)});`,
        ...flash(`${k}-ting`, s0 + 0.9, 3),
        ...push(`${k}-cam`, s0 + 1.0, 2.0, "50% 50%").map((l) => l.replace("{ scale: 1 }, { scale: 1.06", "{ scale: 1.06 }, { scale: 1")),
        ...flash(`${k}-bolt`, s0 + 1.4, 3),
        ...flash(`${k}-flash`, s0 + 1.4, 2),
      ],
    };
  }
  out["s5-final-frame"] = scene("s5-final-frame", p, shots, { card: { text: PLANS["s5-final-frame"].card, start: 10.2 } });
}

/* ---------------- write ---------------- */

for (const [id, html] of Object.entries(out)) {
  writeFileSync(join(FILM, "compositions", `${id}.html`), html);
}

const hosts = SEQ.scenes
  .map(
    (s) =>
      `      <div id="${s.id}-host" data-composition-id="${s.id}" data-composition-src="${s.composition}" data-start="${s.start}" data-duration="${s.seconds}" data-track-index="1" data-width="${W}" data-height="${H}"></div>`,
  )
  .join("\n");
writeFileSync(
  join(FILM, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${SEQ.title} — html-anime</title>
    <style>
      html, body { margin: 0; background: ${C.ink}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.ink}; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="${SEQ.slug}" data-start="0" data-duration="${SEQ.seconds}" data-width="${W}" data-height="${H}">
${hosts}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${SEQ.slug}"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
);
/* ---------------- model sheets ---------------- */

function modelSheet(who, name, poses, notes) {
  const k = CAST[who];
  const views = poses
    .map(([label, pose], i) => {
      const x = 190 + i * 300;
      return `${figure({ ...pose, x, ground: 900, s: 1 }, who)}<text class="lab" x="${x}" y="950" text-anchor="middle">${label}</text>`;
    })
    .join("");
  const guides = [0, 1, 2, 3, 4, 5, 6].map((i) => `<path class="guide" d="M40 ${900 - i * 54} H1500" />`).join("");
  const chips = [
    ["body", k.body],
    ["rim", k.rim],
    ["blade", k.blade],
    ["core", C.line],
    ["grip", C.hair],
  ]
    .map(([n, hex], i) => `<rect x="${1560}" y="${150 + i * 60}" width="40" height="40" fill="${hex}" stroke="${C.line}" stroke-width="1" /><text class="lab" x="1615" y="${177 + i * 60}">${n} ${hex}</text>`)
    .join("");
  const noteLines = notes.map((n, i) => `<text class="note" x="1560" y="${520 + i * 34}">${n}</text>`).join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${name} — model sheet — stickman-blade-fight</title>
    <style>
      html, body { margin: 0; background: ${C.ink}; }
      svg { display: block; width: 100%; height: auto; max-width: 1920px; }
      text { font-family: ui-sans-serif, system-ui, sans-serif; fill: ${C.line}; }
      .h1 { font-size: 34px; font-weight: 700; letter-spacing: 0.04em; }
      .h2 { font-size: 15px; font-weight: 600; letter-spacing: 0.14em; fill: ${C.practical}; }
      .lab { font-size: 15px; opacity: 0.8; }
      .note { font-size: 17px; }
      .guide { stroke: ${C.line}; stroke-width: 1; opacity: 0.15; stroke-dasharray: 6 6; }
    </style>
  </head>
  <body>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${C.ink}" />
      <text class="h1" x="40" y="62">${name.toUpperCase()}</text>
      <text class="lab" x="40" y="88">model sheet · films/stickman-blade-fight · stick rig, 334px tall at scale 1 · follows the script's notes</text>
      <text class="h2" x="40" y="130">POSES · FROM THE FILM'S RIG</text>
      ${guides}
      <path d="M40 900 H1500" stroke="${C.line}" stroke-width="2" opacity="0.5" />
      ${views}
      <text class="h2" x="1560" y="130">PAINTS</text>
      ${chips}
      <text class="h2" x="1560" y="490">NOTES</text>
      ${noteLines}
    </svg>
  </body>
</html>
`;
}

writeFileSync(
  join(FILM, "design", "shadow.html"),
  modelSheet(
    "shadow",
    "Shadow",
    [
      ["stand", SH.stand],
      ["guard", SH.guard],
      ["coil", SH.coil],
      ["swing", SH.swing],
      ["raise", SH.raise],
    ],
    [
      "Black stick figure: hair body, accent rim.",
      "No face. One accent eye slit, toward the facing side.",
      "Crimson katana, one hand or two, 175px.",
      "Pivot: the front hand. Edge forward.",
      "Fast, aggressive: big arcs, low stance.",
      "Never change: red rim, red blade, black body.",
      "Voice: male, Daniel. Cold, angry.",
    ],
  ),
);
writeFileSync(
  join(FILM, "design", "phantom.html"),
  modelSheet(
    "phantom",
    "Phantom",
    [
      ["crouch", { face: -1, ...PH.crouch }],
      ["draw out", { face: -1, ...PH.drawOut }],
      ["stance", { face: -1, ...PH.stance }],
      ["block X", { face: -1, ...PH.blockX }],
      ["raise twin", { face: -1, ...PH.raiseTwin }],
    ],
    [
      "White stick figure: line body, volt rim.",
      "No face. One volt eye slit, toward the facing side.",
      "Two electric-blue blades, 128px, one per hand.",
      "Pivots: each hand. Blades cross to block.",
      "Precise, defensive: compact, crossed guards.",
      "Never change: blue rim, twin blades, white body.",
      "Voice: male, Rishi. Resolve, joy.",
    ],
  ),
);

console.log(`build: wrote ${Object.keys(out).length} scenes, index.html, and 2 model sheets`);
