/**
 * The cast on a sheet. Each member is either an original (the designer draws a
 * model sheet example first and waits for a yes) or follows a reference the
 * user gave (an image path, a URL, or written notes).
 */

export const MAX_CAST = 4;

const ORIGINAL = /^(original|new|oc|none|-)?$/i;
const IMAGE = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i;

/**
 * A folder-safe slug for a cast member's model sheet file.
 * @param {string} name
 * @returns {string}
 */
export function castSlug(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "figure"
  );
}

function member(name, reference) {
  const ref = String(reference ?? "")
    .trim()
    .replace(/^ref(erence)?\s*[:=-]?\s*/i, "");
  const trimmed = String(name).trim();
  if (ORIGINAL.test(ref)) {
    return { name: trimmed, slug: castSlug(trimmed), kind: "original", reference: "" };
  }
  const image = /^https?:\/\//i.test(ref) || IMAGE.test(ref);
  return { name: trimmed, slug: castSlug(trimmed), kind: image ? "image" : "notes", reference: ref };
}

/**
 * Read the cast from text ("Name" or "Name: reference" per line) or an array
 * of `{name, reference}`.
 * @param {string|Array<{name: string, reference?: string}>|undefined} input
 * @returns {{ok: true, cast: Array<{name: string, slug: string, kind: "original"|"image"|"notes", reference: string}>} | {ok: false, error: string}}
 */
export function parseCast(input) {
  let rows;
  if (Array.isArray(input)) {
    rows = input.map((row) => [row?.name ?? "", row?.reference ?? ""]);
  } else {
    rows = String(input ?? "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const at = line.indexOf(":");
        return at === -1 ? [line, ""] : [line.slice(0, at), line.slice(at + 1)];
      });
  }

  const cast = [];
  const seen = new Set();
  for (const [name, reference] of rows) {
    if (!String(name).trim()) {
      return { ok: false, error: "Every cast line needs a name before the colon." };
    }
    if (String(name).trim().length > 40) {
      return { ok: false, error: "Keep cast names under 40 characters." };
    }
    const m = member(name, reference);
    if (seen.has(m.slug)) {
      return { ok: false, error: `"${m.name}" is in the cast twice.` };
    }
    seen.add(m.slug);
    cast.push(m);
  }
  if (cast.length > MAX_CAST) {
    return { ok: false, error: `A short holds at most ${MAX_CAST} named characters.` };
  }
  return { ok: true, cast };
}
