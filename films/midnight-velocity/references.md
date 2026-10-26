# Midnight Velocity — references

Research before drawing. The images are for study only: they stay in references/ (git-ignored) and are never traced or shipped. The car is an original design. It borrows the proportions of a mid-engined V10 supercar but has no badges or brand.

## Subjects

| Subject | Sources | Shape and proportion | Colours (sampled → paint) | Movement | Do not change |
| --- | --- | --- | --- | --- | --- |
| Widebody supercar | [Lamborghini Huracán (Wikipedia)](https://en.wikipedia.org/wiki/Lamborghini_Hurac%C3%A1n): wheelbase 2,620 mm, length about 4.46–4.57 m, height about 1.17 m; 20-inch wheels; [Audi R8 V10 review (MotorBeam)](https://www.motorbeam.com/2017-audi-r8-v10-review-test-drive/2) and [Motor Authority](https://www.motorauthority.com/news/1031151_audi-releases-new-video-and-images-for-v10-fsi-r8) for the V10's character | 4.5 m long, 1.96 m wide, 1.17 m tall, 2.62 m wheelbase, front track 1.68 m and rear 1.72 m; a cab-forward canopy, a long rear deck, flared arches, a low splitter, a diffuser and a wing | Deep electric-blue paint that picks up violet and cyan reflections; carbon aero; smoked glass | 0–100 km/h in about 3.5 s; a 7-speed with upshifts near 8,300 rpm; squat on launch, dive under braking | No badges, no lettering |
| Drift | Sideslip on a closed corner | Tail out about 35°, countersteer about 0.55 × slip | — | Snaps in over about 0.5 s, holds through the apex, grip returns over about 0.9 s | — |
| Neon street | [Hong Kong night street (Commons)](https://commons.wikimedia.org/wiki/File:Hong_Kong_night_street_2.jpg) | Signs project over the street in stacked boxes, with towers beyond | #602b24, #9e3f38, #287ba9, with near-black at 25% | — | No text on signs |
| Night skyline | [Tokyo (Commons)](https://commons.wikimedia.org/wiki/File:Tokyo_(16228516431).jpg) | Window grids, partly lit, set in dark facades | #0c0814 (29%), #1a4c68, #4197a9, #a8cfcb | — | — |
| Light trails | [Provincial Highway 74A at night (Commons)](https://commons.wikimedia.org/wiki/File:Night_view_of_the_Provincial_Highway_74A_on_23_December_2016.jpg) | Ribbons of red tail lights and white heads along a curving elevated road | #070301 to #180d03 (about 53%), sodium #b87b20 | — | — |

## Light and grade

The references are night scenes with near-black values over about half the frame, small saturated sources, and wet surfaces that double every light. The film keeps a true black point, a magenta-violet sky glow, cyan and violet neon, warm window light for contrast, red tails against white heads, and bloom on the brightest sources only.

## Movement references

- Engine and drive: `assets/motion.js` integrates speed into distance and derives gear, rpm and every shift from the same speed curve, so the picture and the sound share one clock.
- Wheel rotation follows distance ÷ wheel radius; the rears over-spin at the launch and through the drift.
