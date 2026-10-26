# html-anime · sequence

The Last Eclipse

52s · 24fps · 1248 frames · 1920×1080 · 6 scenes
Color script and art style: as on every scene sheet (eclipse, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-confrontation | The Final Confrontation | 0:00.00–0:08.00 | 8s | From an extreme-wide aerial over the shattered bridge, the camera descends between Kael and Raizen silhouetted against the crimson moon; blue lightning behind Kael, crimson energy along Raizen's sword; close-ups of their eyes; a low two-shot as both take their stances. | 0 |
| 2 | s2-steel | Steel Against Steel | 0:08.00–0:16.00 | 8s | Kael Flash Steps in; Raizen blocks; a ring of pressure scatters ash. Six exchanges: horizontal slash, overhead block, spinning counter, a duck under the blade, a double slash, and a weapon lock. | 0 |
| 3 | s3-echo | Speed Versus Strength | 0:16.00–0:24.00 | 8s | Phantom Echo: two afterimages circle Raizen; his sweep shatters them into blue particles; the real Kael drops from above; Raizen catches the blade, then drives him back with a shockwave. | 0 |
| 4 | s4-rupture | The Crimson Rupture | 0:24.00–0:32.00 | 8s | Raizen slams Graveheart into the bridge; crimson fractures race toward Kael, who leaps between collapsing pillars, cuts a falling slab, lands on a surviving ledge, and charges his blade with lightning. | 0 |
| 5 | s5-ultimates | Heaven Splitter Versus Eclipse Devourer | 0:32.00–0:44.00 | 12s | Kael's sword becomes an enormous blue-white arc; Raizen forms a crimson-black sphere that pulls debris inward; they charge; the collision holds in slow motion, then a dome of light expands across the skyline. | 0 |
| 6 | s6-choice | The Choice | 0:44.00–0:52.00 | 8s | The light fades; Kael kneels, Raizen stands with his sword lowered; the fractured Eclipse Core floats between them; Kael reaches toward it instead of attacking; Raizen's grip loosens. | 0 |

## Cast (shared)
- Kael Arashi — original. Model sheet example at films/the-last-eclipse/design/kael-arashi.html. Show it and wait for a yes before any scene is drawn.
- Raizen Kuro — original. Model sheet example at films/the-last-eclipse/design/raizen-kuro.html. Show it and wait for a yes before any scene is drawn.

## Build
One bible and one design folder for the whole sequence: films/the-last-eclipse/bible.md, films/the-last-eclipse/design/.
Each scene is a sub-composition: films/the-last-eclipse/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/the-last-eclipse/index.html (data-composition-id="the-last-eclipse", data-duration="52") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-confrontation-host" data-composition-id="s1-confrontation" data-composition-src="compositions/s1-confrontation.html" data-start="0" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-steel-host" data-composition-id="s2-steel" data-composition-src="compositions/s2-steel.html" data-start="8" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-echo-host" data-composition-id="s3-echo" data-composition-src="compositions/s3-echo.html" data-start="16" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-rupture-host" data-composition-id="s4-rupture" data-composition-src="compositions/s4-rupture.html" data-start="24" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-ultimates-host" data-composition-id="s5-ultimates" data-composition-src="compositions/s5-ultimates.html" data-start="32" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s6-choice-host" data-composition-id="s6-choice" data-composition-src="compositions/s6-choice.html" data-start="44" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/the-last-eclipse/scenes/<id>), render.
4. Check the whole: node harness/check.js films/the-last-eclipse, then npx hyperframes lint and npx hyperframes check in films/the-last-eclipse.

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
