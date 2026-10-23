/**
 * Pure audio helpers for harness/voice.js: phrase splitting, 16-bit mono WAV
 * read and write, joining with silence, trimming, the ffmpeg emotion chain,
 * and the mouth track. No engines and no file system here, so it is testable.
 */

export const SAMPLE_RATE = 48000;

/** Mouth shapes on twos: 0 closed, 1 mid, 2 open. */
export const MOUTHS = ["closed", "mid", "open"];

/**
 * Split a line into phrases at commas, dashes, ellipses, and sentence ends.
 * Each phrase knows the pause that follows it, as a multiple of the emotion's pause.
 * @param {string} text
 * @returns {Array<{text: string, pauseAfter: number}>}
 */
export function splitPhrases(text) {
  const parts = String(text)
    .trim()
    .split(/(?<=[,，、;；:：…—–.!?。！？])\s*/u)
    .map((p) => p.trim())
    .filter((p) => p && /[\p{L}\p{N}]/u.test(p));
  return parts.map((p, i) => {
    const last = i === parts.length - 1;
    const end = /[.!?。！？]$/u.test(p);
    const held = /(…|—|–)$/u.test(p);
    return { text: p, pauseAfter: last ? 0 : end ? 1.6 : held ? 2 : 1 };
  });
}

/**
 * Parse a PCM WAV. Accepts 16-bit integer, mono or stereo (stereo is mixed down).
 * @param {Uint8Array} bytes
 * @returns {{rate: number, samples: Int16Array}}
 */
export function readWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("not a WAV file");
  }
  let at = 12;
  let fmt;
  while (at + 8 <= bytes.length) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      fmt = {
        format: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        rate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      if (!fmt) throw new Error("WAV data before fmt");
      if (fmt.bits !== 16 || (fmt.format !== 1 && fmt.format !== 0xfffe)) {
        throw new Error(`WAV must be 16-bit PCM (got ${fmt.bits}-bit, format ${fmt.format})`);
      }
      const frames = Math.floor(Math.min(size, bytes.length - body) / (2 * fmt.channels));
      const samples = new Int16Array(frames);
      for (let i = 0; i < frames; i += 1) {
        let sum = 0;
        for (let c = 0; c < fmt.channels; c += 1) {
          sum += view.getInt16(body + (i * fmt.channels + c) * 2, true);
        }
        samples[i] = Math.round(sum / fmt.channels);
      }
      return { rate: fmt.rate, samples };
    }
    at = body + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/**
 * Write 16-bit mono PCM as a WAV.
 * @param {Int16Array} samples
 * @param {number} [rate=SAMPLE_RATE]
 * @returns {Uint8Array}
 */
export function writeWav(samples, rate = SAMPLE_RATE) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const put = (at, s) => [...s].forEach((ch, i) => (bytes[at + i] = ch.charCodeAt(0)));
  put(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(44 + i * 2, samples[i], true);
  }
  return bytes;
}

/**
 * Join clips with silence between them.
 * @param {Array<{samples: Int16Array, silenceAfterMs: number}>} clips all at `rate`
 * @param {number} [rate=SAMPLE_RATE]
 * @returns {Int16Array}
 */
export function joinClips(clips, rate = SAMPLE_RATE) {
  const gaps = clips.map((c) => Math.round((c.silenceAfterMs / 1000) * rate));
  const total = clips.reduce((n, c, i) => n + c.samples.length + gaps[i], 0);
  const out = new Int16Array(total);
  let at = 0;
  clips.forEach((c, i) => {
    out.set(c.samples, at);
    at += c.samples.length + gaps[i];
  });
  return out;
}

/**
 * Trim leading and trailing silence, keeping a short pad.
 * @param {Int16Array} samples
 * @param {number} [rate=SAMPLE_RATE]
 * @param {{thresholdDb?: number, padMs?: number}} [opts]
 * @returns {Int16Array}
 */
export function trimSilence(samples, rate = SAMPLE_RATE, { thresholdDb = -45, padMs = 40 } = {}) {
  const limit = 32767 * 10 ** (thresholdDb / 20);
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < limit) first += 1;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < limit) last -= 1;
  if (first >= samples.length) return samples.slice(0, 0);
  const pad = Math.round((padMs / 1000) * rate);
  return samples.slice(Math.max(0, first - pad), Math.min(samples.length, last + 1 + pad));
}

/**
 * Scale by a gain in dB with hard clipping (used when ffmpeg is missing).
 * @param {Int16Array} samples
 * @param {number} db
 * @returns {Int16Array}
 */
export function applyGain(samples, db) {
  const k = 10 ** (db / 20);
  return samples.map((s) => Math.max(-32768, Math.min(32767, Math.round(s * k))));
}

const TONES = {
  none: [],
  warm: ["lowpass=f=7000", "bass=g=2:f=180"],
  dark: ["lowpass=f=4500", "bass=g=3:f=160"],
  bright: ["treble=g=3:f=3500", "acompressor=threshold=0.125:ratio=3:attack=5:release=80"],
  breath: ["highpass=f=380", "lowpass=f=3800"],
};

/**
 * The ffmpeg -af chain for an emotion: pitch shift (tempo kept), tone,
 * tremolo, loudness normalisation, then the emotion's gain.
 * @param {{pitch: number, gain: number, tone: string, tremolo?: [number, number]}} emotion
 * @param {{tempo?: number, rate?: number}} [opts] tempo > 1 speeds the line up to fit a shot
 * @returns {string}
 */
export function emotionFilter(emotion, { tempo = 1, rate = SAMPLE_RATE } = {}) {
  const chain = [];
  const f = 2 ** (emotion.pitch / 12);
  if (Math.abs(emotion.pitch) > 0.001) {
    chain.push(`asetrate=${Math.round(rate * f)}`, `aresample=${rate}`);
  }
  const atempo = tempo / f;
  if (Math.abs(atempo - 1) > 0.001) {
    chain.push(`atempo=${atempo.toFixed(4)}`);
  }
  chain.push(...(TONES[emotion.tone] ?? []));
  if (emotion.tremolo && emotion.tremolo[1] > 0) {
    chain.push(`tremolo=f=${emotion.tremolo[0]}:d=${emotion.tremolo[1]}`);
  }
  chain.push("loudnorm=I=-18:TP=-2:LRA=7");
  if (Math.abs(emotion.gain) > 0.001) {
    chain.push(`volume=${emotion.gain}dB`);
  }
  return chain.join(",");
}

/**
 * The mouth track on twos: one shape per 2 frames at `fps`, from the line's loudness.
 * Single-step flickers between closed and open are smoothed to mid.
 * @param {Int16Array} samples
 * @param {number} rate
 * @param {number} [fps=24]
 * @returns {number[]} indexes into MOUTHS
 */
export function mouthTrack(samples, rate, fps = 24) {
  const step = Math.round((rate * 2) / fps);
  const rms = [];
  for (let at = 0; at < samples.length; at += step) {
    let sum = 0;
    const end = Math.min(samples.length, at + step);
    for (let i = at; i < end; i += 1) sum += samples[i] * samples[i];
    rms.push(Math.sqrt(sum / Math.max(1, end - at)));
  }
  const peak = Math.max(1, ...rms);
  // Voiced steps open on a local loudness peak (a syllable) and sit at mid between peaks.
  const shapes = rms.map((v, i) => {
    if (v / peak < 0.12) return 0;
    const near = rms.slice(Math.max(0, i - 2), i + 3);
    const mean = near.reduce((a, b) => a + b, 0) / near.length;
    return v >= mean && v / peak >= 0.3 ? 2 : 1;
  });
  // A voiced shape held for more than 3 steps (6 frames) reads as a frozen mouth: flip it.
  let run = 1;
  for (let i = 1; i < shapes.length; i += 1) {
    run = shapes[i] === shapes[i - 1] ? run + 1 : 1;
    if (shapes[i] !== 0 && run > 3) {
      shapes[i] = shapes[i] === 2 ? 1 : 2;
      run = 1;
    }
  }
  for (let i = 1; i < shapes.length - 1; i += 1) {
    if (shapes[i - 1] !== shapes[i] && shapes[i + 1] !== shapes[i] && Math.abs(shapes[i - 1] - shapes[i]) === 2) {
      shapes[i] = 1;
    }
  }
  if (shapes.length) shapes[shapes.length - 1] = 0;
  return shapes;
}

/** How far before the button cut a line may start (a J-cut over the sakuga hold). */
export const J_CUT = 1.2;

/** Silence kept between two lines. */
export const LINE_GAP = 0.15;

/**
 * Where a line sits in its shot. It starts after the color dip into the shot
 * (0.4s in; 0.2s in the first shot) and ends before the shot ends (before the
 * last 8 frames fade to ink, on the last shot). A line too long for that
 * starts earlier, as a J-cut up to J_CUT seconds before the cut, but never
 * before the previous line has ended.
 * @param {{shots: Array<{id: string, start: number, end: number}>, fps: number}} sheet
 * @param {number} duration seconds
 * @param {{shot?: string, after?: number}} [opts] the shot id (default "button"), and when the previous line ends
 * @returns {{start: number, latestEnd: number, room: number, jcut: boolean, fits: boolean}}
 */
export function placeLine(sheet, duration, { shot = "button", after = -Infinity } = {}) {
  const fps = sheet.fps;
  const target = sheet.shots.find((s) => s.id === shot) ?? sheet.shots.at(-1);
  const first = target === sheet.shots[0];
  const last = target === sheet.shots.at(-1);
  const snap = (t) => Math.ceil(t * fps - 1e-6) / fps;
  const latestEnd = target.end - (last ? 8 : 2) / fps;
  const floor = Math.max(0, after + LINE_GAP);
  const preferred = snap(Math.max(target.start + (first ? 0.2 : 0.4), floor));
  const earliest = snap(Math.max(target.start - J_CUT, floor));
  const room = latestEnd - earliest;
  let start = preferred;
  if (preferred + duration > latestEnd) {
    start = Math.max(earliest, Math.floor((latestEnd - duration) * fps) / fps);
  }
  return {
    start: round3(start),
    latestEnd: round3(latestEnd),
    room: round3(room),
    jcut: start < target.start,
    fits: duration <= room + 1e-6,
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
