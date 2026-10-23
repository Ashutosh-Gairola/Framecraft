#!/usr/bin/env node
/**
 * Procedural sound design: sword clangs, impacts, whooshes, thunder, wind, energy,
 * creature calls, taiko, and a music bed, synthesized with ffmpeg from formulas.
 * Same formula, same sound: every render matches.
 *
 *   node harness/sfx.js films/<slug>          render every sound in <film>/sfx.json to assets/sfx/
 *   node harness/sfx.js --list                the sound kinds and their parameters
 *
 * A film's build writes sfx.json: { "sounds": { "<name>": { "kind": "clang", "dur": 1.6, "pitch": 1.2 } } }
 * and places <audio src="assets/sfx/<name>.wav"> clips itself (see harness/draw/kit.js scene({ audio })).
 * This is sound design, not an orchestra: the score is a synthesized drone bed. For a real
 * score, pass a music file through the same <audio> clip.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 48000;
const noise = "(2*random(0)-1)";

/** Chords for the score bed, in Hz, by mood. */
const MOODS = {
  calm: [73.42, 110, 146.83, 174.61],
  tense: [73.42, 77.78, 110, 155.56, 207.65],
  epic: [73.42, 110, 146.83, 220, 293.66],
  climax: [73.42, 110, 146.83, 220, 293.66, 349.23],
  fade: [73.42, 110, 174.61],
  serene: [146.83, 220, 293.66, 369.99, 440],
  warm: [98, 146.83, 196, 246.94, 293.66],
  wonder: [110, 164.81, 220, 277.18, 329.63],
};

/**
 * Each kind: dur (s), expr(params) → an ffmpeg aevalsrc expression in t, af → the filter chain.
 * Params: pitch (multiplier), dur, mood (score).
 */
export const KINDS = {
  clang: {
    dur: 1.8,
    about: "metal on metal: inharmonic partials ringing out, a bright strike transient",
    expr: ({ pitch = 1 }) =>
      `(0.5*sin(2*PI*${523 * pitch}*t)+0.35*sin(2*PI*${1307 * pitch}*t)+0.25*sin(2*PI*${2213 * pitch}*t)+0.15*sin(2*PI*${3371 * pitch}*t)+0.1*sin(2*PI*${4710 * pitch}*t))*exp(-3.2*t)+0.7*${noise}*exp(-45*t)`,
    af: "highpass=f=150,aecho=0.7:0.5:35|90:0.3|0.2",
  },
  shing: {
    dur: 1.2,
    about: "a blade drawn: a rising metallic ring",
    expr: ({ pitch = 1 }) => `(0.4*sin(2*PI*(${2400 * pitch}+${4000 * pitch}*t)*t)+0.3*sin(2*PI*(${3600 * pitch}+${5000 * pitch}*t)*t))*exp(-2.6*t)+0.3*${noise}*exp(-20*t)`,
    af: "highpass=f=1500,aecho=0.6:0.4:25:0.2",
  },
  impact: {
    dur: 1.4,
    about: "a heavy hit: a falling sub thump and a crack",
    expr: ({ pitch = 1 }) => `0.9*sin(2*PI*(${90 * pitch}*exp(-6*t)+${38 * pitch})*t)*exp(-4*t)+0.5*${noise}*exp(-12*t)`,
    af: "lowpass=f=1100,aecho=0.6:0.4:60:0.25",
  },
  boom: {
    dur: 5,
    about: "a huge explosion: sub drop, long rumble, echo",
    expr: () => `1.0*sin(2*PI*(60*exp(-2*t)+28)*t)*exp(-1.1*t)+0.8*${noise}*exp(-1.5*t)`,
    af: "lowpass=f=1200,aecho=0.8:0.7:120|300:0.4|0.3",
  },
  whoosh: {
    dur: 0.6,
    about: "air torn by a fast move",
    expr: ({ dur = 0.6 }) => `${noise}*pow(sin(PI*t/${dur}),2)`,
    af: "bandpass=f=900:width_type=o:w=1.6,volume=2.2",
  },
  burst: {
    dur: 0.9,
    about: "a vanish or a teleport: a sharp burst and a falling hiss",
    expr: () => `${noise}*exp(-7*t)+0.5*sin(2*PI*(1800*exp(-5*t)+200)*t)*exp(-6*t)`,
    af: "highpass=f=300,aecho=0.5:0.4:40:0.3",
  },
  thunder: {
    dur: 3.6,
    about: "distant thunder: rolling, low",
    expr: () => `${noise}*(exp(-1.5*t)+0.6*exp(-2*abs(t-0.6))+0.4*exp(-3*abs(t-1.4)))`,
    af: "lowpass=f=320,lowpass=f=320,volume=3,aecho=0.8:0.6:200:0.3",
  },
  wind: {
    dur: 12,
    about: "wind high above the clouds, swelling and falling (set dur to the scene)",
    expr: ({ dur = 12 }) => `${noise}*(0.6+0.4*sin(2*PI*0.23*t)*sin(2*PI*0.07*t))*min(1,t/1.5)*min(1,(${dur}-t)/1.5)`,
    af: "lowpass=f=700,highpass=f=80,volume=0.8",
  },
  charge: {
    dur: 2.5,
    about: "energy building: a rising buzzing tone and hiss",
    expr: ({ dur = 2.5 }) => {
      const f = `(80+140*t/${dur})`;
      return `(sin(2*PI*${f}*t)+0.5*sin(4*PI*${f}*t)+0.3*sin(6*PI*${f}*t))*(t/${dur})*0.5+0.25*${noise}*(t/${dur})`;
    },
    af: "lowpass=f=3200,tremolo=f=14:d=0.35",
  },
  crackle: {
    dur: 1.5,
    about: "lightning crawling on a blade: gated sparks",
    expr: () => `${noise}*gt(random(1),0.82)*0.9`,
    af: "highpass=f=1200,aecho=0.4:0.3:15:0.2",
  },
  roar: {
    dur: 3,
    about: "the dragon: a low growl with throat wobble",
    expr: ({ dur = 3 }) => `(0.8*sin(2*PI*55*t+3*sin(2*PI*7*t))+0.4*sin(2*PI*110*t+2*sin(2*PI*9*t)))*sin(PI*t/${dur})+0.3*${noise}*sin(PI*t/${dur})`,
    af: "lowpass=f=900,aecho=0.8:0.6:150:0.35",
  },
  cry: {
    dur: 2.4,
    about: "the phoenix: a high bending call",
    expr: ({ dur = 2.4 }) => `0.45*sin(2*PI*(1200+500*sin(2*PI*1.3*t))*t)*sin(PI*t/${dur})+0.2*sin(2*PI*(2400+900*sin(2*PI*1.3*t))*t)*sin(PI*t/${dur})`,
    af: "highpass=f=300,aecho=0.8:0.6:180|360:0.35|0.2",
  },
  stream: {
    dur: 20,
    about: "flowing water: a bright rush with a slow gurgle (set dur to the scene)",
    expr: ({ dur = 20 }) => `${noise}*(0.7+0.3*sin(2*PI*0.8*t+2*sin(2*PI*0.31*t)))*min(1,t/2)*min(1,(${dur}-t)/2)`,
    af: "highpass=f=400,lowpass=f=5000,equalizer=f=1500:t=q:w=1:g=4,volume=0.7",
  },
  birds: {
    dur: 20,
    about: "distant birdsong: short rising chirps in loose phrases (set dur to the scene)",
    expr: ({ dur = 20 }) =>
      `0.35*sin(2*PI*(2600+1400*sin(2*PI*9*t))*t)*gt(sin(2*PI*1.1*t+3*sin(2*PI*0.23*t)),0.93)+0.25*sin(2*PI*(3400+900*sin(2*PI*13*t))*t)*gt(sin(2*PI*0.7*t+2*sin(2*PI*0.17*t)+1.7),0.95)*min(1,(${dur}-t)/1.5)`,
    af: "highpass=f=1500,aecho=0.8:0.7:120|260:0.3|0.2,volume=0.8",
  },
  bell: {
    dur: 7,
    about: "a temple bell: low inharmonic partials with a long shimmering decay",
    expr: ({ pitch = 1 }) =>
      `(0.5*sin(2*PI*${220 * pitch}*t)+0.3*sin(2*PI*${262 * pitch}*t)+0.25*sin(2*PI*${531 * pitch}*t)+0.15*sin(2*PI*${812 * pitch}*t)+0.08*sin(2*PI*${1197 * pitch}*t))*exp(-0.55*t)*(1+0.08*sin(2*PI*3*t))+0.2*${noise}*exp(-60*t)`,
    af: "aecho=0.8:0.7:300|700:0.35|0.2,volume=0.9",
  },
  rumble: {
    dur: 20,
    about: "deep earth rumble: a low roar that swells and settles (volcanoes, quakes; set dur to the scene)",
    expr: ({ dur = 20 }) => `${noise}*(0.6+0.4*sin(2*PI*0.13*t)*sin(2*PI*0.41*t+1))*min(1,t/2)*min(1,(${dur}-t)/2)+0.4*sin(2*PI*38*t+2*sin(2*PI*0.3*t))*min(1,t/3)`,
    af: "lowpass=f=140,lowpass=f=140,volume=6,aecho=0.8:0.6:250:0.3",
  },
  drone: {
    dur: 20,
    about: "the deep, spacious hum of space: low beating tones and a high shimmer (set dur to the scene)",
    expr: ({ dur = 20 }) =>
      `(0.45*sin(2*PI*55*t)+0.35*sin(2*PI*55.6*t)+0.25*sin(2*PI*82.4*t)+0.12*sin(2*PI*1318*t)*(0.5+0.5*sin(2*PI*0.2*t)))*min(1,t/3)*min(1,(${dur}-t)/3)`,
    af: "lowpass=f=2400,aecho=0.8:0.8:600|1100:0.4|0.3,volume=0.9",
  },
  taiko: {
    dur: 1.2,
    about: "a taiko drum hit",
    expr: ({ pitch = 1 }) => `sin(2*PI*(${110 * pitch}*exp(-10*t)+${55 * pitch})*t)*exp(-5*t)+0.4*${noise}*exp(-30*t)`,
    af: "lowpass=f=600,aecho=0.6:0.5:80:0.25",
  },
  underwater: {
    dur: 20,
    about: "under the sea: a muffled, rolling hush and a low hum (set dur to the scene)",
    expr: ({ dur = 20 }) => `(0.8*${noise}*(0.6+0.4*sin(2*PI*0.15*t))+0.3*sin(2*PI*48*t+3*sin(2*PI*0.2*t)))*min(1,t/2)*min(1,(${dur}-t)/1.5)`,
    af: "lowpass=f=320,lowpass=f=320,volume=3,aecho=0.8:0.7:300|600:0.4|0.3",
  },
  bubbles: {
    dur: 4,
    about: "bubbles rising: quick upward blips in loose trains",
    expr: ({ dur = 4 }) =>
      `(0.6*sin(2*PI*(500+1500*mod(t*2.7,1))*t)*exp(-14*mod(t*2.7,1))+0.5*sin(2*PI*(800+1800*mod(t*4.3+0.3,1))*t)*exp(-18*mod(t*4.3+0.3,1))*gt(sin(2*PI*0.9*t),-0.2))*min(1,(${dur}-t)/0.8)`,
    af: "highpass=f=200,lowpass=f=3500,aecho=0.6:0.5:60:0.3",
  },
  surf: {
    dur: 20,
    about: "waves on a beach: a surge every few seconds and the hiss of the wash (set dur to the scene)",
    expr: ({ dur = 20 }) => `${noise}*(0.22+0.78*pow(max(0,sin(2*PI*t/6.5)),3)+0.25*pow(max(0,sin(2*PI*t/6.5-1.2)),6))*min(1,t/1.5)*min(1,(${dur}-t)/1.5)`,
    af: "lowpass=f=1800,highpass=f=60,volume=1.3",
  },
  gulls: {
    dur: 20,
    about: "seabirds: falling cries now and then (set dur to the scene)",
    expr: ({ dur = 20 }) => `0.5*sin(2*PI*(1700-500*mod(t*0.9,1))*t+4*sin(2*PI*9*t))*exp(-4*mod(t*0.9,1))*gt(sin(2*PI*0.37*t+1),0.2)*min(1,(${dur}-t)/1.5)`,
    af: "highpass=f=600,aecho=0.8:0.6:300:0.3",
  },
  traffic: {
    dur: 20,
    about: "a city street: the wash of traffic, engines, a distant horn (set dur to the scene)",
    expr: ({ dur = 20 }) =>
      `(0.7*${noise}*(0.7+0.3*sin(2*PI*0.11*t))+0.25*sin(2*PI*(90+10*sin(2*PI*0.3*t))*t)+0.15*(sin(2*PI*440*t)+sin(2*PI*554*t))*gt(sin(2*PI*0.083*t+2),0.985))*min(1,t/2)*min(1,(${dur}-t)/2)`,
    af: "lowpass=f=900,highpass=f=40,volume=1.1",
  },
  insects: {
    dur: 20,
    about: "crickets and cicadas: high pulsing trills (set dur to the scene)",
    expr: ({ dur = 20 }) =>
      `(0.4*sin(2*PI*4200*t)*gt(sin(2*PI*28*t),0.3)*gt(sin(2*PI*1.6*t),0)+0.3*sin(2*PI*5100*t)*gt(sin(2*PI*33*t+1),0.4)*gt(sin(2*PI*1.1*t+2),0.2))*min(1,t/2)*min(1,(${dur}-t)/2)`,
    af: "highpass=f=2500,volume=0.5",
  },
  moo: {
    dur: 2.2,
    about: "a cow lowing: a rising, falling call",
    expr: ({ pitch = 1 }) => `(sin(2*PI*${140 * pitch}*t+3*sin(PI*t/2.2))+0.6*sin(4*PI*${140 * pitch}*t+6*sin(PI*t/2.2))+0.4*sin(6*PI*${140 * pitch}*t))*sin(PI*t/2.2)*0.4`,
    af: "lowpass=f=1200,aecho=0.8:0.5:150:0.2",
  },
  woodpecker: {
    dur: 1.2,
    about: "a woodpecker drumming on a trunk",
    expr: () => `${noise}*exp(-60*mod(t*16,1))*lt(t,0.9)`,
    af: "bandpass=f=1800:width_type=h:w=1500,volume=2.5",
  },
  score: {
    dur: 20,
    about: "a synthesized music bed: a chord drone with a slow pulse (mood: calm, tense, epic, climax, fade, serene, warm, wonder)",
    expr: ({ dur = 20, mood = "epic" }) => {
      const notes = MOODS[mood] ?? MOODS.epic;
      const pad = notes.map((f) => `(sin(2*PI*${f}*t)+0.4*sin(2*PI*${2 * f}*t)+0.2*sin(2*PI*${3 * f}*t))`).join("+");
      const pulse = mood === "calm" || mood === "fade" ? "1" : "(0.82+0.18*sin(2*PI*2*t))";
      return `(${pad})*${(0.5 / notes.length).toFixed(3)}*${pulse}*min(1,t/2)*min(1,(${dur}-t)/1.2)*(0.85+0.15*sin(2*PI*0.25*t))`;
    },
    af: "lowpass=f=1800,aecho=0.8:0.6:200|400:0.3|0.2",
  },
};

/**
 * The ffmpeg arguments that render one sound to a 48 kHz mono 16-bit WAV.
 * @param {{kind: string, dur?: number}} spec
 * @param {string} out
 * @returns {string[]}
 */
export function ffmpegArgs(spec, out) {
  const kind = KINDS[spec.kind];
  if (!kind) throw new Error(`unknown sound kind "${spec.kind}"`);
  const dur = spec.dur ?? kind.dur;
  const expr = kind.expr({ ...spec, dur }).replace(/'/g, "");
  return [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=exprs='${expr}':s=${RATE}:d=${dur}`,
    "-af",
    `${kind.af},alimiter=limit=0.89,aresample=${RATE},atrim=end=${dur}`,
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    out,
  ];
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const [name, k] of Object.entries(KINDS)) console.log(`${name.padEnd(8)} ${String(k.dur).padStart(4)}s  ${k.about}`);
    return;
  }
  const dir = args[0] ? resolve(args[0]) : null;
  if (!dir || !existsSync(join(dir, "sfx.json"))) {
    console.error("usage: node harness/sfx.js films/<slug>   (the film's build writes sfx.json)");
    process.exit(1);
  }
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
    console.error("sfx: ffmpeg is required.");
    process.exit(1);
  }
  const { sounds } = JSON.parse(readFileSync(join(dir, "sfx.json"), "utf8"));
  const outDir = join(dir, "assets", "sfx");
  mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const [name, spec] of Object.entries(sounds)) {
    const out = join(outDir, `${name}.wav`);
    const r = spawnSync("ffmpeg", ffmpegArgs(spec, out), { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(`sfx: ${name} failed: ${r.stderr.trim()}`);
      process.exit(1);
    }
    n += 1;
  }
  console.log(`sfx: rendered ${n} sounds to ${outDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
