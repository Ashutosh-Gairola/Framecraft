# html-anime · sequence

Everest to the Galaxy

120s · 24fps · 2880 frames · 1920×1080 · 6 scenes
Color script and art style: as on every scene sheet (indigo, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-everest | The Roof of the World | 0:00.00–0:20.00 | 20s | At sunrise a drone glides toward Everest above a sea of clouds, golden light on the summit, snow blowing off the ridges; it passes just over the peak and rises into the sky. | 0 |
| 2 | s2-volcano | Fire and Earth | 0:20.00–0:40.00 | 20s | Through the clouds a colossal active volcano appears over black lava fields; glowing lava flows down its slopes, the crater bubbles, and the camera sweeps around it and rises through the towering plume. | 0 |
| 3 | s3-earth | Earth From Above | 0:40.00–1:00.00 | 20s | The smoke becomes cloud as the camera climbs to the edge of space; Earth's curve, oceans, continents, cloud systems and thin blue glow appear, the night side lit by cities, until the whole planet hangs in the dark. | 0 |
| 4 | s4-space | Leaving Earth | 1:00.00–1:20.00 | 20s | Beyond the atmosphere the sky turns black; the Moon and satellites appear, stars come out, and Earth shrinks beneath the camera as it accelerates gently into space. | 0 |
| 5 | s5-solar-system | The Solar System | 1:20.00–1:40.00 | 20s | The Sun blazes as the camera travels past Mercury, Venus, Mars, Jupiter's storms, Saturn's rings, and the blue giants Uranus and Neptune. | 0 |
| 6 | s6-milky-way | The Milky Way | 1:40.00–2:00.00 | 20s | The solar system becomes a speck and the Milky Way spreads out, spiral arms of stars, pink nebulae, dark dust lanes and a golden core, as the camera rises and pulls back to a gentle stop. | 0 |

## Cast (shared)
No named cast. Any figure on screen is an original and gets a model sheet first.

## Build
One bible and one design folder for the whole sequence: films/everest-to-galaxy/bible.md, films/everest-to-galaxy/design/.
Each scene is a sub-composition: films/everest-to-galaxy/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/everest-to-galaxy/index.html (data-composition-id="everest-to-galaxy", data-duration="120") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-everest-host" data-composition-id="s1-everest" data-composition-src="compositions/s1-everest.html" data-start="0" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-volcano-host" data-composition-id="s2-volcano" data-composition-src="compositions/s2-volcano.html" data-start="20" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-earth-host" data-composition-id="s3-earth" data-composition-src="compositions/s3-earth.html" data-start="40" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-space-host" data-composition-id="s4-space" data-composition-src="compositions/s4-space.html" data-start="60" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-solar-system-host" data-composition-id="s5-solar-system" data-composition-src="compositions/s5-solar-system.html" data-start="80" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s6-milky-way-host" data-composition-id="s6-milky-way" data-composition-src="compositions/s6-milky-way.html" data-start="100" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/everest-to-galaxy/scenes/<id>), render.
4. Check the whole: node harness/check.js films/everest-to-galaxy, then npx hyperframes lint and npx hyperframes check in films/everest-to-galaxy.

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
