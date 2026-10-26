import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const lucidePackageRoot = dirname(require.resolve("lucide-static/package.json"));
const tablerCollection = JSON.parse(
  readFileSync(require.resolve("@iconify-json/tabler/icons.json"), "utf8")
);
const output = resolve(dirname(fileURLToPath(import.meta.url)), "../src/icons/generated.ts");
const selectedLucideIcons = {
  maximize2: "maximize-2",
  trash2: "trash-2"
};
const selectedTablerIcons = {
  rulerEnd: "triangle",
  rulerFirstLine: "triangle-inverted",
  rulerMarginResize: "arrows-horizontal",
  rulerStart: "rectangle"
};

/**
 * Removes intrinsic dimensions from only the root SVG element.
 *
 * Child geometry such as Lucide's panel and table rectangles also uses
 * `width` and `height`; removing those attributes collapses the shape and
 * leaves only its internal divider paths visible.
 *
 * @param {string} svg - Raw trusted SVG markup.
 * @returns {string} SVG markup whose root sizes through the shared icon CSS.
 */
function removeRootDimensions(svg) {
  return svg.replace(/<svg\b([^>]*)>/u, (_match, attributes) => {
    const responsiveAttributes = attributes
      .replace(/\s+width="[^"]+"/gu, "")
      .replace(/\s+height="[^"]+"/gu, "");
    return `<svg${responsiveAttributes}>`;
  });
}

const lucideEntries = Object.entries(selectedLucideIcons).map(([name, file]) => {
  const svg = removeRootDimensions(
    readFileSync(resolve(lucidePackageRoot, `icons/${file}.svg`), "utf8")
  )
    .replace(/\r?\n/g, "")
    .replace(/>\s+</g, "><")
    .trim();
  return `  ${name}: ${JSON.stringify(svg)}`;
});
const tablerEntries = Object.entries(selectedTablerIcons).map(([name, iconName]) => {
  const icon = tablerCollection.icons[iconName];
  if (icon === undefined) {
    throw new Error(`Missing explicitly selected Tabler icon: ${iconName}`);
  }
  const width = icon.width ?? tablerCollection.width ?? 24;
  const height = icon.height ?? tablerCollection.height ?? 24;
  const svg = `<!-- @license Tabler Icons 3.45.0 - MIT --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${icon.body}</svg>`;
  return `  ${name}: ${JSON.stringify(svg)}`;
});
const entries = [...lucideEntries, ...tablerEntries];

const source = `/* Generated from explicit local SVG allowlists. Iconify collections are build-time sources only. */\nexport const classicEditorIconSvg = Object.freeze({\n${entries.join(",\n")}\n});\n\nexport type ClassicEditorIconName = keyof typeof classicEditorIconSvg;\n`;
writeFileSync(output, source);
