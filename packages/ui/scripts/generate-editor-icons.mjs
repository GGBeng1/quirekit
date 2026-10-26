import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generalIconGroups } from "./icons/general.mjs";
import { editorIconGroups } from "./icons/editor.mjs";
import { iconAliases } from "./icons/aliases.mjs";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("lucide-static/package.json"));
const outputRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../src/components/icon");
const groups = [...generalIconGroups, ...editorIconGroups];
const names = new Set();
const entries = [];

/**
 * Removes dimensions from the root only; rectangle geometry retains its size.
 * @param {string} svg - Trusted upstream markup.
 * @returns {string} Responsive SVG markup.
 */
function normalizeSvg(svg) {
  return svg.replace(/<svg\b([^>]*)>/u, (_match, attributes) =>
    `<svg${attributes.replace(/\s+(?:width|height)="[^"]+"/gu, "")}>`
  ).replace(/\r?\n/gu, "").replace(/>\s+</gu, "><").trim();
}

// The manifest owns admission and browsing order; runtime never loads the whole library.
for (const group of groups) {
  for (const [name, file] of group.entries) {
    if (names.has(name)) throw new Error(`Duplicate icon: ${name}`);
    names.add(name);
    if (file === "custom") continue;
    const svg = normalizeSvg(readFileSync(resolve(packageRoot, `icons/${file}.svg`), "utf8"));
    entries.push(`  ${name}: ${JSON.stringify(svg)}`);
  }
}
for (const [alias, target] of Object.entries(iconAliases)) {
  if (names.has(alias) || !names.has(target)) throw new Error(`Invalid icon alias: ${alias}`);
}
writeFileSync(resolve(outputRoot, "lucide.ts"),
  `/* Generated from the curated Lucide manifest in scripts/icons. */\nexport const quireKitEditorLucideIconSvg = Object.freeze({\n${entries.join(",\n")}\n});\n`);
const metadata = groups.map(({ entries: icons, ...group }) => ({
  ...group, icons: icons.map(([name, upstream]) => ({ name, upstream }))
}));
writeFileSync(resolve(outputRoot, "metadata.ts"),
  `/* Generated from scripts/icons; edit the manifest, not this file. Display labels live in locale/components/icon-catalog. */\n/** Language-independent icon groups in browsing order. */\nexport const quireKitEditorIconGroups = ${JSON.stringify(metadata, null, 2)} as const;\n\n/** Compatibility-only names excluded from browsing. */\nexport const quireKitIconAliases = ${JSON.stringify(iconAliases, null, 2)} as const;\n`);
