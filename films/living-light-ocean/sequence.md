# html-anime · sequence

The Living Light of the Ocean

40s · 24fps · 960 frames · 1920×1080 · 5 scenes
Color script and art style: as on every scene sheet (indigo, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | shoreline | The Glowing Shoreline | 0:00.00–0:08.00 | 8s | An extremely low glide follows a glowing wave over black sand, then closes on tiny cyan plankton flashing in the ripples and bubbles. | 0 |
| 2 | descent | Beneath the Surface | 0:08.00–0:16.00 | 8s | The camera follows the luminous water and slips continuously beneath its surface, with refraction and bubbles as the wavering surface recedes overhead. | 0 |
| 3 | school | The Living Constellation | 0:16.00–0:24.00 | 8s | A small school of silver fish sweeps through drifting plankton and turns together, briefly stirring fine blue trails before vanishing into the deep. | 0 |
| 4 | turtle | A Gentle Giant | 0:24.00–0:32.00 | 8s | A green sea turtle glides calmly past the camera, its slow flipper strokes stirring a few brief cyan sparks as the camera follows at a respectful distance. | 0 |
| 5 | deep | The Infinite Blue | 0:32.00–0:40.00 | 8s | The camera pulls back and rises into an immense dark ocean where tiny bioluminescent points surround the turtle's distant silhouette like a submerged galaxy. | 0 |

## Cast (shared)
- Green sea turtle — follows a reference: A scientifically recognizable adult green sea turtle: broad oval olive shell with subtle scute pattern, pale underside, small dark eyes, four broad paddle-shaped flippers, realistic proportions and calm marine movement. No markings, accessories, or anthropomorphism. Build films/living-light-ocean/design/green-sea-turtle.html from it.

## Build
One bible and one design folder for the whole sequence: films/living-light-ocean/bible.md, films/living-light-ocean/design/.
Each scene is a sub-composition: films/living-light-ocean/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/living-light-ocean/index.html (data-composition-id="living-light-ocean", data-duration="40") mounts them, and registers an empty paused timeline:

```html
  <div id="shoreline-host" data-composition-id="shoreline" data-composition-src="compositions/shoreline.html" data-start="0" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="descent-host" data-composition-id="descent" data-composition-src="compositions/descent.html" data-start="8" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="school-host" data-composition-id="school" data-composition-src="compositions/school.html" data-start="16" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="turtle-host" data-composition-id="turtle" data-composition-src="compositions/turtle.html" data-start="24" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="deep-host" data-composition-id="deep" data-composition-src="compositions/deep.html" data-start="32" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/living-light-ocean/scenes/<id>), render.
4. Check the whole: node harness/check.js films/living-light-ocean, then npx hyperframes lint and npx hyperframes check in films/living-light-ocean.

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
