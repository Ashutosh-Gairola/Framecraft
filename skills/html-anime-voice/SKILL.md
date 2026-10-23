---
name: html-anime-voice
description: Voice the lines of a code-drawn anime — cast a voice per character, choose the language and each line's emotion, generate the audio with harness/voice.js (Kokoro, macOS say, espeak-ng, or the user's own recording), place it on the timeline, and animate mouth shapes on twos that match it. Use when an html-anime sheet has voice on, or the user wants the line spoken, in English or any other language, with a mood.
---

# Voice

The line is acted twice: once in the voice, once in the face. Both say the same emotion.

## Casting

The sheet's Voice section fixes each speaker's register (`female` or `male`) and voice, the language, the engine, and each line's emotion. Change any of them by recompiling the brief, or for a quick try, with flags on `voice.js` (flags apply to every line).

- **Lines.** Up to two per sheet, each `{speaker, text, emotion, shot}`. A plain `dialogue` string is one line on the button shot. With two lines and no shots given, the first sits on the shot before the sakuga shot.
- **Speakers.** `voice.speakers: {"Shadow": {"register": "male"}, "Phantom": {"register": "male", "voice": "Rishi"}}`. Speakers who share a register get different voices automatically, assigned in cast order, so a character keeps the same voice in every scene of a sequence.

- **Language.** The line's language, never a translation. Auto-detected from the script: Japanese, Korean, Chinese, Hindi, Russian, Arabic. Latin-script lines default to English; set `lang` (`es`, `fr`, `de`, `it`, `pt`, `pt-br`…) for the rest. Any code an engine has a voice for works.
- **Voice.** Leave it blank to let `voice.js` pick the first installed voice for the language and register, or name one (`--voice Kyoko`, `--voice af_heart`). `node harness/voice.js --list --lang <code>` shows what's installed.
- **The user's own recording.** `source` on the sheet, or `--source take.wav`. It is used as is: trimmed, loudness-matched, placed, mouth-tracked. No emotion processing on a real performance.

## Engines

| Engine | Where | Quality | Languages |
| --- | --- | --- | --- |
| `kokoro` | `npx hyperframes tts`, local, no key | Best | en, ja, es, fr, it, pt, hi, zh |
| `say` | macOS, built in | Good | Every voice installed in System Settings → Spoken Content |
| `espeak-ng` | Linux, Windows, macOS via package | Robotic | 100+ |

`auto` tries them in that order. ffmpeg, if present, does the emotion shaping; without it only gain applies. For a cloud voice (HeyGen, ElevenLabs, Gemini), follow `vendor/hyperframes/skills/hyperframes/references/sound.md` and pass the result as `--source`.

## Emotions

Each emotion sets speed, pitch, pauses, tone, and loudness, and comes with the acting that must match it on the face. `intensity` (0–1.5) scales how far it goes from neutral.

| Emotion | Voice | Face |
| --- | --- | --- |
| neutral | As written | Mouth on twos, brows level |
| calm | Slower, a little lower, warm, longer pauses | Slow blink before the line; lids a third down |
| resolve | Slightly slow and low, firm | Inner brows down, jaw set, no head move |
| sad | Slow, low, dark, long pauses, quieter | Eyes down, inner brows up, small mouth; the hold outlasts the line |
| cold | Slow, low, dark, flat | No blink across the line; small iris; mouth barely opens |
| angry | Fast, higher, bright, compressed, louder, short pauses | Brows hard down, teeth on the open mouth, a 2-frame lean on the stress |
| fear | Fast, higher, shaking (tremolo), quieter | Iris shrinks, sclera all round, mouth open between words |
| joy | Faster, higher, bright | Lower lids up, cheeks lift; the open mouth wide, not tall |
| whisper | Slow, breathy band, very quiet | Only the mid mouth shape, small and slow; head toward the listener |

Punctuation shapes the pauses: a comma takes the emotion's pause, a sentence end 1.6×, an ellipsis or dash 2×.

## Generate

```
node harness/voice.js films/<slug>
```

It writes `assets/voice/line-1.wav`, `line-2.wav` (48 kHz mono, loudness-normalized) and `voice.json`, and prints the `<audio>` tags and the mouth-swap snippets. For a scene of a sequence, point it at the scene: `node harness/voice.js films/<seq>/scenes/<id>`; the audio goes to `films/<seq>/assets/voice/<id>/`, and the tags use root-relative paths and scene-local times. Try variants without touching the sheet:

```
node harness/voice.js films/<slug> --emotion sad --intensity 1.3
node harness/voice.js films/<slug> --lang es --voice Mónica
node harness/voice.js films/<slug> --dry
```

## Placement

Each line starts 0.4s into its shot, after the color dip, and must end before the shot ends (on the last shot, 8 frames before the fade). If it is longer, it starts earlier as a **J-cut**: the voice begins over the end of the previous shot (up to 1.2s before the cut) and the face appears speaking. A second line never starts until 0.15s after the first ends. If a line still doesn't fit, `voice.js` refuses. Then `--fit` speeds it up to 1.15×, or shorten the line with the user, or recompile at a longer runtime. Never cut a word off.

Paste the `<audio>` tags inside the composition's root, exactly as printed. Don't change its `data-start`; `check.js` compares it with `voice.json`.

## Mouth shapes

Three drawings in the speaker's close-up, from the model sheet: `#mouth-closed`, `#mouth-mid`, `#mouth-open`. With two speakers on one sheet, each has its own set: `#shadow-mouth-closed`… Only one shape per speaker is visible at a time. Paste the printed snippet into the timeline:

```js
const MOUTH_1 = [[6, "mid"], [6.083, "open"], /* … from voice.js */];
for (const [t, shape] of MOUTH_1) for (const m of ["closed", "mid", "open"]) tl.set(`#mouth-${m}`, { opacity: m === shape ? 1 : 0 }, t);
```

The track is on twos, follows the syllables of the actual audio, starts at its shot's cut (the J-cut part is off-screen voice), and ends closed. Start with `#mouth-closed` visible in the CSS. Off-screen voice (`onScreen: false`) has no mouth track; the face holds its expression.

The emotion's face from the table is drawn on the same close-up: brows, lids, and iris set before the first mouth swap, and held. A blink may land in a pause, never mid-word.

## Done

`voice.json` exists and matches the lines, the tags are pasted, the mouth drawings exist if the speaker is on screen, and `node harness/check.js films/<slug>` is clean. Listen to every line once before you sign off.
