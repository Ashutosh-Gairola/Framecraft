# Sky City Duel — bible

The film's design contract. Drawn by `build/build.mjs` with `build/warriors.mjs` on the shared kit (`harness/draw/kit.js`); the model sheets in `design/` are rendered from the same renderer and poses as the film.

## Cast

### Kuro

- Kind: notes reference — "Silver-haired swordsman, long black coat with glowing crimson markings, katana forged from dark energy."
- Model sheet: `design/kuro.html`
- Silhouette: spiked silver hair streaming back; long coat whose tails trail the wind and his motion; a long black blade with a crimson edge
- Proportion: 7 heads (BONES: torso 112, head 25, thigh 88, shin 86)
- Paints: hair `moon` with a `line` highlight, coat `hair`, trousers `ink`, markings `accent`, eyes `accent`, skin `skin`; blade `hair` with `accent` edge and glow
- Filled in: crimson eyes (to match the markings), black gloves
- Never change: silver hair, red markings, black blade

### Seren

- Kind: notes reference — "Female warrior, flowing white hair, golden eyes, elegant black-and-gold armor, a pair of luminous celestial blades."
- Model sheet: `design/seren.html`
- Silhouette: long white hair streaming behind; black cape; armored skirt plates; two short gold blades
- Paints: hair `sclera`, armor `hair` with `practical` trim, legs `ink`, eyes `iris`, skin `skin`; blades `practical` with a `line` core and glow
- Filled in: a gold circlet, pauldron on the leading arm, gold knee guard
- Never change: white hair, gold trim, gold eyes, two blades

## Props and powers

- Dark-energy katana: 190px at scale 1, pivot at the front hand.
- Celestial blades: 150px each, pivot at each hand.
- Golden spectral wings: seven feather blades a side, `practical` at falling opacity, unfold from the shoulders.
- Energy swords: small `practical` blades with a `line` edge; dozens orbit and launch.
- Crimson dragon: a `hair` body along a sine spine with an `accent` rim, spikes, horns, and lightning arcs.
- Golden phoenix: `practical` wings with `iris` feather lines, a `line` body, tail streamers, three burning rings.

## Art

- Style: painted-world — cel characters with one outer `ink` contour; painted backgrounds of stacked flat washes; atmospheric perspective by washing far islands into `sky`.
- Color roles: `sky`/`ink` the storm; `moon` the horizon glow and lightning; `accent` Kuro's power; `practical` Seren's power and the city windows; `line` impact frames and highlights.
- Value: the fighters and their weapons hold the strongest contrast; far islands sit in the middle values.
- Light: lightning on the horizon, then each fighter's own aura; the collision lights the sky red (left) and gold (right).
- Wind: from the right, blowing left (-35° to -70°), strengthening as the auras rise.

## Motion

Cards: `blade.md`, `strike.md`, `locomotion.md`, `cloth-hair.md`, `effects.md`. Full animation: keys inbetweened by `act()`, fast moves on ones, holds breathing; coat, cape, and hair flow from the wind and the hip's velocity.

## Layout

| Scene | Shots |
| --- | --- |
| 1 | extreme wide city · push / two-shot on the platform · pan / auras flare · locked / split eye close-ups · push |
| 2 | stance and vanish · push / reappear-slash-block · locked + shake / the bind, close · locked / shatter · shake / extreme wide fall · pull / across the gap · locked |
| 3 | the leap · push / midair clashes · pan / aerial kick · rotating / exchange · rotating + shake / extreme wide · push / Seren gathers light · locked |
| 4 | wings · push / swords appear · pan / barrage and the run · locked / deflections and the circular slash · shake / the ring breaks the swarm · locked / across the sky · locked |
| 5 | charge · push / the dragon · pan / the phoenix · push / collision · shake / the lit sky · pull / the light fades · locked |
| 6 | descent · push / exhausted · pan / eyes, then the rush · shake / white |
