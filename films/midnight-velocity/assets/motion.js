/**
 * Midnight Velocity — the car's motion, shared by the picture (world.js) and the sound
 * (build/sound.mjs), so the revs, the shifts, the squeal, and the pops land on the frames.
 * Plain numbers, no three.js. Proportions and performance from references.md: a 4.5 m
 * widebody, 2.62 m wheelbase, 20-inch wheels; 0–100 km/h in ~3.5 s; a V10 to ~8,700 rpm.
 */

export const DURATION = 96;
export const T = { start: 8.6, launch: 12, tunnelIn: 40, tunnelOut: 51, brake: 51, driftIn: 55, driftOut: 58, highwayEnd: 84, stop: 90.5, paddle: 37.2 };
export const WHEEL_R = 0.345;
export const CAR = { length: 4.5, width: 1.96, height: 1.17, wheelbase: 2.62, trackF: 1.68, trackR: 1.72 };

const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** Speed in m/s at film time t. */
export function speedAt(t) {
  if (t < T.launch) return 0;
  if (t < T.tunnelIn) return 75 * (1 - Math.exp(-(t - T.launch) / 7.5));
  const v40 = 75 * (1 - Math.exp(-(T.tunnelIn - T.launch) / 7.5));
  if (t < T.brake) return v40 + (79 - v40) * smooth(T.tunnelIn, T.brake, t);
  if (t < T.driftIn) return 21 + 58 * (1 - smooth(T.brake, T.driftIn, t));
  if (t < T.driftOut) return 21 - 4 * Math.sin((Math.PI * (t - T.driftIn)) / (T.driftOut - T.driftIn));
  const v70 = 21 + 56 * (1 - Math.exp(-(70 - T.driftOut) / 5));
  if (t < 70) return 21 + 56 * (1 - Math.exp(-(t - T.driftOut) / 5));
  if (t < T.highwayEnd) return v70 + (80 - v70) * smooth(70, T.highwayEnd, t);
  if (t < T.stop) return 80 * (1 - smooth(T.highwayEnd, T.stop, t));
  return 0;
}

// Distance along the route, integrated once at fine steps.
const DT = 1 / 480;
const N = Math.ceil(DURATION / DT) + 2;
const S = new Float64Array(N);
for (let i = 1; i < N; i += 1) S[i] = S[i - 1] + ((speedAt((i - 1) * DT) + speedAt(i * DT)) / 2) * DT;
/** Distance travelled by film time t. */
export function sAt(t) {
  const f = Math.min(N - 1.001, Math.max(0, t / DT));
  const i = Math.floor(f);
  return S[i] + (S[i + 1] - S[i]) * (f - i);
}
/** Longitudinal acceleration (m/s²): for squat, dive, and the engine's load. */
export const accelAt = (t) => (speedAt(t + 0.02) - speedAt(t - 0.02)) / 0.04;

/** The route's pieces, sized so each beat of the film lands where the script wants it. */
export const ROUTE = (() => {
  const s = (t) => sAt(t);
  const A = s(T.tunnelIn);
  const B = s(T.tunnelOut) - A;
  const C = s(T.driftIn) - s(T.tunnelOut);
  const D = s(T.driftOut) - s(T.driftIn);
  const E = s(70) - s(T.driftOut);
  const F = s(T.highwayEnd) - s(70);
  const end = s(T.stop);
  const G = end - s(T.highwayEnd);
  return {
    total: end,
    pieces: [
      { name: "boulevard", len: A, turn: 0 },
      { name: "tunnel-in", len: 150, turn: 0, tunnel: true },
      { name: "tunnel-curve", len: 520, turn: (25 * Math.PI) / 180, tunnel: true },
      { name: "tunnel-out", len: B - 670, turn: 0, tunnel: true },
      { name: "approach", len: C, turn: 0 },
      { name: "drift", len: D, turn: -Math.PI / 2 },
      { name: "street", len: 120, turn: 0 },
      { name: "ramp", len: 360, turn: (20 * Math.PI) / 180, rise: [0, 22] },
      { name: "deck", len: E - 480, turn: 0, elevated: true },
      { name: "highway", len: F, turn: (100 * Math.PI) / 180, elevated: true },
      { name: "exit", len: G - 70, turn: -(30 * Math.PI) / 180, rise: [22, 38], elevated: true },
      { name: "overlook", len: 70, turn: -(140 * Math.PI) / 180, overlook: true },
    ],
  };
})();

/** Gears, rpm, and the shift events, from the speed. Upshift near 8,300 rpm; downshift under braking. */
export const GEARS = [0, 3.13, 2.12, 1.6, 1.25, 1.0, 0.82, 0.68];
const FINAL = 3.7;
export const rpmFor = (v, g) => (v / (2 * Math.PI * WHEEL_R)) * 60 * GEARS[g] * FINAL;
export const DRIVE = (() => {
  const step = 1 / 120;
  const n = Math.ceil(DURATION / step) + 1;
  const gear = new Uint8Array(n);
  const rpm = new Float32Array(n);
  const events = [];
  let g = 1;
  let lastShift = -9;
  for (let i = 0; i < n; i += 1) {
    const t = i * step;
    const v = speedAt(t);
    const a = accelAt(t);
    if (t < T.start) {
      rpm[i] = 0;
      gear[i] = 1;
      continue;
    }
    if (t < T.launch) {
      // Idle, then two blips of the throttle before the launch.
      const blip = (c, w) => Math.exp(-(((t - c) / w) ** 2));
      rpm[i] = 1050 + 5200 * blip(9.8, 0.35) + 6400 * blip(10.9, 0.3) + 3400 * smooth(11.4, 12, t);
      gear[i] = 1;
      continue;
    }
    let r = rpmFor(v, g);
    // The close-up of the driver catches a shift into sixth.
    const scheduled = g === 5 && t >= T.paddle && t - lastShift > 0.5 && t < T.tunnelOut;
    if ((r > 8300 || scheduled) && g < GEARS.length - 1 && t - lastShift > 0.5) {
      g += 1;
      lastShift = t;
      events.push({ t, type: "up", gear: g });
      r = rpmFor(v, g);
    } else if (a < -2 && r < 3600 && g > 2 && t - lastShift > 0.35) {
      g -= 1;
      lastShift = t;
      events.push({ t, type: "down", gear: g });
      r = rpmFor(v, g);
    }
    // Wheelspin off the line and through the drift lifts the revs above the road speed.
    const spin = Math.exp(-(((t - T.launch) / 0.6) ** 2)) * 2600 + (t > T.driftIn - 0.3 && t < T.driftOut + 0.4 ? 1900 * Math.sin((Math.PI * (t - T.driftIn + 0.3)) / 3.7) : 0);
    rpm[i] = Math.max(t > T.stop ? 1000 : 1200, r + spin);
    gear[i] = g;
  }
  return { step, gear, rpm, events };
})();
export const rpmAt = (t) => DRIVE.rpm[Math.min(DRIVE.rpm.length - 1, Math.max(0, Math.round(t / DRIVE.step)))];
export const gearAt = (t) => DRIVE.gear[Math.min(DRIVE.gear.length - 1, Math.max(0, Math.round(t / DRIVE.step)))];

/** The drift: tail angle (rad, positive = tail out to the left of the turn) and countersteer. */
export function driftAt(t) {
  const a = T.driftIn - 0.5;
  const b = T.driftOut + 0.9;
  if (t < a || t > b) return { slip: 0, counter: 0 };
  const u = (t - a) / (b - a);
  // Snap in, hold ~35°, ease out as the rear regains traction.
  const slip = (35 * Math.PI) / 180 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
  return { slip, counter: slip * 0.55 };
}
