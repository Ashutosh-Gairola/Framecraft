# Mountain Shrine — bible

A 3D film (`skills/html-anime-3d-actor/SKILL.md`). One world, `assets/world.js`, built once per scene composition and drawn at film time, so the camera is one unbroken path across all four scenes. The sheets' shots are beats of that path, not cuts.

## World

- Terrain: seeded value noise and ridges; a central peak with a flat summit at y 262; a valley carved south of it with a winding river (`riverX(z)`) and a lake at z 560; a far snow range in a ring 1050–1650 out.
- Paints: the `noon` script plus `pine`, `azure`, `gold` (the first version's `meadow` and `glacier` are now blends of these, so the sky can be truly blue and the flags truly yellow). Every colour is a paint or a blend of two. Research: `references.md`.
- Shrine: two stone platforms, a white hall with a red band and red pillars, two hip roofs, a gold finial and sphere, a chorten, a bell, 46 stone steps down the south slope with lanterns every fifth step, four strings of prayer flags (blue, white, red, green, yellow).
- Valley: 7,000 instanced pines in clustered stands, wildflowers on the floor, a wooden bridge at z 380, three waterfalls on the walls, birds circling.
- Land detail: fine relief, a grain normal map, rock strata, grass patches, ambient occlusion, 1,600 boulders.
- Shrine (rebuilt after Nyatapola): a five-level stepped brick plinth with a central stair and pairs of guardian statues on every level; a red-brick sanctum framed in dark carved timber with latticed bays and a door under a gilded torana on each side; five tiers of dark roofs over brick drums, every eave held by a ring of painted struts (red, green, gold, blue), bells along the lowest eave; a gilded finial; a white chorten; rows of brass prayer wheels; a mani wall along the stair and tall white pole banners.
- Life: choughs over the valley and the summit, four Himalayan griffon vultures soaring; 16 shaggy yaks (hump, hair skirt, sweeping horns, four-beat walk) by the river and a pack train of five loaded yaks with their herder on the valley trail; long-haired goats on the slopes; 11 pilgrims in chubas climbing the stair (staffs, prayer wheels), 9 walking the kora clockwise round the temple, 4 monks in maroon and saffron at the door. People have knees and elbows, counter-rotating hips and shoulders, robes that swing with the stride. Red rhododendrons in flower on the valley slopes.
- Grade: a deep azure zenith, fog only in the distance, sun against blue skylight fill, one contrast/saturation pass on the finished frame.
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
