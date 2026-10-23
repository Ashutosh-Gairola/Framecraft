# html-anime · sequence

Mountain Shrine

80s · 24fps · 1920 frames · 1920×1080 · 4 scenes
Color script and art style: as on every scene sheet (noon, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-above-the-clouds | Above the Clouds | 0:00.00–0:20.00 | 20s | A drone glides slowly above a sea of white clouds at sunrise until a lush mountain peak rises through them with an ancient shrine on its summit, prayer flags lit gold. | 0 |
| 2 | s2-the-valley | The Valley | 0:20.00–0:40.00 | 20s | The camera flies forward low through the valley over pine forests, a winding river, a wooden bridge and a lake reflecting the peaks, with waterfalls in the mist and birds gliding past. | 0 |
| 3 | s3-the-shrine | The Shrine | 0:40.00–1:00.00 | 20s | The camera rises to the summit and slowly orbits the shrine, its carved roofs, glowing lanterns and wet stone steps against a panorama of misty Himalayan ranges. | 0 |
| 4 | s4-the-range | The Range | 1:00.00–1:20.00 | 20s | The camera pulls slowly up and back until the whole range is revealed, the shrine small above the clouds and snow peaks glowing under the morning sun. | 0 |

## Cast (shared)
No named cast. Any figure on screen is an original and gets a model sheet first.

## Build
One bible and one design folder for the whole sequence: films/mountain-shrine/bible.md, films/mountain-shrine/design/.
Each scene is a sub-composition: films/mountain-shrine/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/mountain-shrine/index.html (data-composition-id="mountain-shrine", data-duration="80") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-above-the-clouds-host" data-composition-id="s1-above-the-clouds" data-composition-src="compositions/s1-above-the-clouds.html" data-start="0" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-the-valley-host" data-composition-id="s2-the-valley" data-composition-src="compositions/s2-the-valley.html" data-start="20" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-the-shrine-host" data-composition-id="s3-the-shrine" data-composition-src="compositions/s3-the-shrine.html" data-start="40" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-the-range-host" data-composition-id="s4-the-range" data-composition-src="compositions/s4-the-range.html" data-start="60" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/mountain-shrine/scenes/<id>), render.
4. Check the whole: node harness/check.js films/mountain-shrine, then npx hyperframes lint and npx hyperframes check in films/mountain-shrine.

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
