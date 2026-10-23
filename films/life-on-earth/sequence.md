# html-anime · sequence

Life on Earth

120s · 24fps · 2880 frames · 1920×1080 · 6 scenes
Color script and art style: as on every scene sheet (indigo, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-underwater | The Mysterious Underwater World | 0:00.00–0:20.00 | 20s | Beneath turquoise water sunbeams fall on a coral reef; the camera glides between coral heads past reef fish, a sea turtle, rays, and clownfish in anemones, rises over a silver school turning in patterns, sees a whale pass in the blue, and follows rising bubbles up through the surface. | 0 |
| 2 | s2-coast | Coastal Life | 0:20.00–0:40.00 | 20s | Out of the water a golden beach and green hills appear; low over the waves, then a drone sweep along the coast past a fishing village and boats, a tracking shot along the beach with people and crabs, and a turn inland over fields. | 0 |
| 3 | s3-countryside | Peaceful Rural Life | 0:40.00–1:00.00 | 20s | From high above the countryside the camera descends to follow a farmer between crop rows, passes cattle and buffaloes at a pond, goats, chickens and ducks, villagers by the river, and reveals the whole village before following the road away. | 0 |
| 4 | s4-city | Bustling Modern City | 1:00.00–1:20.00 | 20s | The road widens into a city; a drone reveals the skyline, flies down between glass towers to a street with pedestrians, cyclists and traffic, looks up between the towers, and cranes over a green park before following birds out of the city. | 0 |
| 5 | s5-forest | The Living Forest | 1:20.00–1:40.00 | 20s | Over the suburbs the birds lead to a vast forest; the camera descends into a misty clearing where deer cross a trail, tracks low through ferns to a stream with fish, frogs and dragonflies, tilts up a towering trunk, and rises above the canopy beside an eagle. | 0 |
| 6 | s6-connection | The Grand Connection of All Life | 1:40.00–2:00.00 | 20s | Rising above the forest at golden hour, the camera pulls back over rivers, farmland, villages, suburbs, the city, and the coast to the shining ocean and the mountains, and settles on the whole living landscape. | 0 |

## Cast (shared)
No named cast. Any figure on screen is an original and gets a model sheet first.

## Build
One bible and one design folder for the whole sequence: films/life-on-earth/bible.md, films/life-on-earth/design/.
Each scene is a sub-composition: films/life-on-earth/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/life-on-earth/index.html (data-composition-id="life-on-earth", data-duration="120") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-underwater-host" data-composition-id="s1-underwater" data-composition-src="compositions/s1-underwater.html" data-start="0" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-coast-host" data-composition-id="s2-coast" data-composition-src="compositions/s2-coast.html" data-start="20" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-countryside-host" data-composition-id="s3-countryside" data-composition-src="compositions/s3-countryside.html" data-start="40" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-city-host" data-composition-id="s4-city" data-composition-src="compositions/s4-city.html" data-start="60" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-forest-host" data-composition-id="s5-forest" data-composition-src="compositions/s5-forest.html" data-start="80" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s6-connection-host" data-composition-id="s6-connection" data-composition-src="compositions/s6-connection.html" data-start="100" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/life-on-earth/scenes/<id>), render.
4. Check the whole: node harness/check.js films/life-on-earth, then npx hyperframes lint and npx hyperframes check in films/life-on-earth.

## Crew
1. Director — skills/html-anime-director/SKILL.md — the sheet, the gates, the final review
2. Designer — skills/html-anime-designer/SKILL.md — cast and props: model sheet example first, or follow the reference
3. Actor — skills/html-anime-actor/SKILL.md — each character as a spec: appearance, wardrobe with cloth physics, movement
4. Art — skills/html-anime-art/SKILL.md — the style, the backgrounds, the color roles
5. Motion — skills/html-anime-motion/SKILL.md — key poses for every prop and action
6. Cameraman — skills/html-anime-cameraman/SKILL.md — size, angle, layout, the move
7. Staff — skills/html-anime-staff/SKILL.md — keys, inbetweens, correction, finishing (with cel and timing)
8. Voice — skills/html-anime-voice/SKILL.md — casting, emotion, the generated lines, mouth shapes
9. Sound — skills/html-anime-sound/SKILL.md — effects, ambience, and the score, cued to the picture
10. Render — skills/html-anime-render/SKILL.md — the HyperFrames file and the gates
11. Editor — skills/html-anime-editor/SKILL.md — the review pass on the render, rhythm, continuity, mastering
