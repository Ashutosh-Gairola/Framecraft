# html-anime · sequence

Sky City Duel

104s · 24fps · 2496 frames · 1920×1080 · 6 scenes
Color script and art style: as on every scene sheet (indigo, painted-world).

## Scenes
Each scene keeps every sheet rule: its own runtime, one sakuga shot, its own lines. Its full sheet is scenes/<id>/sheet.md.

| # | Id | Title | Time | Length | Scene | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | s1-sky-city | The Sky City | 0:00.00–0:12.00 | 12s | Above the clouds a shattered futuristic city floats in a lightning storm; Kuro and Seren face each other on a cracked platform as wind tears at coat and hair and their auras flare. | 0 |
| 2 | s2-first-strike | First Strike | 0:12.00–0:32.00 | 20s | Kuro vanishes in a burst of crimson and reappears behind Seren with a horizontal slash; she blocks with both blades and the clash of sparks sends a shockwave that shatters the platform. | 0 |
| 3 | s3-among-the-ruins | Among the Ruins | 0:32.00–0:52.00 | 20s | They leap between floating ruins trading lightning-fast strikes, an aerial kick, a spinning attack and a midair counter, every clash knocking stone into the clouds. | 0 |
| 4 | s4-celestial-barrage | Celestial Barrage | 0:52.00–1:12.00 | 20s | Seren spreads golden spectral wings and launches dozens of floating energy swords; Kuro sprints across collapsing structures deflecting them, then channels crimson lightning into a devastating circular slash. | 0 |
| 5 | s5-dragon-and-phoenix | Dragon and Phoenix | 1:12.00–1:32.00 | 20s | Both charge their ultimates: Kuro summons a crimson dragon of shadow and lightning, Seren a radiant golden phoenix ringed with burning celestial rings, and they collide above the city in an explosion of red and gold that lights the whole sky. | 0 |
| 6 | s6-last-clash | The Last Clash | 1:32.00–1:44.00 | 12s | As the light fades both warriors descend onto opposite sides of the ruined platform, exhausted, weapons glowing faintly; a close-up of their eyes, a sudden rush toward each other, and a brilliant white flash. | 0 |

## Cast (shared)
- Kuro — follows a reference: Silver-haired swordsman, long black coat with glowing crimson markings, katana forged from dark energy. Build films/sky-city-duel/design/kuro.html from it.
- Seren — follows a reference: Female warrior, flowing white hair, golden eyes, elegant black-and-gold armor, a pair of luminous celestial blades. Build films/sky-city-duel/design/seren.html from it.

## Build
One bible and one design folder for the whole sequence: films/sky-city-duel/bible.md, films/sky-city-duel/design/.
Each scene is a sub-composition: films/sky-city-duel/compositions/<id>.html, a <template> whose root has data-composition-id="<id>", with times local to the scene and asset paths root-relative (assets/…).
The root films/sky-city-duel/index.html (data-composition-id="sky-city-duel", data-duration="104") mounts them, and registers an empty paused timeline:

```html
  <div id="s1-sky-city-host" data-composition-id="s1-sky-city" data-composition-src="compositions/s1-sky-city.html" data-start="0" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s2-first-strike-host" data-composition-id="s2-first-strike" data-composition-src="compositions/s2-first-strike.html" data-start="12" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s3-among-the-ruins-host" data-composition-id="s3-among-the-ruins" data-composition-src="compositions/s3-among-the-ruins.html" data-start="32" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s4-celestial-barrage-host" data-composition-id="s4-celestial-barrage" data-composition-src="compositions/s4-celestial-barrage.html" data-start="52" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s5-dragon-and-phoenix-host" data-composition-id="s5-dragon-and-phoenix" data-composition-src="compositions/s5-dragon-and-phoenix.html" data-start="72" data-duration="20" data-track-index="1" data-width="1920" data-height="1080"></div>
  <div id="s6-last-clash-host" data-composition-id="s6-last-clash" data-composition-src="compositions/s6-last-clash.html" data-start="92" data-duration="12" data-track-index="1" data-width="1920" data-height="1080"></div>
```

Scenes join at a cut: each scene's button fades its last 8 frames to ink, and the next scene opens from its own hero frame. A root-level #dip on a higher track may straddle a seam instead, for a color dip between scenes.

## Order
1. Director: this plan, then every scene sheet.
2. Designer: the shared bible and model sheets, once, before any scene.
3. For each scene in order: art, motion, cameraman, staff, voice (node harness/voice.js films/sky-city-duel/scenes/<id>), render.
4. Check the whole: node harness/check.js films/sky-city-duel, then npx hyperframes lint and npx hyperframes check in films/sky-city-duel.

## Crew
1. Director — skills/html-anime-director/SKILL.md — the sheet, the gates, the final review
2. Designer — skills/html-anime-designer/SKILL.md — cast and props: model sheet example first, or follow the reference
3. Art — skills/html-anime-art/SKILL.md — the style, the backgrounds, the color roles
4. Motion — skills/html-anime-motion/SKILL.md — key poses for every prop and action
5. Cameraman — skills/html-anime-cameraman/SKILL.md — size, angle, layout, the move
6. Staff — skills/html-anime-staff/SKILL.md — keys, inbetweens, correction, finishing (with cel and timing)
7. Voice — skills/html-anime-voice/SKILL.md — casting, emotion, the generated lines, mouth shapes
8. Render — skills/html-anime-render/SKILL.md — the HyperFrames file and the gates
