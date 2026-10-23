---
name: html-anime-actor
description: Build a code-drawn anime character as an actor — first research the real thing on the web (clothes, body, animal anatomy, how it moves, its colours), then the appearance (proportions, paints, face, hair), wardrobe (every garment as a layer pinned to the body, with its own cloth physics), and movement (a personality for how the character moves, its gait measured from reference, and its pose library) — as one data spec a renderer draws in every shot. Use when a character, an extra, or an animal must look accurate and move believably, when colours read dull, when clothes or hair read badly or move stiffly, or when a character needs a distinct way of moving.
---

# Actor

A character is a spec, not a pile of drawings. The spec says what they look like, what they wear and how it moves, and how they carry themselves. Every frame of every shot is drawn from it, so the character never drifts off model.

`films/sky-city-duel/build/actors.mjs` is a worked spec; `warriors.mjs` draws any spec on the kit's rig (`harness/draw/kit.js`).

## 0. Research the real thing first

Drawing from memory gives generic shapes, dull guessed colours, and stiff movement. Before writing a spec, look the subject up. This applies to every figure on screen — lead characters, extras (a farmer, a fisherman, a commuter), and every animal.

1. `node harness/refs.js init films/<slug>` writes `references.md` (the research sheet) and a `references/` folder (git-ignored).
2. **Search** (WebSearch) for each subject, specifically: the culture, the era, the job, the climate — "rice farmer field clothes", "fisherman hauling net", "red fox trotting side view", "egret wingbeat". For a named style or show, search its official art. For an animal, search its anatomy and its gait.
3. **Read** the best pages (WebFetch) for facts: proportions, what the garments are called and how they are worn, typical colours, gait patterns and speeds.
4. **Look**: download 3–6 images into `references/` (`curl -L -o films/<slug>/references/fox-trot.jpg <url>`) and open them (the Read tool shows images). Prefer photos and film stills for real subjects; side views for gaits; several angles for costume.
5. **Sample the colours**: `node harness/refs.js palette films/<slug>/references/<image> --film films/<slug>` prints the dominant colours and the nearest sheet paint for each. A colour with no close paint (ΔE over 12) is a blend of two paints or a design colour for the director.
6. **Write it down** in `references.md`, one row per subject: sources, shape and proportion, colours → paints, movement (cycle length in frames, contact and passing poses, bob, arm swing, where the weight is), and the three things that must not change.

Rules:

- References are for study. Measure them, sample them, describe them; never trace or ship a downloaded image.
- An existing character from a show, game, or book: find its official reference art and tell the user which image you are following before you draw (designer skill). Never substitute a look-alike.
- When the web disagrees, prefer the source closest to the real thing (a photo over an illustration, a field guide over a stock vector).

## 1. Appearance

- **Build**: proportions in head-heights (the rig's `BONES`), and widths: chest, back, waist, hips, shoulders, arm and leg thickness. Two characters in one film get different builds, not the same body recolored.
- **Paints**: one sheet paint per part role — skin, eyes, hair (and a shade), torso, sleeves, gloves, legs, boots, outline. A dark costume on a dark sky needs a lighter trim or an outline that separates it.
- **Colour that lives**: take costume colours from the references, not from a blend toward white. Keep one saturated colour per figure (a red scarf, a saffron shirt, a blue sari) at full strength; mute the rest around it. Skin is never grey: in 3D give it warmth (a slightly warmer albedo, or a faint emissive in the skin tone) so it doesn't die in shadow. Check every figure against its background in the frame it appears: a figure that matches the ground's value disappears (art skill, Value and Colour grade).
- **Face**: eye color and shape, where the eye sits (toward the facing side), a blink every 3–5 seconds lasting 2 frames (never mid-word, never on an impact).
- **Hair**: a cap, bangs (rigid chunks), and either rigid spikes (short, stiff hair) or strands (long hair, as chains). Long hair is several strands of different lengths, never one solid mass: one mass reads as a cape.

## 2. Wardrobe

List every garment from the skin out, and give each a type:

| Type | What it is | Physics |
| --- | --- | --- |
| `plate` | Rigid armor or a lapel on the torso, in torso-local points | None: it moves with the torso |
| `line` | Markings, seams, trim | None |
| `segment` | Armor along a limb (gauntlet, greave), from one joint toward the next | None |
| `joint` | A pauldron or knee guard centred on a joint | None |
| `chain` | Anything that hangs: coat tails, capes, skirts, sashes, scarves, hair strands, side locks | A spring per node: lags, overshoots, settles |

A chain has an anchor (`hipBack`, `hipMid`, `hipFront`, `shoulderBack`, `headBack`, `headNape`, `headSide`), a layer (behind or in front of the body), nodes × segment length, a width taper, a rest angle relative to the facing, and three physics numbers:

- **stiffness**: how hard it pulls back to rest. Heavy coat 50–70; cape 30–40; long hair 22–30; armor tassets 80+.
- **damping**: how fast it stops swinging. Cloth 6–10; hair 4–6 (hair swings longer).
- **wind**: how much the wind and the body's motion move it. Hair and capes 0.9–1; heavy coats 0.6–0.75; armored skirts 0.3.

Rules that make clothes read:

- **Every garment is its own shape with its own outline.** A cape, the hair, and the body never merge into one silhouette.
- **Contrast between layers.** Alternate fills (a black cape with a darker inner tail, gold armor on a black undersuit).
- **Hang points are real.** A cape hangs from the shoulders, a coat from the waist, a skirt from the hips. Never from the middle of the back.
- **The bigger the garment, the slower it moves.** Long, heavy things get low stiffness and high damping; short, light things the reverse.
- **Wind agrees everywhere.** Every chain uses the shot's `wind`, and so do rain, smoke, and petals.

## 3. Movement

Give the character a movement profile in a sentence, then make the poses and timing obey it.

- **Stance and weight**: low and forward (aggressive), upright and centred (precise), loose (playful), heavy (tired).
- **Rhythm**: does the character snap into poses and stop dead (attacks `ease: "in"`, recoveries `"out"`), or flow through them on arcs (spline keys, few stops)? Two fighters should differ.
- **Signature moves**: the two or three poses only this character does. Keep them in the pose library (`KU`, `SE` in the worked example) and reuse them, so the character is recognisable by silhouette.
- **Secondary action**: what moves after the body stops — a coat that swings back, hair that settles a beat later. That's the chains; make sure they're on (a pose held with no velocity still settles).

### Gait, measured, not guessed

Take the numbers from the movement references and put them in the spec:

| | Cycle (frames at 24 fps) | Notes |
| --- | --- | --- |
| Person walking | 24–30 per two steps | Hips and shoulders counter-rotate; the body is highest at passing, lowest at contact (3–5 cm bob); arms swing opposite the legs, ~20° forward, ~10° back; the knee bends in the swing phase; the head stays level |
| Person running | 14–18 per two steps | Both feet off the ground mid-stride; lean 10–15° forward; elbows bent ~90° |
| Cattle, horse walking | 28–36 | Four-beat: left hind, left fore, right hind, right fore; the head nods once per step |
| Horse, dog trotting | 14–18 | Diagonal pairs move together |
| Deer walking | 24–30 | High, careful steps; head up, ears turning; frequent stops |
| Small bird hopping | 6–8 per hop | Both feet together; head bob while walking (pigeons) |
| Bird flapping | 3–8 (small) to 12–20 (large) per beat | Downstroke faster than upstroke; large birds glide between beats |

- **Two-segment limbs**: a leg is thigh and shin with a knee, an arm is upper arm and forearm with an elbow. A single stick per limb reads as a toy.
- **Tie the cycle to distance**, not time, so feet never slide; when speed changes, the cadence changes.
- **No two extras alike**: vary height, build, speed, and phase ±10–15%, and give a crowd three to five idle actions (a weight shift, a head turn, a gesture, checking a phone, pointing) instead of standing still.
- **Ease between states**: standing → walking → running blend over 4–8 frames; nobody snaps to full stride.

## 4. Pose library

Poses are rig keys: hip, torso lean (positive leans toward the facing side), head tilt, and an absolute angle per limb segment, plus props in the hands. Build each pose once, check it on the model sheet, then use only library poses (with small overrides) in the film.

Check every new pose for: line of action, weight over the planted foot, silhouette with the prop clear of the body, and a forward lean into an attack.

## 5. The model sheet

The model sheet is drawn by the same renderer from the same spec (designer skill). A change to the spec is a change to every shot; rebuild and look at the sheet before rendering the film.

## Done

`references.md` has a row for every figure and animal with sources, sampled colours, and gait numbers; the spec lists build, paints, face, hair, every garment with its physics, the movement profile with its measured gait, and the pose library; the model sheet is rendered from it; in a draft render the clothes and hair lag and settle after every stop, and `node harness/edit.js review` shows no frozen runs inside action.
