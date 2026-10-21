#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] || "public/radar-helper.html";
const html = readFileSync(join(root, file), "utf8");

const required = [
  "map", "temp", "feels", "placeName", "cond", "clock", "windLbl",
  "legend", "ramp", "panel", "insT", "insB", "tags", "play", "chart",
  "sMove", "sHum", "sWind", "sRate", "foot", "toast", "recenter", "grab"
];
const missing = required.filter((id) => !html.includes(`id="${id}"`));
if (missing.length) {
  console.error(`missing ids in ${file}: ${missing.join(", ")}`);
  process.exit(1);
}

const script = html.match(/<script>\s*'use strict';([\s\S]*)<\/script>/);
if (!script) {
  console.error(`${file}: expected a single inline 'use strict' script`);
  process.exit(1);
}

try {
  // Syntax-check only. The page is still one file; we do not execute it here.
  new Function(script[1]);
} catch (err) {
  console.error(`${file}: script failed to parse\n${err}`);
  process.exit(1);
}

const must = [
  ["offline flag", /\[\?&\]offline=1/],
  ["IEM NEXRAD", /nexrad-n0q-900913/],
  ["NASA GIBS", /gibs\.earthdata\.nasa\.gov/],
  ["Esri imagery", /World_Imagery/],
  ["Open-Meteo", /api\.open-meteo\.com/],
  ["NardWeather.set", /NardWeather = \{/],
  ["parent-only postMessage", /e\.source === window\.parent/],
  ["Marshall–Palmer", /Z = 200 R\^1\.6/],
];
for (const [name, re] of must) {
  if (!re.test(html)) {
    console.error(`${file}: missing ${name}`);
    process.exit(1);
  }
}

if (html.includes("?live=1")) {
  console.error(`${file}: leftover ?live=1 — live layers are on by default`);
  process.exit(1);
}

console.log(`ok ${file} (${html.length} bytes)`);
