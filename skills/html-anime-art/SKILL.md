---
name: html-anime-art
description: Art-direct a code-drawn anime — which art style to follow (ink cel, retro cel, painted world, manga ink, chibi, or the user's own reference), the color roles of the closed script, backgrounds, value structure, light, and shape language. Use when deciding how an html-anime film should look, when the user gives an art reference, or when frames look generic or muddy.
---

# Art

One look, held in every frame. The sheet names the style. A style reference from the user beats the style; the style fills in what the reference does not show.

## Following a reference

When the sheet has a `Style reference`, look at it before anything else and write in the bible's Art section:

- Line: weight, taper, color (dark line, colored line, or no line).
- Shadow: how many tiers, hard or shaped, which paint.
- Proportion and eyes, if characters are shown.
- Backgrounds: silhouette, painted washes, detailed, or empty.
- Texture: none, screentone, a drawn grain.
- What it never does.

Then map it onto the sheet's paints. The reference's look, the sheet's hexes. If the reference cannot be reached without a color the sheet lacks, say so to the director; do not invent a hex.

## The styles

The sheet prints each style's numbers. This is how to hold them.

### ink-cel — the default

Modern TV cel. Flat local color, one hard shadow per form at about 20% `ink`, tapered line on top. Backgrounds are silhouettes in two or three values with a few `practical` windows. The light is one flat shape: the moon, a window, the blade.

### retro — late-80s and 90s OVA

Heavier line (8px outer). Two hard shadow tiers: shadow at 20% `ink`, deep shadow at 40% inside it. Hair gets a hard highlight shape, not a band. Faces are longer, jaws and noses have corners. Cities are dense: many windows, a rim of `line` along the skyline. One `accent` rim light on the character's back edge.

### painted-world — painted backgrounds

Characters stay cel. Backgrounds lose their line and become stacked flat washes: three to five shapes per form, each a sheet paint at 15–40% opacity, overlapping. Clouds and trees are big masses with a lit side and a shade side. Every wash agrees with one light direction. Never a CSS gradient on a form; a sky may still grade `sky` to `ink`.

### manga — ink and paper

Two paints do almost everything: `ink` and the lightest paint (`sclera`, `moon`, or `practical`). `accent` appears once a shot at most. Shadows are screentone: an SVG `<pattern>` of dots in `ink`, sized 6–10px, on a fixed grid. Deep shadow is solid ink. Hatching is straight parallel strokes. In the sakuga shot the background is replaced by straight speed lines converging on the action.

### chibi — super-deformed

2.5 heads tall. Every shape is round; even 8px line with round joins. Eyes are 40% of the face. No shadow, or one small one under the hair. Props drawn oversized. Timing stays on twos, with squash on landings (see timing).

## Color roles

Every paint has one job per shot. Write them in the bible:

- `sky`, `ink`: the world. Large areas, low detail.
- `moon`, `practical`, `line`: light. The brightest shape in a frame is one of these, and there is one brightest shape.
- `accent`: the story color. On the thing that matters: the blade's edge, the cord, the moon's ring. Under 5% of the frame.
- `skin`, `hair`, `iris`, `sclera`: the character. Never used for the world.

## Value

Squint test: the frame read in three values (dark, middle, light) must show the subject at once. Plan it before color:

- Wide shots: the figure is a dark shape on a middle world, or a light shape on a dark one. Never middle on middle.
- Close-ups: the face is the lightest large area; the eyes hold the darkest dark and the brightest catchlight next to each other.
- The sakuga shot carries the film's strongest contrast. The aftermath and button step down from it.

## Colour grade

The picture must hold true darks, saturated mid-tones, and one clear light. A grade that drifts toward white haze reads dull even when every object has a colour. `node harness/edit.js review` prints a Colour line: colourfulness, mid-tone saturation, black point, and contrast, and names any dull stretch.

| Measure | Lively | Dull |
| --- | --- | --- |
| Black point (5th-percentile luma, 0–255) | under 30 | over 40: haze, no true darks |
| Mid-tone saturation (0–1) | 0.35–0.6 | under 0.32: pastel |
| Colourfulness | 35–60 | under 25: washed out; over 90: garish |
| Contrast (luma spread) | over 50 | under 40: flat |

Underwater, fog, and dawn shots may sit hazier on purpose, briefly; the film around them must not.

Where dullness comes from, and the fix:

- **Fog everywhere.** Fog is for distance: set its density so the near half of the frame is untouched; make its colour the horizon's colour, slightly deeper and more saturated, never near-white.
- **Fill light lifting the shadows.** Keep a key-to-fill ratio of at least 4:1 (sun 3–4, hemisphere 0.4–0.6). Shadows should be a darker, cooler version of the colour, not grey.
- **Paints blended toward white.** `blend(x, "sclera", …)` and `blend(x, "moon", …)` desaturate. Take colours from the references (`node harness/refs.js palette`) and keep the signature colours at full strength.
- **Tone mapping.** ACES flattens saturated highlights. Lower exposure a touch (0.85–0.95) and grade after it.
- **No grade pass.** In a composited film, grade the final 2D frame once: `ctx.filter = "contrast(1.1) saturate(1.15)"` before drawing the WebGL canvas, with a gentle warm-light / cool-shadow split. Grade the whole film the same way, scene to scene.
- **Match a reference.** Sample a reference still you want the film to feel like; match its black point and saturation, not just its hues.

## Backgrounds

Back to front, each layer one value step closer to the foreground's contrast: sky, far silhouette, mid ground, figure ground, weather, close figure. Far layers have fewer, smaller details. Background shapes point toward the subject: a roofline, a bridge rail, a power line leading the eye.

A background drawn for a pan is wider than the frame by the pan distance plus 2%.

## Shape language

Decide once for the film and repeat it: round (safe, warm), square (stable, stern), triangle (danger, speed). The character, the prop, and the sakuga shot's background shapes share it. The threat in a scene carries the triangles.

## Done

The bible's Art section has: the style or the reference notes, the color role of every paint, the value plan per shot, the light source per shot, the shape language, and the grade (exposure, fog, key-to-fill, the 2D grade pass); and the draft review's Colour line reads lively.
