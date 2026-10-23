# Mountain Shrine — bible

A 3D film (`skills/html-anime-3d-actor/SKILL.md`). One world, `assets/world.js`, built once per scene composition and drawn at film time, so the camera is one unbroken path across all four scenes. The sheets' shots are beats of that path, not cuts.

## World

- Terrain: seeded value noise and ridges; a central peak with a flat summit at y 262; a valley carved south of it with a winding river (`riverX(z)`) and a lake at z 560; a far snow range in a ring 1050–1650 out.
- Paints: the `noon` script plus `pine`, `meadow`, `glacier`. Every color in the world is a paint or a blend of two.
- Shrine: two stone platforms, a white hall with a red band and red pillars, two hip roofs, a gold finial and sphere, a chorten, a bell, 46 stone steps down the south slope with lanterns every fifth step, four strings of prayer flags (blue, white, red, green, yellow).
- Valley: 7,000 instanced pines in clustered stands, wildflowers on the floor, a wooden bridge at z 380, three waterfalls on the walls, birds circling.
- Land detail: fine relief, a grain normal map, rock strata, grass patches, ambient occlusion, 1,600 boulders.
- Shrine: a three-tier pagoda (`pagodaRoof()`: curved hip roofs with upturned corners, tile ribs, gold fascia, corner lanterns) on a three-tier railed plinth; timber-framed hall, lattice windows, red-and-gold door, porch columns, eave struts, gold spire, prayer wheels, banners.
- Life: 31 birds (a valley flock, a summit flock, three eagles), 16 yaks along the river, 8 goats on the high slopes, 9 pilgrims climbing the stairs (some with staffs), 3 monks at the door.
- Air: a sky dome from deep blue to a warm horizon, a low golden sun in the east-south-east rising slowly, exponential fog, a sea of clouds kept out of the valley corridor, wisps circling the summit, light shafts in the first scene.

## Motion

Cards: `effects.md` (water, fog, cloud, light), `cloth-hair.md` (the prayer flags flutter with the wind). Everything moves from film time: cloud sprites drift east, wisps circle the summit, the water's ripples and the waterfalls' streaks scroll, the flags flutter, birds circle with flapping wings, the sun climbs slowly.

## Camera

| Time | Move |
| --- | --- |
| 0–18s | Glide forward high above the clouds from the south; descend as the peak and shrine rise through them |
| 18–37s | Down into the valley; low and forward over the river, the lake, the bridge; up the slope |
| 37–41s | Into a cloud bank on the climb (white for about a second), out of it facing the shrine |
| 40–58s | A slow orbit around the shrine, 160° in 14 s, at roof height |
| 58–80s | Crane up and pull back over the whole range to an ultra-wide view |

The path is a C1 spline through timed points (velocity continuous, at rest only at the very start and end), with a soft floor above the terrain. No cuts, no shake.

## Sound

Wind under everything; the stream and birdsong in the valley; temple bells at the shrine; a synthesized serene/calm music bed.
