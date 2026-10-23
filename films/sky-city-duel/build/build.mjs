#!/usr/bin/env node
/**
 * Draws Sky City Duel. Writes design/ (model sheets), compositions/<scene>.html, and index.html.
 *
 *   node films/sky-city-duel/build/build.mjs
 *
 * Characters come from warriors.mjs on the shared kit (harness/draw/kit.js): key poses,
 * inbetweened by act(), cloth and hair trailing the wind and the motion. Big effects
 * (wings, the sword swarm, the dragon, the phoenix) are parametric drawings on twos.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createKit } from "../../../harness/draw/kit.js";
import { BONES, createWarriors } from "./warriors.mjs";
import { KINDS } from "../../../harness/sfx.js";

const FILM = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1920;
const H = 1080;

// The sheet's paints (Indigo moon). Only these.
const C = {
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
};

const K = createKit({ film: FILM, colors: C, bones: BONES });
const { F, r1, r3, pt, seeded, along, rig, smear, sparks, shards, speedLines, hLines, bolt, arcs, clouds, PLANS, scene, swaps, flash, push, pan, shake, fullFlash, flicker, show, ringTl, debrisTl } = K;
const WR = createWarriors(K, C);
const { warrior, eyeCloseup, KU, SE, ku, se, smooth } = WR;
const act = (id, who, keys, o = {}) => K.act(id, who, keys, { render: (p, w, m) => warrior(p, w, m), ...o });

/** A parametric drawing on twos (or ones): fn(u, t) → svg for u in 0..1 across [start, end). */
function animate(id, start, end, fn, { step = F, hold = true } = {}) {
  let svg = "";
  const tl = [];
  let prev = null;
  let n = 0;
  for (let t = start; t < end - 1e-6; t += step) {
    const fid = `${id}-${n++}`;
    svg += `<g id="${fid}" class="d">${fn((t - start) / (end - start), t)}</g>`;
    if (prev) tl.push(`tl.set("#${prev}", { opacity: 0 }, ${K.ft(t)});`);
    tl.push(`tl.set("#${fid}", { opacity: 1 }, ${K.ft(t)});`);
    prev = fid;
  }
  if (!hold && prev) tl.push(`tl.set("#${prev}", { opacity: 0 }, ${K.ft(end)});`);
  return { svg, tl };
}

const ease = { out: (u) => 1 - Math.pow(1 - u, 3), inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), in: (u) => u * u * u };

/* ---------------- the world ---------------- */

function skyDefs(id) {
  return `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}" /><stop offset="0.5" stop-color="${C.sky}" /><stop offset="0.78" stop-color="${C.sky}" /><stop offset="1" stop-color="${C.moon}" /></linearGradient>`;
}

function sky(k, horizon = 640) {
  return [
    `<rect x="-300" y="-300" width="${W + 600}" height="${H + 600}" fill="url(#${k}-sky)" />`,
    `<rect x="-300" y="${horizon - 120}" width="${W + 600}" height="240" fill="${C.moon}" opacity="0.12" />`,
    `<g class="drift-far">${clouds(7, 40, 9, C.ink, 0.6)}</g>`,
    `<g class="drift-near">${clouds(9, 140, 6, C.ink, 0.45)}</g>`,
  ].join("");
}

/** The cloud sea below the city, in painted washes: far pale, near dark. */
function cloudSea(y, seed = 3) {
  const rand = seeded(seed);
  let out = "";
  for (const [dy, color, op, n, ry] of [
    [0, C.moon, 0.18, 10, 40],
    [40, C.line, 0.2, 9, 55],
    [110, C.sky, 0.85, 8, 80],
    [200, C.ink, 0.8, 7, 110],
  ]) {
    for (let i = 0; i < n; i += 1) {
      out += `<ellipse cx="${r1(-200 + rand() * (W + 400))}" cy="${r1(y + dy + rand() * 30)}" rx="${r1(220 + rand() * 260)}" ry="${r1(ry * (0.7 + rand() * 0.6))}" fill="${color}" opacity="${op}" />`;
    }
  }
  return out;
}

/** A floating island with futuristic towers. depth 0 (near) … 1 (far) washes it into the sky. */
function island(x, y, s, seed, depth = 0, towers = 3) {
  const rand = seeded(seed);
  const w = 260 * s;
  const parts = [];
  const top = `M${r1(x - w)},${r1(y)} L${r1(x + w)},${r1(y)} L${r1(x + w * 0.9)},${r1(y + 22 * s)} L${r1(x - w * 0.92)},${r1(y + 22 * s)} Z`;
  let rock = `M${r1(x - w * 0.92)},${r1(y + 20 * s)}`;
  for (let i = 0; i <= 8; i += 1) {
    const u = i / 8;
    const px = x - w * 0.92 + u * w * 1.82;
    const py = y + 20 * s + Math.sin(u * Math.PI) * (160 + rand() * 120) * s;
    rock += ` L${r1(px)},${r1(py)}`;
  }
  rock += " Z";
  parts.push(`<path d="${rock}" fill="${C.hair}" />`, `<path d="${top}" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.35" stroke-width="${r1(3 * s)}" />`);
  for (let i = 0; i < towers; i += 1) {
    const tx = x - w * 0.7 + (i + rand() * 0.6) * ((w * 1.4) / towers);
    const th = (180 + rand() * 260) * s;
    const tw = (36 + rand() * 40) * s;
    const broken = rand() > 0.5;
    const tip = broken ? `L${r1(tx + tw * 0.6)},${r1(y - th + 20 * s)} L${r1(tx + tw * 0.3)},${r1(y - th + 40 * s)}` : `L${r1(tx + tw * 0.5)},${r1(y - th - 40 * s)}`;
    parts.push(`<path d="M${r1(tx)},${r1(y)} L${r1(tx)},${r1(y - th)} ${tip} L${r1(tx + tw)},${r1(y - th + 10 * s)} L${r1(tx + tw)},${r1(y)} Z" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.25" stroke-width="${r1(2 * s)}" />`);
    let win = "";
    for (let wy = y - th + 30 * s; wy < y - 20 * s; wy += 26 * s) if (rand() > 0.45) win += `M${r1(tx + 8 * s)},${r1(wy)} L${r1(tx + tw - 8 * s)},${r1(wy)} `;
    if (win) parts.push(`<path d="${win}" stroke="${C.practical}" stroke-width="${r1(3 * s)}" opacity="0.7" />`);
  }
  const body = parts.join("");
  if (depth <= 0) return body;
  return `<g>${body}</g><g opacity="${r1(depth * 0.8 * 10) / 10}"><path d="${rock}" fill="${C.sky}" />${parts.slice(1).join("").replace(/fill="#[0-9a-f]{6}"/g, `fill="${C.sky}"`).replace(/stroke="#[0-9a-f]{6}"/g, `stroke="${C.sky}"`)}</g>`;
}

function bridge(x0, y0, x1, y1, s, gapAt = 0.55, seed = 1) {
  const rand = seeded(seed);
  const seg = (a, b) => {
    const n = [0, 10 * s];
    return `<polygon points="${pt(a)} ${pt(b)} ${pt([b[0], b[1] + n[1]])} ${pt([a[0], a[1] + n[1]])}" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.3" stroke-width="2" />`;
  };
  const p = (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
  const g0 = gapAt - 0.08;
  const g1 = gapAt + 0.08;
  let rails = "";
  for (let u = 0.05; u < 1; u += 0.08) if (u < g0 || u > g1) rails += `M${pt(p(u))} L${pt([p(u)[0], p(u)[1] - 26 * s])} `;
  const dangle = [p(g0)[0] + 10, p(g0)[1] + 40 * s + rand() * 30];
  return `${seg(p(0), p(g0))}${seg(p(g1), p(1))}<path d="${rails}" stroke="${C.ink}" stroke-width="${r1(3 * s)}" /><path d="M${pt(p(g0))} L${pt(dangle)}" stroke="${C.ink}" stroke-width="${r1(6 * s)}" />`;
}

/** The central platform: hexagonal deck, underside rock, glowing cracks. */
function platform(cx, y, s, { cracks = 0.3, id = "" } = {}) {
  const w = 620 * s;
  const deck = `M${r1(cx - w)},${r1(y)} L${r1(cx - w * 0.82)},${r1(y - 40 * s)} L${r1(cx + w * 0.82)},${r1(y - 40 * s)} L${r1(cx + w)},${r1(y)} L${r1(cx + w * 0.82)},${r1(y + 26 * s)} L${r1(cx - w * 0.82)},${r1(y + 26 * s)} Z`;
  const rand = seeded(77);
  let rock = `M${r1(cx - w * 0.8)},${r1(y + 26 * s)}`;
  for (let i = 0; i <= 10; i += 1) {
    const u = i / 10;
    rock += ` L${r1(cx - w * 0.8 + u * w * 1.6)},${r1(y + 26 * s + Math.sin(u * Math.PI) * (220 + rand() * 160) * s)}`;
  }
  rock += " Z";
  let panel = "";
  for (let i = -6; i <= 6; i += 1) panel += `M${r1(cx + i * 90 * s)},${r1(y - 38 * s)} L${r1(cx + i * 104 * s)},${r1(y + 24 * s)} `;
  let crack = "";
  const cr = seeded(91);
  const n = Math.round(cracks * 10);
  for (let i = 0; i < n; i += 1) {
    let x = cx + (cr() - 0.5) * w * 1.2;
    let yy = y - 30 * s + cr() * 50 * s;
    crack += `M${r1(x)},${r1(yy)}`;
    for (let k = 0; k < 4; k += 1) {
      x += (cr() - 0.5) * 120 * s;
      yy += (cr() - 0.3) * 18 * s;
      crack += ` L${r1(x)},${r1(yy)}`;
    }
    crack += " ";
  }
  return `<g${id ? ` id="${id}"` : ""}><path d="${rock}" fill="${C.hair}" /><path d="${deck}" fill="${C.sky}" stroke="${C.line}" stroke-opacity="0.45" stroke-width="${r1(3 * s)}" /><path d="${deck}" fill="${C.ink}" opacity="0.45" /><path d="${panel}" stroke="${C.line}" stroke-opacity="0.15" stroke-width="2" />${n ? `<path d="${crack}" stroke="${C.practical}" stroke-width="${r1(3 * s)}" fill="none" opacity="0.8" />` : ""}</g>`;
}

function city(k, { horizon = 640, seaY = 760 } = {}) {
  return [
    sky(k, horizon),
    bolt(1700, -40, 1560, horizon - 60, 5, `${k}-bolt1`, "d"),
    bolt(260, -40, 420, horizon - 40, 9, `${k}-bolt2`, "d"),
    island(300, 470, 0.7, 11, 0.75, 4),
    island(1580, 430, 0.8, 13, 0.75, 5),
    island(980, 330, 0.5, 15, 0.85, 3),
    bridge(420, 480, 860, 350, 0.6, 0.5, 3),
    cloudSea(seaY, 21),
    island(120, 620, 0.9, 17, 0.35, 3),
    island(1800, 600, 1.0, 19, 0.35, 4),
    bridge(250, 640, 700, 700, 0.9, 0.6, 7),
  ].join("");
}

function wind(seed, op = 0.35) {
  return hLines(140, 900, 22, C.line, seed, op);
}

function embers(seed, n, color, x0 = 0, y0 = 0, x1 = W, y1 = H) {
  const rand = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i += 1) out += `<circle cx="${r1(x0 + rand() * (x1 - x0))}" cy="${r1(y0 + rand() * (y1 - y0))}" r="${r1(2 + rand() * 4)}" fill="${color}" opacity="${r1(0.4 + rand() * 0.6)}" />`;
  return out;
}

/** Volumetric light: flat shafts fanning from a point. */
function shafts(x, y, n, len, color, seed, opacity = 0.14) {
  const rand = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i += 1) {
    const a = 20 + (i / n) * 50 + rand() * 6;
    const w = 4 + rand() * 6;
    out += `<polygon points="${pt([x, y])} ${pt(along([x, y], a, len))} ${pt(along([x, y], a + w, len))}" fill="${color}" opacity="${opacity}" />`;
  }
  return out;
}

const wideBolts = (k, times) => times.flatMap((t, i) => flash(`${k}-bolt${(i % 2) + 1}`, t, 3));

function shotSvg(prefix, id, world, overlay = "") {
  // Every shot keeps breathing: far clouds and near clouds drift at different speeds, a few embers float.
  const life = `<g class="life">${embers(hash(prefix + id), 18, C.line, 0, 80, W, 980)}</g>`;
  return `<defs>${skyDefs(`${prefix}-${id}`)}</defs><g id="${prefix}-${id}-cam">${world}${life}</g>${overlay}`;
}

function hash(s) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return h;
}

/** The world's constant motion for one shot: cloud layers and embers drift; nothing is ever frozen. */
function lifeTl(k, start, dur) {
  return [
    `tl.fromTo("#${k}-cam .drift-far", { x: 0 }, { x: ${r1(-18 * dur)}, duration: ${r3(dur)}, ease: "none" }, ${r3(start)});`,
    `tl.fromTo("#${k}-cam .drift-near", { x: 0 }, { x: ${r1(-42 * dur)}, duration: ${r3(dur)}, ease: "none" }, ${r3(start)});`,
    `tl.fromTo("#${k}-cam .life", { x: 0, y: 0 }, { x: ${r1(-30 * dur)}, y: ${r1(-12 * dur)}, duration: ${r3(dur)}, ease: "none" }, ${r3(start)});`,
  ];
}

/** Give every shot of a scene its life tweens. */
function alive(p, sceneId, shots) {
  for (const plan of PLANS[sceneId].shots) {
    const shot = shots[plan.id];
    if (shot) shot.tl.push(...lifeTl(`${p}-${plan.id}`, plan.start, plan.end - plan.start));
  }
  return shots;
}

/* ---------------- effects for this film ---------------- */

function wings(cx, cy, s, spread, color = C.practical) {
  let out = "";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i += 1) {
      const a = 180 + side * (40 + i * 15 * spread);
      const len = (260 - i * 18) * s * (0.3 + 0.7 * spread);
      const base = [cx + side * 10 * s, cy];
      const tip = along(base, a, len);
      const n = along([0, 0], a + 90, 1);
      out += `<polygon points="${pt(base)} ${pt([base[0] + n[0] * 18 * s + (tip[0] - base[0]) * 0.6, base[1] + n[1] * 18 * s + (tip[1] - base[1]) * 0.6])} ${pt(tip)} ${pt([base[0] - n[0] * 10 * s + (tip[0] - base[0]) * 0.55, base[1] - n[1] * 10 * s + (tip[1] - base[1]) * 0.55])}" fill="${color}" opacity="${r1((0.55 - i * 0.04) * 100) / 100}" stroke="${C.line}" stroke-width="2" stroke-opacity="0.6" />`;
    }
  }
  return out;
}

function energySword(x, y, a, s = 1, color = C.practical) {
  const tip = along([x, y], a, 70 * s);
  const butt = along([x, y], a + 180, 16 * s);
  const n = along([0, 0], a + 90, 1);
  return `<polygon points="${pt([x + n[0] * 7 * s, y + n[1] * 7 * s])} ${pt(tip)} ${pt([x - n[0] * 7 * s, y - n[1] * 7 * s])} ${pt(butt)}" fill="${color}" stroke="${C.line}" stroke-width="2" /><path d="M${pt([x + n[0] * 12 * s, y + n[1] * 12 * s])} L${pt([x - n[0] * 12 * s, y - n[1] * 12 * s])}" stroke="${C.line}" stroke-width="${r1(3 * s)}" />`;
}

/** The dragon: a serpentine body along a spine, drawn on up to `reach` (0–1). */
function dragon(u, t, { x0 = 120, y0 = 820, x1 = 1000, y1 = 300, phase = 0, reach = 1, scale = 1 } = {}) {
  const n = 46;
  const spine = [];
  for (let i = 0; i <= n; i += 1) {
    const v = (i / n) * reach;
    const wave = Math.sin(v * 9 + t * 5 + phase) * 90 * scale * (1 - v * 0.4);
    const px = x0 + (x1 - x0) * v;
    const py = y0 + (y1 - y0) * v;
    const dir = [x1 - x0, y1 - y0];
    const l = Math.hypot(dir[0], dir[1]);
    spine.push([px - (dir[1] / l) * wave, py + (dir[0] / l) * wave]);
  }
  const width = (i) => (10 + 34 * Math.sin(Math.min(1, (i / n) * 1.15) * Math.PI * 0.9)) * scale;
  const left = [];
  const right = [];
  for (let i = 0; i < spine.length; i += 1) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const d = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    const nrm = [-d[1] / l, d[0] / l];
    left.push([spine[i][0] + nrm[0] * width(i), spine[i][1] + nrm[1] * width(i)]);
    right.push([spine[i][0] - nrm[0] * width(i), spine[i][1] - nrm[1] * width(i)]);
  }
  const body = `M${[...left, ...right.reverse()].map(pt).join(" L")} Z`;
  const head = spine.at(-1);
  const prev = spine.at(-3);
  const dir = [head[0] - prev[0], head[1] - prev[1]];
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const fwd = [dir[0] / dl, dir[1] / dl];
  const nrm = [-fwd[1], fwd[0]];
  const P = (a, b) => [head[0] + fwd[0] * a * scale + nrm[0] * b * scale, head[1] + fwd[1] * a * scale + nrm[1] * b * scale];
  const jaw = `${pt(P(-10, 40))} ${pt(P(80, 26))} ${pt(P(110, 6))} ${pt(P(60, 4))} ${pt(P(100, -10))} ${pt(P(70, -30))} ${pt(P(-10, -40))}`;
  const horns = `M${pt(P(0, 30))} L${pt(P(-70, 80))} M${pt(P(0, -30))} L${pt(P(-80, -70))}`;
  let spikes = "";
  for (let i = 4; i < spine.length - 2; i += 3) spikes += `M${pt(left[i])} L${pt([left[i][0] + (left[i][0] - spine[i][0]) * 0.8, left[i][1] + (left[i][1] - spine[i][1]) * 0.8])} `;
  return [
    `<path d="${body}" fill="${C.accent}" opacity="0.25" stroke="${C.accent}" stroke-width="${r1(40 * scale)}" stroke-linejoin="round" />`,
    `<path d="${body}" fill="${C.hair}" stroke="${C.accent}" stroke-width="${r1(5 * scale)}" />`,
    `<path d="M${spine.map(pt).join(" L")}" stroke="${C.accent}" stroke-width="${r1(6 * scale)}" fill="none" stroke-dasharray="${r1(14 * scale)} ${r1(10 * scale)}" />`,
    `<path d="${spikes}" stroke="${C.accent}" stroke-width="${r1(5 * scale)}" />`,
    reach > 0.9 ? `<polygon points="${jaw}" fill="${C.hair}" stroke="${C.accent}" stroke-width="${r1(6 * scale)}" stroke-linejoin="round" /><path d="${horns}" stroke="${C.accent}" stroke-width="${r1(8 * scale)}" stroke-linecap="round" /><circle cx="${r1(P(40, 16)[0])}" cy="${r1(P(40, 16)[1])}" r="${r1(8 * scale)}" fill="${C.line}" />` : "",
    arcs(spine[Math.floor(n * 0.3 * reach)], spine[Math.floor(n * 0.7 * reach)], Math.round(t * 24) + 5, C.accent),
    arcs(spine[Math.floor(n * 0.5 * reach)], spine[Math.floor(n * 0.95 * reach)], Math.round(t * 24) + 9, C.line),
  ].join("");
}

/** The phoenix: body, sweeping wings (flap 0–1), tail streamers, burning rings. */
function phoenix(cx, cy, s, flap, t, { rings = true } = {}) {
  let out = "";
  if (rings) {
    for (let i = 0; i < 3; i += 1) {
      const rx = (240 + i * 90) * s;
      const ry = (70 + i * 26) * s;
      out += `<ellipse cx="${cx}" cy="${cy}" rx="${r1(rx)}" ry="${r1(ry)}" fill="none" stroke="${C.practical}" stroke-width="${r1((10 - i * 2) * s)}" opacity="0.7" transform="rotate(${r1(-20 + i * 25 + t * 40 * (i % 2 ? -1 : 1))} ${cx} ${cy})" />`;
    }
  }
  const lift = (0.5 - flap) * 120 * s;
  for (const side of [-1, 1]) {
    let d = `M${r1(cx + side * 20 * s)},${r1(cy - 10 * s)}`;
    const pts = [];
    for (let i = 0; i <= 6; i += 1) {
      const u = i / 6;
      pts.push([cx + side * (40 + u * 420) * s, cy - (60 + Math.sin(u * Math.PI) * 120) * s + lift * u]);
    }
    for (let i = 6; i >= 0; i -= 1) {
      const u = i / 6;
      pts.push([cx + side * (40 + u * 420) * s, cy - (60 + Math.sin(u * Math.PI) * 120) * s + lift * u + (40 + u * 90) * s]);
    }
    d += ` L${pts.map(pt).join(" L")} Z`;
    out += `<path d="${d}" fill="${C.practical}" opacity="0.85" stroke="${C.line}" stroke-width="${r1(3 * s)}" />`;
    for (let i = 1; i <= 5; i += 1) {
      const u = i / 6;
      const a = [cx + side * (40 + u * 420) * s, cy - (60 + Math.sin(u * Math.PI) * 120) * s + lift * u];
      out += `<path d="M${pt(a)} L${pt([a[0] + side * 30 * s, a[1] + (90 + u * 60) * s])}" stroke="${C.iris}" stroke-width="${r1(5 * s)}" />`;
    }
  }
  for (let i = 0; i < 5; i += 1) {
    const sw = Math.sin(t * 6 + i) * 30 * s;
    out += `<path d="M${r1(cx)},${r1(cy + 30 * s)} Q${r1(cx + (i - 2) * 50 * s + sw)},${r1(cy + 220 * s)} ${r1(cx + (i - 2) * 110 * s)},${r1(cy + (320 + (i % 2) * 60) * s)}" fill="none" stroke="${i % 2 ? C.practical : C.iris}" stroke-width="${r1(12 * s)}" stroke-linecap="round" opacity="0.85" />`;
  }
  out += `<ellipse cx="${cx}" cy="${r1(cy + 10 * s)}" rx="${r1(36 * s)}" ry="${r1(70 * s)}" fill="${C.line}" /><path d="M${r1(cx)},${r1(cy - 60 * s)} L${r1(cx - 22 * s)},${r1(cy - 110 * s)} L${r1(cx)},${r1(cy - 96 * s)} L${r1(cx + 22 * s)},${r1(cy - 110 * s)} Z" fill="${C.practical}" />`;
  out += `<polygon points="${r1(cx - 10 * s)},${r1(cy - 84 * s)} ${r1(cx - 4 * s)},${r1(cy - 120 * s)} ${r1(cx + 4 * s)},${r1(cy - 84 * s)}" fill="${C.iris}" />`;
  return out;
}

/* ---------------- sound ---------------- */

// Every sound the film uses, rendered by `node harness/sfx.js films/sky-city-duel`.
const SOUNDS = {
  clang: { kind: "clang" },
  "clang-hi": { kind: "clang", pitch: 1.3 },
  "clang-lo": { kind: "clang", pitch: 0.75 },
  shing: { kind: "shing" },
  impact: { kind: "impact" },
  "impact-lo": { kind: "impact", pitch: 0.7 },
  boom: { kind: "boom" },
  whoosh: { kind: "whoosh" },
  "whoosh-long": { kind: "whoosh", dur: 0.9 },
  burst: { kind: "burst" },
  thunder: { kind: "thunder" },
  "wind-12": { kind: "wind", dur: 12 },
  "wind-20": { kind: "wind", dur: 20 },
  "wind-s6": { kind: "wind", dur: 7.6 },
  charge: { kind: "charge" },
  "charge-long": { kind: "charge", dur: 3.5 },
  crackle: { kind: "crackle" },
  roar: { kind: "roar" },
  cry: { kind: "cry" },
  taiko: { kind: "taiko" },
  "taiko-lo": { kind: "taiko", pitch: 0.8 },
  "score-s1": { kind: "score", dur: 12, mood: "calm" },
  "score-s2": { kind: "score", dur: 20, mood: "tense" },
  "score-s3": { kind: "score", dur: 20, mood: "epic" },
  "score-s4": { kind: "score", dur: 20, mood: "epic" },
  "score-s5a": { kind: "score", dur: 11, mood: "climax" },
  "score-s5b": { kind: "score", dur: 8.5, mood: "climax" },
  "score-s6": { kind: "score", dur: 7.6, mood: "fade" },
};
writeFileSync(join(FILM, "sfx.json"), `${JSON.stringify({ sounds: SOUNDS }, null, 2)}\n`);

/** A sound cue: name from SOUNDS, at scene time t, at a volume. */
const cue = (name, t, volume = 1) => ({ name, t, volume, dur: SOUNDS[name].dur ?? KINDS[SOUNDS[name].kind].dur });
const many = (name, times, volume) => times.map((t) => cue(name, t, volume));

const CUES = {
  "s1-sky-city": [cue("score-s1", 0, 0.55), cue("wind-12", 0, 0.6), ...many("thunder", [0.7, 1.8, 3.9, 7.2, 8.4], 0.7), cue("charge", 5.9, 0.5), cue("whoosh-long", 7.9, 0.4), cue("shing", 10.4, 0.45)],
  "s2-first-strike": [
    cue("score-s2", 0, 0.45),
    cue("wind-20", 0, 0.45),
    cue("burst", 2.3, 0.9),
    cue("burst", 3.5, 0.9),
    cue("whoosh", 3.7, 0.5),
    cue("clang", 3.92, 1),
    cue("impact", 3.92, 0.8),
    cue("crackle", 4.0, 0.5),
    ...many("clang-lo", [6.3, 7.2, 8.1], 0.35),
    ...many("crackle", [6.0, 7.5], 0.4),
    cue("boom", 9.35, 0.9),
    cue("taiko-lo", 9.35, 0.8),
    cue("whoosh-long", 9.6, 0.5),
    cue("impact-lo", 10.2, 0.8),
    cue("thunder", 15.6, 0.6),
  ],
  "s3-among-the-ruins": [
    cue("score-s3", 0, 0.45),
    ...many("taiko", [3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5], 0.45),
    cue("whoosh", 0.8, 0.45),
    cue("impact-lo", 2.1, 0.45),
    ...many("whoosh", [3.4, 4.3, 6.7], 0.45),
    cue("clang-hi", 3.6, 0.9),
    cue("clang", 4.5, 0.9),
    cue("impact", 6.9, 0.9),
    ...many("whoosh", [9.3, 10.0, 10.7, 11.5, 12.2], 0.4),
    ...[9.5, 10.2, 10.9, 11.7, 12.4].map((t, i) => cue(["clang", "clang-hi", "clang-lo", "clang-hi", "clang"][i], t, 0.9)),
    cue("impact", 12.4, 0.7),
    cue("thunder", 16.2, 0.6),
    cue("charge", 17.5, 0.45),
  ],
  "s4-celestial-barrage": [
    cue("score-s4", 0, 0.45),
    cue("charge-long", 0, 0.4),
    cue("cry", 0.8, 0.35),
    ...many("shing", [3.2, 3.6, 4.0, 4.4, 4.8], 0.3),
    ...many("whoosh-long", [6.3, 6.7, 7.1, 7.5], 0.5),
    ...many("impact-lo", [6.6, 7.4, 8.2], 0.45),
    ...many("clang-hi", [9.3, 9.75, 10.15, 10.6, 11.0], 0.75),
    cue("crackle", 11.6, 0.6),
    cue("charge", 11.6, 0.5),
    cue("whoosh-long", 12.35, 0.6),
    cue("impact", 12.5, 1),
    cue("clang-lo", 12.5, 0.7),
    ...many("clang-hi", [14.4, 14.6, 14.8], 0.35),
    cue("crackle", 17.5, 0.5),
    cue("thunder", 18.7, 0.6),
  ],
  "s5-dragon-and-phoenix": [
    cue("score-s5a", 0, 0.5),
    cue("charge-long", 0, 0.55),
    cue("crackle", 1.0, 0.5),
    cue("thunder", 1.6, 0.6),
    cue("roar", 3.4, 0.75),
    cue("cry", 6.3, 0.65),
    cue("roar", 9.2, 0.7),
    cue("cry", 9.4, 0.6),
    cue("whoosh-long", 10.7, 0.6),
    cue("boom", 11.5, 1),
    cue("impact-lo", 11.5, 0.9),
    cue("thunder", 11.8, 0.7),
    cue("score-s5b", 11.5, 0.5),
    cue("thunder", 14.5, 0.6),
  ],
  "s6-last-clash": [cue("score-s6", 0, 0.4), cue("wind-s6", 0, 0.5), cue("impact-lo", 1.25, 0.6), cue("shing", 5.6, 0.45), cue("taiko", 6.6, 0.7), cue("whoosh-long", 7.0, 0.8), cue("clang", 7.6, 1), cue("boom", 7.6, 0.8)],
};

/* ---------------- scenes ---------------- */

const out = {};
const T = (id) => Object.fromEntries(PLANS[id].shots.map((s) => [s.id, s]));

/* ===== Scene 1 — The Sky City (12s) ===== */
{
  const id = "s1-sky-city";
  const p = "s1";
  const S = T(id);
  const shots = {};

  // Establish: the whole floating city in the storm; two tiny figures on the platform.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const kuro = act(`${k}-ku`, "kuro", [[0, ku("stand", { x: 880, ground: 690, s: 0.24 })]], { end });
    const seren = act(`${k}-se`, "seren", [[0, se("stand", { x: 1040, ground: 690, s: 0.24 })]], { end });
    const world = [city(k), platform(960, 700, 0.42, { cracks: 0.4 }), kuro.svg, seren.svg, `<g id="${k}-wind">${wind(31, 0.25)}</g>`].join("");
    shots.establish = {
      svg: shotSvg(p, "establish", world),
      tl: [`tl.fromTo("#${k}-cam", { scale: 1.12, y: -60 }, { scale: 1, y: 0, duration: ${end}, ease: "power1.inOut", transformOrigin: "50% 65%" }, 0);`, `tl.fromTo("#${k}-wind", { x: 0 }, { x: -400, duration: ${end}, ease: "none" }, 0);`, ...wideBolts(k, [0.7, 1.8]), ...kuro.tl, ...seren.tl],
    };
  }

  // Approach: the two-shot on the cracked platform; wind tears at coat and hair.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const g = 820;
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("stand", { x: 560, ground: g, s: 1.0, wind: -50 })]], { end });
    const seren = act(`${k}-se`, "seren", [[s0, se("stand", { x: 1380, ground: g, s: 1.0, wind: -50 })]], { end });
    const world = [city(k, { horizon: 700, seaY: 860 }), platform(960, g + 30, 1.4, { cracks: 0.5 }), kuro.svg, seren.svg, `<g id="${k}-wind">${wind(33)}</g>`].join("");
    shots.approach = {
      svg: shotSvg(p, "approach", world),
      tl: [...pan(`${k}-cam`, s0, end - s0, -90), `tl.fromTo("#${k}-wind", { x: 200 }, { x: -500, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`, ...wideBolts(k, [s0 + 1.4]), ...kuro.tl, ...seren.tl],
    };
  }

  // Sakuga: they take their stances and the auras flare; stones lift, lightning cracks.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const g = 840;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [s0, ku("stand", { x: 600, ground: g, s: 1.15, aura: 0, wind: -50 })],
        [s0 + 0.9, ku("stand", { x: 600, ground: g, s: 1.15, aura: 0.2, wind: -50 })],
        [s0 + 1.6, ku("ready", { x: 620, ground: g, s: 1.15, aura: 0.6, wind: -60 }), { ease: "inOut" }],
        [s0 + 3.0, ku("ready", { x: 620, ground: g, s: 1.15, aura: 1, wind: -70 }), { ease: "inOut" }],
      ],
      { end },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("stand", { x: 1320, ground: g, s: 1.15, aura: 0, wind: -50 })],
        [s0 + 1.1, se("stand", { x: 1320, ground: g, s: 1.15, aura: 0.25, wind: -50 })],
        [s0 + 1.8, se("guard", { x: 1300, ground: g, s: 1.15, aura: 0.7, wind: -60 }), { ease: "inOut" }],
        [s0 + 3.0, se("guard", { x: 1300, ground: g, s: 1.15, aura: 1, wind: -70 }), { ease: "inOut" }],
      ],
      { end },
    );
    const rocks = shards([960, g + 10], 18, 500, C.hair, 41);
    const world = [
      city(k, { horizon: 700, seaY: 880 }),
      platform(960, g + 30, 1.5, { cracks: 0.8 }),
      `<g id="${k}-rocks">${rocks}</g>`,
      kuro.svg,
      seren.svg,
      `<g id="${k}-lines" class="d">${speedLines([960, 560], 50, C.line, 43, 0.3)}</g>`,
      `<g id="${k}-wind">${wind(35, 0.45)}</g>`,
    ].join("");
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world, fullFlash(`${k}-flash`, C.moon, 0.7)),
      tl: [
        `tl.fromTo("#${k}-rocks", { y: 0 }, { y: -170, duration: 2.6, ease: "power1.inOut" }, ${r3(s0 + 1.2)});`,
        `tl.fromTo("#${k}-wind", { x: 300 }, { x: -700, duration: 4, ease: "none" }, ${s0});`,
        ...show(`${k}-lines`, s0 + 2.9),
        ...flash(`${k}-flash`, s0 + 2.2, 2),
        ...wideBolts(k, [s0 + 2.2, s0 + 3.4]),
        ...kuro.tl,
        ...seren.tl,
      ],
    };
  }

  // Button: their eyes, split; they narrow; a glint.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const end = S.button.end;
    const ku_ = animate(`${k}-ke`, s0, end, (u) => eyeCloseup("kuro", 480, 540, 300, { narrow: Math.min(1, Math.max(0, (u - 0.35) / 0.25)) * 0.8, glint: u > 0.45 && u < 0.6, face: 1 }));
    const se_ = animate(`${k}-se`, s0, end, (u) => eyeCloseup("seren", 1440, 540, 300, { narrow: Math.min(1, Math.max(0, (u - 0.38) / 0.25)) * 0.8, glint: u > 0.5 && u < 0.65, face: -1 }));
    const world = [
      `<defs><clipPath id="${k}-l"><rect x="0" y="0" width="${W / 2}" height="${H}" /></clipPath><clipPath id="${k}-r"><rect x="${W / 2}" y="0" width="${W / 2}" height="${H}" /></clipPath></defs>`,
      `<g clip-path="url(#${k}-l)">${ku_.svg}</g>`,
      `<g clip-path="url(#${k}-r)">${se_.svg}</g>`,
      `<rect x="${W / 2 - 4}" y="0" width="8" height="${H}" fill="${C.ink}" />`,
    ].join("");
    shots.button = { svg: shotSvg(p, "button", world), dip: C.ink, tl: [...push(`${k}-cam`, s0, end - s0, "50% 50%"), ...ku_.tl, ...se_.tl] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ===== Scene 2 — First Strike (20s) ===== */
{
  const id = "s2-first-strike";
  const p = "s2";
  const S = T(id);
  const shots = {};
  const g = 830;

  // Establish: both in stance; Kuro sinks — and vanishes in a burst of crimson.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const vanish = 2.3;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [0, ku("ready", { x: 620, ground: g, s: 1.0, aura: 0.8 })],
        [1.3, ku("ready", { x: 620, ground: g, s: 1.0, aura: 0.8 })],
        [vanish, ku("crouch", { x: 640, ground: g, s: 1.0, aura: 1 }), { ease: "inOut" }],
      ],
      { end: vanish + 2 * F },
    );
    const seren = act(`${k}-se`, "seren", [[0, se("guard", { x: 1320, ground: g, s: 1.0, aura: 0.6 })]], { end });
    const world = [
      city(k, { horizon: 700, seaY: 880 }),
      platform(960, g + 30, 1.5, { cracks: 0.6 }),
      kuro.svg,
      seren.svg,
      `<g id="${k}-burst" class="d">${sparks([660, g - 180], 26, 260, C.accent, 51, 7)}<circle cx="660" cy="${g - 180}" r="90" fill="${C.accent}" opacity="0.5" /></g>`,
      `<g id="${k}-wind">${wind(53)}</g>`,
    ].join("");
    shots.establish = {
      svg: shotSvg(p, "establish", world),
      tl: [...push(`${k}-cam`, 0, end, "50% 70%"), `tl.fromTo("#${k}-wind", { x: 0 }, { x: -500, duration: ${end}, ease: "none" }, 0);`, ...kuro.tl, `tl.set("#${k}-ku-${0}", { opacity: 0 }, ${K.ft(vanish + 2 * F)});`, ...flash(`${k}-burst`, vanish, 6), `tl.fromTo("#${k}-burst", { scale: 0.6, transformOrigin: "50% 50%" }, { scale: 1.6, duration: 0.25, ease: "power2.out" }, ${vanish});`, ...seren.tl],
    };
  }

  // Approach: he reappears behind her with a horizontal slash; she turns and blocks with both blades.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const appear = s0 + 0.5;
    const hit = appear + 0.42;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [appear, ku("windup", { face: -1, x: 1360, ground: g, s: 1.2, aura: 1 })],
        [hit - 0.12, ku("windup", { face: -1, x: 1330, ground: g, s: 1.2, aura: 1 })],
        [hit, ku("slash", { face: -1, x: 1300, ground: g, s: 1.2, aura: 1 }), { ease: "in", ones: true }],
        [end, ku("slash", { face: -1, x: 1290, ground: g, s: 1.2, aura: 0.9, torso: 30 }), { ease: "lin" }],
      ],
      { end, from: appear },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("guard", { x: 900, ground: g, s: 1.2, aura: 0.6 })],
        [appear + 0.12, se("guard", { x: 900, ground: g, s: 1.2, aura: 0.6 })],
        [hit - 0.04, se("blockX", { face: 1, x: 920, ground: g, s: 1.2, aura: 1 }), { ease: "out", ones: true }],
        [end, se("blockX", { face: 1, x: 905, ground: g, s: 1.2, aura: 1, torso: -16 }), { ease: "lin" }],
      ],
      { end },
    );
    const clash = [1105, g - 330];
    const world = [
      city(k, { horizon: 700, seaY: 880 }),
      platform(960, g + 30, 1.5, { cracks: 0.7 }),
      `<g id="${k}-burst" class="d">${sparks([1360, g - 200], 22, 220, C.accent, 61, 6)}</g>`,
      `<g id="${k}-smear" class="d">${smear(rig(ku("slash", { face: -1, x: 1300, ground: g, s: 1.2 })).sh, 60, 270, 120, -40, C.accent, 0.6)}</g>`,
      seren.svg,
      kuro.svg,
      `<g id="${k}-sp1" class="d">${sparks(clash, 22, 260, C.practical, 63, 6)}${sparks(clash, 18, 200, C.accent, 65, 5)}</g>`,
      `<g id="${k}-sp2" class="d">${sparks(clash, 18, 180, C.line, 67, 4)}${sparks(clash, 14, 240, C.accent, 69, 4)}</g>`,
    ].join("");
    shots.approach = {
      svg: shotSvg(p, "approach", world, fullFlash(`${k}-flash`, C.line, 1)),
      tl: [
        ...flash(`${k}-burst`, appear, 5),
        ...kuro.tl,
        ...seren.tl,
        ...flash(`${k}-smear`, hit - 3 * F, 3),
        ...flash(`${k}-flash`, hit, 2),
        ...shake(`${k}-cam`, hit),
        ...flicker(`${k}-sp1`, `${k}-sp2`, hit + 2 * F, end),
      ],
    };
  }

  // Turn: close on the bind — crossed blades straining, sparks, both faces lit.
  {
    const k = `${p}-turn`;
    const s0 = S.turn.start;
    const end = S.turn.end;
    const keys = (make, a, b) => {
      const ks = [];
      for (let t = s0, i = 0; t < end; t += 0.3, i += 1) ks.push([t, make(i % 2 ? b : a), { ease: "inOut" }]);
      return ks;
    };
    const kuro = act(`${k}-ku`, "kuro", keys((o) => ku("slash", { face: -1, x: 1290, ground: 1420, s: 2.4, aura: 1, ...o }), { torso: 30 }, { torso: 33, x: 1282 }), { end, breath: 0 });
    const seren = act(`${k}-se`, "seren", keys((o) => se("blockX", { face: 1, x: 640, ground: 1420, s: 2.4, aura: 1, ...o }), { torso: -16 }, { torso: -13, x: 648 }), { end, breath: 0 });
    const world = [
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`,
      shafts(960, 300, 12, 1400, C.practical, 71, 0.1),
      seren.svg,
      kuro.svg,
      `<g id="${k}-a">${sparks([960, 330], 20, 240, C.practical, 73, 5)}</g>`,
      `<g id="${k}-b" class="d">${sparks([960, 330], 20, 240, C.accent, 79, 5)}</g>`,
    ].join("");
    shots.turn = { svg: shotSvg(p, "turn", world), tl: [...kuro.tl, ...seren.tl, ...flicker(`${k}-a`, `${k}-b`, s0, end)] };
  }

  // Sakuga: the bind explodes — sparks, shockwave — and the platform shatters beneath them.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const boom = s0 + 0.35;
    const shatter = s0 + 1.2;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [s0, ku("slash", { face: -1, x: 1080, ground: g, s: 1.0, aura: 1 })],
        [boom + 0.25, ku("air", { face: -1, x: 1200, y: 560, s: 1.0, aura: 0.8 }), { ease: "out", ones: true }],
        [shatter + 0.8, ku("air", { face: -1, x: 1500, y: 300, s: 1.0, aura: 0.6 }), { ease: "out" }],
        [end - 1.5, ku("land", { face: -1, x: 1600, ground: 620, s: 1.0, aura: 0.5 }), { ease: "in" }],
        [end - 0.4, ku("ready", { face: -1, x: 1600, ground: 620, s: 1.0, aura: 0.5 }), { ease: "stop" }],
      ],
      { end },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("blockX", { face: 1, x: 840, ground: g, s: 1.0, aura: 1 })],
        [boom + 0.25, se("air", { face: 1, x: 700, y: 560, s: 1.0, aura: 0.8 }), { ease: "out", ones: true }],
        [shatter + 0.8, se("air", { face: 1, x: 420, y: 320, s: 1.0, aura: 0.6 }), { ease: "out" }],
        [end - 1.4, se("land", { face: 1, x: 330, ground: 640, s: 1.0, aura: 0.5 }), { ease: "in" }],
        [end - 0.3, se("guard", { face: 1, x: 330, ground: 640, s: 1.0, aura: 0.5 }), { ease: "stop" }],
      ],
      { end },
    );
    const pieces = (() => {
      const rand = seeded(83);
      let o = "";
      for (let i = 0; i < 10; i += 1) {
        const x = 420 + i * 112;
        o += `<g id="${k}-pc${i}"><polygon points="${x},${g + 4} ${x + 100 + rand() * 30},${g + 4 + rand() * 10} ${x + 90},${g + 60 + rand() * 50} ${x + 10},${g + 50 + rand() * 40}" fill="${C.sky}" stroke="${C.line}" stroke-opacity="0.4" stroke-width="3" /></g>`;
      }
      return o;
    })();
    const world = [
      city(k, { horizon: 700, seaY: 900 }),
      island(330, 700, 0.6, 85, 0, 2),
      island(1600, 680, 0.6, 87, 0, 2),
      `<g id="${k}-whole">${platform(960, g + 30, 1.5, { cracks: 1 })}</g>`,
      `<g id="${k}-pieces" class="d">${pieces}</g>`,
      kuro.svg,
      seren.svg,
      `<ellipse id="${k}-ring" class="d" cx="960" cy="${g - 300}" rx="160" ry="70" fill="none" stroke="${C.line}" stroke-width="22" />`,
      `<ellipse id="${k}-ring2" class="d" cx="960" cy="${g - 300}" rx="120" ry="50" fill="none" stroke="${C.practical}" stroke-width="12" />`,
      `<g id="${k}-sp" class="d">${sparks([960, g - 300], 30, 480, C.practical, 89, 6)}${sparks([960, g - 300], 26, 420, C.accent, 91, 6)}</g>`,
      `<g id="${k}-dust" class="d">${shards([960, g], 30, 600, C.hair, 93)}</g>`,
    ].join("");
    const pcTl = [];
    const rand = seeded(97);
    for (let i = 0; i < 10; i += 1) {
      const dx = (i - 4.5) * 30;
      pcTl.push(`tl.fromTo("#${k}-pc${i}", { x: 0, y: 0, rotation: 0 }, { x: ${r1(dx * 4)}, y: ${r1(700 + rand() * 300)}, rotation: ${r1((rand() - 0.5) * 120)}, transformOrigin: "50% 50%", duration: ${r3(2.2 + rand())}, ease: "power2.in" }, ${r3(shatter + rand() * 0.3)});`);
    }
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world, fullFlash(`${k}-flash`, C.line, 1)),
      tl: [
        ...flash(`${k}-flash`, boom, 3),
        ...ringTl(`${k}-ring`, boom + 2 * F, 8, 1.3),
        ...ringTl(`${k}-ring2`, boom + 5 * F, 6, 1.3),
        ...flash(`${k}-sp`, boom + 2 * F, 14),
        `tl.fromTo("#${k}-sp", { scale: 0.7, transformOrigin: "50% 50%" }, { scale: 1.3, duration: ${r3(14 * F)}, ease: "power2.out" }, ${r3(boom + 2 * F)});`,
        `tl.set("#${k}-whole", { opacity: 0 }, ${K.ft(shatter)});`,
        ...show(`${k}-pieces`, shatter),
        ...pcTl,
        ...debrisTl(`${k}-dust`, shatter, 200, 700),
        ...shake(`${k}-cam`, boom),
        ...shake(`${k}-cam`, shatter),
        ...kuro.tl,
        ...seren.tl,
      ],
    };
  }

  // Aftermath: extreme wide — the platform's fragments falling into the clouds; they land on separate ruins.
  {
    const k = `${p}-aftermath`;
    const s0 = S.aftermath.start;
    const end = S.aftermath.end;
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("land", { face: -1, x: 1500, ground: 560, s: 0.5, aura: 0.4 })], [s0 + 1.0, ku("ready", { face: -1, x: 1500, ground: 560, s: 0.5, aura: 0.4 }), { ease: "inOut" }]], { end });
    const seren = act(`${k}-se`, "seren", [[s0, se("land", { face: 1, x: 420, ground: 580, s: 0.5, aura: 0.4 })], [s0 + 1.1, se("guard", { face: 1, x: 420, ground: 580, s: 0.5, aura: 0.4 }), { ease: "inOut" }]], { end });
    const world = [
      city(k),
      island(420, 590, 0.55, 101, 0, 2),
      island(1500, 570, 0.55, 103, 0, 2),
      `<g id="${k}-fall">${shards([960, 520], 40, 360, C.sky, 105, C.line)}</g>`,
      kuro.svg,
      seren.svg,
      `<g id="${k}-wind">${wind(107, 0.3)}</g>`,
    ].join("");
    shots.aftermath = {
      svg: shotSvg(p, "aftermath", world),
      tl: [
        ...push(`${k}-cam`, s0, end - s0, "50% 50%").map((l) => l.replace("{ scale: 1 }, { scale: 1.06", "{ scale: 1.06 }, { scale: 1")),
        `tl.fromTo("#${k}-fall", { y: -60 }, { y: 520, duration: ${r3(end - s0)}, ease: "power1.in" }, ${s0});`,
        `tl.fromTo("#${k}-wind", { x: 0 }, { x: -400, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`,
        ...wideBolts(k, [s0 + 1.6]),
        ...kuro.tl,
        ...seren.tl,
      ],
    };
  }

  // Button: across the gap, on their ruins, both ready; the wind.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const end = S.button.end;
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("ready", { face: -1, x: 1430, ground: 760, s: 0.9, aura: 0.5, wind: -60 })]], { end });
    const seren = act(`${k}-se`, "seren", [[s0, se("guard", { face: 1, x: 490, ground: 780, s: 0.9, aura: 0.5, wind: -60 })]], { end });
    const world = [city(k, { horizon: 700, seaY: 900 }), island(490, 790, 0.9, 109, 0, 2), island(1430, 770, 0.9, 111, 0, 2), kuro.svg, seren.svg, `<g id="${k}-wind">${wind(113)}</g>`].join("");
    shots.button = { svg: shotSvg(p, "button", world), tl: [`tl.fromTo("#${k}-wind", { x: 0 }, { x: -400, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`, ...kuro.tl, ...seren.tl] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ===== Scene 3 — Among the Ruins (20s) ===== */
{
  const id = "s3-among-the-ruins";
  const p = "s3";
  const S = T(id);
  const shots = {};
  const ruins = (k) => [city(k, { horizon: 720, seaY: 900 }), island(380, 760, 0.8, 121, 0, 3), island(1180, 640, 0.6, 123, 0.15, 2), island(1700, 800, 0.8, 125, 0, 2)].join("");

  // Establish: Kuro leaps the gap between ruins.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [0, ku("ready", { x: 380, ground: 760, s: 0.7 })],
        [0.5, ku("crouch", { x: 400, ground: 760, s: 0.7 }), { ease: "inOut" }],
        [0.8, ku("air", { x: 600, y: 470, s: 0.7 }), { ease: "out", ones: true }],
        [1.5, ku("air", { x: 950, y: 380, s: 0.7 }), { ease: "lin" }],
        [2.1, ku("land", { x: 1160, ground: 640, s: 0.7 }), { ease: "in" }],
      ],
      { end },
    );
    const world = [ruins(k), kuro.svg, `<g id="${k}-wind">${wind(127, 0.3)}</g>`].join("");
    shots.establish = { svg: shotSvg(p, "establish", world), tl: [...push(`${k}-cam`, 0, end, "60% 60%"), `tl.fromTo("#${k}-wind", { x: 0 }, { x: -400, duration: ${end}, ease: "none" }, 0);`, ...kuro.tl] };
  }

  // Approach: Seren meets him in the air — two strikes, two clashes.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const c1 = s0 + 0.6;
    const c2 = s0 + 1.5;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [s0, ku("air", { x: 520, y: 640, s: 1.0 })],
        [c1, ku("slash", { x: 840, y: 520, s: 1.0 }), { ease: "in", ones: true }],
        [c1 + 0.35, ku("air", { x: 720, y: 480, s: 1.0 }), { ease: "out" }],
        [c2, ku("slash", { x: 860, y: 470, s: 1.0, torso: 40 }), { ease: "in", ones: true }],
        [end, ku("air", { x: 640, y: 560, s: 1.0 }), { ease: "out" }],
      ],
      { end },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("air", { x: 1420, y: 600, s: 1.0 })],
        [c1, se("blockX", { x: 1100, y: 510, s: 1.0 }), { ease: "in", ones: true }],
        [c1 + 0.35, se("air", { x: 1220, y: 470, s: 1.0 }), { ease: "out" }],
        [c2, se("strike", { x: 1080, y: 460, s: 1.0 }), { ease: "in", ones: true }],
        [end, se("air", { x: 1320, y: 560, s: 1.0 }), { ease: "out" }],
      ],
      { end },
    );
    const world = [ruins(k), `<g id="${k}-lines">${speedLines([960, 500], 40, C.line, 129, 0.25)}</g>`, kuro.svg, seren.svg, `<g id="${k}-s1" class="d">${sparks([970, 420], 20, 220, C.practical, 131, 5)}</g>`, `<g id="${k}-s2" class="d">${sparks([970, 400], 20, 220, C.accent, 133, 5)}</g>`].join("");
    shots.approach = {
      svg: shotSvg(p, "approach", world, fullFlash(`${k}-flash`, C.line, 0.9)),
      tl: [...pan(`${k}-cam`, s0, end - s0, -80), ...kuro.tl, ...seren.tl, ...flash(`${k}-flash`, c1, 1), ...flash(`${k}-s1`, c1 + F, 7), ...flash(`${k}-flash`, c2, 1), ...flash(`${k}-s2`, c2 + F, 7), ...shake(`${k}-cam`, c1), ...shake(`${k}-cam`, c2)],
    };
  }

  // Turn: Kuro's aerial kick into her guard; she turns with it.
  {
    const k = `${p}-turn`;
    const s0 = S.turn.start;
    const end = S.turn.end;
    const hit = s0 + 0.9;
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [s0, ku("air", { x: 640, y: 560, s: 1.25 })],
        [hit - 0.2, ku("air", { x: 760, y: 500, s: 1.25, torso: -10 }), { ease: "inOut" }],
        [hit, ku("kick", { x: 860, y: 470, s: 1.25 }), { ease: "out", ones: true }],
        [end, ku("air", { x: 700, y: 520, s: 1.25 }), { ease: "inOut" }],
      ],
      { end },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("guard", { x: 1240, y: 560, s: 1.25 })],
        [hit, se("blockX", { x: 1180, y: 540, s: 1.25 }), { ease: "out", ones: true }],
        [hit + 0.5, se("spin", { x: 1290, y: 520, s: 1.25 }), { ease: "out" }],
        [end, se("guard", { x: 1320, y: 520, s: 1.25 }), { ease: "inOut" }],
      ],
      { end },
    );
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, cloudSea(860, 135), kuro.svg, seren.svg, `<g id="${k}-hit" class="d">${sparks([1060, 420], 18, 200, C.line, 137, 5)}</g>`].join("");
    shots.turn = {
      svg: shotSvg(p, "turn", world, fullFlash(`${k}-flash`, C.line, 0.9)),
      tl: [`tl.fromTo("#${k}-cam", { rotation: -4 }, { rotation: 4, duration: ${r3(end - s0)}, ease: "power1.inOut", transformOrigin: "50% 50%" }, ${s0});`, ...kuro.tl, ...seren.tl, ...flash(`${k}-flash`, hit, 2), ...flash(`${k}-hit`, hit + 2 * F, 8), ...shake(`${k}-cam`, hit)],
    };
  }

  // Sakuga: the exchange — spin attack, counter thrust, a near miss, a midair counter; stone knocked into the clouds.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const h = [0.5, 1.2, 1.9, 2.7, 3.4].map((x) => s0 + x);
    const kuro = act(
      `${k}-ku`,
      "kuro",
      [
        [s0, ku("air", { x: 640, y: 560, s: 1.05 })],
        [h[0], ku("spin", { x: 820, y: 540, s: 1.05 }), { ease: "in", ones: true }],
        [h[0] + 0.3, ku("air", { x: 700, y: 520, s: 1.05 }), { ease: "out" }],
        [h[1], ku("deflect", { x: 820, y: 520, s: 1.05 }), { ease: "out", ones: true }],
        [h[1] + 0.3, ku("air", { x: 720, y: 560, s: 1.05, torso: -20 }), { ease: "out" }],
        [h[2], ku("slash", { x: 840, y: 500, s: 1.05 }), { ease: "in", ones: true }],
        [h[2] + 0.35, ku("air", { x: 700, y: 520, s: 1.05 }), { ease: "out" }],
        [h[3], ku("kick", { x: 830, y: 520, s: 1.05 }), { ease: "in", ones: true }],
        [h[3] + 0.3, ku("air", { x: 660, y: 540, s: 1.05 }), { ease: "out" }],
        [h[4], ku("slash", { x: 860, y: 520, s: 1.05, torso: 34 }), { ease: "in", ones: true }],
        [end, ku("air", { x: 520, y: 620, s: 1.05 }), { ease: "out" }],
      ],
      { end },
    );
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("air", { x: 1300, y: 560, s: 1.05 })],
        [h[0], se("blockX", { x: 1090, y: 540, s: 1.05 }), { ease: "in", ones: true }],
        [h[0] + 0.3, se("air", { x: 1220, y: 520, s: 1.05 }), { ease: "out" }],
        [h[1], se("counter", { x: 1060, y: 520, s: 1.05 }), { ease: "in", ones: true }],
        [h[1] + 0.3, se("air", { x: 1220, y: 540, s: 1.05 }), { ease: "out" }],
        [h[2], se("spin", { x: 1100, y: 500, s: 1.05 }), { ease: "out", ones: true }],
        [h[2] + 0.35, se("air", { x: 1240, y: 520, s: 1.05 }), { ease: "out" }],
        [h[3], se("blockX", { x: 1090, y: 520, s: 1.05 }), { ease: "out", ones: true }],
        [h[3] + 0.3, se("air", { x: 1240, y: 540, s: 1.05 }), { ease: "out" }],
        [h[4], se("strike", { x: 1070, y: 520, s: 1.05 }), { ease: "in", ones: true }],
        [end, se("air", { x: 1400, y: 600, s: 1.05 }), { ease: "out" }],
      ],
      { end },
    );
    const world = [
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`,
      island(300, 900, 0.9, 141, 0.2, 2),
      island(1650, 860, 0.8, 143, 0.2, 2),
      cloudSea(940, 145),
      `<g id="${k}-lines">${speedLines([960, 520], 46, C.line, 147, 0.22)}</g>`,
      kuro.svg,
      seren.svg,
      ...h.map((_, i) => `<g id="${k}-sp${i}" class="d">${sparks([960, 440 + (i % 2) * 40], 20, 240, i % 2 ? C.accent : C.practical, 151 + i, 5)}</g>`),
      ...h.map((_, i) => `<g id="${k}-st${i}" class="d">${shards([900 + i * 40, 600], 8, 140, C.hair, 161 + i)}</g>`),
    ].join("");
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world, fullFlash(`${k}-flash`, C.line, 0.9)),
      tl: [
        `tl.fromTo("#${k}-cam", { rotation: 3 }, { rotation: -3, duration: 5, ease: "power1.inOut", transformOrigin: "50% 50%" }, ${s0});`,
        ...kuro.tl,
        ...seren.tl,
        ...h.flatMap((t, i) => [...flash(`${k}-flash`, t, 1), ...flash(`${k}-sp${i}`, t + F, 6), ...debrisTl(`${k}-st${i}`, t + F, 60, 500)]),
        ...shake(`${k}-cam`, h[4]),
      ],
    };
  }

  // Aftermath: extreme wide — stone tumbling into the clouds; two figures part to two ruins.
  {
    const k = `${p}-aftermath`;
    const s0 = S.aftermath.start;
    const end = S.aftermath.end;
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("air", { x: 900, y: 420, s: 0.35 })], [s0 + 1.2, ku("land", { x: 540, ground: 560, s: 0.35 }), { ease: "inOut" }]], { end });
    const seren = act(`${k}-se`, "seren", [[s0, se("air", { x: 1020, y: 410, s: 0.35 })], [s0 + 1.3, se("land", { x: 1380, ground: 530, s: 0.35 }), { ease: "inOut" }]], { end });
    const world = [city(k), island(540, 570, 0.45, 171, 0, 2), island(1380, 540, 0.45, 173, 0, 2), `<g id="${k}-fall">${shards([960, 480], 30, 260, C.hair, 175)}</g>`, kuro.svg, seren.svg].join("");
    shots.aftermath = { svg: shotSvg(p, "aftermath", world), tl: [...push(`${k}-cam`, s0, end - s0, "50% 50%"), `tl.fromTo("#${k}-fall", { y: 0 }, { y: 600, duration: ${r3(end - s0)}, ease: "power1.in" }, ${s0});`, ...wideBolts(k, [s0 + 2.2]), ...kuro.tl, ...seren.tl] };
  }

  // Button: Seren on her ruin; golden light gathering.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const end = S.button.end;
    const seren = act(`${k}-se`, "seren", [[s0, se("guard", { x: 1100, ground: 900, s: 1.5, aura: 0.3 })], [end - 0.4, se("summon", { x: 1100, ground: 900, s: 1.5, aura: 1 }), { ease: "inOut" }]], { end });
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, `<g id="${k}-light" opacity="0">${shafts(1100, 300, 16, 1300, C.practical, 177, 0.16)}</g>`, island(1100, 910, 1.4, 179, 0, 0), seren.svg].join("");
    shots.button = { svg: shotSvg(p, "button", world), tl: [`tl.to("#${k}-light", { opacity: 1, duration: 2, ease: "power2.in" }, ${s0});`, ...seren.tl] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ===== Scene 4 — Celestial Barrage (20s) ===== */
{
  const id = "s4-celestial-barrage";
  const p = "s4";
  const S = T(id);
  const shots = {};
  const swordRing = (cx, cy, n, r, seed, aim = -90) => {
    const rand = seeded(seed);
    const list = [];
    for (let i = 0; i < n; i += 1) {
      const a = 120 + (i / n) * 120 + rand() * 6;
      const pos = along([cx, cy], a, r + rand() * 140);
      list.push({ x: pos[0], y: pos[1], a: aim + (rand() - 0.5) * 10 });
    }
    return list;
  };

  // Establish: Seren spreads golden spectral wings.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const seren = act(`${k}-se`, "seren", [[0, se("summon", { x: 1120, ground: 900, s: 1.3, aura: 1 })]], { end });
    const j = rig(se("summon", { x: 1120, ground: 900, s: 1.3 }));
    const wingAnim = animate(`${k}-w`, 0, end, (u) => wings(j.sh[0], j.sh[1] + 20, 1.6, ease.out(Math.min(1, u * 1.6))));
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, shafts(1120, 340, 18, 1400, C.practical, 181, 0.12), cloudSea(880, 183), island(1120, 910, 1.3, 185, 0, 0), wingAnim.svg, seren.svg, embers(187, 40, C.practical, 600, 100, 1700, 900)].join("");
    shots.establish = { svg: shotSvg(p, "establish", world), tl: [...push(`${k}-cam`, 0, end, "58% 40%"), ...wingAnim.tl, ...seren.tl] };
  }

  // Approach: dozens of floating energy swords appear around her.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const swords = swordRing(1180, 540, 28, 300, 191);
    const seren = act(`${k}-se`, "seren", [[s0, se("summon", { x: 1180, ground: 980, s: 1.0, aura: 1 })], [s0 + 1.8, se("command", { x: 1180, ground: 980, s: 1.0, aura: 1 }), { ease: "inOut" }]], { end });
    const j = rig(se("summon", { x: 1180, ground: 980, s: 1.0 }));
    const world = [
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`,
      cloudSea(900, 193),
      wings(j.sh[0], j.sh[1] + 20, 1.25, 1),
      island(1180, 990, 1.0, 195, 0, 0),
      seren.svg,
      ...swords.map((sw, i) => `<g id="${k}-sw${i}" class="d">${energySword(sw.x, sw.y, sw.a, 1.1)}</g>`),
    ].join("");
    shots.approach = {
      svg: shotSvg(p, "approach", world),
      tl: [...pan(`${k}-cam`, s0, end - s0, -100), ...seren.tl, ...swords.flatMap((_, i) => [`tl.set("#${k}-sw${i}", { opacity: 1 }, ${K.ft(s0 + 0.2 + i * 0.06)});`, `tl.fromTo("#${k}-sw${i}", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, ${r3(s0 + 0.2 + i * 0.06)});`])],
    };
  }

  // Turn: she commands; the barrage launches; Kuro sprints across a collapsing bridge.
  {
    const k = `${p}-turn`;
    const s0 = S.turn.start;
    const end = S.turn.end;
    const runKeys = [];
    for (let t = s0, i = 0; t <= end + 0.01; t += 0.25, i += 1) runKeys.push([t, ku(i % 2 ? "run2" : "run1", { x: 300 + (t - s0) * 330, ground: 760, s: 0.9 }), { ease: "lin" }]);
    const kuro = act(`${k}-ku`, "kuro", runKeys, { end });
    const swords = swordRing(2000, 400, 20, 120, 197, -110);
    const bridgeSegs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<g id="${k}-b${i}"><polygon points="${i * 260 - 40},770 ${i * 260 + 210},770 ${i * 260 + 210},790 ${i * 260 - 40},790" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.35" stroke-width="3" /></g>`);
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, island(1500, 500, 0.6, 199, 0.7, 4), cloudSea(860, 201), ...bridgeSegs, kuro.svg, ...swords.map((sw, i) => `<g id="${k}-sw${i}">${energySword(sw.x, sw.y, sw.a, 1)}</g>`)].join("");
    const rand = seeded(203);
    shots.turn = {
      svg: shotSvg(p, "turn", world),
      tl: [
        ...kuro.tl,
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `tl.to("#${k}-b${i}", { y: 600, rotation: ${r1((rand() - 0.5) * 40)}, transformOrigin: "50% 50%", duration: 1.4, ease: "power2.in" }, ${r3(s0 + 0.6 + i * 0.32)});`),
        ...swords.map((sw, i) => `tl.fromTo("#${k}-sw${i}", { x: 0, y: 0 }, { x: ${r1(-1700 - rand() * 400)}, y: ${r1(250 + rand() * 300)}, duration: 0.9, ease: "power2.in" }, ${r3(s0 + 0.3 + i * 0.12)});`),
      ],
    };
  }

  // Sakuga: deflecting the swarm on the run, then crimson lightning gathers and the circular slash.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const hits = [0.3, 0.75, 1.15, 1.6, 2.0].map((x) => s0 + x);
    const charge = s0 + 2.6;
    const cut = s0 + 3.5;
    const keys = [[s0, ku("run1", { x: 760, ground: 800, s: 1.15 })]];
    hits.forEach((t, i) => {
      keys.push([t, ku("deflect", { x: 780 + i * 30, ground: 800, s: 1.15, torso: 12 + (i % 2) * 14 }), { ease: "out", ones: true }]);
      keys.push([t + 0.2, ku(i % 2 ? "run1" : "run2", { x: 800 + i * 30, ground: 800, s: 1.15 }), { ease: "inOut" }]);
    });
    keys.push([charge, ku("charge", { x: 960, ground: 800, s: 1.15, aura: 1 }), { ease: "inOut" }]);
    keys.push([cut - 0.15, ku("windup", { x: 960, ground: 800, s: 1.15, aura: 1 }), { ease: "inOut" }]);
    keys.push([cut, ku("spin", { x: 960, ground: 800, s: 1.15, aura: 1 }), { ease: "in", ones: true }]);
    keys.push([cut + 0.18, ku("slash", { x: 960, ground: 800, s: 1.15, aura: 1 }), { ease: "out", ones: true }]);
    const kuro = act(`${k}-ku`, "kuro", keys, { end });
    const j = rig(ku("charge", { x: 960, ground: 800, s: 1.15 }));
    const incoming = hits.map((t, i) => ({ t, from: [1900, 200 + i * 90], to: [880 + i * 30, 520 + (i % 2) * 40] }));
    const world = [
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`,
      cloudSea(880, 211),
      `<polygon points="-100,810 2020,810 2020,840 -100,840" fill="${C.ink}" stroke="${C.line}" stroke-opacity="0.35" stroke-width="3" />`,
      ...incoming.map((s, i) => `<g id="${k}-in${i}">${energySword(s.from[0], s.from[1], -90 - Math.atan2(s.to[1] - s.from[1], s.from[0] - s.to[0]) * 57.3 + 0, 1.1)}</g>`),
      kuro.svg,
      ...hits.map((_, i) => `<g id="${k}-sp${i}" class="d">${sparks(incoming[i].to, 14, 160, C.practical, 213 + i, 5)}</g>`),
      `<g id="${k}-l1" class="d">${arcs(j.fh, along(j.fh, 180, 210), 221, C.accent)}${arcs([j.fh[0] - 80, j.fh[1] - 220], [j.fh[0] + 60, j.fh[1] + 120], 223, C.accent)}</g>`,
      `<g id="${k}-l2" class="d">${arcs(j.fh, along(j.fh, 180, 210), 227, C.line)}${arcs([j.fh[0] + 90, j.fh[1] - 200], [j.fh[0] - 70, j.fh[1] + 130], 229, C.accent)}</g>`,
      `<ellipse id="${k}-ring" class="d" cx="960" cy="600" rx="200" ry="80" fill="none" stroke="${C.accent}" stroke-width="26" />`,
      `<ellipse id="${k}-ring2" class="d" cx="960" cy="600" rx="160" ry="60" fill="none" stroke="${C.line}" stroke-width="8" />`,
    ].join("");
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world, fullFlash(`${k}-flash`, C.accent, 0.7)),
      tl: [
        ...incoming.flatMap((s, i) => [`tl.fromTo("#${k}-in${i}", { x: 0, y: 0 }, { x: ${r1(s.to[0] - s.from[0])}, y: ${r1(s.to[1] - s.from[1])}, duration: 0.3, ease: "power2.in" }, ${r3(s.t - 0.3)});`, `tl.to("#${k}-in${i}", { x: ${r1(s.to[0] - s.from[0] + 300)}, y: ${r1(s.to[1] - s.from[1] - 500)}, rotation: 220, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.out" }, ${r3(s.t)});`, ...flash(`${k}-sp${i}`, s.t, 5)]),
        ...kuro.tl,
        ...flicker(`${k}-l1`, `${k}-l2`, charge, cut),
        ...flash(`${k}-flash`, cut, 2),
        ...ringTl(`${k}-ring`, cut + 2 * F, 9, 1.4),
        ...ringTl(`${k}-ring2`, cut + 4 * F, 7, 1.4),
        ...shake(`${k}-cam`, cut),
      ],
    };
  }

  // Aftermath: the crimson ring tears through the sword swarm; Seren shields with her wings.
  {
    const k = `${p}-aftermath`;
    const s0 = S.aftermath.start;
    const end = S.aftermath.end;
    const swords = swordRing(1300, 520, 26, 260, 231, -100);
    const seren = act(
      `${k}-se`,
      "seren",
      [
        [s0, se("command", { x: 1360, ground: 960, s: 0.9, aura: 1 })],
        [s0 + 0.6, se("blockX", { x: 1370, ground: 960, s: 0.9, aura: 1 }), { ease: "out" }],
        [s0 + 1.6, se("blockX", { x: 1385, ground: 960, s: 0.9, aura: 0.9, torso: -18 })],
        [s0 + 2.6, se("guard", { x: 1360, ground: 960, s: 0.9, aura: 0.8 }), { ease: "stop" }],
      ],
      { end },
    );
    const j = rig(se("blockX", { x: 1370, ground: 960, s: 0.9 }));
    const world = [
      `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`,
      cloudSea(900, 233),
      `<g id="${k}-wings">${wings(j.sh[0], j.sh[1] + 20, 1.15, 0.7)}</g>`,
      island(1370, 970, 0.9, 235, 0, 0),
      seren.svg,
      ...swords.map((sw, i) => `<g id="${k}-sw${i}">${energySword(sw.x, sw.y, sw.a, 1)}</g>`),
      `<ellipse id="${k}-ring" cx="400" cy="560" rx="200" ry="90" fill="none" stroke="${C.accent}" stroke-width="30" />`,
    ].join("");
    const rand = seeded(237);
    shots.aftermath = {
      svg: shotSvg(p, "aftermath", world),
      tl: [
        `tl.fromTo("#${k}-ring", { scale: 1, opacity: 1, transformOrigin: "50% 50%" }, { scale: 9, opacity: 0, duration: 1.6, ease: "power2.out" }, ${s0});`,
        ...swords.map((sw, i) => `tl.to("#${k}-sw${i}", { x: ${r1(200 + rand() * 300)}, y: ${r1(500 + rand() * 300)}, rotation: ${r1(200 + rand() * 300)}, opacity: 0, transformOrigin: "50% 50%", duration: 1.2, ease: "power2.in" }, ${r3(s0 + 0.3 + (sw.x - 1000) / 2000)});`),
        `tl.fromTo("#${k}-wings", { scaleX: 1, svgOrigin: "${r1(j.sh[0])} ${r1(j.sh[1])}" }, { scaleX: 0.55, svgOrigin: "${r1(j.sh[0])} ${r1(j.sh[1])}", duration: 0.5, ease: "power2.out" }, ${r3(s0 + 0.5)});`,
        ...seren.tl,
      ],
    };
  }

  // Button: both across the sky; crimson lightning still crackling on his blade.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const end = S.button.end;
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("ready", { x: 520, ground: 760, s: 0.85, aura: 0.8 })]], { end });
    const seren = act(`${k}-se`, "seren", [[s0, se("guard", { x: 1420, ground: 740, s: 0.85, aura: 0.8 })]], { end });
    const j = rig(ku("ready", { x: 520, ground: 760, s: 0.85 }));
    const world = [city(k, { horizon: 700, seaY: 880 }), island(520, 770, 0.8, 239, 0, 1), island(1420, 750, 0.8, 241, 0, 1), kuro.svg, seren.svg, `<g id="${k}-l1">${arcs(j.fh, along(j.fh, -125, 160), 243, C.accent)}</g><g id="${k}-l2" class="d">${arcs(j.fh, along(j.fh, -125, 160), 245, C.line)}</g>`].join("");
    shots.button = { svg: shotSvg(p, "button", world), tl: [...kuro.tl, ...seren.tl, ...flicker(`${k}-l1`, `${k}-l2`, s0, end), ...wideBolts(k, [s0 + 1.2])] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ===== Scene 5 — Dragon and Phoenix (20s) ===== */
{
  const id = "s5-dragon-and-phoenix";
  const p = "s5";
  const S = T(id);
  const shots = {};

  // Establish: both charge — crimson lightning, golden rings.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const kuro = act(`${k}-ku`, "kuro", [[0, ku("ready", { x: 500, ground: 820, s: 0.9, aura: 0.8 })], [1.0, ku("charge", { x: 500, ground: 820, s: 0.9, aura: 1 }), { ease: "inOut" }]], { end });
    const seren = act(`${k}-se`, "seren", [[0, se("guard", { x: 1420, ground: 820, s: 0.9, aura: 0.8 })], [1.1, se("charge", { x: 1420, ground: 820, s: 0.9, aura: 1 }), { ease: "inOut" }]], { end });
    const ringAnim = animate(`${k}-rg`, 0, end, (u, t) => `<ellipse cx="1420" cy="560" rx="${r1(140 + u * 60)}" ry="40" fill="none" stroke="${C.practical}" stroke-width="8" transform="rotate(${r1(t * 60)} 1420 560)" opacity="0.8" /><ellipse cx="1420" cy="560" rx="${r1(100 + u * 40)}" ry="30" fill="none" stroke="${C.practical}" stroke-width="5" transform="rotate(${r1(-t * 80)} 1420 560)" />`);
    const world = [city(k, { horizon: 700, seaY: 900 }), island(500, 830, 0.9, 251, 0, 1), island(1420, 830, 0.9, 253, 0, 1), `<g id="${k}-col"><rect x="470" y="-100" width="60" height="920" fill="${C.accent}" opacity="0.35" /></g>`, ringAnim.svg, kuro.svg, seren.svg].join("");
    shots.establish = { svg: shotSvg(p, "establish", world), tl: [...push(`${k}-cam`, 0, end), `tl.fromTo("#${k}-col", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 1.2, ease: "power2.out" }, 1.0);`, ...ringAnim.tl, ...kuro.tl, ...seren.tl, ...wideBolts(k, [1.6])] };
  }

  // Approach: the crimson dragon forms, coiling up out of the lightning.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const dr = animate(`${k}-dr`, s0, end, (u, t) => dragon(u, t, { x0: 260, y0: 980, x1: 1300, y1: 260, reach: Math.max(0.05, ease.out(u)), scale: 1.1 }));
    const kuro = act(`${k}-ku`, "kuro", [[s0, ku("charge", { x: 300, ground: 960, s: 0.8, aura: 1 })]], { end });
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, clouds(261, 200, 6, C.ink, 0.6), cloudSea(900, 263), dr.svg, kuro.svg, embers(265, 40, C.accent)].join("");
    shots.approach = { svg: shotSvg(p, "approach", world), tl: [...pan(`${k}-cam`, s0, end - s0, -100), ...dr.tl, ...kuro.tl] };
  }

  // Turn: the golden phoenix spreads its wings within burning rings.
  {
    const k = `${p}-turn`;
    const s0 = S.turn.start;
    const end = S.turn.end;
    const ph = animate(`${k}-ph`, s0, end, (u, t) => `<g opacity="${r1(Math.min(1, u * 2.5) * 100) / 100}">${phoenix(1000, 470, 0.6 + 0.6 * ease.out(Math.min(1, u * 1.5)), 0.5 + 0.5 * Math.sin(t * 5), t)}</g>`);
    const seren = act(`${k}-se`, "seren", [[s0, se("charge", { x: 1000, ground: 1040, s: 0.8, aura: 1 })]], { end });
    const world = [`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${k}-sky)" />`, shafts(1000, 300, 18, 1400, C.practical, 271, 0.12), cloudSea(920, 273), ph.svg, seren.svg, embers(275, 50, C.practical)].join("");
    shots.turn = { svg: shotSvg(p, "turn", world), tl: [...push(`${k}-cam`, s0, end - s0, "50% 45%"), ...ph.tl, ...seren.tl] };
  }

  // Sakuga: dragon and phoenix charge across the sky and collide. Half a second of silence. Then everything.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const meet = s0 + 2.0;
    const boom = meet + 0.5;
    const dr = animate(`${k}-dr`, s0, meet, (u, t) => dragon(u, t, { x0: -300 + u * 700, y0: 820 - u * 200, x1: 500 + u * 420, y1: 460 - u * 60, reach: 1, scale: 0.9 }), { hold: false });
    const phx = animate(`${k}-ph`, s0, meet, (u, t) => phoenix(1600 - u * 520, 420, 0.75, 0.5 + 0.5 * Math.sin(t * 7), t), { hold: false });
    const world = [
      city(k, { horizon: 700, seaY: 900 }),
      `<rect id="${k}-red" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.accent}" opacity="0" />`,
      `<rect id="${k}-gold" x="${W / 2}" y="-200" width="${W / 2 + 200}" height="${H + 400}" fill="${C.practical}" opacity="0" />`,
      dr.svg,
      phx.svg,
      `<g id="${k}-meet" class="d">${dragon(1, meet, { x0: 400, y0: 620, x1: 920, y1: 400, scale: 0.9 })}${phoenix(1080, 420, 0.75, 0.3, meet)}<circle cx="1000" cy="410" r="60" fill="${C.line}" /></g>`,
      `<circle id="${k}-core" class="d" cx="1000" cy="410" r="160" fill="${C.line}" />`,
      `<ellipse id="${k}-r1" class="d" cx="1000" cy="410" rx="200" ry="90" fill="none" stroke="${C.accent}" stroke-width="40" />`,
      `<ellipse id="${k}-r2" class="d" cx="1000" cy="410" rx="180" ry="80" fill="none" stroke="${C.practical}" stroke-width="30" />`,
      `<ellipse id="${k}-r3" class="d" cx="1000" cy="410" rx="150" ry="70" fill="none" stroke="${C.line}" stroke-width="14" />`,
      `<g id="${k}-deb" class="d">${shards([1000, 410], 40, 900, C.hair, 281)}</g>`,
      `<g id="${k}-emb" class="d">${embers(283, 80, C.practical)}${embers(285, 80, C.accent)}</g>`,
    ].join("");
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world, fullFlash(`${k}-flash`, C.line, 1)),
      tl: [
        `tl.to("#${k}-red", { opacity: 0.25, duration: 2, ease: "power1.in" }, ${s0});`,
        `tl.to("#${k}-gold", { opacity: 0.2, duration: 2, ease: "power1.in" }, ${s0});`,
        ...dr.tl,
        ...phx.tl,
        ...show(`${k}-meet`, meet, boom),
        ...flash(`${k}-flash`, boom, 4),
        ...show(`${k}-core`, boom + 4 * F, boom + 0.9),
        `tl.fromTo("#${k}-core", { scale: 1, transformOrigin: "50% 50%" }, { scale: 3, opacity: 0.2, duration: 0.9, ease: "power2.out" }, ${r3(boom + 4 * F)});`,
        ...ringTl(`${k}-r1`, boom + 3 * F, 10, 1.8),
        ...ringTl(`${k}-r2`, boom + 6 * F, 8, 1.8),
        ...ringTl(`${k}-r3`, boom + 9 * F, 6, 1.6),
        ...debrisTl(`${k}-deb`, boom + 3 * F, 200, 800),
        ...show(`${k}-emb`, boom + 0.3),
        `tl.fromTo("#${k}-emb", { y: -200, opacity: 1 }, { y: 400, opacity: 0.2, duration: ${r3(end - boom - 0.3)}, ease: "none" }, ${r3(boom + 0.3)});`,
        `tl.to("#${k}-red", { opacity: 0.55, duration: 0.3, ease: "power2.out" }, ${r3(boom + 4 * F)});`,
        `tl.to("#${k}-gold", { opacity: 0.5, duration: 0.3, ease: "power2.out" }, ${r3(boom + 4 * F)});`,
        ...shake(`${k}-cam`, boom),
        ...shake(`${k}-cam`, boom + 0.3),
      ],
    };
  }

  // Aftermath: extreme wide — the entire sky red and gold; the shockwave rolling through the clouds.
  {
    const k = `${p}-aftermath`;
    const s0 = S.aftermath.start;
    const end = S.aftermath.end;
    const world = [
      city(k),
      `<rect x="-200" y="-200" width="${W / 2 + 200}" height="${H + 400}" fill="${C.accent}" opacity="0.45" />`,
      `<rect x="${W / 2}" y="-200" width="${W / 2 + 200}" height="${H + 400}" fill="${C.practical}" opacity="0.4" />`,
      `<ellipse id="${k}-ring" cx="960" cy="420" rx="300" ry="80" fill="none" stroke="${C.line}" stroke-width="20" />`,
      shafts(960, 420, 24, 1600, C.line, 291, 0.12),
      `<g id="${k}-emb">${embers(293, 90, C.practical)}${embers(295, 60, C.accent)}</g>`,
    ].join("");
    shots.aftermath = {
      svg: shotSvg(p, "aftermath", world),
      tl: [`tl.fromTo("#${k}-ring", { scale: 1, opacity: 1, transformOrigin: "50% 50%" }, { scale: 5, opacity: 0, duration: 3.4, ease: "power2.out" }, ${s0});`, `tl.fromTo("#${k}-emb", { y: 0 }, { y: 300, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`, ...push(`${k}-cam`, s0, end - s0, "50% 40%").map((l) => l.replace("{ scale: 1 }, { scale: 1.06", "{ scale: 1.06 }, { scale: 1"))],
    };
  }

  // Button: the light fades; embers drift down.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const end = S.button.end;
    const world = [city(k), `<rect id="${k}-glow" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.practical}" opacity="0.4" />`, `<g id="${k}-emb">${embers(297, 70, C.practical)}</g>`].join("");
    shots.button = { svg: shotSvg(p, "button", world), tl: [`tl.to("#${k}-glow", { opacity: 0, duration: 2.2, ease: "power1.out" }, ${s0});`, `tl.fromTo("#${k}-emb", { y: 0, opacity: 1 }, { y: 260, opacity: 0, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ===== Scene 6 — The Last Clash (12s) ===== */
{
  const id = "s6-last-clash";
  const p = "s6";
  const S = T(id);
  const shots = {};
  const g = 840;

  // Establish: they descend onto opposite sides of the ruined platform.
  {
    const k = `${p}-establish`;
    const end = S.establish.end;
    const kuro = act(`${k}-ku`, "kuro", [[0, ku("air", { x: 520, y: 240, s: 0.9, aura: 0.3 })], [1.2, ku("land", { x: 560, ground: g, s: 0.9, aura: 0.2 }), { ease: "inOut" }], [2.2, ku("tired", { x: 560, ground: g, s: 0.9 }), { ease: "inOut" }]], { end });
    const seren = act(`${k}-se`, "seren", [[0, se("air", { x: 1420, y: 230, s: 0.9, aura: 0.3 })], [1.3, se("land", { x: 1380, ground: g, s: 0.9, aura: 0.2 }), { ease: "inOut" }], [2.3, se("tired", { x: 1380, ground: g, s: 0.9 }), { ease: "inOut" }]], { end });
    const world = [city(k, { horizon: 700, seaY: 900 }), `<g opacity="0.85">${platform(960, g + 30, 1.3, { cracks: 1 })}</g>`, kuro.svg, seren.svg, `<g id="${k}-dust" class="d">${hLines(g - 60, g + 10, 12, C.line, 301, 0.4)}</g>`, `<g id="${k}-emb">${embers(303, 30, C.practical)}</g>`].join("");
    shots.establish = { svg: shotSvg(p, "establish", world), tl: [...push(`${k}-cam`, 0, end), ...kuro.tl, ...seren.tl, ...flash(`${k}-dust`, 1.25, 10), `tl.fromTo("#${k}-emb", { y: 0 }, { y: 200, duration: ${end}, ease: "none" }, 0);`] };
  }

  // Approach: exhausted, breathing hard, weapons glowing faintly; the wind.
  {
    const k = `${p}-approach`;
    const s0 = S.approach.start;
    const end = S.approach.end;
    const pant = (make, a, b) => {
      const ks = [];
      for (let t = s0, i = 0; t <= end; t += 0.6, i += 1) ks.push([t, make(i % 2 ? b : a), { ease: "inOut" }]);
      return ks;
    };
    const kuro = act(`${k}-ku`, "kuro", pant((o) => ku("tired", { x: 600, ground: g, s: 1.15, wind: -40, ...o }), { torso: 20 }, { torso: 27, tilt: 22 }), { end, breath: 0 });
    const seren = act(`${k}-se`, "seren", pant((o) => se("tired", { x: 1340, ground: g, s: 1.15, wind: -40, ...o }), { torso: 18 }, { torso: 25, tilt: 20 }), { end, breath: 0 });
    const world = [city(k, { horizon: 700, seaY: 900 }), platform(960, g + 30, 1.5, { cracks: 1 }), kuro.svg, seren.svg, `<g id="${k}-wind">${wind(305, 0.3)}</g>`].join("");
    shots.approach = { svg: shotSvg(p, "approach", world), tl: [...pan(`${k}-cam`, s0, end - s0, -60), ...kuro.tl, ...seren.tl, `tl.fromTo("#${k}-wind", { x: 0 }, { x: -300, duration: ${r3(end - s0)}, ease: "none" }, ${s0});`] };
  }

  // Sakuga: their eyes — then the rush.
  {
    const k = `${p}-sakuga`;
    const s0 = S.sakuga.start;
    const end = S.sakuga.end;
    const rush = s0 + 1.6;
    const ke = animate(`${k}-ke`, s0, rush, (u) => eyeCloseup("kuro", 960, 300, 520, { narrow: Math.min(0.85, u * 1.6), glint: u > 0.7, face: 1 }), { hold: false });
    const sev = animate(`${k}-sv`, s0, rush, (u) => eyeCloseup("seren", 960, 780, 520, { narrow: Math.min(0.85, u * 1.5), glint: u > 0.75, face: -1 }), { hold: false });
    const meet = rush + 1.0;
    const kuro = act(`${k}-ku`, "kuro", [[rush, ku("tired", { x: 520, ground: g, s: 1.0 })], [rush + 0.3, ku("crouch", { x: 540, ground: g, s: 1.0, aura: 1 }), { ease: "inOut" }], [meet, ku("dash", { x: 900, ground: g, s: 1.0, aura: 1 }), { ease: "in", ones: true }]], { end: meet + 2 * F, from: rush });
    const seren = act(`${k}-se`, "seren", [[rush, se("tired", { x: 1400, ground: g, s: 1.0 })], [rush + 0.3, se("land", { x: 1380, ground: g, s: 1.0, aura: 1 }), { ease: "inOut" }], [meet, se("dash", { x: 1020, ground: g, s: 1.0, aura: 1 }), { ease: "in", ones: true }]], { end: meet + 2 * F, from: rush });
    const world = [
      `<g id="${k}-eyes">${ke.svg}${sev.svg}<rect x="0" y="536" width="${W}" height="8" fill="${C.ink}" /></g>`,
      `<g id="${k}-yard" class="d">${city(k, { horizon: 700, seaY: 900 })}${platform(960, g + 30, 1.5, { cracks: 1 })}${speedLines([960, 600], 60, C.line, 311, 0.35)}${kuro.svg}${seren.svg}</g>`,
      `<rect id="${k}-white" class="d" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.line}" />`,
    ].join("");
    shots.sakuga = {
      svg: shotSvg(p, "sakuga", world),
      tl: [...ke.tl, ...sev.tl, ...show(`${k}-yard`, rush), `tl.set("#${k}-eyes", { opacity: 0 }, ${K.ft(rush)});`, ...kuro.tl, ...seren.tl, ...show(`${k}-white`, meet), ...shake(`${k}-cam`, meet)],
    };
  }

  // Button: white, then black.
  {
    const k = `${p}-button`;
    const s0 = S.button.start;
    const world = `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.ink}" /><rect id="${k}-white" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.line}" />`;
    shots.button = { svg: shotSvg(p, "button", world), dip: C.line, tl: [`tl.set("#${k}-white", { opacity: 0 }, ${K.ft(s0 + 0.6)});`] };
  }
  out[id] = scene(id, p, alive(p, id, shots), { dipColor: C.ink, sounds: CUES[id] });
}

/* ---------------- write ---------------- */

for (const [sid, html] of Object.entries(out)) writeFileSync(join(FILM, "compositions", `${sid}.html`), html);

const hosts = K.SEQ.scenes
  .map((s) => `      <div id="${s.id}-host" data-composition-id="${s.id}" data-composition-src="${s.composition}" data-start="${s.start}" data-duration="${s.seconds}" data-track-index="1" data-width="${W}" data-height="${H}"></div>`)
  .join("\n");
writeFileSync(
  join(FILM, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${K.SEQ.title} — html-anime</title>
    <style>
      html, body { margin: 0; background: ${C.ink}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.ink}; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="${K.SEQ.slug}" data-start="0" data-duration="${K.SEQ.seconds}" data-width="${W}" data-height="${H}">
${hosts}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${K.SEQ.slug}"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`,
);

/* ---------------- model sheets ---------------- */

function modelSheet(who, name, poses, notes) {
  const look = WR.LOOK[who];
  const views = poses
    .map(([label, pose], i) => {
      const x = 170 + i * 250;
      return `${warrior({ ...pose, x, ground: 760, s: 1 }, who, { t: 0.4 })}<text class="lab" x="${x}" y="800" text-anchor="middle">${label}</text>`;
    })
    .join("");
  const guides = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path class="guide" d="M40 ${760 - i * 50} H1480" />`).join("");
  const chips = Object.entries({ body: look.body, legs: look.legs, trim: look.trim, hair: look.hair, eyes: look.eye, skin: C.skin, blade: look.blade.fill, glow: look.blade.glow })
    .map(([n, hex], i) => `<rect x="1540" y="${150 + i * 46}" width="34" height="34" fill="${hex}" stroke="${C.line}" stroke-width="1" /><text class="lab" x="1588" y="${173 + i * 46}">${n} ${hex}</text>`)
    .join("");
  const noteLines = notes.map((n, i) => `<text class="note" x="1540" y="${600 + i * 30}">${n}</text>`).join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${name} — model sheet — sky-city-duel</title>
    <style>
      html, body { margin: 0; background: ${C.ink}; }
      svg { display: block; width: 100%; height: auto; max-width: 1920px; }
      text { font-family: ui-sans-serif, system-ui, sans-serif; fill: ${C.line}; }
      .h1 { font-size: 34px; font-weight: 700; letter-spacing: 0.04em; }
      .h2 { font-size: 15px; font-weight: 600; letter-spacing: 0.14em; fill: ${C.practical}; }
      .lab { font-size: 15px; opacity: 0.8; }
      .note { font-size: 16px; }
      .guide { stroke: ${C.line}; stroke-width: 1; opacity: 0.15; stroke-dasharray: 6 6; }
    </style>
  </head>
  <body>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${C.sky}" />
      <text class="h1" x="40" y="62">${name.toUpperCase()}</text>
      <text class="lab" x="40" y="88">model sheet · films/sky-city-duel · 7 heads (BONES) · follows the script's description</text>
      <text class="h2" x="40" y="130">POSES · FROM THE FILM'S RIG</text>
      ${guides}
      <path d="M40 760 H1480" stroke="${C.line}" stroke-width="2" opacity="0.5" />
      ${views}
      <text class="h2" x="40" y="860">EYES</text>
      <svg x="40" y="870" width="700" height="190" viewBox="0 0 700 190"><rect width="700" height="190" fill="${C.ink}" />${eyeCloseup(who, 350, 110, 260, {})}</svg>
      <svg x="760" y="870" width="700" height="190" viewBox="0 0 700 190"><rect width="700" height="190" fill="${C.ink}" />${eyeCloseup(who, 350, 110, 260, { narrow: 0.8, glint: true })}</svg>
      <text class="h2" x="1540" y="130">PAINTS</text>
      ${chips}
      <text class="h2" x="1540" y="570">NOTES</text>
      ${noteLines}
    </svg>
  </body>
</html>
`;
}

writeFileSync(
  join(FILM, "design", "kuro.html"),
  modelSheet(
    "kuro",
    "Kuro",
    [
      ["stand", KU.stand],
      ["ready", KU.ready],
      ["windup", KU.windup],
      ["slash", KU.slash],
      ["run", KU.run1],
      ["kick", { ...KU.kick, y: 520 }],
    ],
    ["Silver spiked hair, crimson eyes.", "Long black coat, crimson markings,", "tails stream with wind and motion.", "Dark-energy katana: black blade,", "crimson edge and glow, 190px.", "Never change: silver hair, red", "markings, black blade."],
  ),
);
writeFileSync(
  join(FILM, "design", "seren.html"),
  modelSheet(
    "seren",
    "Seren",
    [
      ["stand", { face: -1, ...SE.stand }],
      ["guard", { face: -1, ...SE.guard }],
      ["block", { face: -1, ...SE.blockX }],
      ["strike", { face: -1, ...SE.strike }],
      ["summon", { face: -1, ...SE.summon }],
      ["counter", { face: -1, ...SE.counter }],
    ],
    ["Long white hair, golden eyes.", "Black armor with gold trim, cape,", "armored skirt; cape and hair stream.", "Twin celestial blades: gold, white", "core, gold glow, 150px each.", "Never change: white hair, gold", "trim, gold eyes, two blades."],
  ),
);

console.log(`build: wrote ${Object.keys(out).length} scenes, index.html, and 2 model sheets`);
