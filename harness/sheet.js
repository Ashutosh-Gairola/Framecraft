#!/usr/bin/env node
/**
 * Compile a brief and save it next to the film.
 *
 *   node harness/sheet.js brief.json            writes films/<slug>/sheet.md and sheet.json
 *   node harness/sheet.js brief.json --out dir  writes into dir instead
 *   echo '{...}' | node harness/sheet.js -      reads the brief from stdin
 *
 * The brief is the compileBrief input: logline, seconds, aspect, script, and
 * optionally dialogue, cast, props, style, styleReference, designColors.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBrief } from "./compile.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`sheet: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith("--"));
const outAt = args.indexOf("--out");
if (!source) {
  fail("usage: node harness/sheet.js <brief.json | -> [--out <dir>]");
}

let brief;
try {
  brief = JSON.parse(readFileSync(source === "-" ? 0 : source, "utf8"));
} catch (error) {
  fail(`cannot read the brief: ${error.message}`);
}

const result = compileBrief(brief);
if (!result.ok) {
  fail(result.error);
}

const dir = outAt === -1 ? join(ROOT, "films", result.slug) : resolve(args[outAt + 1] ?? fail("--out needs a directory"));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "sheet.md"), result.markdown);
writeFileSync(join(dir, "sheet.json"), `${JSON.stringify(result.sheet, null, 2)}\n`);

console.log(result.markdown);
console.error(`sheet: wrote ${join(dir, "sheet.md")} and sheet.json`);
