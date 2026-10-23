/**
 * Kuro and Seren drawn from their actor specs (actors.mjs) on the kit's rig: cel paint
 * with an ink outline on every part, garments and hair as spring chains that lag, overshoot,
 * and settle with the wind and the body's motion, faces with blinks, weapons, auras, and
 * eye close-ups. Poses are keys for act(); see the model sheets.
 */

import { createActors } from "./actors.mjs";

export const BONES = { torso: 112, neck: 12, head: 25, ua: 62, fa: 58, th: 88, sh: 86 };

export function createWarriors(K, C) {
  const { r1, pt, along, rig } = K;

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]) || 1;
  const unit = (a) => mul(a, 1 / len(a));
  const perp = (a) => [-a[1], a[0]];
  const deg = (a) => (Math.atan2(a[0], a[1]) * 180) / Math.PI;

  /** A closed or open Catmull-Rom curve through points, as a path. */
  function smooth(ps, closed = true) {
    const n = ps.length;
    const P = (i) => (closed ? ps[(i + n) % n] : ps[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${pt(ps[0])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i += 1) {
      const p0 = P(i - 1);
      const p1 = P(i);
      const p2 = P(i + 1);
      const p3 = P(i + 2);
      const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
      const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
      d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
    }
    return closed ? `${d} Z` : d;
  }

  /** A tapered limb segment from a to b. */
  function limb(a, b, wa, wb) {
    const n = unit(perp(sub(b, a)));
    const ps = [add(a, mul(n, wa)), add(b, mul(n, wb)), add(b, mul(unit(sub(b, a)), wb * 0.9)), sub(b, mul(n, wb)), sub(a, mul(n, wa)), sub(a, mul(unit(sub(b, a)), wa * 0.9))];
    return smooth(ps);
  }

  const SPECS = createActors(C);
  // The compact look the eye close-ups and model sheets read.
  const LOOK = Object.fromEntries(
    Object.entries(SPECS).map(([who, a]) => [
      who,
      { aura: a.aura, eye: a.eye, hair: a.hair.fill, body: a.body.torso, legs: a.body.legs, trim: a.weapon.trim, blade: { fill: a.weapon.fill, glow: a.weapon.glow } },
    ]),
  );

  function weapon(hand, a, length, w, s, glow = 1) {
    const tip = along(hand, a, length * s);
    const n = along([0, 0], a + 90, 1);
    const off = (p, k) => [p[0] + n[0] * k, p[1] + n[1] * k];
    const butt = along(hand, a + 180, 34 * s);
    const g = along(hand, a, 10 * s);
    return [
      glow > 0.02 ? `<polygon points="${pt(off(g, 18 * s))} ${pt(along(hand, a, (length + 26) * s))} ${pt(off(g, -18 * s))}" fill="${w.glow}" opacity="${r1(0.32 * glow * 10) / 10}" />` : "",
      `<path d="M${pt(hand)} L${pt(butt)}" stroke="${C.ink}" stroke-width="${r1(11 * s)}" stroke-linecap="round" />`,
      `<path d="M${pt(hand)} L${pt(butt)}" stroke="${w.trim}" stroke-width="${r1(3 * s)}" stroke-dasharray="${r1(5 * s)} ${r1(5 * s)}" />`,
      `<polygon points="${pt(off(g, 7 * s))} ${pt(off(along(hand, a, length * 0.9 * s), 4.5 * s))} ${pt(tip)} ${pt(off(g, -6 * s))}" fill="${w.fill}" stroke="${C.ink}" stroke-width="${r1(2.5 * s)}" stroke-linejoin="round" />`,
      `<path d="M${pt(off(g, 5 * s))} L${pt(tip)}" stroke="${w.edge}" stroke-width="${r1(2.5 * s)}" />`,
      `<path d="M${pt(off(along(hand, a, 4 * s), 15 * s))} L${pt(off(along(hand, a, 4 * s), -15 * s))}" stroke="${w.trim}" stroke-width="${r1(6 * s)}" stroke-linecap="round" />`,
    ].join("");
  }

  /**
   * A chain of nodes hanging from a root, each angle a damped spring toward its target.
   * Deterministic: integrated in fixed substeps, frame after frame, from the act's state.
   */
  function chain(state, key, root, targets, cfg, dt, s) {
    let c = state?.[key];
    if (!c || !(dt > 0) || c.a.length !== targets.length) {
      c = { a: targets.slice(), v: targets.map(() => 0) };
      if (state) state[key] = c;
    } else {
      const steps = 6;
      const h = dt / steps;
      for (let k = 0; k < steps; k += 1) {
        for (let i = 0; i < c.a.length; i += 1) {
          // Each node pulls toward its own target and toward following its parent's bend.
          const follow = i === 0 ? targets[0] : c.a[i - 1] + (targets[i] - targets[i - 1]);
          const goal = i === 0 ? targets[0] : 0.45 * follow + 0.55 * targets[i];
          const acc = (goal - c.a[i]) * cfg.stiffness * (1 + i * 0.15) - c.v[i] * cfg.damping;
          c.v[i] += acc * h;
          c.a[i] += c.v[i] * h;
        }
      }
    }
    const pts = [root];
    for (let i = 0; i < c.a.length; i += 1) pts.push(along(pts[i], c.a[i], cfg.seg * s));
    return pts;
  }

  /** A ribbon along chain points, tapering from w0 to w1; returns the outline and its two edges. */
  function ribbon(pts, w0, w1, s) {
    const left = [];
    const right = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const n = unit(perp(sub(b, a)));
      const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) * s;
      left.push(add(pts[i], mul(n, w)));
      right.push(sub(pts[i], mul(n, w)));
    }
    const tip = add(pts.at(-1), mul(unit(sub(pts.at(-1), pts.at(-2))), w1 * s * 0.6));
    return { d: smooth([...left, tip, ...right.reverse()]), left, right: right.reverse() };
  }

  /**
   * One actor from its spec. m = {t, dt, vx, vy, state}: time, frame step, hip velocity,
   * and the act's persistent state (cloth and hair springs).
   * Pose extras: aura (0–1), glow (blade glow), wind (deg the wind blows cloth toward), eye (false = closed).
   */
  function warrior(p, who, m = {}) {
    const A = SPECS[who];
    const B = A.build;
    const j = rig(p);
    const s = p.s ?? 1;
    const f = p.face ?? 1;
    const t = m.t ?? 0;
    const dt = m.dt ?? 0;
    const vx = m.vx ?? 0;
    const vy = m.vy ?? 0;
    const u = unit(sub(j.neck, j.hip));
    const front = mul(perp(u), -f);
    const hr = BONES.head * s;
    const hc = j.head;
    const at = (k, d) => add(add(j.hip, mul(u, k * BONES.torso * s)), mul(front, d * s));
    const wind = p.wind ?? -35;
    const ow = 4.5 * s;
    const shape = (d, fill) => `<path d="${d}" fill="${fill}" stroke="${A.outline}" stroke-width="${r1(ow)}" stroke-linejoin="round" paint-order="stroke" />`;
    const silhouettes = [];
    const push = (list, d, fill) => {
      silhouettes.push(d);
      list.push(shape(d, fill));
    };

    // Where each garment hangs, and the direction it rests in.
    const anchors = {
      hipBack: at(0.22, -B.hips + 2),
      hipMid: at(0.15, 0),
      hipFront: at(0.22, B.hips - 4),
      shoulderBack: at(0.96, -B.back + 4),
      headBack: add(hc, add(mul(front, -hr * 0.55), mul(u, hr * 0.35))),
      headNape: add(hc, add(mul(front, -hr * 0.45), mul(u, -hr * 0.45))),
      headSide: add(hc, add(mul(front, -hr * 0.12), mul(u, -hr * 0.15))),
    };
    const targetsFor = (cfg, phase) => {
      const restAbs = (cfg.rest ?? 0) * f;
      const drag = Math.max(-70, Math.min(70, ((wind - restAbs) * 0.55 - vx * 0.045) * cfg.wind));
      const fall = Math.max(-35, Math.min(35, vy * 0.03 * cfg.wind)) * (restAbs <= 0 ? -1 : 1);
      return Array.from({ length: cfg.nodes }, (_, i) => {
        const flutter = Math.sin(t * (cfg.seg < 32 ? 9 : 7) + i * 0.8 + phase) * (2 + i * 1.6) * cfg.wind;
        return Math.max(-160, Math.min(160, restAbs + drag + fall + flutter + (cfg.curl ?? 0) * i * f));
      });
    };
    const drawChain = (cfg, list, phase) => {
      const pts = chain(m.state, cfg.id, anchors[cfg.anchor], targetsFor(cfg, phase), cfg, dt, s);
      const r = ribbon(pts, cfg.w0, cfg.w1, s);
      push(list, r.d, cfg.fill);
      if (cfg.edge) list.push(`<path d="${smooth([...r.right.slice(1)], false)}" stroke="${cfg.edge}" stroke-width="${r1(3 * s)}" fill="none" />`);
      if (cfg.shade) list.push(`<path d="${smooth(pts.slice(1, -1), false)}" stroke="${cfg.shade}" stroke-width="${r1(2.5 * s)}" fill="none" opacity="0.8" />`);
    };

    const back = [];
    const mid = [];
    const front_ = [];
    const top = [];

    // Behind the body: back cloth, hair.
    A.garments.filter((g) => g.type === "chain" && g.layer === "back").forEach((g, i) => drawChain(g, back, i * 1.3));
    A.hair.strands.forEach((h, i) => drawChain({ ...h, fill: A.hair.fill, shade: A.hair.shade }, back, i * 0.9 + 2));
    for (const [d, l, w] of A.hair.spikes) {
      const dir = along([0, 0], 180 + f * d + (wind + 35) * 0.25 - vx * 0.006, 1);
      const base = add(hc, mul(dir, hr * 0.5));
      const tip = add(hc, mul(dir, hr * (1 + l)));
      const side = mul(perp(dir), hr * w);
      push(back, smooth([add(base, side), tip, sub(base, side)]), A.hair.fill);
    }

    // Back limbs.
    const [ua, fa, hand] = B.arm;
    const [th, sh, ft] = B.leg;
    push(back, limb(j.hip, j.bk, th * s, sh * s), A.body.legs);
    push(back, limb(j.bk, j.bf, sh * s, ft * s), A.body.legs);
    push(back, smooth([add(j.bf, mul(front, -8 * s)), add(j.bf, mul(front, 17 * s)), add(j.bf, add(mul(front, 14 * s), [0, 6 * s])), add(j.bf, add(mul(front, -8 * s), [0, 6 * s]))]), A.body.boots);
    push(back, limb(j.sh, j.be, ua * s, fa * s), A.body.sleeve);
    push(back, limb(j.be, j.bh, fa * s, hand * s), A.body.sleeve);
    push(back, smooth([add(j.bh, [-7 * s, -6 * s]), add(j.bh, [7 * s, -6 * s]), add(j.bh, [6 * s, 7 * s]), add(j.bh, [-6 * s, 7 * s])]), A.body.glove);
    for (const g of A.garments.filter((x) => x.type === "segment" && x.back)) {
      const a0 = add(j[g.from], mul(sub(j[g.to], j[g.from]), g.start));
      push(back, limb(a0, j[g.to], g.width * s, g.width * 0.8 * s), g.fill);
    }

    // Torso, armor, markings.
    push(mid, smooth([at(-0.05, -B.hips), at(0.32, -B.waist), at(0.72, -B.back), at(0.97, -B.shoulder), at(1.0, B.shoulder), at(0.74, B.chest), at(0.34, B.waist), at(-0.05, B.hips)]), A.body.torso);
    push(mid, smooth([add(j.neck, mul(front, -6 * s)), add(j.neck, mul(front, 6 * s)), add(add(j.neck, mul(front, 6 * s)), mul(u, 16 * s)), add(add(j.neck, mul(front, -6 * s)), mul(u, 16 * s))]), A.skin);
    for (const g of A.garments) {
      if (g.type === "plate") push(mid, smooth(g.points.map(([k, d]) => at(k, d))), g.fill);
      if (g.type === "line") mid.push(`<path d="${smooth(g.points.map(([k, d]) => at(k, d)), false)}" stroke="${g.stroke}" stroke-width="${r1(g.width * s)}" fill="none" stroke-linecap="round" />`);
    }

    // Head: face, hair cap, bangs, circlet, eye.
    const faceC = add(hc, mul(front, hr * 0.12));
    push(mid, smooth([add(faceC, mul(u, hr * 0.95)), add(faceC, add(mul(front, hr * 0.85), mul(u, hr * 0.2))), add(faceC, add(mul(front, hr * 0.55), mul(u, -hr * 0.8))), add(faceC, mul(u, -hr * 1.05)), add(faceC, add(mul(front, -hr * 0.8), mul(u, -hr * 0.3))), add(faceC, add(mul(front, -hr * 0.85), mul(u, hr * 0.5)))]), A.skin);
    push(mid, smooth([add(hc, add(mul(front, hr * 0.78), mul(u, hr * 0.62))), add(hc, add(mul(front, hr * 0.1), mul(u, hr * 1.22))), add(hc, add(mul(front, -hr * 1.1), mul(u, hr * 0.6))), add(hc, add(mul(front, -hr * 1.05), mul(u, -hr * 0.45))), add(hc, add(mul(front, -hr * 0.2), mul(u, hr * 0.35)))]), A.hair.fill);
    for (const [d, l] of A.hair.bangs) {
      const dir = along([0, 0], 180 + f * d, 1);
      const base = add(hc, mul(dir, hr * 0.7));
      const tip = add(base, mul(add(mul(front, 0.6), mul(u, -0.9)), hr * l * 0.9));
      const side = mul(perp(dir), hr * 0.35);
      push(mid, smooth([add(base, side), tip, sub(base, side)]), A.hair.fill);
    }
    if (A.hair.circlet) mid.push(`<path d="${smooth([add(hc, add(mul(front, -hr * 0.6), mul(u, hr * 0.95))), add(hc, add(mul(front, hr * 0.15), mul(u, hr * 1.22))), add(hc, add(mul(front, hr * 0.8), mul(u, hr * 0.75)))], false)}" stroke="${A.hair.circlet}" stroke-width="${r1(3.5 * s)}" fill="none" />`);
    const blink = p.eye === false || (t + (who === "seren" ? 1.7 : 0)) % 3.9 < 0.085;
    const eyeC = add(hc, add(mul(front, hr * 0.62), mul(u, hr * 0.02)));
    if (blink) {
      mid.push(`<path d="M${pt(add(eyeC, mul(front, -5 * s)))} L${pt(add(eyeC, mul(front, 6 * s)))}" stroke="${C.ink}" stroke-width="${r1(2.5 * s)}" stroke-linecap="round" />`);
    } else {
      mid.push(`<path d="${smooth([add(eyeC, mul(front, -6 * s)), add(eyeC, add(mul(front, 2 * s), mul(u, 4 * s))), add(eyeC, add(mul(front, 7 * s), mul(u, 1 * s))), add(eyeC, add(mul(front, 1 * s), mul(u, -3 * s)))])}" fill="${A.eye}" stroke="${C.ink}" stroke-width="${r1(1.6 * s)}" />`);
      mid.push(`<path d="M${pt(add(eyeC, add(mul(front, -7 * s), mul(u, 5 * s))))} L${pt(add(eyeC, add(mul(front, 8 * s), mul(u, 3 * s))))}" stroke="${C.ink}" stroke-width="${r1(2.4 * s)}" stroke-linecap="round" />`);
    }

    // Front leg, then the cloth that hangs over it, then the front arm.
    push(front_, limb(j.hip, j.fk, (th + 1) * s, sh * s), A.body.legs);
    push(front_, limb(j.fk, j.ff, sh * s, ft * s), A.body.legs);
    push(front_, smooth([add(j.ff, mul(front, -8 * s)), add(j.ff, mul(front, 17 * s)), add(j.ff, add(mul(front, 14 * s), [0, 6 * s])), add(j.ff, add(mul(front, -8 * s), [0, 6 * s]))]), A.body.boots);
    for (const g of A.garments.filter((x) => x.type === "segment" && !x.back && (x.from === "fk" || x.from === "hip"))) {
      const a0 = add(j[g.from], mul(sub(j[g.to], j[g.from]), g.start));
      push(front_, limb(a0, j[g.to], g.width * s, g.width * 0.8 * s), g.fill);
    }
    A.garments.filter((g) => g.type === "chain" && g.layer === "front").forEach((g, i) => drawChain(g, front_, i * 1.1 + 0.5));
    push(front_, limb(j.sh, j.fe, (ua + 1) * s, fa * s), A.body.sleeve);
    push(front_, limb(j.fe, j.fh, fa * s, hand * s), A.body.sleeve);
    push(front_, smooth([add(j.fh, [-8 * s, -7 * s]), add(j.fh, [8 * s, -7 * s]), add(j.fh, [7 * s, 8 * s]), add(j.fh, [-7 * s, 8 * s])]), A.body.glove);
    for (const g of A.garments) {
      if (g.type === "segment" && !g.back && g.from === "fe") {
        const a0 = add(j.fe, mul(sub(j.fh, j.fe), g.start));
        push(front_, limb(a0, j.fh, g.width * s, g.width * 0.85 * s), g.fill);
      }
      if (g.type === "joint") {
        const c = j[g.joint];
        const dir = unit(sub(j.fe, c));
        const ps = [add(c, mul(perp(dir), g.r * s)), add(c, mul(dir, g.r * 1.3 * s)), sub(c, mul(perp(dir), g.r * s)), sub(c, mul(dir, g.r * 0.7 * s))];
        push(front_, smooth(ps), g.fill);
        if (g.inner) front_.push(`<path d="${smooth(ps.map((q) => add(c, mul(sub(q, c), 0.55))))}" fill="${g.inner}" />`);
      }
    }
    if (A.hair.locks) A.hair.locks.forEach((h, i) => drawChain({ ...h, fill: A.hair.fill }, top, i + 4));
    if (who === "kuro") top.push(`<path d="M${pt(j.fe)} L${pt(along(j.fe, deg(sub(j.fh, j.fe)), 34 * s))}" stroke="${C.accent}" stroke-width="${r1(2.5 * s)}" />`);

    const glow = p.glow ?? 1;
    const blades = (p.blades ?? []).map((b) => weapon(b.hand === "b" ? j.bh : j.fh, b.a * f, b.len ?? A.weapon.len, A.weapon, s, b.glow ?? glow));
    const backBlades = blades.filter((_, i) => p.blades[i].hand === "b").join("");
    const frontBlades = blades.filter((_, i) => p.blades[i].hand !== "b").join("");
    const aura = p.aura > 0.02 ? `<g opacity="${r1(p.aura * 4) / 10}" fill="${A.aura}" stroke="${A.aura}" stroke-width="${r1(26 * s)}" stroke-linejoin="round">${silhouettes.map((d) => `<path d="${d}" />`).join("")}</g>` : "";
    return `${aura}${backBlades}${back.join("")}${mid.join("")}${front_.join("")}${top.join("")}${frontBlades}`;
  }

  /** Eye close-up: one eye filling a band, for the stare before the clash. */
  function eyeCloseup(who, cx, cy, w, { narrow = 0, glint = false, face = 1 } = {}) {
    const look = LOOK[who];
    const h = w * (0.34 - 0.12 * narrow);
    const x0 = cx - (w / 2) * face;
    const x1 = cx + (w / 2) * face;
    const top = cy - h / 2;
    const bot = cy + h / 2;
    const eye = `M${r1(x0)},${r1(cy + h * 0.1)} C${r1(cx - w * 0.25 * face)},${r1(top - h * 0.3)} ${r1(cx + w * 0.25 * face)},${r1(top - h * 0.2)} ${r1(x1)},${r1(cy - h * 0.1)} C${r1(cx + w * 0.2 * face)},${r1(bot + h * 0.1)} ${r1(cx - w * 0.2 * face)},${r1(bot + h * 0.15)} ${r1(x0)},${r1(cy + h * 0.1)} Z`;
    const ir = h * 0.62;
    const ic = [cx + w * 0.05 * face, cy + h * 0.05];
    const bangs = [];
    const band = cy - h * 2.3;
    for (let i = 0; i < 7; i += 1) {
      const bx = cx - w * 1.2 + i * w * 0.4;
      bangs.push(`<polygon points="${r1(bx - w * 0.2)},${r1(band - 4)} ${r1(bx + w * 0.22)},${r1(band - 4)} ${r1(bx + w * 0.06 * face)},${r1(top - h * (i % 2 ? 0.15 : 0.55))}" fill="${look.hair}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round" />`);
    }
    return [
      `<rect x="${r1(cx - 2000)}" y="${r1(cy - 2000)}" width="4000" height="4000" fill="${C.skin}" />`,
      `<rect x="${r1(cx - 2000)}" y="${r1(band)}" width="4000" height="${r1(h * 0.5)}" fill="${C.ink}" opacity="0.15" />`,
      `<rect x="${r1(cx - 2000)}" y="${r1(cy - 2000)}" width="4000" height="${r1(2000 - h * 2.3)}" fill="${look.hair}" />`,
      `<path d="M${r1(cx - 2000)},${r1(cy + h * 1.5)} L${r1(cx + 2000)},${r1(cy + h * 1.5)} L${r1(cx + 2000)},${r1(cy + 2000)} L${r1(cx - 2000)},${r1(cy + 2000)} Z" fill="${C.ink}" opacity="0.18" />`,
      `<path d="${eye}" fill="${C.sclera}" stroke="${C.ink}" stroke-width="6" />`,
      `<clipPath id="eye-${who}-${Math.round(cx)}"><path d="${eye}" /></clipPath>`,
      `<g clip-path="url(#eye-${who}-${Math.round(cx)})"><circle cx="${r1(ic[0])}" cy="${r1(ic[1])}" r="${r1(ir)}" fill="${look.eye}" /><circle cx="${r1(ic[0])}" cy="${r1(ic[1])}" r="${r1(ir * 0.62)}" fill="${who === "kuro" ? C.hair : C.iris}" opacity="${who === "kuro" ? 1 : 0.6}" />${who === "kuro" ? `<ellipse cx="${r1(ic[0])}" cy="${r1(ic[1])}" rx="${r1(ir * 0.16)}" ry="${r1(ir * 0.7)}" fill="${C.accent}" />` : `<circle cx="${r1(ic[0])}" cy="${r1(ic[1])}" r="${r1(ir * 0.32)}" fill="${C.hair}" />`}<rect x="${r1(ic[0] - ir * 0.55)}" y="${r1(ic[1] - ir * 0.6)}" width="${r1(ir * 0.32)}" height="${r1(ir * 0.26)}" fill="${C.line}" /><path d="M${r1(cx - w)},${r1(top - h * 0.2)} L${r1(cx + w)},${r1(top - h * 0.2)} L${r1(cx + w)},${r1(cy - h * 0.15)} L${r1(cx - w)},${r1(cy - h * 0.15)} Z" fill="${C.ink}" opacity="0.18" /></g>`,
      `<path d="M${r1(x0 - 10 * face)},${r1(cy + h * 0.1)} C${r1(cx - w * 0.25 * face)},${r1(top - h * 0.38)} ${r1(cx + w * 0.25 * face)},${r1(top - h * 0.28)} ${r1(x1 + 24 * face)},${r1(cy - h * 0.25)}" fill="none" stroke="${C.ink}" stroke-width="${r1(h * 0.16)}" stroke-linecap="round" />`,
      `<path d="M${r1(cx - w * 0.75 * face)},${r1(top - h * 0.95)} Q${r1(cx)},${r1(top - h * (1.35 - narrow * 0.4))} ${r1(cx + w * 0.8 * face)},${r1(top - h * (0.85 + narrow * 0.25))}" fill="none" stroke="${who === "kuro" ? C.moon : C.sclera}" stroke-width="${r1(h * 0.14)}" stroke-linecap="round" />`,
      who === "seren" ? `<path d="M${r1(x1)},${r1(cy - h * 0.1)} l${r1(30 * face)},${r1(-12)}" stroke="${C.practical}" stroke-width="5" />` : `<path d="M${r1(cx - w * 0.9 * face)},${r1(cy + h * 1.3)} l${r1(w * 0.5 * face)},${r1(-h * 0.5)}" stroke="${C.accent}" stroke-width="5" opacity="0.8" />`,
      ...bangs,
      glint ? `<polygon points="${r1(ic[0] - ir * 0.4)},${r1(ic[1] - ir * 0.5)} ${r1(ic[0] - ir * 0.2)},${r1(ic[1] - ir * 1.8)} ${r1(ic[0])},${r1(ic[1] - ir * 0.5)} ${r1(ic[0] + ir * 1.3)},${r1(ic[1] - ir * 0.3)} ${r1(ic[0])},${r1(ic[1] - ir * 0.1)} ${r1(ic[0] - ir * 0.2)},${r1(ic[1] + ir * 1.2)} ${r1(ic[0] - ir * 0.4)},${r1(ic[1] - ir * 0.1)} ${r1(ic[0] - ir * 1.6)},${r1(ic[1] - ir * 0.3)}" fill="${C.line}" />` : "",
    ].join("");
  }

  const KU = {
    stand: { torso: 4, fua: 18, ffa: 30, bua: -14, bfa: -8, fth: 10, fsh: 0, bth: -10, bsh: 0, blades: [{ hand: "f", a: 35 }] },
    ready: { torso: 16, tilt: 4, fua: 30, ffa: 70, bua: 22, bfa: 72, fth: 38, fsh: -6, bth: -32, bsh: -10, blades: [{ hand: "f", a: -125 }] },
    crouch: { torso: 32, tilt: 6, fua: -40, ffa: -60, bua: -20, bfa: -32, fth: 74, fsh: -10, bth: -42, bsh: -62, blades: [{ hand: "f", a: -112 }] },
    windup: { torso: -10, fua: -90, ffa: -122, bua: -62, bfa: -100, fth: 32, fsh: 4, bth: -32, bsh: -10, blades: [{ hand: "f", a: -152 }] },
    slash: { torso: 26, fua: 95, ffa: 95, bua: 72, bfa: 90, fth: 46, fsh: 0, bth: -42, bsh: -16, blades: [{ hand: "f", a: 96 }] },
    air: { torso: 16, fua: 120, ffa: 142, bua: 40, bfa: 80, fth: 72, fsh: -42, bth: 10, bsh: 70, blades: [{ hand: "f", a: 140 }] },
    kick: { torso: -32, tilt: -10, fua: 60, ffa: 82, bua: -62, bfa: -40, fth: 102, fsh: 98, bth: -22, bsh: 30, blades: [{ hand: "f", a: 80 }] },
    spin: { torso: 2, fua: 92, ffa: 92, bua: -92, bfa: -92, fth: 26, fsh: 0, bth: -26, bsh: 0, blades: [{ hand: "f", a: 92 }] },
    run1: { torso: 26, tilt: 6, fua: -50, ffa: -24, bua: 62, bfa: 100, fth: 62, fsh: -12, bth: -42, bsh: -72, blades: [{ hand: "f", a: -128 }] },
    run2: { torso: 26, tilt: 6, fua: 40, ffa: 70, bua: -50, bfa: -24, fth: -40, fsh: -72, bth: 62, bsh: -12, blades: [{ hand: "f", a: -100 }] },
    deflect: { torso: 12, fua: 140, ffa: 172, bua: 60, bfa: 110, fth: 50, fsh: -14, bth: -40, bsh: -50, blades: [{ hand: "f", a: 205 }] },
    charge: { torso: 0, fua: 170, ffa: 180, bua: 160, bfa: 175, fth: 20, fsh: 0, bth: -20, bsh: 0, blades: [{ hand: "f", a: 180 }] },
    land: { torso: 32, fua: 52, ffa: 22, bua: -42, bfa: -72, fth: 86, fsh: -10, bth: -26, bsh: -92, blades: [{ hand: "f", a: 100 }] },
    tired: { torso: 22, tilt: 18, fua: 10, ffa: 20, bua: -8, bfa: 0, fth: 16, fsh: 0, bth: -16, bsh: -4, blades: [{ hand: "f", a: 25, glow: 0.3 }] },
    dash: { torso: 52, tilt: 6, fua: 100, ffa: 100, bua: -62, bfa: -42, fth: 72, fsh: 20, bth: -72, bsh: -32, blades: [{ hand: "f", a: 100 }] },
  };

  const SE = {
    stand: { torso: 2, fua: 20, ffa: 16, bua: -20, bfa: -14, fth: 8, fsh: 0, bth: -8, bsh: 0, blades: [{ hand: "f", a: 32 }, { hand: "b", a: -32 }] },
    guard: { torso: 12, fua: 62, ffa: 110, bua: 46, bfa: 96, fth: 36, fsh: -5, bth: -30, bsh: -10, blades: [{ hand: "f", a: 130 }, { hand: "b", a: 62 }] },
    blockX: { torso: -10, fua: 125, ffa: 170, bua: 115, bfa: 165, fth: 40, fsh: 0, bth: -42, bsh: -16, blades: [{ hand: "f", a: 215 }, { hand: "b", a: 140 }] },
    slide: { torso: -24, fua: 100, ffa: 140, bua: 82, bfa: 122, fth: 54, fsh: 20, bth: -42, bsh: -52, blades: [{ hand: "f", a: 200 }, { hand: "b", a: 150 }] },
    air: { torso: 10, fua: 140, ffa: 160, bua: 60, bfa: 90, fth: 62, fsh: -42, bth: 0, bsh: 52, blades: [{ hand: "f", a: 160 }, { hand: "b", a: 100 }] },
    strike: { torso: 32, fua: 110, ffa: 70, bua: 100, bfa: 60, fth: 52, fsh: -5, bth: -42, bsh: -20, blades: [{ hand: "f", a: 60 }, { hand: "b", a: 45 }] },
    spin: { torso: 0, fua: 92, ffa: 92, bua: -92, bfa: -92, fth: 30, fsh: -20, bth: -30, bsh: 20, blades: [{ hand: "f", a: 92 }, { hand: "b", a: -92 }] },
    counter: { torso: 36, fua: 90, ffa: 90, bua: -60, bfa: -40, fth: 62, fsh: 0, bth: -52, bsh: -20, blades: [{ hand: "f", a: 90 }, { hand: "b", a: -100 }] },
    summon: { torso: -6, tilt: -12, fua: 122, ffa: 132, bua: -122, bfa: -132, fth: 10, fsh: 0, bth: -10, bsh: 0, blades: [{ hand: "f", a: 132 }, { hand: "b", a: -132 }] },
    command: { torso: 10, fua: 95, ffa: 90, bua: -40, bfa: -30, fth: 30, fsh: -4, bth: -24, bsh: -6, blades: [{ hand: "f", a: 92 }, { hand: "b", a: -60 }] },
    charge: { torso: 0, fua: 166, ffa: 176, bua: -166, bfa: -176, fth: 14, fsh: 0, bth: -14, bsh: 0, blades: [{ hand: "f", a: 200 }, { hand: "b", a: -200 }] },
    land: { torso: 34, fua: 62, ffa: 30, bua: -60, bfa: -80, fth: 86, fsh: -10, bth: -22, bsh: -94, blades: [{ hand: "f", a: 100 }, { hand: "b", a: -120 }] },
    tired: { torso: 20, tilt: 16, fua: 14, ffa: 10, bua: -12, bfa: -6, fth: 14, fsh: 0, bth: -14, bsh: -4, blades: [{ hand: "f", a: 22, glow: 0.3 }, { hand: "b", a: -26, glow: 0.3 }] },
    dash: { torso: 54, fua: 100, ffa: 96, bua: -100, bfa: -90, fth: 84, fsh: 12, bth: -76, bsh: -42, blades: [{ hand: "f", a: 98 }, { hand: "b", a: -100 }] },
  };

  const ku = (name, o) => ({ ...KU[name], ...o });
  const se = (name, o) => ({ face: -1, ...SE[name], ...o });

  return { warrior, eyeCloseup, weapon, KU, SE, ku, se, smooth, LOOK, SPECS };
}
