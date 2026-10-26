import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { decompress } = require("wawoff2");
const dependencyRoot = resolve(packageRoot, "node_modules");
const outputRoot = resolve(packageRoot, "dist");
const fontOutputRoot = resolve(outputRoot, "pdf", "fonts");
const licenseOutputRoot = resolve(outputRoot, "licenses");
const codeFontOutputRoot = resolve(outputRoot, "fonts", "jetbrains-mono");

mkdirSync(fontOutputRoot, { recursive: true });
mkdirSync(licenseOutputRoot, { recursive: true });
mkdirSync(codeFontOutputRoot, { recursive: true });

for (const file of [
  "styles.css",
  "carlito.css",
  "noto-sans-sc.css",
  "noto-serif-sc.css",
  "lxgw-wenkai.css",
  "zhuque-fangsong.css",
  "jetbrains-mono.css",
  "LICENSE.md"
]) {
  copy(file, file);
}

for (const file of [
  "fonts/jetbrains-mono/jetbrains-mono-variable.woff2",
  "fonts/jetbrains-mono/jetbrains-mono-italic.woff2",
  "fonts/jetbrains-mono/SOURCE.txt",
  "licenses/jetbrains-mono-OFL.txt"
]) {
  copy(file, file);
}

copy(
  "licenses/carlito-OFL.txt",
  "licenses/carlito-OFL.txt"
);
copyDependency(
  "@fontsource/noto-sans-sc/LICENSE",
  "licenses/noto-sans-sc-OFL.txt"
);
copyDependency(
  "@fontsource/noto-serif-sc/LICENSE",
  "licenses/noto-serif-sc-OFL.txt"
);
copyDependency(
  "@free-fonts/lxgw-wenkai/LICENSE",
  "licenses/lxgw-wenkai-OFL.txt"
);
copyDependency(
  "@free-fonts/zhuque-fangsong/LICENSE",
  "licenses/zhuque-fangsong-OFL.txt"
);
copyDependency(
  "@embedpdf/fonts-sc/LICENSE",
  "licenses/noto-sans-hans-OFL.txt"
);
copyDependency(
  "@fontsource/noto-sans-symbols-2/LICENSE",
  "licenses/noto-sans-symbols-2-OFL.txt"
);
copyDependency(
  "dejavu-fonts-ttf/LICENSE",
  "licenses/dejavu-fonts-LICENSE.txt"
);

for (const [source, target] of [
  [
    "@openfonts/carlito_all/files/carlito-all-400.woff2",
    "Carlito-Regular.ttf"
  ],
  [
    "@openfonts/carlito_all/files/carlito-all-400-italic.woff2",
    "Carlito-Italic.ttf"
  ],
  [
    "@openfonts/carlito_all/files/carlito-all-700.woff2",
    "Carlito-Bold.ttf"
  ],
  [
    "@openfonts/carlito_all/files/carlito-all-700-italic.woff2",
    "Carlito-BoldItalic.ttf"
  ],
  [
    "@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2",
    "NotoSansSymbols2-Regular.ttf"
  ]
]) {
  const woff2 = readFileSync(resolve(dependencyRoot, source));
  const ttf = await decompress(woff2);
  writeFileSync(resolve(fontOutputRoot, target), ttf);
}

for (const [source, target] of [
  [
    "@expo-google-fonts/noto-serif-sc/400Regular/NotoSerifSC_400Regular.ttf",
    "NotoSerifSC-Regular.ttf"
  ],
  [
    "@expo-google-fonts/noto-serif-sc/700Bold/NotoSerifSC_700Bold.ttf",
    "NotoSerifSC-Bold.ttf"
  ],
  [
    "@embedpdf/fonts-sc/fonts/NotoSansHans-Regular.otf",
    "NotoSansHans-Regular.otf"
  ],
  [
    "@embedpdf/fonts-sc/fonts/NotoSansHans-Bold.otf",
    "NotoSansHans-Bold.otf"
  ],
  ...["DejaVuSansMono.ttf", "DejaVuSansMono-Oblique.ttf", "DejaVuSansMono-Bold.ttf", "DejaVuSansMono-BoldOblique.ttf"]
    .map((file) => [`dejavu-fonts-ttf/ttf/${file}`, file])
]) {
  copyFileSync(
    resolve(dependencyRoot, source),
    resolve(fontOutputRoot, target)
  );
}

/**
 * Copies one package-owned source asset into the build output.
 *
 * @param source - Path relative to the font-pack package root.
 * @param target - Path relative to the font-pack output root.
 */
function copy(source, target) {
  copyFileSync(resolve(packageRoot, source), resolve(outputRoot, target));
}

/**
 * Copies one pinned dependency asset into the build output.
 *
 * @param source - Path relative to the package-local dependency root.
 * @param target - Path relative to the font-pack output root.
 */
function copyDependency(source, target) {
  copyFileSync(resolve(dependencyRoot, source), resolve(outputRoot, target));
}
