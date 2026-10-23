# Effects — light, fire, water, sparks, smoke, petals, weather, impact, shatter

Effects are drawn shapes in the sheet's paints, on ones, on their own layer. No blur, no glow stacks, no `Math.random()`: positions are written out or come from a seeded series.

A seeded series, when you need many positions:

```js
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
```

Generate the values once at build time and write them into the markup, or compute them synchronously before the timeline is built. The same seed gives the same film every render.

## Light and beams

- A beam is one flat polygon in `practical` or `moon`, wider at the far end, with a hard edge. Optional: a second, narrower polygon at higher opacity for the core.
- A light appearing: 2 drawings — a thin line, then the full shape. Not an opacity fade.
- A falling line of light (a meteor, a cut of light): the head is the brightest shape, the tail tapers; on ones, it moves the length of itself each frame.
- Light hitting something: the lit side of that thing gets a flat shape of the light's paint.

## Fire

3–4 drawings of flame shapes cycled on ones or twos: tongues rise and split, tips break off as separate shapes that rise and vanish. Paints: `practical` core, `accent` outer. Fire lights the faces near it with a flat shape.

## Water and splashes

- A splash: 4 keys — impact crown, rising droplets (separate shapes on arcs), peak, droplets falling and the surface ring spreading.
- Ripples: concentric ellipses, each a drawing, growing and thinning.
- Water surface: 2–3 horizontal highlight strokes in `line`, cycled on twos.

## Sparks

A burst at the contact point: 6–12 short straight strokes radiating, then each travels outward on an arc that falls with gravity, getting shorter. 4–6 frames on ones, then gone. `practical` or `line`.

## Smoke and dust

Big round masses that grow, drift with the wind, and thin out (opacity steps of 0.2 per drawing on twos). Dust from a landing spreads low along the ground.

## Petals, leaves, snow

Each piece has its own drift path (seeded), rotates as it falls, and moves side to side like a falling leaf, not straight down. Snow falls slower than rain and drifts. Fewer, bigger pieces in the foreground; many small ones in the back.

## Rain

A field of straight strokes in `line` on its own layer, slanted with the wind. Two layers: near (longer, sparser, faster) and far (shorter, denser, lower opacity). A loop is a finite `repeat` covering the runtime, moving each layer down by its stroke spacing per cycle. Splashes on the ground: tiny crowns, 2 drawings, on ones.

## Moon and sky events

A moon opening, cracking, or turning red is a short sequence of drawings: the ring appears (a stroke in `accent`), then the face changes, 2–3 drawings on twos. Keep the moon as one of the frame's brightest shapes.

## Impact flash

On the contact frame: 1–2 frames of a full-frame flat `line` or `accent`, or the picture inverted to two values (light shapes become `ink`, dark become `line`). Then straight back to the picture. Never fade it.

## Shatter

The object as one drawing, then a drawing with crack lines, then separate shards that each fly on their own arc and rotate, accelerating with gravity. Shards are flat polygons in the object's paints with a `line` edge on the lit side.
