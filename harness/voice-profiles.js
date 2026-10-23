/**
 * Voice casting and emotion profiles. Browser-safe: the site and the sheet use
 * these; harness/voice.js turns them into engine flags and ffmpeg filters.
 * skills/html-anime-voice/SKILL.md owns how each emotion is acted.
 */

export const VOICE_MODES = ["off", "line"];

/**
 * rate: speaking speed multiplier. pitch: semitones. gain: dB after loudness
 * normalisation. pause: ms of silence at a comma (a sentence end gets 1.6×).
 * tone: a named filter in TONES. tremolo: [hz, depth] for a shaking voice.
 */
export const EMOTIONS = {
  neutral: { label: "Neutral", rate: 1, pitch: 0, gain: 0, pause: 220, tone: "none", acting: "Mouth on twos, brows level." },
  calm: { label: "Calm", rate: 0.92, pitch: -1, gain: -2, pause: 320, tone: "warm", acting: "Slow blink before the line. Lids a third down." },
  resolve: { label: "Resolve", rate: 0.95, pitch: -1, gain: 1, pause: 260, tone: "none", acting: "Brows down at the inner corner. Jaw set. No head move." },
  sad: { label: "Sad", rate: 0.82, pitch: -2, gain: -4, pause: 480, tone: "dark", acting: "Eyes down, inner brows up. Small mouth. The hold is longer than the line." },
  cold: { label: "Cold", rate: 0.9, pitch: -2, gain: -1, pause: 380, tone: "dark", acting: "No blink across the line. Iris small. Mouth barely opens." },
  angry: { label: "Angry", rate: 1.1, pitch: 1, gain: 3, pause: 120, tone: "bright", acting: "Brows hard down, teeth shape on the open mouth, a 2-frame lean on the stress." },
  fear: { label: "Fear", rate: 1.12, pitch: 2, gain: -2, pause: 160, tone: "none", tremolo: [6, 0.18], acting: "Iris shrinks, sclera shows all round. Mouth stays open between words." },
  joy: { label: "Joy", rate: 1.06, pitch: 2, gain: 1, pause: 180, tone: "bright", acting: "Lower lids up, cheeks lift. The open mouth is wide, not tall." },
  whisper: { label: "Whisper", rate: 0.9, pitch: 0, gain: -6, pause: 360, tone: "breath", acting: "Mouth small and slow, only the mid shape. Head tilted toward the listener." },
};

export const ENGINES = ["auto", "kokoro", "say", "espeak"];

/**
 * Languages a line can be voiced in. Any other BCP-47-ish code is accepted
 * too: `say` and espeak-ng look it up in their own installed voices.
 */
export const LANGS = {
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  hi: "Hindi",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
};

/** Candidate voices by engine, language, and register. The first one installed wins. */
export const VOICES = {
  kokoro: {
    en: { female: ["af_heart", "af_bella", "bf_emma"], male: ["am_michael", "am_fenrir", "bm_george"] },
    ja: { female: ["jf_alpha", "jf_tebukuro"], male: ["jm_kumo"] },
    es: { female: ["ef_dora"], male: ["em_alex"] },
    fr: { female: ["ff_siwis"], male: ["ff_siwis"] },
    it: { female: ["if_sara"], male: ["im_nicola"] },
    pt: { female: ["pf_dora"], male: ["pm_alex"] },
    hi: { female: ["hf_alpha"], male: ["hm_omega"] },
    zh: { female: ["zf_xiaobei"], male: ["zm_yunjian"] },
  },
  say: {
    en: { female: ["Samantha", "Karen", "Moira", "Tessa"], male: ["Daniel", "Rishi", "Fred"] },
    ja: { female: ["Kyoko", "Flo (Japanese (Japan))", "Shelley (Japanese (Japan))"], male: ["Otoya", "Reed (Japanese (Japan))", "Eddy (Japanese (Japan))"] },
    es: { female: ["Mónica", "Paulina"], male: ["Jorge", "Juan"] },
    fr: { female: ["Amélie", "Audrey"], male: ["Thomas"] },
    de: { female: ["Anna"], male: ["Markus"] },
    it: { female: ["Alice"], male: ["Luca"] },
    pt: { female: ["Luciana", "Joana"], male: ["Felipe"] },
    hi: { female: ["Lekha"], male: ["Lekha"] },
    zh: { female: ["Tingting", "Meijia"], male: ["Tingting"] },
    ko: { female: ["Yuna"], male: ["Yuna"] },
    ru: { female: ["Milena"], male: ["Yuri"] },
    ar: { female: ["Majed"], male: ["Majed"] },
  },
  espeak: {
    en: { female: ["en-us+f3"], male: ["en-us+m3"] },
  },
};

/**
 * The language of a line, by script. Latin text defaults to English; pass
 * `lang` on the sheet for Spanish, French, and the rest.
 * @param {string} text
 * @returns {string}
 */
export function lineLanguage(text) {
  const t = String(text);
  if (/[\u3040-\u30ff]/.test(t)) return "ja";
  if (/[\uac00-\ud7af]/.test(t)) return "ko";
  if (/[\u3400-\u9fff]/.test(t)) return "zh";
  if (/[\u0900-\u097f]/.test(t)) return "hi";
  if (/[\u0400-\u04ff]/.test(t)) return "ru";
  if (/[\u0600-\u06ff]/.test(t)) return "ar";
  return "en";
}

/**
 * An emotion with its distance from neutral scaled by intensity (0 to 1.5).
 * @param {string} id
 * @param {number} [intensity=1]
 * @returns {object|undefined}
 */
export function emotionProfile(id, intensity = 1) {
  const base = EMOTIONS[id];
  if (!base) return undefined;
  const k = Math.max(0, Math.min(1.5, Number(intensity)));
  const n = EMOTIONS.neutral;
  const mix = (key) => Math.round((n[key] + (base[key] - n[key]) * k) * 1000) / 1000;
  return {
    id,
    ...base,
    intensity: k,
    rate: mix("rate"),
    pitch: mix("pitch"),
    gain: mix("gain"),
    pause: Math.round(mix("pause")),
    tremolo: base.tremolo ? [base.tremolo[0], Math.round(base.tremolo[1] * k * 1000) / 1000] : undefined,
  };
}

function register(value, fallback) {
  const r = String(value || fallback);
  return r === "female" || r === "male" ? r : undefined;
}

/**
 * Validate the sheet's voice block against the lines it will speak.
 * @param {object|undefined} input {mode, engine, lang, intensity, onScreen, emotion, register, voice, source, speaker,
 *   speakers: {[name]: {register, voice}}}. `source` is the user's own recording, used instead of synthesis
 *   (one line only; with several lines each line carries its own `source`).
 * @param {Array<{name: string}>} cast
 * @param {string|Array<{speaker?: string, text: string}>} lines the scene's lines, or one line as a string
 * @returns {{ok: true, voice: object} | {ok: false, error: string}}
 */
export function voiceSettings(input, cast, lines) {
  const list = typeof lines === "string" ? (lines ? [{ text: lines, speaker: input?.speaker }] : []) : lines ?? [];
  const mode = String(input?.mode ?? "off");
  if (!VOICE_MODES.includes(mode)) {
    return { ok: false, error: "Voice mode has to be off or line." };
  }
  if (mode === "off") {
    return { ok: true, voice: { mode } };
  }
  if (!list.length) {
    return { ok: false, error: "Voice needs a line of dialogue to speak." };
  }
  const emotion = String(input?.emotion || "neutral");
  if (!EMOTIONS[emotion]) {
    return { ok: false, error: `Emotion has to be one of: ${Object.keys(EMOTIONS).join(", ")}.` };
  }
  const engine = String(input?.engine || "auto");
  if (!ENGINES.includes(engine)) {
    return { ok: false, error: `Voice engine has to be one of: ${ENGINES.join(", ")}.` };
  }
  const defaultRegister = register(input?.register, "female");
  if (!defaultRegister) {
    return { ok: false, error: "Voice register has to be female or male." };
  }
  const intensity = input?.intensity == null || input.intensity === "" ? 1 : Number(input.intensity);
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1.5) {
    return { ok: false, error: "Emotion intensity has to be between 0 and 1.5." };
  }
  const lang = String(input?.lang || lineLanguage(list.map((l) => l.text).join(" "))).trim().toLowerCase();
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(lang)) {
    return { ok: false, error: `Voice language "${lang}" must be a code like en, ja, es, or pt-br.` };
  }
  const source = String(input?.source || "").trim();
  if (source && list.length > 1) {
    return { ok: false, error: "With several lines, give each line its own source." };
  }

  const speakers = {};
  for (const [name, raw] of Object.entries(input?.speakers ?? {})) {
    if (cast.length && !cast.some((m) => m.name === name)) {
      return { ok: false, error: `The voice for "${name}" is not in the cast.` };
    }
    const r = register(raw?.register, defaultRegister);
    if (!r) {
      return { ok: false, error: `${name}'s register has to be female or male.` };
    }
    speakers[name] = { register: r, voice: String(raw?.voice || "") };
  }
  const speaker = String(input?.speaker || list[0].speaker || cast[0]?.name || "").trim();
  for (const name of new Set(list.map((l) => l.speaker || speaker))) {
    if (cast.length && name && !cast.some((m) => m.name === name)) {
      return { ok: false, error: `The speaker "${name}" is not in the cast.` };
    }
    speakers[name] ??= { register: defaultRegister, voice: String(input?.voice || "") };
  }

  return {
    ok: true,
    voice: {
      mode,
      speaker,
      onScreen: input?.onScreen !== false,
      emotion,
      intensity,
      register: defaultRegister,
      engine,
      voice: String(input?.voice || ""),
      lang,
      source,
      speakers,
    },
  };
}
