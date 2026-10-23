/**
 * Fixed shot lists per runtime. Drawing budgets match skills/html-anime-timing/SKILL.md.
 * Camera moves are the vocabulary in skills/html-anime-cameraman/SKILL.md.
 */

export const RUNTIMES = [8, 12, 20];

export const MOVES = {
  push: "Push 100% to 106% across the shot, power1.inOut. No other move.",
  pan: "Slow lateral pan, at most 8% of the frame width across the shot, ease none. The background is drawn wider than the frame.",
  locked: "Locked. The drawings do the moving.",
  shake: "Locked, plus one impact shake on the contact frame: 6 frames on ones, written-out offsets decaying to 0.",
};

export const SIZES = {
  wide: "Wide",
  medium: "Medium",
  close: "Close-up",
};

const shot = (id, label, dur, size, camera, sakuga = false) => ({
  id,
  label,
  dur,
  size,
  camera,
  sakuga,
  drawings: sakuga ? 8 : 3,
});

export const PLANS = {
  8: [
    shot("establish", "Establish", 2.4, "wide", "push"),
    shot("sakuga", "Sakuga", 3.6, "medium", "shake", true),
    shot("button", "Button", 2, "close", "locked"),
  ],
  12: [
    shot("establish", "Establish", 2.5, "wide", "push"),
    shot("approach", "Approach", 2.5, "medium", "pan"),
    shot("sakuga", "Sakuga", 4, "medium", "shake", true),
    shot("button", "Button", 3, "close", "locked"),
  ],
  20: [
    shot("establish", "Establish", 3, "wide", "push"),
    shot("approach", "Approach", 3, "medium", "pan"),
    shot("turn", "Turn", 3, "close", "locked"),
    shot("sakuga", "Sakuga", 5, "medium", "shake", true),
    shot("aftermath", "Aftermath", 3.5, "wide", "locked"),
    shot("button", "Button", 2.5, "close", "locked"),
  ],
};

export const DIRECTION = {
  establish: "The place in the logline. The figure is small, or not in it yet.",
  approach: "A cut closer. Who is there, and what they hold. The prop reads in silhouette.",
  turn: "The moment before the verb. Four frames of anticipation, then a hold.",
  sakuga:
    "The verb in the logline. The only shot that may use 8 keys (8 drawings in limited animation). Anticipate, play the action from the motion card's keys, one or two smear frames, then the settled drawing.",
  aftermath: "The result, already settled. Hold at least 12 frames. A blink or a hair follow-through may happen inside the hold.",
  button: "The line, if there is one, in the clear, bottom third, off the eyes. Then a hold. Fade the last 8 frames to ink.",
};

/**
 * The fixed shot list for a runtime, with direction and timing filled in.
 * @param {number} seconds 8, 12, or 20
 * @returns {Array<object>} shots whose `dur` values sum to `seconds`, exactly one with `sakuga: true`
 * @throws {Error} for any other runtime
 */
export function shotPlan(seconds) {
  const plan = PLANS[seconds];
  if (!plan) {
    throw new Error("Runtime must be 8, 12, or 20 seconds.");
  }
  let t = 0;
  return plan.map((s) => {
    const start = t;
    t = Math.round((t + s.dur) * 1000) / 1000;
    return { ...s, start, end: t, direction: DIRECTION[s.id] };
  });
}
