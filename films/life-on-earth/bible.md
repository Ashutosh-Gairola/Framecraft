# Life on Earth — bible

A 3D film (`skills/html-anime-3d-actor/SKILL.md`): one continuous 120-second journey in six scenes, drawn by `assets/world.js` at film time through one shared renderer.

## Stages and seams

| Time | Where | How it joins the next |
| --- | --- | --- |
| 0–19.65s | The reef (`sea.js`): light rays, caustics, coral heads along a sand channel, a rock arch, reef fish, a silver bait ball, clownfish in anemones, eagle rays, a turtle, a whale in the blue | The camera follows a column of bubbles up; bright water fills the frame at the surface |
| 19.65–120s | The land (`land.js`): one map, one moving sun | Droplets run off the lens as the coast opens; from there everything is one camera path over one geography |

## The map (`geo.js`)

West to east: ocean → beach, dunes, palms, fishing village, jetty → patchwork farmland, a village with a pond and pasture → the country road over its bridge, houses thickening into → the city (avenues, cross streets, glass towers at the centre, park, market, plaza, river walk) → suburbs → the forest (a glade, a stream, a giant tree) → the eastern range. A mountain range runs along the north. One river rises in the east and runs through the forest, the city, and the farmland to the sea.

## The camera, beat by beat

| Time | Shot |
| --- | --- |
| 0–4 | Extreme-wide establishing shot over the reef |
| 4–9.5 | Low tracking between coral heads, under the arch |
| 9.5–11.5 | Rising to a bird's-eye view of the bait ball |
| 11.5–14 | Macro on clownfish in an anemone |
| 14–17 | Wide: the turtle passes, the whale glides in the blue |
| 17–19.65 | Tilting up with the bubbles to the surface |
| 19.65–24.5 | Just above the water, waves, pelicans diving |
| 24.5–32 | Aerial sweep along the coast, the fishing village, boats |
| 32–37 | Tracking down the beach: walkers, crabs, tide pools |
| 37–44 | Inland over the dunes; high above the countryside |
| 44–52 | Down to the farmer walking between the crop rows |
| 52–60 | Cattle at the fence, buffaloes in the pond, the village revealed |
| 60–66 | Following the road over the bridge toward the city |
| 66–72 | The skyline from high; down between the towers |
| 72–77 | Street level; looking up between the towers |
| 77–80 | Crane over the park |
| 80–88 | With the birds along the river, out over the suburbs to the forest |
| 88–95 | Into the glade; telephoto on the deer crossing the trail |
| 95–100 | Low through the ferns to the stream; the leaf with dew |
| 100–104 | Tilting up the giant tree into the canopy, beside an eagle |
| 104–120 | Golden hour: the pullback over forest, river, city, farmland, coast, and the shining sea |

## Life

People (farmers, villagers, children, fishermen, beach walkers, commuters, cyclists, dog walkers, families), cattle, buffaloes, oxen at the plough, horses, goats, dogs, chickens, ducks, deer, a fox, rabbits, squirrels, fish in schools and in the stream, turtles, rays, a whale, crabs, frogs, butterflies, dragonflies, bees, gulls, pelicans, geese, crows, pigeons, sparrows, songbirds, a woodpecker, eagles. Traffic and pedestrians in the city are simulated once at load: cars follow each other and stop at red lights, walkers wait at the kerb and cross on green.

## Motion

Cards: `locomotion.md` (people, cattle, deer, birds), `cloth-hair.md` (sway of grass, palms, crowns), `effects.md` (water, bubbles, mist, light). Walk cycles are tied to distance travelled, so feet don't slide; fish swim with a body wave; everything moves from film time.

## Paints

The `indigo` script plus `ocean`, `land`, `cyan`; every colour in the world is a paint or a blend of two.

## Sound

The muffled hush of the reef and its bubbles; surf, gulls and wind at the coast; birdsong, the river and cattle in the countryside; traffic in the city; birds, insects, the stream and a woodpecker in the forest; wind at golden hour. A synthesized score warms from serene to wonder.

## Limits

Stylized realism, drawn by code: no photographs, no scanned assets, no volumetric light. The score is synthesized, not orchestral.
