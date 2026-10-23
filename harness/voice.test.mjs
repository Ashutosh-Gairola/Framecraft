import assert from "node:assert/strict";
import { EMOTIONS, emotionProfile, lineLanguage, voiceSettings } from "./voice-profiles.js";
import {
  SAMPLE_RATE,
  applyGain,
  emotionFilter,
  joinClips,
  mouthTrack,
  placeLine,
  readWav,
  splitPhrases,
  trimSilence,
  writeWav,
} from "./voice-lib.js";

// Languages by script; Latin defaults to English.
assert.equal(lineLanguage("The rain hid the sound."), "en");
assert.equal(lineLanguage("待って、まだ行かないで…"), "ja");
assert.equal(lineLanguage("아직이야"), "ko");
assert.equal(lineLanguage("还没有"), "zh");
assert.equal(lineLanguage("अभी नहीं"), "hi");
assert.equal(lineLanguage("Ещё нет"), "ru");

// Intensity scales the distance from neutral.
const sad = emotionProfile("sad", 0.5);
assert.equal(sad.rate, 0.91);
assert.equal(sad.pitch, -1);
assert.equal(emotionProfile("sad", 0).rate, EMOTIONS.neutral.rate);
assert.equal(emotionProfile("nope"), undefined);
assert.deepEqual(emotionProfile("fear", 1).tremolo, [6, 0.18]);

// Settings.
assert.equal(voiceSettings({ mode: "line", lang: "pt-br" }, [], "Ainda não.").voice.lang, "pt-br");
assert.equal(voiceSettings({ mode: "line", lang: "Portuguese" }, [], "Ainda não.").ok, false);
assert.equal(voiceSettings({ mode: "line", intensity: 2 }, [], "Hi.").ok, false);
assert.equal(voiceSettings({ mode: "line", register: "child" }, [], "Hi.").ok, false);
assert.equal(voiceSettings({ mode: "line" }, [{ name: "Ren" }], "Hi.").voice.speaker, "Ren");
assert.equal(voiceSettings({ mode: "line", source: "take.wav" }, [], "Hi.").voice.source, "take.wav");
assert.deepEqual(voiceSettings(undefined, [], "").voice, { mode: "off" });

// Phrases and their pauses.
assert.deepEqual(splitPhrases("Wait, not yet… Please. Stay!"), [
  { text: "Wait,", pauseAfter: 1 },
  { text: "not yet…", pauseAfter: 2 },
  { text: "Please.", pauseAfter: 1.6 },
  { text: "Stay!", pauseAfter: 0 },
]);
assert.deepEqual(splitPhrases("待って、まだ。").map((p) => p.text), ["待って、", "まだ。"]);

// WAV round trip, join, trim, gain.
const tone = new Int16Array(SAMPLE_RATE / 10).map((_, i) => Math.round(Math.sin(i / 8) * 12000));
const wav = readWav(writeWav(tone));
assert.equal(wav.rate, SAMPLE_RATE);
assert.deepEqual([...wav.samples.slice(0, 50)], [...tone.slice(0, 50)]);
const joined = joinClips([{ samples: tone, silenceAfterMs: 100 }, { samples: tone, silenceAfterMs: 0 }]);
assert.equal(joined.length, tone.length * 2 + SAMPLE_RATE / 10);
const padded = new Int16Array(SAMPLE_RATE);
padded.set(tone, SAMPLE_RATE / 2);
const trimmed = trimSilence(padded);
assert.ok(trimmed.length < tone.length + SAMPLE_RATE * 0.1 && trimmed.length >= tone.length);
assert.equal(Math.max(...applyGain(tone, 20)), 32767);

// The emotion chain keeps tempo when it shifts pitch.
const angry = emotionFilter(emotionProfile("angry"));
assert.match(angry, /asetrate=\d+,aresample=48000,atempo=0\.94/);
assert.match(angry, /loudnorm/);
assert.match(angry, /volume=3dB$/);
assert.doesNotMatch(emotionFilter(emotionProfile("neutral")), /asetrate|atempo|volume/);
assert.match(emotionFilter(emotionProfile("fear")), /tremolo=f=6:d=0\.18/);

// Mouth track: closed in silence, alternating while voiced, never frozen, ends closed.
const speech = new Int16Array(SAMPLE_RATE * 2);
for (let i = 0; i < speech.length; i += 1) {
  const t = i / SAMPLE_RATE;
  const voiced = t > 0.25 && t < 1.75;
  const syllable = 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 4));
  speech[i] = voiced ? Math.round(Math.sin(i / 6) * 20000 * syllable) : 0;
}
const track = mouthTrack(speech, SAMPLE_RATE, 24);
assert.equal(track.length, 24);
assert.equal(track[0], 0);
assert.equal(track.at(-1), 0);
assert.ok(track.includes(1) && track.includes(2));
let run = 1;
for (let i = 1; i < track.length; i += 1) {
  run = track[i] === track[i - 1] ? run + 1 : 1;
  if (track[i] !== 0) assert.ok(run <= 3, "a voiced mouth shape holds at most 3 steps");
}

// Placement: after the dip, or a J-cut when long, never past the fade.
const sheet = { fps: 24, shots: [{ id: "sakuga", start: 2.4, end: 6 }, { id: "button", start: 6, end: 8 }] };
const short = placeLine(sheet, 1);
assert.equal(short.start, 6.417);
assert.equal(short.jcut, false);
const long = placeLine(sheet, 1.9);
assert.equal(long.jcut, true);
assert.ok(long.start + 1.9 <= long.latestEnd + 1e-9);
assert.equal(placeLine(sheet, 3).fits, false);

console.log("voice: ok");
