---
name: html-anime-character
description: Design and build 3D characters for a three.js film — a human from a reference photo, a known anime character, or an original — as one sculpted, skinned body (not stacked tubes), in a realistic or an anime style, with face, hair and clothing, and a turnaround model sheet before any animation. Use whenever a 3D film needs a person or a humanoid character, the user names an anime character, or earlier humans looked like mannequins.
---

# Character

A person on screen is judged harder than anything else in the frame. A body built from separate tubes, with a head that is a deformed sphere, reads as a mannequin however well it moves. Build every human and humanoid with `harness/templates/human.js`, and show a turnaround before anything is animated.

## What the template does

Copy `harness/templates/human.js` into `films/<slug>/assets/`, then call `buildHuman(THREE, spec)`, and pose the result with `poseHuman(h, pose)`.

- **Body.** One continuous skin. It is a signed distance field built from anatomical masses: ribcage, pectorals or breasts, lats, glutes, deltoids, biceps and triceps, forearm flexors, quadriceps, adductors, calves, patella, clavicles and trapezius. The masses are joined with smooth unions and meshed by surface nets. Normals come from the field's gradient, so the surface is smooth with no seams at the joints.
- **Head.** Sculpted on its own at about 1 mm resolution:
  - the masses: cranium, face, jaw and jaw angles, cheekbones, brow ridge and glabella, chin, ears with a carved concha, temples;
  - the nose: bridge, tip, alae and nostrils;
  - the mouth: lips as arcs, with the crease, philtrum and mentolabial fold carved in;
  - the eyes: sockets with eyelids sculpted round the ball in an almond opening, plus a lid crease.
- **Eyes.** Separate balls with a painted iris and a clearcoat. Blinks use lid shells.
- **Expressions.** Morph targets for smile, frown, browUp, browIn, squint and jaw.
- **Hair, brows and clothes.** Shells offset from the same field.
  - Hair thickness grows from nothing at the hairline, so it blends into the scalp. Strand grooves and tufts give it texture. Styles: short, long, bun, bald, and spiked styles (`goku`).
  - Brows are projected onto the skin.
  - Garments: t-shirt, jacket, button-up `shirt` (collar, placket, rolled sleeves), `gi` (V-neck crossed top over an undershirt), jeans, shorts, gi trousers, sneakers and boots, a belt or sash, and wristbands.
- **Skeleton.** Hips, spine, chest, neck and head; clavicle, upper arm, forearm, hand and three-jointed fingers; thigh, shin, foot and toe.
  - Skin weights come from the distance to each bone, restricted to the bones of the body part a vertex lies in.
  - A garment may only bind to the parts it covers. Without that, a shirt hem follows the hands that hang beside it, and flaps out when the arms lift.
- **Two styles from one design.**
  - `style: "real"`: anatomical proportions (7.6 heads tall), physical skin with sheen and regional colour (lips, cheeks, nose, ears, knuckles), small eyes.
  - `style: "anime"`: about 7 heads tall and longer-legged. A rounder skull, a small soft chin, and large eyes with a big iris and two highlights. A tiny nose, a short mouth line, clumped bangs. Cel shading with a two-step ramp and ink outlines (inverted hull, skinned).

Build time is about 7 s per character in the browser. Render with HyperFrames as usual; the build resolves `buildReady` before the first frame.

## Steps

### 0. Research

Follow actor skill, section 0. A real person or a known character gets references before any numbers are written.

- **A real-looking person from a photo:**
  - find a freely licensed full-body photo (Openverse, Wikimedia Commons; CC0, CC BY or public domain) and save it in `references/` (git-ignored);
  - write its credit in `references.md`;
  - sample its colours with `node harness/refs.js palette`;
  - read off the build, the proportions, the hair, and every garment with its colour.

  Design a character from it. Don't copy a private person's identity: match the outfit, build, palette and type, not their exact face.
- **A known anime character:** list the signature features that make them recognisable, and get each one right. For Goku:
  - the hair silhouette: big top and back spikes, the forehead bangs, the front tuft;
  - an orange gi over a blue undershirt;
  - a blue sash, blue wristbands, blue boots with red ties;
  - black eyes under angled brows, and a heavily muscled build.

  Leave out logos and lettering, as everywhere in the films.

### 1. Spec

Write the spec as a module, for example `films/<slug>/assets/cast.js`. Everything has a default; see `DEFAULTS` in the template.

```js
{
  style: "real" | "anime",
  height, sex (0–1), build, muscle, fat,
  skin, eyes,
  face: { jaw, chin, nose, noseWidth, brow, cheek, lips, eyeSize, browTilt, browWeight },
  hair: { style: "short" | "long" | "bun" | "bald" | "goku", color },
  brows,
  top: { type: "tshirt" | "jacket" | "shirt" | "gi" | "none", color, under },
  bottom: { type: "jeans" | "shorts" | "gi" | "none", color },
  shoes: { type: "sneaker" | "boot", color, sole, tie },
  belt, bands
}
```

New garments, hairstyles or features go into the template as fields, not into the film. Add them next to the existing ones and keep the same idioms: offset the body field, cut with `smax`, add tufts or folds as small displacements.

### 2. Turnaround gate

Before any animation, render a turnaround: a full circle in an A-pose, then a face close-up with a blink and a smile. `films/character-test/index.html` is the worked example (three characters, 12 s).

Check every point below. A character that fails one isn't animated.

- Full body, front, side and back:
  - proportions in heads;
  - shoulders wider than hips (male) or hips wider (female);
  - arms reaching mid-thigh;
  - no seams;
  - clothes follow the body.
- Face, front and three-quarter:
  - eyes at half the head's height, one eye-width apart;
  - the upper lid covers the top of the iris;
  - the nose base and the mouth fall on the thirds of the lower face;
  - brows on the skin;
  - hair blends at the hairline.
- Anime: the silhouette alone identifies the character (hair, outfit colours, build).
- Lighting: a key, a rim and a fill. Skin keeps its colour; no grey or orange cast.
- A comparison sheet: the reference beside the build (photo or official look), then real and anime if both are needed. `renders/character-test-comparison.png` is the example.

### 3. Pose and act

`poseHuman` follows the figure conventions:

- the spine, chest, neck and head take `[x, y, z]` (x > 0 bends forward, y > 0 turns to the character's left);
- shoulders take `sh: [flex, twist, abduct]`;
- elbows and knees take a bend (`el`, `knee`);
- hands take `hand: { curl: [index, middle, ring, pinky, thumb], spread, oppose }`;
- faces take `face: { smile, frown, browUp, browIn, squint, jaw, blink, wide, lookX, lookY }`.

Timing, gait and acting come from the actor, timing and motion skills.

## Limits

- **Photorealism.** "Real" is a stylised realism, at the level of a game character, not a photograph. Close-ups of realistic faces are the weakest shots. Light them low-key with a rim, keep them short, and give the performance to the eyes and brows.
- **Likenesses.** No likenesses of real public figures or actors.
- **Anime** is the stronger style for close-ups and for known characters.
- **Mouths.** The jaw morph parts the lips through the crease. Wide-open shouting mouths need a mouth cavity, which isn't built yet.
- **Speech.** Long dialogue needs mouth shapes (voice skill); the morphs are only a start.
