---
name: html-anime-3d-actor
description: Build characters, buildings, and whole environments in three.js for a HyperFrames film — jointed actors with toon shading and ink outlines, procedural architecture and terrain, water, fog, light, and real camera moves (dolly, crane, orbit, fly-through) — all drawn deterministically from timeline time. Use when a film needs real 3D space or camera movement that 2D layers can't fake (orbits, drone flights, big environments, realistic landscapes), or the user asks for three.js or 3D.
---

# 3D Actor

When the camera must really move through space — orbit a shrine, fly over a valley, circle two fighters — build the world in three.js. Everything else in the crew still applies: the sheet, the actor spec, the paints, the timing, the gates.

`harness/templates/three-scene.html` is a working template: the ready gate, the seek listener, a toon ramp with ink outlines, a jointed actor, a lit building, a seeded set, and an orbiting camera. Copy it, then replace the actor, the set, and the camera path.

## The contract

HyperFrames seeks every frame on its own. The 3D frame is a pure function of time:

```js
function renderAt(t) {
  /* pose the actors, move the camera, update water and cloud uniforms — from t alone */
  renderer.render(scene, camera);
}
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
renderAt(0);
window.__threeReady(); // resolves window.__hf.buildReady["three"], created before the module loads
```

- No `requestAnimationFrame` loop, no clock, no `Math.random()`: seed a PRNG (mulberry32) and build everything once at load.
- Simulations (cloth, particles, flocks) are run once at load into arrays, then looked up by frame: `state[Math.round(t * 24)]`.
- Load three.js as an ES module from `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` (pin the version). Add-ons (`OrbitControls` never; `Sky`, `Water`, `EffectComposer` if needed) from the same version's `examples/jsm/`.
- `preserveDrawingBuffer: true`, pixel ratio 1, the canvas at the sheet's size, `outputColorSpace = SRGBColorSpace`.
- Register an empty paused GSAP timeline for the composition, as every HyperFrames root needs.

## Actors in 3D

The actor skill's spec still defines the character; in 3D it becomes a hierarchy:

- **Skeleton**: groups that pivot at joints (hips → spine → neck → head; shoulder → elbow → wrist; hip → knee → ankle). A limb is a mesh offset from its pivot, so rotating the group rotates the limb at the joint.
- **Body**: capsules, spheres, and lathed profiles per segment; costume layers as separate meshes (a breastplate is a shell slightly larger than the torso).
- **Cloth and hair**: chains of small segments with the same spring physics as the 2D actor (simulated once at load per shot), or a vertex-displaced plane for a cape.
- **Look**: `MeshToonMaterial` with a 3-step gradient ramp for cel shading, plus an inverted-hull outline (the same geometry, back faces, ink, scaled 1.02–1.05). For a realistic film use `MeshStandardMaterial` instead and drop the outline.
- **Keys**: keyed values per joint in time, smoothstep or spline between them; the timing skill's rules (anticipation, contact holds, overlap, breathing holds) carry over unchanged.
- **Research and gait**: research every figure and animal first (actor skill, section 0: `harness/refs.js`, web references, sampled colours). Build limbs as two segments with knees and elbows, counter-rotate hips and shoulders, and drive the gait with the measured cycle (actor skill, Gait); quadrupeds walk in the four-beat sequence, not with diagonal pairs swinging like a table.
- **Colour in 3D**: skin and costumes keep their saturation under light (a warm skin albedo, no blend toward white); grade the film with the art skill's Colour grade — true darks, fog only in the distance, key-to-fill 4:1, one 2D grade pass on the composited frame.

## Buildings and environments

- **Architecture** from parts: boxes, extrusions (`ExtrudeGeometry` from a 2D profile for roofs, eaves, arches), lathes (pillars, domes, lanterns), and instancing for repeats (`InstancedMesh` for tiles, windows, steps, prayer flags).
- **Terrain** from a seeded height function (layered sine or value noise) displacing a `PlaneGeometry`; color by height and slope (rock, grass, snow); far ranges as separate low-detail meshes.
- **Vegetation** with instanced cones and billboards; sway in the vertex position by `sin(t + phase)`.
- **Water**: a plane with a moving normal pattern or a reflective material; ripples from time, never a clock.
- **Sky and air**: a gradient sky dome or the `Sky` add-on; `scene.fog` (`Fog` or `FogExp2`) for atmospheric perspective; layered transparent cloud planes drifting with time; light shafts as additive cones.
- **Light**: a key (sun), a rim, a hemisphere fill. Golden hour: low warm key, cool shadow side. Keep bloom (if any) to the brightest points.

## Land, clouds, and buildings that hold up close

- **Land**: add fine relief to the height function (small knolls, rock steps), a tiling grain normal map at low strength (0.4–0.5; stronger reads as fingerprints), rock on steep slopes banded in strata, grass in patches of two or three greens plus dry and bare earth, and fake ambient occlusion (darken a vertex by how far it sits below its neighbours). Boulders as an instanced, flat-shaded dodecahedron, small by water, larger on scree.
- **Clouds**: cumulus is a cluster (a big body and smaller puffs), each puff a texture of overlapping lobes lit warm on top and softly shaded below, never a single blur. Fade every cloud by its distance to the camera, so none smears across the lens. Keep dark rims out of the shading.
- **Flying through a cloud** (a hide-and-reveal): one compact bank of round, soft puffs (no flat edges, they show as seams) centred on the camera path, faded in only as the camera nears it so it's never a lone puff from afar; plus a camera-attached veil (a plane at 1 unit with a noise texture, depth test off) whose opacity rises and falls over about two seconds. Come out of it facing the subject.
- **Architecture**: build the style's real parts. A pagoda is a railed stone plinth, a timber-framed whitewashed hall with lattice windows and a carved door, a colonnaded porch, struts under the eaves, and tiers of curved hip roofs (concave slopes, overhanging eaves, upturned corners, tile ribs, a gold fascia, corner lanterns) under a gold spire. A box with a cone on top reads as a toy.
- **Life**: people as jointed figures that walk (legs and arms swing on a sine, a small bob) along paths like stairs, sampled from the terrain; animals as bodies, heads that lower to graze, legs that stride when they walk; birds as flocks with flapping wings and a few gliding eagles. Place them where the camera passes, at a size that reads there.

## Journeys across worlds and scales

When one continuous film must cross very different worlds (a mountain, a volcano, a planet, a galaxy), build each as a **stage** — its own scene, lights, and camera path in film time — and draw them all through **one renderer** into a 2D compositor canvas, so the scenes share one build and one GPU context:

- **Hide a swap under a veil**: a full-frame cloud or smoke image drawn over the picture, rising to fully opaque for about a second while the stage underneath changes, then clearing into the new world. Motivate it on screen (the camera climbs into cloud, rises into a plume).
- **Cross a scale with a dissolve**: render both stages and blend the second over the first for 2–3 seconds through something they share (a starfield, a glow), not a cut.
- **Light the side the camera sees**: approach planets from their sunlit side; place viewpoints by rotating the planet-to-sun direction aside, not by fixed offsets.
- **Lead with the eye**: the look target turns to the next subject a second or two before the camera arrives, or the frame goes empty between subjects.
- **Make bright things burn**: a sun is an emissive surface pushed far past white (so tone mapping keeps it white) plus a few glow sprites sized to the camera's distance — one huge glow washes the frame.
- **Shaders for planets**: a day/night material (lit color, city lights on the dark side, ocean glint, a rim of atmosphere) and a back-face additive atmosphere shell 2–3% larger than the planet. Canvas textures marked sRGB are already linear when sampled: don't gamma-correct them again.
- **Galaxies as points**: a few hundred thousand points in logarithmic arms with a bulge, a custom point shader with a size clamp, nebula sprites scattered (not beaded), dust kept off the core.
- **Keep it out of the subject**: check every waypoint clears every body; the editor's review finds a pass through a planet as a cut.

`films/everest-to-galaxy/assets/world.js` is a worked example: five stages, two veils, two dissolves, one 120-second shot.

## A living world on one map

When the journey stays on one planet (ocean, coast, farmland, city, forest), build **one land** with one geography, one sun that moves through the day, and one camera path; give each place its own module on the same ground (`films/life-on-earth/assets/`: `geo.js` for the map as plain functions, then `coast.js`, `rural.js`, `city.js`, `forest.js`).

- **Heights above the ground**: write the camera path as height above the surface (smoothed under high shots, so the drone doesn't bob over every hill), and give it a soft floor. A low shot written as sea-level height ends up inside the crop. Guard the soft floor against overflow (`x > 30 ? x : log1p(exp(x))`) or high shots go black.
- **No overshoot**: limit the spline's tangents (Fritsch–Carlson). A fast dive into a slow walking shot otherwise dips through the ground before it settles.
- **A grid that reaches the horizon**: warp the terrain grid (`x = c + a·u + b·u⁷`) so cells are ~17 m where you film and kilometres at the edge; look heights up through the same triangles the mesh draws.
- **Crowds as instanced parts**: people (torso, head, hair, legs, arms), four-legged animals (body, neck, head, legs, tail, horns), birds (body, two wings), fish (a body wave in the vertex shader) — one draw call per part, posed every frame from `pose(t)`. Tie the walk cycle to distance travelled, not time, so feet don't slide.
- **Traffic that obeys the lights**: simulate once at load (a car-following model with stop lines and a signal cycle; walkers wait at the kerb and cross on green), store each user's distance per frame, and look it up by time. Fade users in and out where lanes wrap.
- **Foliage up close**: crowns are lumpy meshes from afar; near the camera, scatter leaf cards (alpha-tested clusters) over each crown's surface so the silhouette breaks up.
- **Keep the camera's way clear**: list the camera's ground track and keep plants, stones and logs off it, and out of the line of sight to the subject.
- **Bridge seams the way the script says**: bubbles to a surface break (bright water, then droplets running off the lens), a road that grows into a city, birds that lead the camera to the next place.

## Camera

Real moves, written as paths in time:

- **Dolly / fly-through**: position along a `CatmullRomCurve3` sampled at an eased `u(t)`; look slightly ahead along the curve.
- **Crane**: raise y and tilt down together.
- **Orbit**: angle = a0 + speed·t around the subject, radius eased; look at the subject's centre.
- **Pullback reveal**: radius and height grow on a slow ease-in-out.
- Smoothness is the whole point: ease every start and stop (`smoothstep`), keep angular speed under about 15°/s for calm shots, no shake unless the sheet calls for impact.
- Lens: 30–40° field of view for drone shots and landscapes, 20–28° for close actors.

## Performance

A frame that renders slowly slows every frame of the render. Cap triangles (instancing, low-poly far geometry), share materials, avoid real-time shadows on huge scenes (fake contact shadows with a dark blurred disc texture made once), and snapshot the heaviest moment once to time it.

## Done

`references.md` covers every figure, animal, and building style on screen; the review's Colour line reads lively; the scene renders from `renderAt(t)` alone (seek out of order and the frames match), `npx hyperframes lint` and `check` pass, the camera moves without a single jump (`node harness/edit.js review` shows no stutter and no frozen runs where the camera moves), and the actor spec's appearance and movement hold in 3D.
