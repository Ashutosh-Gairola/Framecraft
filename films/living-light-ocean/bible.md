# The Living Light of the Ocean — production bible

## Cast and props
- **Green sea turtle**: green sea turtle model sheet at `design/green-sea-turtle.html`. Adult *Chelonia mydas*, broad oval shell, small head, long paddle foreflippers, shorter steering hind flippers, muted olive shell and pale underside. This is an animal, not a mascot.
- **School of fish**: small, consistent silver fish silhouettes with tapered bodies and forked tails; one coordinated school.
- **Plankton**: microscopic points; cyan flashes only briefly near movement, then fade.
- **Water**: a single ocean stage. Wet black sand at the coast becomes a continuous surface descent, open water, and deep darkness.

## Art
This film interprets the requested nature documentary in the repo's code-drawn anime medium. Painted-world backgrounds have layered navy washes without outlines; marine life uses restrained cel shapes with a hard ink shadow. Keep the near field sharp and dark, the distance hazy navy, and reserve `plankton` for tiny short-lived light. `shell` is limited to the turtle; `oceanlight` is a broad, restrained midwater wash; `moon` supplies surface glints and fish highlights. No red accent is used. Particles remain sparse at shore and denser only in the final wide reveal. No titles, captions, logos, or fantasy structures.

Paint roles: `sky` is ocean midground; `ink` is the black-point and deep water; `moon` is surface reflection and tiny highlights; `plankton` is the only cyan emission; `shell` marks the turtle carapace. Exposure holds true black; cyan highlights do not wash the frame. Shadows stay dark and localized; no full-frame glow or blur.

## Motion
A single camera path carries the five scene beats: low coastal tracking at 0–6s; skim and macro approach at 6–9s; pass through the waterline at 9–14s; drift among fish at 14–23s; follow the turtle at 23–32s; pull back and rise to the deep reveal at 32–40s. Each composition uses the corresponding segment of the same deterministic path, so adjacent endpoints match.

- Shore water rolls in slowly; foam and plankton travel with the wave. Water disturbance produces short cyan strokes that fade within about half a second.
- Plankton has individually seeded drift paths, subtle parallax, and disturbance-triggered pulses. No `Math.random()` or permanent glow trails.
- Fish hold a coherent group and bank through one shared arc; each tail oscillates subtly with a phase offset.
- Turtle swim cycle: 48 frames at 24fps. Broad foreflipper power stroke, eased recovery, smaller hind flippers steering. The shell and head remain stable; the turtle glides forward and does not flap like a bird.
- Bubbles rise during the water entry and descent, bending slightly with current.

## Layout and camera
16:9, 1920×1080. A continuous wide-lens journey with strong near/mid/far parallax. Shoreline begins at sand level with horizon in upper third. The waterline passes over the lens around 10s; maintain a recognizable wavering surface overhead during descent. Fish move screen-left to right; turtle crosses toward screen-right. The final move pulls backward and tilts toward the distant surface; turtle ends as a small silhouette below center. The luminous points are not the brightest shape in every frame; keep a clear dark silhouette.

## Sound
No voice or captions. Start with soft surf and faint night air. Introduce a calm wonder score quietly. At the waterline, crossfade surf into muffled underwater ambience with a few delicate bubbles. Keep a low ocean bed under the fish and turtle. Let the score open slightly for the final reveal and end on a quiet, peaceful tail.

## Timing and delivery
40 seconds, 24fps, 960 frames, 16:9. Five 8-second sheets establish the beats. They compress the detailed 6/6/6/7/7/8-second outline into five equal scene units; shoreline and macro share the opening unit, and the fish/turtle/deep beats each have their own unit. The camera continuity in the render joins those units into one journey.
