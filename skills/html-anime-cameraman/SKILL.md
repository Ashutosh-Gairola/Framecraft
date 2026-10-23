---
name: html-anime-cameraman
description: Lay out and shoot a code-drawn anime — shot size, camera angle, lens feel, eye placement, look room, layered depth, the one allowed camera move per shot (push, pan, locked, impact shake), and cutting on the action in 16:9 or 9:16. Use when laying out an html-anime shot, choosing an angle, placing a face, moving the camera, or cutting between shots.
---

# Cameraman

Layout first, then the lens, then the move. A shot has one move, the one printed on the sheet.

## Size

| Size | The subject | Use |
| --- | --- | --- |
| Wide | The world. The figure is under a fifth of the frame height, or absent. | Establish, aftermath |
| Medium | The body, knees or waist up. The pose reads in silhouette. | Approach, sakuga |
| Close-up | The face, chin to hairline filling half the frame height or more. | Turn, button |

Get closer by cutting. Each cut changes size by at least one step, or changes angle by at least 30°.

## Angle

- **Eye level**: the default. Neutral.
- **Low angle** (horizon in the lower third, figure above it): power, threat, the moment of the verb.
- **High angle** (horizon in the upper third, figure below it): small, alone, after a loss.
- **Dutch** (horizon tilted 8–15°): only inside the sakuga shot, only if the action is violent.

Draw the angle. Move the horizon and redraw the forms; do not rotate a flat drawing.

## Lens feel

Done with scale, not filters:

- **Wide lens**: strong size difference between near and far things, the floor and sky show, lines converge fast. Action and space.
- **Long lens**: near and far layers almost the same size, the background is a flat wall, little floor. Faces, tension, the button.

## Placement

- Eyes sit on a third. Leave room in front of the gaze, about a third of the frame width.
- Do not center every face. Center only a frontal stare or a symmetrical threat.
- The brightest shape and the face are on different thirds, or they overlap on purpose.
- Screen direction holds across a cut: a character moving right keeps moving right in the next shot. A prop held in the right hand stays in the right hand.

## Frame

- **16:9** is 1920×1080. Letterbox bars (56px top, 80–100px bottom) are part of the frame if you use them. Keep faces out of the bars. Type may sit in the bottom bar.
- **9:16** is 1080×1920, composed tall. Head in the upper half. Type in the lower fifth. Stack depth vertically: sky high, figure middle, foreground low. Never crop a wide picture into a tall frame.
- Keep the subject inside the 90% action-safe box and type inside the 80% title-safe box.

## Depth

Back to front: sky, far silhouette, mid figure, weather, close figure, type. Rain may sit between the world and a close figure so the close-up feels nearer than the weather. A foreground shape cut by the frame edge (a rail, a shoulder) makes depth for free.

## Moves

The sheet gives each shot one of these. Do not add a second.

- **push**: the shot's layer scales 100% to 106% across the whole shot, `power1.inOut`. The transform origin is the subject, not the frame center.
- **pan**: the background layer slides at most 8% of the frame width across the shot, `ease: "none"`. With layers (multiplane), far layers move 0.3×, mid 0.6×, near 1×. The figure stays.
- **locked**: nothing moves but the drawings.
- **shake**: locked, plus one impact shake on the contact frame. Six `tl.set` calls, one per frame on ones, on the whole picture layer (not the type), with offsets written out and decaying, for example x `18, -14, 10, -6, 3, 0` and y `-10, 8, -5, 3, -1, 0`.

Never: a zoom past 106%, a rotation, a camera move on a held character to make it look alive, an ease on a shake.

## Cut

Cut on the action. The settle is the first frames of the next shot, not the tail of this one. The cut itself is the color dip (see render). A match cut, where a shape in the outgoing shot lands where a shape sits in the incoming one (the moon becomes an eye, the blade becomes a horizon), is worth more than any transition.

## Done

The bible's Layout section has, per shot: size, angle, lens feel, where the eyes and the brightest shape sit, the move with its numbers, and the screen direction.
