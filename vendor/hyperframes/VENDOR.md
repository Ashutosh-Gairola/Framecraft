# Vendored: HyperFrames agent skills

From [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), commit `4371981b740d92f70e520cfbec34db68a1c93434` (2026-10-21), Apache-2.0 (see `LICENSE` here).

Copied:

- `skills/hyperframes/SKILL.md` and `skills/hyperframes/references/**/*.md` — the render contract and the engine references
- `skills/hyperframes-cli/SKILL.md` and `skills/hyperframes-cli/references/*.md` — `lint`, `check`, `snapshot`, `preview`, `render`

Left out: `skills/hyperframes/assets/frame-presets/` (brand presets for motion graphics, not anime) and `skills/hyperframes/scripts/` (map baking and plugin helpers). Links to those files inside the copied text go nowhere here.

The files are unedited. Where they disagree with `skills/html-anime-*`, the html-anime skill wins for an anime film:

- 24 fps, rendered with `--fps 24`. Not the 30 fps default.
- Characters cut in on a color dip. They do not fade, blur, or slide in.
- Motion is drawing swaps on twos, not one eased tween per element. Motion blur is a drawn smear, not a CSS filter.
- A short under 30 seconds is one `index.html`, not one sub-composition per scene.

Refresh: re-copy the same paths from a newer commit and update the commit line above. `npx hyperframes skills update` installs the live versions globally instead.
