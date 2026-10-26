# Midnight Velocity — bible

A 3D film (`skills/html-anime-3d-actor/SKILL.md`): seven scenes, 96 s, all drawn by `assets/world.js` from one continuous world at film time. The car's motion is in `assets/motion.js`; research is in `references.md`.

## Beats

| Time | Beat | Camera |
| --- | --- | --- |
| 0–12 | The reveal: the car waits on the rain-wet street; the engine starts at 8.6 s, two blips | Glides from the headlight along the wheel and flank to a low front three-quarter |
| 12–20 | The launch: wheelspin, spray, a pop on each upshift | Rear wheel close, then low at the nose as it charges, then a side mount |
| 20–40 | The neon boulevard at full speed | Ultra-low front, profile, rear chase, a drone, then the driver's hands as he shifts into sixth (37.2 s) |
| 40–52 | The LED tunnel, a long right-hand curve, and the exposure flash at the exit | Behind, alongside, the hood |
| 52–64 | The drift: braking, downshifts, about 35° of slip on countersteer, smoke, then the relaunch | A low world camera at the corner, then an orbit round the slide |
| 64–84 | The elevated highway, light trails, under a skybridge | Bumper cam, a rising aerial sweep, a flank chase |
| 84–96 | The overlook: it stops under the skyline, idling, dripping | A held wide shot, then the front wheel, pulling round to the rear three-quarter against the city |

## The car

Original and unbadged: a lofted superellipse body with flared arches, a raked glass canopy over an open cockpit, a carbon splitter, skirts, diffuser and wing, and a smoked headlight housing with a thin light guide and twin projectors. A full-width rear light bar, quad exhausts, cyan underglow, and 20-inch ten-spoke wheels with steering and suspension squat.

## Motion

Cards: `locomotion.md` (vehicles: weight transfer, wheel roll), `effects.md` (rain, spray, smoke, light). Everything moves from film time:

- Speed follows `motion.js`, and wheel roll follows distance.
- The body squats under acceleration and dives under braking.
- The drift is a slip angle over the path heading, with the front wheels countersteering.
- The camera follows monotone keys and orbits round the car rather than passing through it.

## Paints

Neon cyan `#29e0ff`, violet `#8a3cff` and electric blue `#2a6bff` on true black. Warm windows and sodium lamps for contrast, red tail lights.

## Sound

`build/sound.mjs` synthesizes three beds from the motion model:

- **car.wav:** the V10 harmonics following the rpm, brighter under load; ignition cuts and pops at each shift; turbo and blow-off; tyre squeal at the launch and the drift; road and spray noise; a reverb in the tunnel; muffled inside the cabin.
- **score.wav:** 120 bpm electronic. The beat drops at the launch, risers lead into the tunnel and out of the drift, and the pad plays alone at the end.
- **rain.wav:** rain, silent in the tunnel, and drips at the overlook.
