/**
 * The html-anime drawing kit: a stick rig with inbetweening (act), effects,
 * rain, timeline helpers, and scene assembly for a sequence's compositions.
 * A film's build script makes one kit, then draws its own characters and world:
 *
 *   const K = createKit({ film: FILM_DIR, colors: C });
 *   const walk = K.act("s1-a", "hero", keys, { end: 4, render: drawHero });
 *
 * Rig angles: 0° = down, 90° = toward the facing side, 180° = up; a positive
 * torso or tilt leans toward the facing side. Everything is deterministic.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {{film: string, colors: Record<string,string>, bones?: Record<string,number>, W?: number, H?: number, fps?: number}} opts
 *   `film` is the sequence's folder (with sequence.json and scenes/); `colors` the sheet's paints by role.
 */
export function createKit({ film, colors, bones, W = 1920, H = 1080, fps = 24 }) {
  const C = colors;
  const FILM = film;
  const F = 1 / fps;
  const SEQ = JSON.parse(readFileSync(join(FILM, "sequence.json"), "utf8"));

  // The kit body is left unindented: its template strings are written out verbatim.
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;
const pt = (p) => `${r1(p[0])},${r1(p[1])}`;

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ---------------- the rig ---------------- */

const L = bones ?? { torso: 118, neck: 12, head: 27, ua: 64, fa: 60, th: 78, sh: 76 };

function along(o, deg, len) {
  const r = (deg * Math.PI) / 180;
  return [o[0] + Math.sin(r) * len, o[1] + Math.cos(r) * len];
}

function rig(p) {
  const s = p.s ?? 1;
  const f = p.face ?? 1;
  const A = (a) => (a ?? 0) * f;
  const t = A(p.torso);
  const solve = (hip) => {
    const neck = along(hip, 180 - t, L.torso * s);
    const head = along(neck, 180 - t - A(p.tilt), (L.neck + L.head) * s);
    const sh = along(hip, 180 - t, (L.torso - 8) * s);
    const fe = along(sh, A(p.fua), L.ua * s);
    const fh = along(fe, A(p.ffa), L.fa * s);
    const be = along(sh, A(p.bua), L.ua * s);
    const bh = along(be, A(p.bfa), L.fa * s);
    const fk = along(hip, A(p.fth), L.th * s);
    const ff = along(fk, A(p.fsh), L.sh * s);
    const bk = along(hip, A(p.bth), L.th * s);
    const bf = along(bk, A(p.bsh), L.sh * s);
    return { hip, neck, head, sh, fe, fh, be, bh, fk, ff, bk, bf };
  };
  let j = solve([p.x, p.y ?? 0]);
  if (p.ground != null) {
    const low = Math.max(j.ff[1], j.bf[1]);
    j = solve([p.x, (p.y ?? 0) + (p.ground - low)]);
  }
  return j;
}

/* ---------------- effects ---------------- */

/** A tapered crescent: a blade's smear around a pivot, from angle a0 to a1. */
function smear(c, r0, r1_, a0, a1, color, opacity = 0.9) {
  const n = 18;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    outer.push(along(c, a, r1_));
    inner.push(along(c, a, r1_ - (r1_ - r0) * Math.sin((Math.PI * i) / n)));
  }
  return `<polygon points="${[...outer, ...inner.reverse()].map(pt).join(" ")}" fill="${color}" opacity="${opacity}" />`;
}

function sparks(c, n, len, color, seed, width = 4) {
  const rand = seeded(seed);
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const a = (360 * i) / n + rand() * 25;
    const from = along(c, a, 10 + rand() * 30);
    const to = along(c, a + (rand() - 0.5) * 10, 40 + rand() * len);
    d += `M${pt(from)} L${pt(to)} `;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`;
}

function shards(c, n, spread, color, seed, edge = C.line) {
  const rand = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i += 1) {
    const a = 100 + rand() * 160;
    const p = along(c, a, 30 + rand() * spread);
    const s = 8 + rand() * 18;
    const rot = rand() * 360;
    const q = [along(p, rot, s), along(p, rot + 130, s * 0.8), along(p, rot + 220, s * 0.6)];
    out += `<polygon points="${q.map(pt).join(" ")}" fill="${color}" stroke="${edge}" stroke-width="2" />`;
  }
  return out;
}

function speedLines(c, n, color, seed, opacity = 0.5) {
  const rand = seeded(seed);
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const a = rand() * 360;
    const from = along(c, a, 1300);
    const to = along(c, a, 380 + rand() * 260);
    d += `M${pt(from)} L${pt(to)} `;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="3" opacity="${opacity}" />`;
}

function hLines(y0, y1, n, color, seed, opacity = 0.45) {
  const rand = seeded(seed);
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const y = y0 + rand() * (y1 - y0);
    const x = rand() * W;
    d += `M${r1(x)},${r1(y)} L${r1(x + 300 + rand() * 600)},${r1(y)} `;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="3" opacity="${opacity}" />`;
}

function bolt(x0, y0, x1, y1, seed, id = "", cls = "") {
  const rand = seeded(seed);
  const pts = [[x0, y0]];
  const n = 9;
  for (let i = 1; i < n; i += 1) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + (rand() - 0.5) * 120, y0 + (y1 - y0) * t]);
  }
  pts.push([x1, y1]);
  const d = `M${pts.map(pt).join(" L")}`;
  return `<g${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}><path d="${d}" stroke="${C.moon}" stroke-width="22" opacity="0.25" fill="none" stroke-linejoin="bevel" /><path d="${d}" stroke="${C.moon}" stroke-width="6" fill="none" stroke-linejoin="bevel" /></g>`;
}

function arcs(a, b, seed, color) {
  const rand = seeded(seed);
  const pts = [a];
  for (let i = 1; i < 7; i += 1) {
    const t = i / 7;
    pts.push([a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * 30, a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * 30]);
  }
  pts.push(b);
  return `<path d="M${pts.map(pt).join(" L")}" stroke="${color}" stroke-width="3" fill="none" />`;
}

function petals(seed, n, x0, y0, x1, y1) {
  const rand = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i += 1) {
    const cx = r1(x0 + rand() * (x1 - x0));
    const cy = r1(y0 + rand() * (y1 - y0));
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${r1(5 + rand() * 4)}" ry="${r1(3 + rand() * 2)}" transform="rotate(${Math.round(rand() * 180)} ${cx} ${cy})" fill="${C.skin}" opacity="0.85" />`;
  }
  return out;
}

/* ---------------- the world ---------------- */

function skyDefs(id) {
  return `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}" /><stop offset="0.55" stop-color="${C.sky}" /><stop offset="1" stop-color="${C.ink}" /></linearGradient>
<pattern id="${id}-rain-far" width="70" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><path d="M10,0 L10,26 M44,58 L44,80 M28,92 L28,112" stroke="${C.line}" stroke-width="1.6" /></pattern>
<pattern id="${id}-rain-near" width="150" height="220" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><path d="M20,10 L20,70 M96,120 L96,170" stroke="${C.line}" stroke-width="3" /></pattern>`;
}

const RAIN = {
  far: { dx: -120 * Math.sin((18 * Math.PI) / 180), dy: 120 * Math.cos((18 * Math.PI) / 180), dur: 0.3 },
  near: { dx: -220 * Math.sin((18 * Math.PI) / 180), dy: 220 * Math.cos((18 * Math.PI) / 180), dur: 0.22 },
};

function rain(id, far = 0.35, near = 0.45) {
  return `<rect id="${id}-rf" x="-400" y="-500" width="2800" height="2200" fill="url(#${id}-rain-far)" opacity="${far}" /><rect id="${id}-rn" x="-400" y="-500" width="2800" height="2200" fill="url(#${id}-rain-near)" opacity="${near}" />`;
}

/** The rain loop: each layer slides exactly one pattern tile and repeats. `exact` stops before `dur` ends. */
function rainTl(id, start, dur, { exact = false } = {}) {
  const out = [];
  for (const [k, r] of [
    ["rf", RAIN.far],
    ["rn", RAIN.near],
  ]) {
    const cycles = exact ? Math.floor(dur / r.dur) : Math.ceil(dur / r.dur);
    if (cycles < 1) continue;
    out.push(`tl.fromTo("#${id}-${k}", { x: 0, y: 0 }, { x: ${r3(r.dx)}, y: ${r3(r.dy)}, duration: ${r.dur}, ease: "none", repeat: ${cycles - 1} }, ${r3(start)});`);
  }
  return out;
}

function clouds(seed, y, n, color = C.ink, opacity = 0.75) {
  const rand = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i += 1) {
    out += `<ellipse cx="${r1(-100 + rand() * (W + 200))}" cy="${r1(y + rand() * 120)}" rx="${r1(220 + rand() * 260)}" ry="${r1(50 + rand() * 50)}" fill="${color}" opacity="${opacity}" />`;
  }
  return out;
}

/* ---------------- scene assembly ---------------- */

const PLANS = Object.fromEntries(
  SEQ.scenes.map((s) => [s.id, JSON.parse(readFileSync(join(FILM, s.dir, "sheet.json"), "utf8"))]),
);

function voiceOf(sceneId) {
  try {
    return JSON.parse(readFileSync(join(FILM, "scenes", sceneId, "voice.json"), "utf8")).lines;
  } catch {
    return [];
  }
}

/**
 * Build one scene file. Each shot is {svg, tl}: svg is the inner content (camera
 * group included), tl a list of timeline statements in scene time.
 */
/**
 * Assemble one scene file. `sounds` are extra audio clips: [{ name, t, dur, volume }] for
 * assets/sfx/<name>.wav (see harness/sfx.js); they are laid out on tracks that never overlap.
 */
function scene(sceneId, prefix, shots, { card, dipColor = C.accent, sounds = [] } = {}) {
  const sheet = PLANS[sceneId];
  const seconds = sheet.seconds;
  const lines = voiceOf(sceneId);
  const clips = [];
  const tl = [];
  sheet.shots.forEach((plan, i) => {
    const shot = shots[plan.id];
    if (!shot) throw new Error(`${sceneId}: no drawing for shot ${plan.id}`);
    clips.push(
      `<div id="${prefix}-${plan.id}" class="clip ${prefix}-shot" data-start="${plan.start}" data-duration="${r3(plan.end - plan.start)}" data-track-index="${1 + (i % 2)}"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${shot.svg}</svg></div>`,
    );
    tl.push(`// ${plan.label}${plan.sakuga ? " (sakuga)" : ""} ${plan.start}–${plan.end}`, ...shot.tl);
    if (i > 0) {
      const id = `${prefix}-dip${i}`;
      clips.push(`<div id="${id}" class="clip ${prefix}-dip" data-start="${r3(plan.start - 0.25)}" data-duration="0.65" data-track-index="3" style="background:${shot.dip ?? dipColor}"></div>`);
      tl.push(
        `tl.set("#${id}", { opacity: 0 }, ${r3(plan.start - 0.25)});`,
        `tl.to("#${id}", { opacity: 1, duration: 0.25, ease: "power2.in" }, ${r3(plan.start - 0.25)});`,
        `tl.to("#${id}", { opacity: 0, duration: 0.35, ease: "power2.out" }, ${r3(plan.start + 0.05)});`,
      );
    }
  });
  clips.push(`<div id="${prefix}-bars" class="clip ${prefix}-bars" data-start="0" data-duration="${seconds}" data-track-index="4"></div>`);
  lines.forEach((l, i) => {
    clips.push(
      `<div id="${prefix}-sub${i + 1}" class="clip ${prefix}-sub" data-start="${l.start}" data-duration="${l.duration}" data-track-index="5">${l.text.replace(/'/g, "&#39;")}</div>`,
    );
  });
  if (card) {
    clips.push(`<div id="${prefix}-card" class="clip ${prefix}-card" data-start="${card.start}" data-duration="${r3(seconds - card.start)}" data-track-index="6">${card.text}</div>`);
  }
  const fadeStart = r3(seconds - 8 * F);
  clips.push(`<div id="${prefix}-end" class="clip ${prefix}-end" data-start="${fadeStart}" data-duration="${r3(8 * F)}" data-track-index="7"></div>`);
  tl.push(`tl.fromTo("#${prefix}-end", { opacity: 0 }, { opacity: 1, duration: ${r3(7 * F)}, ease: "none" }, ${fadeStart});`);
  const ends = [];
  const sfx = [...sounds]
    .sort((a, b) => a.t - b.t)
    .map((x, i) => {
      const dur = r3(Math.min(x.dur, seconds - x.t));
      let lane = ends.findIndex((e) => e <= x.t + 1e-6);
      if (lane === -1) lane = ends.push(0) - 1;
      ends[lane] = x.t + dur;
      return `  <audio id="${prefix}-fx${i}" class="clip" src="assets/sfx/${x.name}.wav" data-start="${r3(x.t)}" data-duration="${dur}" data-track-index="${20 + lane}" data-volume="${x.volume ?? 1}"></audio>`;
    });
  const audio = [...lines.map((l) => `  ${l.audio}`), ...sfx].join("\n");

  return `<template>
  <style>
    @font-face { font-family: "Shippori Mincho"; src: url("assets/fonts/shippori-mincho-500.woff2") format("woff2"); font-weight: 500; font-display: block; }
    #root { position: absolute; inset: 0; overflow: hidden; background: ${C.ink}; }
    .${prefix}-shot { position: absolute; inset: 0; overflow: hidden; z-index: 1; }
    .${prefix}-shot svg { display: block; }
    .${prefix}-dip { position: absolute; inset: 0; z-index: 3; opacity: 0; }
    .${prefix}-bars { position: absolute; inset: 0; z-index: 4; border-top: 64px solid ${C.ink}; border-bottom: 110px solid ${C.ink}; box-sizing: border-box; }
    .${prefix}-sub { position: absolute; left: 0; right: 0; bottom: 34px; z-index: 5; text-align: center; font-family: "Shippori Mincho", serif; font-weight: 500; font-size: 42px; color: ${C.line}; }
    .${prefix}-card { position: absolute; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; font-family: "Shippori Mincho", serif; font-weight: 500; font-size: 72px; letter-spacing: 0.18em; color: ${C.accent}; }
    .${prefix}-end { position: absolute; inset: 0; z-index: 7; background: ${C.ink}; opacity: 0; }
    .d { opacity: 0; }
  </style>
  <div id="root" data-composition-id="${sceneId}" data-start="0" data-duration="${seconds}" data-width="${W}" data-height="${H}">
${clips.map((c) => `    ${c}`).join("\n")}
${audio}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
${tl.map((s) => `    ${s}`).join("\n")}
    window.__timelines["${sceneId}"] = tl;
  </script>
</template>
`;
}

/** Drawing swaps: keys = [[time, id], …]; every id in the group is hidden except the current one. */
/**
 * A drawing-swap time, snapped to the frame grid and placed just before the frame, so the
 * swap shows on exactly that frame. (A time rounded up past the frame, like 0.042 for 1/24,
 * shows one frame late: the previous drawing repeats and this one is skipped — stutter.)
 */
function ft(t) {
  return (Math.max(0, Math.round(t / F) * F - 0.0002)).toFixed(4);
}

function swaps(keys, ids = [...new Set(keys.map((k) => k[1]))]) {
  const out = [];
  for (const [t, on] of keys) {
    for (const id of ids) out.push(`tl.set("#${id}", { opacity: ${id === on ? 1 : 0} }, ${ft(t)});`);
  }
  return out;
}

function flash(id, t, frames = 2, peak = 1) {
  return [`tl.set("#${id}", { opacity: ${peak} }, ${ft(t)});`, `tl.set("#${id}", { opacity: 0 }, ${ft(t + frames * F)});`];
}

function push(cam, start, dur, origin = "50% 60%") {
  return [`tl.fromTo("#${cam}", { scale: 1 }, { scale: 1.06, duration: ${r3(dur)}, ease: "power1.inOut", transformOrigin: "${origin}" }, ${r3(start)});`];
}

function pan(cam, start, dur, dx = -120) {
  return [`tl.fromTo("#${cam}", { x: 0 }, { x: ${dx}, duration: ${r3(dur)}, ease: "none" }, ${r3(start)});`];
}

function shake(cam, t) {
  const xs = [18, -14, 10, -6, 3, 0];
  const ys = [-10, 8, -5, 3, -1, 0];
  return xs.map((x, i) => `tl.set("#${cam}", { x: ${x}, y: ${ys[i]} }, ${r3(t + i * F)});`);
}

function fullFlash(id, color, opacity = 1) {
  return `<rect id="${id}" class="d" x="-300" y="-300" width="${W + 600}" height="${H + 600}" fill="${color}" opacity="${opacity}" />`;
}

function shotSvg(prefix, id, world, overlay = "") {
  return `<defs>${skyDefs(`${prefix}-${id}`)}</defs><g id="${prefix}-${id}-cam">${world}</g>${overlay}`;
}

/* ---------------- inbetweening ---------------- */

const EASE = {
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u) => 1 - Math.pow(1 - u, 3),
  in: (u) => u * u * u,
  lin: (u) => u,
};
const ANGLES = ["torso", "tilt", "fua", "ffa", "bua", "bfa", "fth", "fsh", "bth", "bsh"];

/** A key pose with its hip resolved, so grounded and airborne keys interpolate. */
function resolve(p) {
  const j = rig(p);
  const { ground, ...rest } = p;
  return { ...rest, x: j.hip[0], y: j.hip[1] };
}

function lerpPose(a, b, e) {
  const m = (k, d = 0) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * e;
  const out = { ...(e < 0.5 ? a : b), x: m("x"), y: m("y"), s: m("s", 1) };
  for (const k of ANGLES) out[k] = m(k);
  // Optional numeric extras a renderer may read (aura, blade glow, wind), interpolated when both keys have them.
  for (const k of ["aura", "glow", "wind"]) if (a[k] != null || b[k] != null) out[k] = m(k);
  const ba = a.blades ?? [];
  const bb = b.blades ?? [];
  if (ba.length === bb.length) {
    out.blades = ba.map((x, i) => ({
      ...(e < 0.5 ? x : bb[i]),
      a: x.a + (bb[i].a - x.a) * e,
      len: x.len != null || bb[i].len != null ? (x.len ?? bb[i].len) + ((bb[i].len ?? x.len) - (x.len ?? bb[i].len)) * e : undefined,
      glow: (x.glow ?? 1) + ((bb[i].glow ?? 1) - (x.glow ?? 1)) * e,
    }));
  }
  return out;
}

/** A held pose stays alive: a slow breath through the torso and arms. */
function breathe(p, t, k = 1) {
  const w = Math.sin((2 * Math.PI * t) / 1.7);
  const w2 = Math.sin((2 * Math.PI * t) / 1.7 + 1.1);
  return { ...p, torso: (p.torso ?? 0) + 1.6 * k * w, fua: (p.fua ?? 0) + 2.2 * k * w2, bua: (p.bua ?? 0) - 1.8 * k * w2, tilt: (p.tilt ?? 0) + 1.2 * k * w };
}

/**
 * An actor across a shot: key poses in time, inbetweened by the rig.
 * keys: [[time, pose, {ease, ones, freeze}]] — `ease` shapes the move into that key
 * (inOut: slow out and slow in), `ones` draws that move on every frame (fast action),
 * `freeze` stops the breath on the hold after that key. Acting is on twos.
 * Returns the drawings and the swaps that play them.
 */
/** Numeric fields of a pose, flattened, so a spline can run through every one. */
function poseNumbers(p) {
  const out = { x: p.x, y: p.y, s: p.s ?? 1 };
  for (const k of ANGLES) out[k] = p[k] ?? 0;
  for (const k of ["aura", "glow", "wind"]) if (p[k] != null) out[k] = p[k];
  (p.blades ?? []).forEach((b, i) => {
    out[`b${i}a`] = b.a;
    if (b.len != null) out[`b${i}l`] = b.len;
    out[`b${i}g`] = b.glow ?? 1;
  });
  return out;
}

function withNumbers(base, nums) {
  const out = { ...base, x: nums.x, y: nums.y, s: nums.s };
  for (const k of ANGLES) out[k] = nums[k];
  for (const k of ["aura", "glow", "wind"]) if (nums[k] != null) out[k] = nums[k];
  if (base.blades) {
    out.blades = base.blades.map((b, i) => ({ ...b, a: nums[`b${i}a`] ?? b.a, ...(nums[`b${i}l`] != null ? { len: nums[`b${i}l`] } : {}), glow: nums[`b${i}g`] ?? b.glow }));
  }
  return out;
}

/**
 * Spline motion through keys: velocity carries through a key instead of stopping on it.
 * A segment's ease shapes its ends: "in" arrives fast and stops dead (an impact),
 * "out" leaves fast (a recoil), "lin" keeps constant speed, "stop" eases both ends;
 * otherwise the curve flows through (Catmull-Rom). Holds and the ends of the act stop.
 */
function splineSegments(ks) {
  const nums = ks.map((k) => poseNumbers(k.p));
  const same = (i, j) => JSON.stringify(ks[i]?.p) === JSON.stringify(ks[j]?.p);
  const tangent = (i, key) => {
    if (i <= 0 || i >= ks.length - 1 || same(i, i - 1) || same(i, i + 1) || ks[i].o.stop) return 0;
    const a = nums[i - 1][key];
    const b = nums[i + 1][key];
    if (a == null || b == null) return 0;
    return (b - a) / (ks[i + 1].t - ks[i - 1].t);
  };
  return (i, u) => {
    const k0 = nums[i];
    const k1 = nums[i + 1];
    const dt = ks[i + 1].t - ks[i].t;
    const ease = ks[i + 1].o.ease;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    const out = {};
    for (const key of Object.keys(k0)) {
      if (k1[key] == null) {
        out[key] = k0[key];
        continue;
      }
      const slope = (k1[key] - k0[key]) / dt;
      let m0 = tangent(i, key);
      let m1 = tangent(i + 1, key);
      if (ease === "in") [m0, m1] = [0, 1.6 * slope];
      else if (ease === "out") [m0, m1] = [1.6 * slope, 0];
      else if (ease === "lin") [m0, m1] = [slope, slope];
      else if (ease === "stop" || ease === "inOut") [m0, m1] = [ks[i].o.flow ? m0 : 0, ks[i + 1].o.flow ? m1 : 0];
      out[key] = h00 * k0[key] + h10 * dt * m0 + h01 * k1[key] + h11 * dt * m1;
    }
    return withNumbers(u < 0.5 ? ks[i].p : ks[i + 1].p, out);
  };
}

/**
 * An actor across a shot: key poses in time, inbetweened by the rig.
 * keys: [[time, pose, {ease, ones, freeze, stop, flow}]].
 * Options: `step` (default every frame), `interp` ("spline", the default, flows through keys;
 * "ease" is the older pose-to-pose easing, with `ones` choosing the step per move), `breath`
 * (0 = holds freeze), `render(pose, who, {t, dt, vx, vy, state})` — `state` persists across the
 * act's frames, for cloth and hair physics.
 */
function act(id, who, keys, { end, from = keys[0][0], breath = 1, render, step = F, interp = "spline" }) {
  const ks = keys.map(([t, p, o = {}]) => ({ t, p: resolve(p), o }));
  const frames = [];
  const at = (t, pose) => frames.push([r3(t), pose]);
  const spline = interp === "spline" ? splineSegments(ks) : null;
  for (let i = 0; i < ks.length; i += 1) {
    const k = ks[i];
    const next = ks[i + 1];
    const until = next ? next.t : end;
    if (!next || JSON.stringify(next.p) === JSON.stringify(k.p)) {
      // A hold: alive unless frozen.
      const still = k.o.freeze || breath === 0;
      const holdStep = interp === "spline" ? step : 2 * F;
      for (let t = Math.max(k.t, from); t < until - 1e-6; t += holdStep) at(t, still ? k.p : breathe(k.p, t, breath));
      continue;
    }
    const segStep = interp === "spline" ? step : next.o.ones ? F : 2 * F;
    const ease = EASE[next.o.ease ?? "inOut"] ?? EASE.inOut;
    for (let t = k.t; t < next.t - 1e-6; t += segStep) {
      if (t < from - 1e-6) continue;
      const u = (t - k.t) / (next.t - k.t);
      at(t, spline ? spline(i, u) : lerpPose(k.p, next.p, ease(u)));
    }
  }
  let svg = "";
  const tl = [];
  let prev = null;
  let prevSvg = "";
  let n = 0;
  let last = null;
  const state = {};
  for (const [t, pose] of frames) {
    // Motion for secondary animation: hair and cloth trail the hip's velocity (px/s).
    const dt = last ? t - last.t : 0;
    const vx = dt > 0 ? (pose.x - last.x) / dt : 0;
    const vy = dt > 0 ? (pose.y - last.y) / dt : 0;
    last = { t, x: pose.x, y: pose.y };
    const drawn = render(pose, who, { t, dt, vx, vy, state });
    if (drawn === prevSvg) continue;
    const fid = `${id}-${n++}`;
    svg += `<g id="${fid}" class="d">${drawn}</g>`;
    if (prev) tl.push(`tl.set("#${prev}", { opacity: 0 }, ${ft(t)});`);
    tl.push(`tl.set("#${fid}", { opacity: 1 }, ${ft(t)});`);
    prev = fid;
    prevSvg = drawn;
  }
  return { svg, tl };
}

/** Toggle a group on and off every two frames (flickering energy). */
function flicker(a, b, start, end, step = F) {
  const keys = [];
  for (let t = start; t < end - 1e-6; t += step) keys.push([t, keys.length % 2 ? b : a]);
  return swaps(keys, [a, b]);
}

function show(id, from, to) {
  return [`tl.set("#${id}", { opacity: 1 }, ${ft(from)});`, ...(to != null ? [`tl.set("#${id}", { opacity: 0 }, ${ft(to)});`] : [])];
}

/** A shockwave ring growing smoothly and thinning out. */
function ringTl(id, t, scale, dur) {
  return [
    `tl.set("#${id}", { opacity: 1 }, ${r3(t)});`,
    `tl.fromTo("#${id}", { scale: 0.4, transformOrigin: "50% 50%" }, { scale: ${scale}, duration: ${dur}, ease: "power3.out" }, ${r3(t)});`,
    `tl.to("#${id}", { opacity: 0, duration: ${dur}, ease: "power2.in" }, ${r3(t)});`,
  ];
}

/** Debris thrown up and falling back under gravity. */
function debrisTl(id, t, up = 180, down = 420) {
  return [
    `tl.set("#${id}", { opacity: 1 }, ${r3(t)});`,
    `tl.fromTo("#${id}", { y: 0 }, { y: ${-up}, duration: 0.55, ease: "power2.out" }, ${r3(t)});`,
    `tl.to("#${id}", { y: ${down}, duration: 0.7, ease: "power2.in" }, ${r3(t + 0.55)});`,
    `tl.to("#${id}", { opacity: 0, duration: 0.3, ease: "none" }, ${r3(t + 0.95)});`,
  ];
}


  return { W, H, F, SEQ, ft, poseNumbers, splineSegments, r1, r3, pt, seeded, L, along, rig, smear, sparks, shards, speedLines, hLines, bolt, arcs, petals, skyDefs, RAIN, rain, rainTl, clouds, PLANS, voiceOf, scene, swaps, flash, push, pan, shake, fullFlash, shotSvg, EASE, ANGLES, resolve, lerpPose, breathe, act, flicker, show, ringTl, debrisTl };
}
