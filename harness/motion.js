/**
 * Motion reference cards. A card holds the key poses, contacts, grips, and
 * timing for one family of props or actions. The sheet lists every card whose
 * words appear in the scene or the props line.
 */

const CARDS = "skills/html-anime-motion/references";

export const MOTION = [
  {
    id: "blade",
    label: "Blades — draw, cut, parry, sheathe",
    words: ["blade", "sword", "katana", "knife", "dagger", "slash", "sheath", "parry", "duel", "saber", "spear", "naginata", "scythe"],
  },
  {
    id: "strike",
    label: "Strikes — punch, kick, clash, impact",
    words: ["punch", "kick", "fist", "strike", "hit", "clash", "fight", "brawl", "block", "impact", "slam"],
  },
  {
    id: "locomotion",
    label: "Locomotion — walk, run, jump, land, turn",
    words: ["walk", "run", "sprint", "dash", "jump", "leap", "land", "climb", "dodge", "roll", "chase", "step", "turn"],
  },
  {
    id: "handling",
    label: "Handling — hold, catch, throw, everyday tools",
    words: ["catch", "throw", "hold", "grab", "reach", "umbrella", "cup", "tea", "phone", "lantern", "brush", "book", "letter", "bag", "key", "hammer", "camera", "flower"],
  },
  {
    id: "ranged",
    label: "Ranged — bow, thrown weapon, aim",
    words: ["bow", "arrow", "aim", "shoot", "kunai", "shuriken", "gun", "pistol", "rifle", "sling"],
  },
  {
    id: "cloth-hair",
    label: "Cloth and hair — wind, follow-through, drag",
    words: ["wind", "cape", "coat", "scarf", "cloak", "skirt", "ribbon", "flag", "hair", "sleeve", "kimono", "robe", "gust"],
  },
  {
    id: "effects",
    label: "Effects — light, fire, water, sparks, impact flash",
    words: ["light", "beam", "fire", "flame", "explosion", "spark", "lightning", "magic", "glow", "water", "splash", "smoke", "petal", "snow", "rain", "moon", "star", "shatter"],
  },
];

for (const card of MOTION) {
  card.card = `${CARDS}/${card.id}.md`;
}

function hits(text, word) {
  return new RegExp(`\\b${word}(e?s|ed|ing|er)?\\b`, "i").test(text);
}

/**
 * Motion cards that apply to a scene.
 * @param {...string} texts the logline, the props line, anything else the scene says
 * @returns {Array<{id: string, label: string, card: string, matched: string[]}>} in library order
 */
export function detectMotion(...texts) {
  const text = texts.filter(Boolean).join(" ");
  const found = [];
  for (const card of MOTION) {
    const matched = card.words.filter((word) => hits(text, word));
    if (matched.length) {
      found.push({ id: card.id, label: card.label, card: card.card, matched });
    }
  }
  return found;
}
