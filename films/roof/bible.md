# Roof — bible

The film's design contract. Every drawing is corrected against this file and the model sheets in `design/`.

## Cast

### Ren

- Kind: original
- Model sheet: `design/ren.html` — approved: yes
- Silhouette: a long coat flaring from the hips; one lock falling past the right jaw. In the wide shot, a dark shape against the indigo sky.
- Proportion: 7 heads; oval head; large almond eyes, the far eye smaller in three-quarter
- Hair: two masses (back, right lock), three bang chunks, one hard sheen band in `moon` on the crown
- Costume: coat closed to the throat; a red cord at the collar
- Paints: hair → `hair`, skin → `skin`, eyes → `sclera` / `iris`, coat → `ink` with a `line` contour, cord → `accent`, blade → `moon` with a `line` edge
- Never change: the red cord, three bang chunks, the moon sheen
- Voice: male register, English, resolve

## Props

### Short blade

- Model sheet: `design/ren.html` (prop cell)
- Size: 2.6 heads
- Grip: right hand, index knuckle against the guard
- Pivot: the grip center
- Paints: handle `hair`, guard `accent`, blade `moon`, edge `line`

## Art

- Style: ink-cel
- Color roles: `sky` and `ink` the world; `moon` the brightest shape of the wide shot; `practical` the falling light and the windows; `accent` the moon's ring, the dip, and the cord (under 5% of any frame); `line` the rain and the contours
- Value plan: shot 1, a light moon on a middle sky over a dark city, Ren a light-edged dark shape. Shot 2, the falling light is the only bright thing. Shot 3, the face is the lightest large area, eyes hold the darkest dark beside the catchlight
- Light: the moon, upper right, in every shot
- Shape language: triangles — the roofline peaks, the bangs, the light's wedge
- Wind: none; rain falls straight down and slightly left

## Motion

```
Action: the moon opens (establish, 0.20–0.80)
Card: effects.md → Moon and sky events
Keys: ring appears with the moon at 0.20; 0.6s ease-in is the only tween on a drawing, the moon is not a character
Secondary: rain field on ones, finite repeat across the runtime

Action: Ren reaches for the falling light (sakuga, 2.40–6.00)
Card: handling.md → Reach and take; effects.md → Light and beams
Keys (on twos):
  K1 stand        0.80  hold — fig-a
  K2 anticipation 1.60  — fig-b, weight back, arm drawn in
  K3 reach        2.40  hold — fig-reach, arm on the arc to the light
  flare           2.50  — the light lands as one flat wedge, 2 drawings
Pivots: the arm at the shoulder
Contacts: both feet on the roof throughout

Action: Ren says the line (button, 6.00–8.00)
Voice: voice.json, J-cut from 5.917; mouth on twos from 6.00
Secondary: none. The face holds.
```

## Layout

| Shot | Size | Angle | Lens | Eyes / brightest shape | Move | Screen direction |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Establish | Wide | Eye level | Wide | Moon upper-right third; Ren lower-left third | push 100→106% from 0.20 | Ren faces right, toward the moon |
| 2 Sakuga | Wide, same layout | Eye level | Wide | The light's wedge crosses to Ren's hand | held from shot 1 (drawings move) | Reach goes up and right |
| 3 Button | Close-up | Eye level | Long | Eyes on the upper third, left of center; look room to the right | locked | Ren looks right |
