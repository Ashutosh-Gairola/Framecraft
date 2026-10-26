// html-anime — the landing page: film cards (hover preview, click to play), the crew, reveals.

const FILMS = [
  { id: "life-on-earth", title: "Life on Earth", dur: "2:00", kind: "3d", tag: "three.js · one shot", big: true, text: "A coral reef, up through the surface to the coast, farmland, a city with live traffic, a forest, and golden hour — all on one map, in one continuous shot." },
  { id: "midnight-velocity", title: "Midnight Velocity", dur: "1:36", kind: "3d", tag: "three.js · 7 scenes", text: "A widebody supercar through a rain-wet neon city: launch, LED tunnel, drift, elevated highway. Engine and score synthesized from the car's motion." },
  { id: "mountain-shrine", title: "Mountain Shrine", dur: "1:20", kind: "3d", tag: "three.js · one shot", text: "Above the clouds and down a valley to a five-tiered temple; pilgrims on the kora, monks, a yak train, prayer flags." },
  { id: "everest-to-galaxy", title: "Everest to the Galaxy", dur: "2:00", kind: "3d", tag: "three.js · one shot", text: "From Everest at sunrise through a volcano's plume to Earth, the planets, and the Milky Way." },
  { id: "living-light-ocean", title: "The Living Light of the Ocean", dur: "0:40", kind: "3d", tag: "three.js · one shot", text: "A night beach where only the waves glow, a dive under the surf, plankton lit by a sardine school and a sea turtle." },
  { id: "sky-city-duel", title: "Sky City Duel", dur: "1:44", kind: "2d", tag: "2D anime · 6 scenes", text: "An aerial duel over a floating city, with cloth and hair physics, a dragon and a phoenix." },
  { id: "character-test", title: "Character test", dur: "0:12", kind: "lab", tag: "lab · characters", poster: "media/character-test.jpg", text: "The character system: a person from a reference photo, the same design in anime, and Goku." },
  { id: "film", title: "Kokuyō", dur: "1:20", kind: "2d", tag: "2D anime · reference", poster: "media/city.jpg", text: "The reference film from the original html-anime project: a cracked moon, rain, two blades." },
];

const CREW = [
  ["🔎", "Research", "actor", "Web references for every figure, animal and place before anything is drawn; sampled colours."],
  ["🎬", "Director", "director", "Refines the brief, builds the sheet or a sequence, holds the gates, signs off."],
  ["✏️", "Designer", "designer", "Model sheets first; a reference is followed exactly."],
  ["🧍", "Character", "character", "3D people as one sculpted, rigged body — realistic or anime — with a turnaround gate."],
  ["🎭", "Actor", "actor", "Appearance, wardrobe with cloth physics, a movement profile, a pose library."],
  ["🎨", "Art", "art", "Style, colour roles, value, and a vivid grade with true blacks."],
  ["🌀", "Motion", "motion", "Key poses, grips and frame counts for blades, gaits, cloth, fire and water."],
  ["🎥", "Cameraman", "cameraman", "Shot size, angle, lens, and the one move per shot."],
  ["🖌️", "Staff", "staff", "Layout, keys, inbetweens, correction against the model sheet."],
  ["⏱️", "Timing", "timing", "Twos and ones, easing, arcs, anticipation, smears, holds."],
  ["🎙️", "Voice", "voice", "A voice per character, any language, with emotion and a mouth track."],
  ["🔊", "Sound", "sound", "Clangs, engines, surf, thunder and a score — synthesized and cued to the picture."],
  ["🧊", "3D Actor", "3d-actor", "three.js worlds: terrain, cities, oceans, crowds, traffic, real camera moves."],
  ["🎞️", "Render", "render", "Deterministic HyperFrames compositions at 24 fps, with the gates."],
  ["✂️", "Editor", "editor", "Reviews every render: stutter, cuts, colour, loudness; then masters it."],
  ["🖍️", "Cel", "cel", "Flat cels in SVG and HTML: line, local colour, one hard shadow."],
];

const grid = document.querySelector("#grid");
for (const f of FILMS) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `card reveal${f.big ? " big" : ""}`;
  card.dataset.kind = f.kind;
  card.dataset.id = f.id;
  const poster = f.poster ?? `media/${f.id}.jpg`;
  card.innerHTML = `
    <div class="thumb">
      <img src="${poster}" alt="${f.title}" loading="lazy" />
      <video muted loop playsinline preload="none"></video>
      <span class="badge">${f.tag}</span>
      <span class="dur">${f.dur}</span>
      <div class="play"><span>▶</span></div>
    </div>
    <div class="info"><h3>${f.title}</h3><p>${f.text}</p></div>`;
  grid.append(card);
  const v = card.querySelector("video");
  const hoverable = window.matchMedia("(hover: hover)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hoverable) {
    card.addEventListener("mouseenter", () => {
      if (!v.src) v.src = `media/${f.id}.mp4#t=${f.id === "film" ? 20 : 8}`;
      const p = v.play();
      if (p) p.then(() => card.classList.add("playing")).catch(() => {});
    });
    card.addEventListener("mouseleave", () => {
      v.pause();
      card.classList.remove("playing");
    });
  }
  card.addEventListener("click", () => open(f));
}

// Filters.
for (const b of document.querySelectorAll(".filter button")) {
  b.addEventListener("click", () => {
    for (const x of document.querySelectorAll(".filter button")) x.classList.toggle("on", x === b);
    for (const c of document.querySelectorAll(".card")) c.classList.toggle("hide", b.dataset.f !== "all" && c.dataset.kind !== b.dataset.f);
  });
}

// The player.
const dlg = document.querySelector("#player");
const pv = dlg.querySelector("video");
function open(f) {
  pv.src = `media/${f.id}.mp4`;
  pv.poster = f.poster ?? `media/${f.id}.jpg`;
  dlg.querySelector("h3").textContent = `${f.title} · ${f.dur}`;
  dlg.querySelector("p").textContent = f.text;
  dlg.showModal();
  const p = pv.play();
  if (p) p.catch(() => {});
}
dlg.querySelector(".close").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) dlg.close();
});
dlg.addEventListener("close", () => pv.pause());
for (const a of document.querySelectorAll("[data-play]")) {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    open(FILMS.find((f) => f.id === a.dataset.play));
  });
}

// The crew.
const crew = document.querySelector("#crew-grid");
for (const [icon, name, skill, text] of CREW) {
  const a = document.createElement("a");
  a.className = "reveal";
  a.href = `https://github.com/Ashutosh-Gairola/html-anime-rework/blob/main/skills/html-anime-${skill}/SKILL.md`;
  a.innerHTML = `<b><i>${icon}</i>${name}</b><span>${text}</span>`;
  crew.append(a);
}

// Copy the start command.
document.querySelector(".copy").addEventListener("click", (e) => {
  const text = document.querySelector("#cmd").textContent.replace(/\s+#.*$/m, "");
  navigator.clipboard?.writeText(text).then(() => {
    e.target.textContent = "Copied";
    setTimeout(() => (e.target.textContent = "Copy"), 1500);
  });
});

// Reveal on scroll.
for (const el of document.querySelectorAll(".steps li, .split > *, .term, .head")) el.classList.add("reveal");
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries)
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
  },
  { threshold: 0.12 },
);
for (const el of document.querySelectorAll(".reveal")) io.observe(el);
