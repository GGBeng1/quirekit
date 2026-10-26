import { existsSync, readdirSync } from "node:fs";
import { extname, join, posix } from "node:path";

/** Extensions Node can load as code; every other export target is only checked for presence. */
const codeExtensions = new Set([".js", ".mjs", ".cjs"]);

/** Dependency sections whose ranges reach the consumer's resolver. */
const dependencySections = ["dependencies", "optionalDependencies", "peerDependencies"];

/**
 * One importable subpath of an installed package.
 * @typedef {object} PackageEntry
 * @property {string} specifier - Bare specifier a consumer writes, such as `@quirekit/core/contract`.
 * @property {string | undefined} runtime - Package-relative runtime file.
 * @property {"import" | "require" | "asset" | "none"} kind - How the probe loads the runtime file.
 * @property {string | undefined} types - Package-relative declaration file.
 */

/**
 * Picks the runtime and declaration targets of one `exports` value.
 * @param {unknown} value - String target or condition object.
 * @returns {{ runtime?: string, kind: PackageEntry["kind"], types?: string }} Selected targets.
 */
function selectTargets(value) {
  if (typeof value === "string") {
    return { runtime: value, kind: codeExtensions.has(extname(value)) ? "import" : "asset" };
  }
  if (!value || typeof value !== "object") return { kind: "none" };
  const runtime = value.import ?? value.default ?? value.require;
  const types = typeof value.types === "string" ? value.types : undefined;
  if (typeof runtime !== "string") return { kind: "none", types };
  const kind = !codeExtensions.has(extname(runtime)) ? "asset" : value.import || value.default ? "import" : "require";
  return { runtime, kind, types };
}

/**
 * Expands a `./dir/*` export by the files actually shipped, so every concrete subpath is probed.
 * @param {string} directory - Installed package directory.
 * @param {string} subpath - Export key containing one `*`.
 * @param {{ runtime?: string, kind: PackageEntry["kind"], types?: string }} targets - Wildcard targets.
 * @returns {{ subpath: string, runtime?: string, kind: PackageEntry["kind"], types?: string }[]} Concrete entries; empty when nothing matches.
 */
function expandWildcard(directory, subpath, targets) {
  const pattern = targets.runtime ?? targets.types;
  if (!pattern) return [];
  const [prefix, suffix] = pattern.replace(/^\.\//u, "").split("*");
  const folder = posix.dirname(`${prefix}x`);
  if (!existsSync(join(directory, folder))) return [];
  return readdirSync(join(directory, folder), { recursive: true, encoding: "utf8" })
    .map((file) => posix.join(folder, file.replaceAll("\\", "/")))
    .filter((file) => file.startsWith(prefix) && file.endsWith(suffix))
    .map((file) => {
      const stem = file.slice(prefix.length, file.length - suffix.length);
      const fill = (target) => target?.replace("*", stem);
      return { subpath: subpath.replace("*", stem), runtime: fill(targets.runtime), kind: targets.kind, types: fill(targets.types) };
    });
}

/**
 * Lists every subpath an installed package exports, with its runtime and declaration targets.
 * @param {string} directory - Installed package directory.
 * @param {Record<string, any>} manifest - Packed manifest read from the installed package.
 * @returns {{ entries: PackageEntry[], errors: string[] }} Entries and manifest-level problems.
 */
export function collectEntries(directory, manifest) {
  const errors = [];
  const entries = [];
  const exportsMap = typeof manifest.exports === "string" ? { ".": manifest.exports } : manifest.exports ?? {};
  for (const [subpath, value] of Object.entries(exportsMap)) {
    if (subpath === "./package.json") continue;
    const targets = selectTargets(value);
    const concrete = subpath.includes("*") ? expandWildcard(directory, subpath, targets) : [{ subpath, ...targets }];
    if (concrete.length === 0) errors.push(`${manifest.name}: export ${subpath} matches no packed file`);
    for (const entry of concrete) {
      entries.push({
        specifier: entry.subpath === "." ? manifest.name : `${manifest.name}/${entry.subpath.slice(2)}`,
        runtime: entry.runtime,
        kind: entry.kind,
        types: entry.types
      });
    }
  }
  return { entries, errors };
}

/**
 * Finds publish-time protocol residue and export targets missing from the tarball.
 * @param {string} directory - Installed package directory.
 * @param {Record<string, any>} manifest - Packed manifest.
 * @param {PackageEntry[]} entries - Collected entries.
 * @returns {string[]} One diagnostic per problem.
 */
export function checkPackedFiles(directory, manifest, entries) {
  const errors = [];
  for (const section of dependencySections) {
    for (const [name, range] of Object.entries(manifest[section] ?? {})) {
      if (/^(?:workspace|catalog):/u.test(String(range))) errors.push(`${manifest.name}: ${section}.${name} keeps ${range}`);
    }
  }
  for (const entry of entries) {
    for (const file of [entry.runtime, entry.types]) {
      if (file && !existsSync(join(directory, file))) errors.push(`${entry.specifier}: packed artifact omits ${file}`);
    }
  }
  return errors;
}
