# html-anime · sequence

Midnight Velocity

96s · 24fps · 2304 frames · 1920×1080 · 7 scenes
Color script and art style: as on every scene sheet (festival, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-reveal | The Reveal | 0:00.00–0:12.00 | 12s | A widebody supercar waits on a rain-soaked neon street; the camera slides from its headlight along the wheel and bodywork to a low front three-quarter; the engine starts, the lights flare, it revs. | 0 |
| 2 | s2-launch | The Launch | 0:12.00–0:20.00 | 8s | It launches: the rear tyre spins and throws water, flames on the gear change; a low front tracking shot as it races at the lens, then a side mount as the city blurs. | 0 |
| 3 | s3-boulevard | Neon Boulevard | 0:20.00–0:40.00 | 20s | Full speed down a broad neon boulevard past traffic, palms and billboards: ultra-low front, side profile, rear chase, an overhead drone, and the driver's hands on the wheel as he shifts. | 0 |
| 4 | s4-tunnel | The Tunnel | 0:40.00–0:52.00 | 12s | Into a long tunnel of cyan, purple and white LED strips; behind, then alongside, then a hood view as it curves; out into the city's light. | 0 |
| 5 | s5-drift | The Drift | 0:52.00–1:04.00 | 12s | At a closed-off city intersection it brakes, swings the tail out and drifts the corner on countersteer through smoke and mist, then grips and launches. | 0 |
| 6 | s6-highway | Elevated Highway | 1:04.00–1:24.00 | 20s | Up onto an elevated highway between glowing towers; bumper cam, then a rising aerial sweep along a broad curve through ribbons of red and white light, under a skybridge. | 0 |
| 7 | s7-finish | The Overlook | 1:24.00–1:36.00 | 12s | It sweeps onto a skyline overlook and stops under the city lights, idling; water drips; the camera pulls back from the front wheel to the car against the endless city. | 0 |

## Cast (shared)
No named cast. Any figure on screen is an original and gets a model sheet first.

## Build
One bible and one design folder for the whole sequence: films/midnight-velocity/bible.md, films/midnight-velocity/design/.
Each scene is a sub-composition: films/midnight-velocity/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/midnight-velocity/index.html (data-composition-id="midnight-velocity", data-duration="96") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-reveal-host" data-composition-id="s1-reveal" data-composition-src="compositions/s1-reveal.html" data-start="0" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-launch-host" data-composition-id="s2-launch" data-composition-src="compositions/s2-launch.html" data-start="12" data-duration="8" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-boulevard-host" data-composition-id="s3-boulevard" data-composition-src="compositions/s3-boulevard.html" data-start="20" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-tunnel-host" data-composition-id="s4-tunnel" data-composition-src="compositions/s4-tunnel.html" data-start="40" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-drift-host" data-composition-id="s5-drift" data-composition-src="compositions/s5-drift.html" data-start="52" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s6-highway-host" data-composition-id="s6-highway" data-composition-src="compositions/s6-highway.html" data-start="64" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s7-finish-host" data-composition-id="s7-finish" data-composition-src="compositions/s7-finish.html" data-start="84" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/midnight-velocity/scenes/<id>), render.
4. Check the whole: node harness/check.js films/midnight-velocity, then npx hyperframes lint and npx hyperframes check in films/midnight-velocity.

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
