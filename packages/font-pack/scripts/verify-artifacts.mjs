import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "fontkit";
import { verifyCodeFont } from "./verify-code-font.mjs";
import { resolveQuirePortableMonoFontUrls, resolveQuirePortablePdfFontUrls } from "../dist/pdf/browser.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const url of [...Object.values(resolveQuirePortablePdfFontUrls()), ...Object.values(resolveQuirePortableMonoFontUrls())]) {
  assert(existsSync(fileURLToPath(url)), "Published PDF browser URLs must resolve to package-owned complete fonts.");
  assert(fileURLToPath(url).startsWith(resolve(packageRoot, "dist/pdf/fonts")), "PDF browser URLs must stay inside the font distribution boundary.");
}
verifyCodeFont(packageRoot);
const manifest = JSON.parse(read("package.json"));
const styles = read("dist/styles.css");
const carlitoStyles = read("dist/carlito.css");
const notoSansScStyles = read("dist/noto-sans-sc.css");
const notoSerifScStyles = read("dist/noto-serif-sc.css");
const lxgwWenKaiStyles = read("dist/lxgw-wenkai.css");
const zhuqueFangsongStyles = read("dist/zhuque-fangsong.css");
const notoSansScDependencyStyles = readDependency(
  "@fontsource/noto-sans-sc/400.css"
);
const notoSerifScDependencyStyles = readDependency(
  "@fontsource/noto-serif-sc/400.css"
);
const lxgwWenKaiDependencyStyles = readDependency(
  "@free-fonts/lxgw-wenkai/lxgw-wenkai.css"
);
const zhuqueFangsongDependencyStyles = readDependency(
  "@free-fonts/zhuque-fangsong/zhuque-fangsong.css"
);
const wrapperLicense = read("dist/LICENSE.md");
const carlitoLicense = read("dist/licenses/carlito-OFL.txt");
const notoSansScLicense = read("dist/licenses/noto-sans-sc-OFL.txt");
const notoSerifScLicense = read("dist/licenses/noto-serif-sc-OFL.txt");
const lxgwWenKaiLicense = read("dist/licenses/lxgw-wenkai-OFL.txt");
const zhuqueFangsongLicense = read("dist/licenses/zhuque-fangsong-OFL.txt");
const notoSansHansLicense = read("dist/licenses/noto-sans-hans-OFL.txt");
const notoSansSymbols2License = read(
  "dist/licenses/noto-sans-symbols-2-OFL.txt"
);

assert(
  manifest.dependencies?.["@fontsource/carlito"] === "5.3.0",
  "Font pack must pin the audited Carlito package."
);
assert(
  manifest.dependencies?.["@fontsource/noto-sans-sc"] === "5.3.0",
  "Font pack must pin the audited Noto Sans SC package."
);
assert(
  manifest.dependencies?.["@fontsource/noto-serif-sc"] === "5.3.0",
  "Font pack must pin the audited Noto Serif SC package."
);
assert(
  manifest.dependencies?.["@free-fonts/lxgw-wenkai"] === "1.0.1"
    && manifest.dependencies?.["@free-fonts/zhuque-fangsong"] === "1.0.0",
  "Font pack must pin the audited Chinese office replacement packages."
);
assert(
  manifest.dependencies?.["@fontsource/noto-sans-symbols-2"] === "5.3.0",
  "Font pack must pin the audited Noto Sans Symbols 2 package."
);
assert(
  manifest.dependencies?.["@openfonts/carlito_all"] === "1.0.0"
    && manifest.dependencies?.["@expo-google-fonts/noto-serif-sc"] === "0.4.2"
    && manifest.dependencies?.["@embedpdf/fonts-sc"] === "1.0.0",
  "Font pack must pin the audited complete static PDF font packages."
);
assert(
  manifest.devDependencies?.wawoff2 === "2.0.1",
  "Font pack must pin the build-only WOFF2-to-sfnt converter."
);
assert(
  manifest.devDependencies?.fontkit === "2.0.4",
  "Font pack must pin the build-only final cmap verifier."
);
assert(
  styles.includes("./carlito.css")
    && styles.includes("./noto-sans-sc.css")
    && styles.includes("./noto-serif-sc.css")
    && styles.includes("./lxgw-wenkai.css")
    && styles.includes("./zhuque-fangsong.css")
    && styles.includes("./jetbrains-mono.css"),
  "Aggregate font pack CSS must mount every included family."
);
assert(
  [
    "latin-400.css",
    "latin-400-italic.css",
    "latin-700.css",
    "latin-700-italic.css"
  ].every((entry) => carlitoStyles.includes(`@fontsource/carlito/${entry}`)),
  "Carlito family CSS must expose every declared Latin face."
);
assert(
  [100, 200, 300, 400, 500, 600, 700, 800, 900].every((weight) => (
    notoSansScStyles.includes(`@fontsource/noto-sans-sc/${weight}.css`)
  )),
  "Noto Sans SC family CSS must expose every declared Unicode-range weight."
);
assert(
  [200, 300, 400, 500, 600, 700, 800, 900].every((weight) => (
    notoSerifScStyles.includes(`@fontsource/noto-serif-sc/${weight}.css`)
  )),
  "Noto Serif SC family CSS must expose every declared Unicode-range weight."
);
assert(
  notoSansScDependencyStyles.includes("font-family: 'Noto Sans SC';")
    && notoSerifScDependencyStyles.includes("font-family: 'Noto Serif SC';")
    && lxgwWenKaiDependencyStyles.includes("font-family: 'LXGW WenKai';")
    && zhuqueFangsongDependencyStyles.includes("font-family: 'Zhuque Fangsong';"),
  "Bundled CSS family names must match the logical substitution candidates."
);
assert(
  lxgwWenKaiStyles.includes("@free-fonts/lxgw-wenkai/lxgw-wenkai.css"),
  "LXGW WenKai family CSS must use the audited Unicode-range package."
);
assert(
  zhuqueFangsongStyles.includes("@free-fonts/zhuque-fangsong/zhuque-fangsong.css"),
  "Zhuque Fangsong family CSS must use the audited preview package."
);
assert(
  wrapperLicense.includes("MIT License")
    && wrapperLicense.includes("QuireKit contributors"),
  "Font pack must distribute the wrapper code license."
);
assert(
  carlitoLicense.includes("Copyright 2013 The Carlito Project Authors")
    && carlitoLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute Carlito copyright and complete OFL notice."
);
assert(
  notoSansScLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute Noto Sans SC attribution and complete OFL notice."
);
assert(
  notoSerifScLicense.includes("Google Inc.")
    && notoSerifScLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute Noto Serif SC attribution and complete OFL notice."
);
assert(
  lxgwWenKaiLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute LXGW WenKai attribution and complete OFL notice."
);
assert(
  zhuqueFangsongLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute Zhuque Fangsong attribution and complete OFL notice."
);
assert(
  notoSansHansLicense.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute the Noto Sans Hans OFL notice."
);
assert(
  notoSansSymbols2License.includes("SIL OPEN FONT LICENSE Version 1.1"),
  "Font pack must distribute the Noto Sans Symbols 2 OFL notice."
);
assert(
  existsSync(resolve(packageRoot, "dist/index.mjs")),
  "Font pack runtime manifest is missing."
);
assert(
  existsSync(resolve(packageRoot, "dist/pdf/index.mjs")),
  "Font pack portable PDF preset is missing."
);

for (const [file, minimumSize] of [
  ["Carlito-Regular.ttf", 500_000],
  ["Carlito-Italic.ttf", 500_000],
  ["Carlito-Bold.ttf", 500_000],
  ["Carlito-BoldItalic.ttf", 500_000],
  ["NotoSerifSC-Regular.ttf", 10_000_000],
  ["NotoSerifSC-Bold.ttf", 10_000_000],
  ["NotoSansHans-Regular.otf", 5_000_000],
  ["NotoSansHans-Bold.otf", 5_000_000],
  ["NotoSansSymbols2-Regular.ttf", 1_000_000]
]) {
  const path = resolve(packageRoot, "dist/pdf/fonts", file);
  assert(
    existsSync(path) && statSync(path).size > minimumSize,
    `Portable PDF font "${file}" is missing or is not a complete static face.`
  );
}

for (const file of [
  "Carlito-Regular.ttf",
  "Carlito-Italic.ttf",
  "Carlito-Bold.ttf",
  "Carlito-BoldItalic.ttf",
  "NotoSansSymbols2-Regular.ttf"
]) {
  const bytes = readFileSync(resolve(packageRoot, "dist/pdf/fonts", file));
  assert(
    bytes.subarray(0, 4).equals(Buffer.from([0x00, 0x01, 0x00, 0x00])),
    `Portable PDF font "${file}" must be a decompressed sfnt/TrueType file.`
  );
}

const symbolFont = create(readFileSync(resolve(
  packageRoot,
  "dist/pdf/fonts/NotoSansSymbols2-Regular.ttf"
)));
for (const codePoint of [0x25a1, 0x2610, 0x2611, 0x2612, 0x2713, 0x2714]) {
  assert(
    symbolFont.glyphForCodePoint(codePoint).id > 0,
    `Noto Sans Symbols 2 must cover U+${codePoint.toString(16).toUpperCase()}.`
  );
}

console.log(JSON.stringify({
  families: [
    { family: "JetBrains Mono", faces: "normal-100-800 + italic-400", license: "OFL-1.1" },
    { family: "Carlito", faces: 4, license: "OFL-1.1" },
    {
      family: "Noto Sans SC",
      faces: "100 + 200 + 300 + 400 + 500 + 600 + 700 + 800 + 900",
      ranges: "unicode-sharded",
      license: "OFL-1.1"
    },
    {
      family: "Noto Serif SC",
      faces: "200 + 300 + 400 + 500 + 600 + 700 + 800 + 900",
      ranges: "unicode-sharded",
      license: "OFL-1.1"
    },
    {
      family: "LXGW WenKai",
      faces: "300 + 400 + 500",
      ranges: "unicode-sharded",
      license: "OFL-1.1"
    },
    {
      family: "Zhuque Fangsong",
      faces: "400 preview",
      ranges: "unicode-sharded",
      license: "OFL-1.1"
    },
    {
      family: "Noto Sans Symbols 2",
      faces: 1,
      ranges: "U+25A0-27BF",
      license: "OFL-1.1"
    },
    {
      preset: "portable-pdf",
      faces: 9,
      loading: "lazy-complete-static",
      license: "OFL-1.1"
    }
  ]
}, null, 2));

function read(path) {
  return readFileSync(resolve(packageRoot, path), "utf8");
}

/**
 * Reads one pinned dependency artifact used by a family wrapper.
 *
 * @param {string} path - Path below the package-local node_modules directory.
 * @returns {string} UTF-8 dependency content.
 */
function readDependency(path) {
  return readFileSync(resolve(packageRoot, "node_modules", path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
