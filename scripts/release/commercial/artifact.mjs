import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { transform } from "esbuild";

const scriptFile = /\.(?:m|c)?js$/u;
const declarationFile = /\.d\.(?:m|c)?ts$/u;
const sourceFile = /\.(?:m|c)?tsx?$|\.vue$/u;
const sourceMapComment = /^\/\/# sourceMappingURL=.*$/gmu;

/**
 * @param {string} directory - Extracted package root.
 * @returns {string[]} Package-relative paths of every file.
 */
export function listFiles(directory) {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(directory, path).replaceAll("\\", "/"));
    }
  };
  walk(directory);
  return out;
}

/**
 * @param {string} directory - Directory to prune bottom-up.
 * @returns {boolean} Whether `directory` itself ended up empty.
 */
function removeEmptyDirectories(directory) {
  let empty = true;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory() && removeEmptyDirectories(path)) rmSync(path, { recursive: true });
    else empty = false;
  }
  return empty;
}

/**
 * Turns a packed workspace package into a compiled-only commercial artifact, in place.
 * `src` files survive only when `files` lists them one by one (stylesheets that exports expose).
 * @param {string} directory - Extracted `package/` directory of the tarball.
 * @returns {Promise<object>} The rewritten manifest.
 */
export async function compileArtifact(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const listed = new Set((manifest.files ?? []).filter((entry) => entry.startsWith("src/")));

  // Phase 1: drop source and source maps before anything is minified.
  for (const file of listFiles(directory)) {
    if (file.endsWith(".map") || (file.startsWith("src/") && !listed.has(file))) rmSync(join(directory, file));
  }
  removeEmptyDirectories(directory);

  // Phase 2: minify each emitted script on its own; bundling stays as the package build left it.
  for (const file of listFiles(directory)) {
    const path = join(directory, file);
    if (declarationFile.test(file)) {
      writeFileSync(path, readFileSync(path, "utf8").replace(sourceMapComment, ""));
    } else if (scriptFile.test(file)) {
      const code = readFileSync(path, "utf8").replace(sourceMapComment, "");
      const result = await transform(code, { loader: "js", minify: true, legalComments: "inline", target: "esnext", charset: "utf8" });
      writeFileSync(path, result.code);
    }
  }

  // Phase 3: the published manifest keeps runtime metadata only.
  delete manifest.private;
  delete manifest.scripts;
  delete manifest.devDependencies;
  if (manifest.files) manifest.files = manifest.files.filter((entry) => !entry.startsWith("src") || listed.has(entry));
  writeFileSync(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/**
 * @param {unknown} node - An `exports` subtree.
 * @param {string[]} out - Collected `./` targets.
 * @returns {string[]} Concrete file targets (pattern targets are skipped).
 */
function exportTargets(node, out = []) {
  if (typeof node === "string") {
    if (node.startsWith("./") && !node.includes("*")) out.push(node.slice(2));
  } else if (node && typeof node === "object") {
    for (const value of Object.values(node)) exportTargets(value, out);
  }
  return out;
}

/**
 * Checks a compiled artifact for leaked source, missing license files and dangling exports.
 * @param {string} directory - Extracted, compiled package directory.
 * @param {object} manifest - Its rewritten manifest.
 * @param {string} licenseHeading - First line every commercial license file starts with.
 * @returns {string[]} Problems, prefixed with the package name.
 */
export function verifyArtifact(directory, manifest, licenseHeading) {
  const errors = [];
  const files = listFiles(directory);
  const license = join(directory, "LICENSE.md");
  if (!existsSync(license) || !readFileSync(license, "utf8").startsWith(licenseHeading)) errors.push("LICENSE.md is not the commercial license");
  if (!files.includes("THIRD_PARTY_NOTICES.md")) errors.push("THIRD_PARTY_NOTICES.md is missing");
  if (manifest.license !== "SEE LICENSE IN LICENSE.md") errors.push(`license field is ${manifest.license}`);
  for (const file of files) {
    if (file.endsWith(".map")) errors.push(`source map shipped: ${file}`);
    else if (sourceFile.test(file) && !declarationFile.test(file)) errors.push(`source file shipped: ${file}`);
  }
  for (const target of exportTargets(manifest.exports)) {
    if (!files.includes(target)) errors.push(`export target missing: ${target}`);
  }
  if (readFileSync(join(directory, "package.json"), "utf8").includes("workspace:")) errors.push("workspace: protocol left in package.json");
  return errors.map((error) => `${manifest.name}: ${error}`);
}
