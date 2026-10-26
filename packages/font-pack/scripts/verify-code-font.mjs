import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { create } from "fontkit";

/**
 * Verifies the pinned code family, exact face coverage, and distribution notice.
 * @param packageRoot - Font-pack source directory containing its build output.
 */
export function verifyCodeFont(packageRoot) {
  const output = resolve(packageRoot, "dist");
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  if (manifest.exports["./jetbrains-mono.css"] !== "./dist/jetbrains-mono.css"
    || manifest.exports["./licenses/jetbrains-mono-OFL.txt"] !== "./dist/licenses/jetbrains-mono-OFL.txt"
    || !manifest.sideEffects.includes("./dist/jetbrains-mono.css")
    || manifest.files.includes("fonts")) {
    throw new Error("JetBrains Mono must expose opt-in CSS and license without publishing duplicate source font bytes.");
  }
  const css = readFileSync(resolve(output, "jetbrains-mono.css"), "utf8");
  const license = readFileSync(resolve(output, "licenses/jetbrains-mono-OFL.txt"), "utf8");
  const source = readFileSync(resolve(output, "fonts/jetbrains-mono/SOURCE.txt"), "utf8");
  if (!license.includes("Copyright 2020 The JetBrains Mono Project Authors")
    || !license.includes("SIL OPEN FONT LICENSE Version 1.1")) {
    throw new Error("JetBrains Mono must include its copyright and complete OFL notice.");
  }
  if (!source.includes("19371302b95d218af43299bce79ddbddd0bc364d")) {
    throw new Error("JetBrains Mono must retain the reviewed upstream revision.");
  }
  for (const [name, expectedHash, style, weight] of [
    ["variable", "31ec365b93e4bad6f202ce23352a56d01ca4462b2afc782ed2cf6fa42ca9ac0e", "normal", "100 800"],
    ["italic", "9f158b85eca345daeee01dfffa602709a905ea08b0cc60dbf6153cbbd97da08f", "italic", "400"]
  ]) {
    const resource = `./fonts/jetbrains-mono/jetbrains-mono-${name}.woff2`;
    const block = css.split("@font-face").find(face => face.includes(resource));
    if (!block?.includes(`font-style: ${style};`) || !block.includes(`font-weight: ${weight};`)) {
      throw new Error(`JetBrains Mono ${style} CSS must match its exact weight coverage.`);
    }
    const bytes = readFileSync(resolve(output, resource));
    if (createHash("sha256").update(bytes).digest("hex") !== expectedHash) {
      throw new Error(`JetBrains Mono ${style} must remain the unmodified approved asset.`);
    }
    const font = create(bytes);
    if (font.familyName !== "JetBrains Mono") throw new Error("Unexpected code-font family.");
    if (name === "variable" && (font.variationAxes.wght.min !== 100 || font.variationAxes.wght.max !== 800)) {
      throw new Error("JetBrains Mono variable face must cover weights 100–800.");
    }
    for (const character of "0Oo1lI=>!{}[]()") {
      if (font.glyphForCodePoint(character.codePointAt(0)).id === 0) {
        throw new Error(`JetBrains Mono ${style} is missing code character ${character}.`);
      }
    }
  }
}
