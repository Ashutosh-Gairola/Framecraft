# html-anime · sequence

Stickman Blade Fight

84s · 24fps · 2016 frames · 1920×1080 · 5 scenes
Color script and art style: as on every scene sheet (indigo, ink-cel).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-encounter | The Encounter | 0:00.00–0:12.00 | 12s | In an abandoned temple at night in a thunderstorm, Shadow waits on a broken stair, and Phantom appears on the opposite rooftop in a flash of blue lightning and draws both blades. | 2 |
| 2 | s2-first-clash | First Clash | 0:12.00–0:32.00 | 20s | Phantom dashes in a blue streak and slashes; Shadow pivots past it, spins, and his crimson katana slams into Phantom's crossed blades in a burst of red and blue sparks that shatters the roof tiles. | 0 |
| 3 | s3-blades-of-the-storm | Blades of the Storm | 0:32.00–0:52.00 | 20s | Phantom rushes in a zigzag of three blue afterimages; Shadow closes his eyes, blocks the real strike, and answers with a full-body spinning slash whose crimson wave throws Phantom through a wooden pillar. | 1 |
| 4 | s4-ultimate-techniques | Ultimate Techniques | 0:52.00–1:12.00 | 20s | Shadow raises his blade and a burning crimson crescent moon forms behind him; Phantom rises in a column of blue lightning, crossing his blades in an X, and the two ultimate attacks collide in a shockwave that tears the storm clouds open. | 2 |
| 5 | s5-final-frame | The Final Frame | 1:12.00–1:24.00 | 12s | In the smoking courtyard Phantom rises from his knees and makes one final dash; the two silhouettes pass each other, a thin red line flashes across the screen, and one blade falls to the stone. | 0 + card |

## Cast (shared)
- Shadow — follows a reference: A black stickman wielding a crimson energy katana. Fast, aggressive, unpredictable. Build films/stickman-blade-fight/design/shadow.html from it.
- Phantom — follows a reference: A white stickman wielding two electric-blue blades. Precise, defensive, and incredibly fast. Build films/stickman-blade-fight/design/phantom.html from it.

## Build
One bible and one design folder for the whole sequence: films/stickman-blade-fight/bible.md, films/stickman-blade-fight/design/.
Each scene is a sub-composition: films/stickman-blade-fight/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/stickman-blade-fight/index.html (data-composition-id="stickman-blade-fight", data-duration="84") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-encounter-host" data-composition-id="s1-encounter" data-composition-src="compositions/s1-encounter.html" data-start="0" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-first-clash-host" data-composition-id="s2-first-clash" data-composition-src="compositions/s2-first-clash.html" data-start="12" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-blades-of-the-storm-host" data-composition-id="s3-blades-of-the-storm" data-composition-src="compositions/s3-blades-of-the-storm.html" data-start="32" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-ultimate-techniques-host" data-composition-id="s4-ultimate-techniques" data-composition-src="compositions/s4-ultimate-techniques.html" data-start="52" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-final-frame-host" data-composition-id="s5-final-frame" data-composition-src="compositions/s5-final-frame.html" data-start="72" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/stickman-blade-fight/scenes/<id>), render.
4. Check the whole: node harness/check.js films/stickman-blade-fight, then npx hyperframes lint and npx hyperframes check in films/stickman-blade-fight.

## Crew
1. Director — skills/html-anime-director/SKILL.md — the sheet, the gates, the final review
2. Designer — skills/html-anime-designer/SKILL.md — cast and props: model sheet example first, or follow the reference
3. Art — skills/html-anime-art/SKILL.md — the style, the backgrounds, the color roles
4. Motion — skills/html-anime-motion/SKILL.md — key poses for every prop and action
5. Cameraman — skills/html-anime-cameraman/SKILL.md — size, angle, layout, the move
6. Staff — skills/html-anime-staff/SKILL.md — keys, inbetweens, correction, finishing (with cel and timing)
7. Voice — skills/html-anime-voice/SKILL.md — casting, emotion, the generated lines, mouth shapes
8. Render — skills/html-anime-render/SKILL.md — the HyperFrames file and the gates
