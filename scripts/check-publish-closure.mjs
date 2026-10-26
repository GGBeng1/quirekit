#!/usr/bin/env node
// Publishable packages must only depend on workspace packages that are also published.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readWorkspace } from "./licensing/workspace.mjs";

const dependencySections = ["dependencies", "optionalDependencies", "peerDependencies"];

/**
 * Resolves the workspace package name an edge points to, including `workspace:@scope/name@range` aliases.
 *
 * @param {string} dependency - Declared dependency key.
 * @param {unknown} version - Declared version or workspace protocol.
 * @returns {string} Target package name.
 */
function resolveTargetName(dependency, version) {
  const value = String(version);
  return value.startsWith("workspace:@") ? value.slice(10).replace(/@[^@]*$/u, "") : dependency;
}

/**
 * Finds published packages whose installable dependencies include private workspace packages.
 *
 * pnpm rewrites `workspace:` ranges to concrete versions at publish time, so such an
 * edge produces a package whose install fails with a missing dependency.
 *
 * @param {{ manifest: Record<string, any> }[]} entries - Workspace package records.
 * @returns {string[]} One diagnostic per offending edge.
 */
export function collectPublishClosureViolations(entries) {
  const byName = new Map(entries.map((entry) => [entry.manifest.name, entry.manifest]));
  const violations = [];
  for (const { manifest } of entries) {
    if (manifest.private === true) continue;
    for (const section of dependencySections) {
      for (const [dependency, version] of Object.entries(manifest[section] ?? {})) {
        const target = byName.get(resolveTargetName(dependency, version));
        if (target?.private === true) {
          violations.push(`${manifest.name}: ${section} includes private workspace package ${target.name}`);
        }
      }
    }
  }
  return violations.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const entries = readWorkspace(root);
  const violations = collectPublishClosureViolations(entries);
  if (violations.length > 0) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    const published = entries.filter((entry) => entry.manifest.private !== true).length;
    process.stdout.write(`Publish closure verified: ${published} publishable packages depend only on published workspace packages.\n`);
  }
}
