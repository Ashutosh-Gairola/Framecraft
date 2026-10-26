#!/usr/bin/env node
/**
 * Synthesizes Midnight Velocity's sound from the same motion model as the picture
 * (assets/motion.js), so every rev, shift, pop, and squeal lands on its frame:
 *
 *   assets/sfx/car.wav    the V10 (firing order from the rpm, harmonics brighter under load),
 *                         turbo whistle and blow-off, shift cuts, exhaust pops, tyre squeal,
 *                         road and spray noise; a tunnel reverb from 40 to 51 s
 *   assets/sfx/score.wav  an electronic score at 120 bpm: a pad and pulse at the reveal, the beat
 *                         at the launch, a riser into the tunnel, a breakdown at the drift, the
 *                         drop for the highway, the pad alone at the overlook
 *   assets/sfx/rain.wav   rain on the street, silent in the tunnel, drips at the overlook
 *
 *   node films/midnight-velocity/build/sound.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DURATION, T, DRIVE, rpmAt, speedAt, accelAt } from "../assets/motion.js";

const FILM = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(FILM, "assets", "sfx");
const SR = 48000;
const N = Math.ceil(DURATION * SR);

/* ---------------- tools ---------------- */

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const bump = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
/** A biquad (RBJ cookbook), run sample by sample; the coefficients can be retuned on the fly. */
function biquad(type, f, q = 0.707) {
  let b0, b1, b2, a1, a2;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (freq, qq = q) => {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * qq);
    const a0 = 1 + al;
    if (type === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al];
    [b0, b1, b2] = [b0 / a0, b1 / a0, b2 / a0];
    a1 = (-2 * cs) / a0;
    a2 = (1 - al) / a0;
  };
  set(f);
  const run = (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
  run.set = set;
  return run;
}
/** A small Schroeder reverb: four combs into two allpasses. */
function reverb(size = 1, fb = 0.8) {
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ buf: new Float32Array(Math.round(n * size * 2)), i: 0, lp: 0 }));
  const aps = [225, 556].map((n) => ({ buf: new Float32Array(Math.round(n * 2)), i: 0 }));
  return (x) => {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.7 + c.lp * 0.3;
      c.buf[c.i] = x + c.lp * fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y - s * 0.5;
    }
    return s;
  };
}
function writeWav(path, L, R) {
  let peak = 1e-9;
  for (let i = 0; i < L.length; i += 1) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak;
  const buf = Buffer.alloc(44 + L.length * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + L.length * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i += 1) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
  console.log(`${path.split("/").slice(-1)[0]}: ${(L.length / SR).toFixed(1)}s, peak ${peak.toFixed(2)}`);
}

/* ---------------- the car ---------------- */

function car() {
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  // How near the car sounds in each shot: close on the car mounts, far on the aerials and the held
  // world cameras, muffled inside the cockpit.
  const near = (t) =>
    1 - 0.55 * bump(t, 33.6, 34.4, 35.8, 36.1) - 0.6 * bump(t, 69, 72, 79, 80.5) - 0.35 * bump(t, 87.3, 87.8, 90.5, 90.8) - 0.3 * bump(t, 53.9, 54.2, 55.2, 55.5);
  const cabin = (t) => bump(t, 35.95, 36.05, 38.55, 38.65);
  const tunnel = (t) => bump(t, 39.6, 40.4, 50.8, 51.6);
  const ups = DRIVE.events.filter((e) => e.type === "up").map((e) => e.t);
  const downs = DRIVE.events.filter((e) => e.type === "down").map((e) => e.t);
  // Pops on the overrun: under braking and on the lift at each upshift.
  const pops = [];
  for (const u of ups) pops.push(u + 0.03, u + 0.11);
  for (let t = T.brake + 0.2; t < T.driftIn; t += 0.12 + rnd() * 0.25) pops.push(t);
  for (let t = T.highwayEnd + 1; t < T.stop - 0.6; t += 0.2 + rnd() * 0.4) pops.push(t);
  pops.push(10.2, 11.2);
  pops.sort((a, b) => a - b);
  let pi = 0;
  let popEnv = 0;
  let ph = 0;
  let turbo = 0;
  let tph = 0;
  let blow = 0;
  const lpBody = biquad("lp", 900, 0.9);
  const lpCabin = biquad("lp", 500, 0.7);
  const bpPop = biquad("bp", 300, 1.5);
  const bpSq = biquad("bp", 1500, 9);
  const bpSq2 = biquad("bp", 2300, 12);
  const lpRoad = biquad("lp", 400);
  const hpSpray = biquad("hp", 2500);
  const bpBlow = biquad("bp", 3500, 2);
  const rvL = reverb(1.3, 0.84);
  const rvR = reverb(1.37, 0.84);
  let shiftGain = 1;
  const blowAt = new Set(ups.map((u) => Math.round(u * SR)));
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    if (t < T.start - 0.6) continue;
    const rpm = rpmAt(t);
    const v = speedAt(t);
    const a = accelAt(t);
    const load = t < T.launch ? smooth(1200, 6000, rpm) : Math.max(0, Math.min(1, a / 6 + 0.25 * (a > -0.5 ? 1 : 0)));
    // The starter: a whirr, then the engine catches.
    let s = 0;
    if (t < T.start + 0.1) {
      const u = t - (T.start - 0.6);
      s += 0.25 * Math.sin(2 * Math.PI * 38 * t) * (Math.sin(2 * Math.PI * 11 * t) > 0 ? 1 : 0.4) * Math.min(1, u * 4);
    }
    // A V10 fires five times a revolution; the half-order gives it the rasp.
    const f0 = (rpm / 60) * 2.5;
    ph += f0 / SR;
    if (ph > 1e6) ph -= 1e6;
    const on = smooth(T.start - 0.05, T.start + 0.15, t);
    const bright = 0.35 + 0.65 * load;
    let eng = 0;
    for (let h = 1; h <= 14; h += 1) {
      const w = h === 2 ? 1 : h === 4 ? 0.8 : 1 / (1 + (h - 1) * (1.6 - bright));
      if (f0 * h > 9000) break;
      eng += w * Math.sin(2 * Math.PI * ph * h + h * 0.7);
    }
    // Combustion pulses: noise gated on the firing.
    const pulse = Math.max(0, Math.sin(2 * Math.PI * ph * 2)) ** 6;
    eng += noise() * pulse * (0.4 + 0.8 * load);
    eng = lpBody(eng * 0.18) * 0.6 + eng * 0.08;
    lpBody.set(500 + 2600 * bright + rpm * 0.15);
    // A brief ignition cut on each shift.
    let target = 1;
    for (const u of ups) if (t > u - 0.02 && t < u + 0.07) target = 0.25;
    for (const d of downs) if (t > d - 0.02 && t < d + 0.05) target = 1.5;
    shiftGain += (target - shiftGain) * 0.004;
    s += eng * on * shiftGain * (0.6 + 0.6 * smooth(900, 8000, rpm));
    // Turbo: whistle with boost, a blow-off on each upshift and lift.
    const boost = Math.max(0, Math.min(1, (rpm - 3000) / 5000)) * load;
    turbo += (boost - turbo) * 0.0004;
    tph += (5200 + 4800 * turbo) / SR;
    s += 0.03 * turbo * Math.sin(2 * Math.PI * tph);
    if (blowAt.has(i)) blow = 1;
    blow *= 0.99985;
    s += bpBlow(noise()) * blow * 0.25 * on;
    // Exhaust pops: short low bursts with a crack.
    while (pi < pops.length && pops[pi] <= t) {
      popEnv = 1;
      pi += 1;
    }
    popEnv *= 0.9993;
    s += (bpPop(noise()) * 2.2 + noise() * 0.3 * popEnv) * popEnv * popEnv;
    // Tyres: wheelspin at the launch, the long slide in the drift.
    const sq = 0.55 * bump(t, T.launch - 0.02, T.launch + 0.08, T.launch + 0.9, T.launch + 1.4) + 0.8 * bump(t, T.driftIn - 0.6, T.driftIn - 0.2, T.driftOut + 0.3, T.driftOut + 1.0);
    if (sq > 0.001) {
      bpSq.set(1350 + 250 * Math.sin(t * 17) + 120 * Math.sin(t * 43));
      s += (bpSq(noise()) + 0.6 * bpSq2(noise())) * sq * 0.9;
    }
    // Road roar and the hiss of spray off the wet asphalt.
    const road = Math.min(1, v / 70);
    s += lpRoad(noise()) * road * 0.35 + hpSpray(noise()) * road * 0.12 * (1 - tunnel(t));
    // Shot perspective.
    const c = cabin(t);
    s = s * (1 - c) + lpCabin(s) * 1.4 * c;
    s *= near(t);
    // The tunnel: a long reverb that blooms in and dies away after the exit.
    const tu = tunnel(t);
    const wl = rvL(s * 0.5) * (0.15 + 1.1 * tu);
    const wr = rvR(s * 0.5) * (0.15 + 1.1 * tu);
    L[i] = s + wl;
    R[i] = s + wr;
  }
  return [L, R];
}

/* ---------------- the score ---------------- */

function score() {
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const BPM = 120;
  const beat = 60 / BPM;
  // A minor: Am, F, C, G, one bar each (4 beats); roots in Hz.
  const prog = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6, 329.6], [196, 246.9, 293.7]];
  const bass = [55, 43.65, 65.4, 49];
  // Sections: how much of each layer plays.
  const pad = (t) => 0.7 + 0.3 * bump(t, 84, 88, 95, 96.5);
  const pulseOn = (t) => smooth(4, 8, t) * (1 - 0.7 * bump(t, 51, 51.5, 57.5, 58));
  const kickOn = (t) => bump(t, 11.95, 12, 50.9, 51) + bump(t, 57.95, 58, 86, 88);
  const hatOn = (t) => bump(t, 19.9, 20, 50.9, 51) + bump(t, 57.95, 58, 84, 86);
  const riser = (t) => bump(t, 36, 39.9, 39.9, 40.3) + bump(t, 55, 57.9, 57.9, 58.2);
  const lpPad = biquad("lp", 1200, 0.8);
  const lpBass = biquad("lp", 300, 1.6);
  const hpHat = biquad("hp", 8000);
  const bpRise = biquad("bp", 400, 3);
  const rvL = reverb(1.6, 0.86);
  const rvR = reverb(1.7, 0.86);
  const phs = new Float64Array(16);
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const bar = Math.floor(t / (beat * 4)) % 4;
    const inBeat = (t / beat) % 1;
    const in8 = (t / (beat / 2)) % 1;
    const in16 = (t / (beat / 4)) % 1;
    let s = 0;
    // Pad: detuned saws, filtered, swelling with the drive.
    const chord = prog[bar];
    let p = 0;
    chord.forEach((f, k) => {
      for (const d of [-0.12, 0.12]) {
        const j = k * 2 + (d > 0 ? 1 : 0);
        phs[j] = (phs[j] + (f * (1 + d / 100)) / SR) % 1;
        p += (phs[j] * 2 - 1) * 0.12;
      }
    });
    lpPad.set(700 + 1600 * smooth(10, 40, t) * (1 - 0.6 * bump(t, 51, 52, 57, 58)) + 400 * Math.sin(t * 0.3));
    s += lpPad(p) * pad(t) * 0.8;
    // Pulse bass on the eighths.
    phs[10] = (phs[10] + bass[bar] / SR) % 1;
    const bEnv = Math.exp(-in8 * 5);
    lpBass.set(180 + 1200 * bEnv * smooth(4, 40, t));
    s += lpBass(phs[10] * 2 - 1) * bEnv * pulseOn(t) * 0.7;
    // Kick: a falling sine on each beat.
    if (kickOn(t) > 0) {
      const kt = inBeat * beat;
      phs[11] += (45 + 110 * Math.exp(-kt * 30)) / SR;
      s += Math.sin(2 * Math.PI * phs[11]) * Math.exp(-kt * 7) * kickOn(t) * 1.1;
      // Clap on the backbeat.
      if (Math.floor(t / beat) % 2 === 1) s += noise() * Math.exp(-kt * 22) * 0.35 * kickOn(t);
    }
    // Hats on the sixteenths, accented on the off-beat eighth.
    if (hatOn(t) > 0) {
      const ht = in16 * (beat / 4);
      const acc = Math.floor(t / (beat / 4)) % 4 === 2 ? 1 : 0.45;
      s += hpHat(noise()) * Math.exp(-ht * 60) * acc * hatOn(t) * 0.35;
    }
    // Risers: a rising band of noise into the tunnel and out of the drift.
    const r = riser(t);
    if (r > 0.001) {
      bpRise.set(300 + 5000 * r * r);
      s += bpRise(noise()) * r * 0.9;
    }
    // A low hit at the tunnel and on the drop.
    for (const h of [12, 40, 58]) if (t >= h && t < h + 2) s += Math.sin(2 * Math.PI * 41 * (t - h)) * Math.exp(-(t - h) * 2.5) * 0.9;
    L[i] = s + rvL(s * 0.4) * 0.6;
    R[i] = s + rvR(s * 0.4) * 0.6;
  }
  // Fade in and out.
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const g = smooth(0, 2.5, t) * (1 - smooth(94, 96, t));
    L[i] *= g;
    R[i] *= g;
  }
  return [L, R];
}

/* ---------------- the rain ---------------- */

function rain() {
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const tunnel = (t) => bump(t, 40.1, 40.6, 50.6, 51.2);
  const hpL = biquad("hp", 900);
  const hpR = biquad("hp", 900);
  const lpL = biquad("lp", 7000);
  const lpR = biquad("lp", 7000);
  const drip = biquad("bp", 1800, 8);
  let d = 0;
  let nextDrip = 88;
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const out = 1 - tunnel(t);
    // A hiss, plus sparse heavier drops on the street.
    const crack = rnd() < 0.0009 ? 1 : 0;
    let l = lpL(hpL(noise())) * 0.5 + crack * noise() * 2;
    let r = lpR(hpR(noise())) * 0.5 + (rnd() < 0.0009 ? noise() * 2 : 0);
    // Water dripping off the car at the overlook.
    if (t >= nextDrip) {
      d = 1;
      nextDrip = t + 0.35 + rnd() * 0.9;
    }
    d *= 0.9992;
    const dr = drip(noise()) * d * 3 * smooth(90, 91, t);
    L[i] = (l * out + dr) * smooth(0, 1.5, t);
    R[i] = (r * out + dr * 0.8) * smooth(0, 1.5, t);
  }
  return [L, R];
}

mkdirSync(OUT, { recursive: true });
writeWav(join(OUT, "car.wav"), ...car());
writeWav(join(OUT, "score.wav"), ...score());
writeWav(join(OUT, "rain.wav"), ...rain());
