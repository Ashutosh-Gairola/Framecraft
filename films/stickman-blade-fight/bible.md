# Stickman Blade Fight — bible

The film's design contract. Drawn by `build/build.mjs`: every pose comes from its stick rig, so the model sheets in `design/` are the film's own drawings.

## Cast

### Shadow

- Kind: notes reference — "A black stickman wielding a crimson energy katana. Fast, aggressive, unpredictable."
- Model sheet: `design/shadow.html`
- Silhouette: a stick figure, 15px limbs at scale 1, round head 27px; a long red blade breaking the silhouette
- Paints: body `hair`, rim `accent`, blade `accent` with a `line` core, grip `hair`
- Filled in (not in the notes): no face, one eye slit in `accent`; a rim so a black figure reads on a night sky
- Never change: red rim, red blade, black body
- Voice: male, Daniel; cold (scene 1), angry (scene 4)

### Phantom

- Kind: notes reference — "A white stickman wielding two electric-blue blades. Precise, defensive, and incredibly fast."
- Model sheet: `design/phantom.html`
- Silhouette: a stick figure, white; two short blades, crossed when he defends
- Paints: body `line`, rim `volt`, blades `volt` with a `line` core, grips `hair`
- Filled in: no face, one eye slit in `volt`
- Never change: blue rim, twin blades, white body
- Voice: male, Rishi; resolve (scenes 1, 4), joy (scene 3)

## Props

### Crimson katana

- 175px at scale 1 (about 0.5 of the figure). Pivot: the front hand. Glow is a flat 30% polygon, never a blur.

### Twin blades

- 128px each. Pivot: each hand. Crossed into an X to block.

## Art

- Style: ink-cel, with the style reference: stickman silhouettes, no faces, glowing blades as flat light shapes, speed lines, impact frames
- Color roles: `sky`/`ink` the storm; `hair` the temple and trees; `moon` lightning and the moon; `accent` Shadow and his energy; `volt` Phantom and his energy; `line` Phantom's body, rain, flashes; `skin` cherry petals
- Value plan: the fighters are the brightest shapes in every shot except a lightning frame
- Light: lightning from the upper right, the blades themselves
- Shape language: Shadow arcs and crescents; Phantom straight lines and X shapes
- Wind: rain slants 18° to the left in every shot

## Motion

Cards: `blade.md`, `strike.md`, `locomotion.md`, `effects.md`, `cloth-hair.md` (no cloth: stickmen).

```
Scene 1 sakuga: Phantom draws both blades — blade.md → Draw
  K1 crouch 5.35 · K2 anticipation 6.20 · smear 6.70 (2f, ones) · K4 out 6.78 (sparks, shake) · K5 stance 8.00
Scene 2 sakuga: cross-blade counter — blade.md → Cut, Parry and clash
  K1 coil 9.00 · K2 swing smear 9.60 · K3 contact 9.77 (flash 2f, sparks, ring, shake) · K4 slide 11.60 · K5 recover 12.20
Scene 3 sakuga: afterimage rush, block, crimson spiral — locomotion.md → Dodge; blade.md → Cut
  K1–K3 afterimages 9.00–9.70 · K4 block 10.40 (clang) · K5 spin smear 11.10 · K6 follow 11.23 · K7 pillar breaks 12.00
Scene 4 sakuga: Thunder Gate meets Crimson Moon — effects.md → Light, Impact flash
  K1 brace · K2 lightning column 9.60 · K3 X trail 10.10 · K4 Shadow's arc 10.50 · K5 silence 11.00 · K6 DOOM 11.50
Scene 5 sakuga: the final pass — locomotion.md → Run; effects.md → Light
  K1 rise · K2 dash 5.50 · K3 streak 5.90 · K4 passing (held 1.2s: slow motion) · K5 past 7.20 · red line 7.60
```

## Layout

| Scene | Shots (size · move) |
| --- | --- |
| 1 | wide aerial · push / medium on the stair · pan / low roof, moon behind · locked + shake / split close-up of both heads · locked |
| 2 | wide courtyard · push / medium dash · pan / close coil · locked / medium clash · shake / medium split · locked / wide · locked |
| 3 | wide landing · push / medium charge-up · pan / close Phantom (rain frozen) · locked / medium rush · shake / midair against the moon · locked / wide · locked |
| 4 | wide breathing · push / extreme close on the grip · pan / wide crescent · locked / wide collision · shake / overhead spiral · locked / white · locked |
| 5 | wide smoke · push / close on the sword · pan / medium pass · locked / wide, the card · locked |
