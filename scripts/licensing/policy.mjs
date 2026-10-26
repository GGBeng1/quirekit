import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Resolves the license tier a package belongs to; unlisted packages use the default tier.
 * @param {object} policy - Explicit license policy.
 * @param {string} name - Package name.
 * @returns {string} Tier key from `policy.tiers`.
 */
export function packageTier(policy, name) {
  for (const [tier, names] of Object.entries(policy.packages)) {
    if (names.includes(name)) return tier;
  }
  return policy.defaultTier;
}

/**
 * Resolves the package-local license, retaining explicitly preserved originals.
 * @param {object} policy - Explicit license policy.
 * @param {object} entry - Workspace package record.
 * @returns {object} Tier, required metadata, local path and optional copy template.
 */
export function packageLicense(policy, entry) {
  const preserved = Object.keys(policy.preservedLicenses)
    .find((path) => dirname(path) === entry.directory);
  const tier = packageTier(policy, entry.manifest.name);
  const definition = policy.tiers[tier];
  return {
    tier,
    metadata: definition.metadata,
    file: preserved?.slice(entry.directory.length + 1) ?? "LICENSE.md",
    template: preserved ? null : definition.template
  };
}

/**
 * Hashes an existing license so synchronization cannot overwrite upstream text.
 * @param {string} path - License path.
 * @returns {string} SHA-256 of the exact original bytes.
 */
export function licenseHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Rejects missing tier templates and local edits to hash-pinned standard texts.
 * @param {string} root - Repository root.
 * @param {object} policy - Explicit license policy.
 * @returns {string[]} Template integrity errors.
 */
export function validateLicenseTemplates(root, policy) {
  const errors = [];
  for (const [tier, definition] of Object.entries(policy.tiers)) {
    const path = join(root, definition.template);
    if (!existsSync(path)) errors.push(`License template for tier ${tier} is missing: ${definition.template}`);
    else if (definition.templateSha256 && licenseHash(path) !== definition.templateSha256) {
      errors.push(`Standard license text changed: ${definition.template}`);
    }
  }
  return errors;
}

/**
 * Protects independent grants before any generated metadata can be written.
 * @param {string} root - Repository root.
 * @param {object} policy - Explicit license policy.
 * @param {object[]} entries - Workspace packages.
 * @returns {string[]} Missing, changed or wrongly classified original licenses.
 */
export function validatePreservedLicenses(root, policy, entries) {
  const errors = [];
  for (const [path, hash] of Object.entries(policy.preservedLicenses)) {
    if (!existsSync(join(root, path)) || licenseHash(join(root, path)) !== hash) {
      errors.push(`Preserved upstream/independent license changed or missing: ${path}`);
    }
    const owner = entries.find((entry) => entry.directory === dirname(path));
    if (!owner || packageTier(policy, owner.manifest.name) !== "mit") {
      errors.push(`Preserved MIT license is outside the MIT tier: ${path}`);
    }
  }
  return errors;
}

/**
 * Collects workspace edges that point from a lower tier into a higher tier.
 * @param {object} policy - Explicit license policy.
 * @param {object[]} entries - Workspace packages.
 * @returns {{ edges: string[], errors: string[] }} Upward edges as `from -> to` and resolution errors.
 */
export function collectUpwardEdges(policy, entries) {
  const byName = new Map(entries.map((entry) => [entry.manifest.name, entry]));
  const edges = [];
  const errors = [];
  for (const entry of entries) {
    const name = entry.manifest.name;
    const rank = policy.tiers[packageTier(policy, name)].rank;
    // Public peers and optional edges ship obligations to consumers exactly like hard dependencies.
    for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
      for (const [dependency, version] of Object.entries(entry.manifest[section] ?? {})) {
        const target = String(version).startsWith("workspace:@")
          ? String(version).slice(10).replace(/@[^@]*$/, "")
          : dependency;
        if (byName.has(target)) {
          if (policy.tiers[packageTier(policy, target)].rank > rank) edges.push(`${name} -> ${target}`);
        } else if (String(version).startsWith("workspace:")) {
          errors.push(`${name}: unresolved workspace dependency ${dependency}`);
        }
      }
    }
  }
  return { edges: [...new Set(edges)].sort(), errors };
}

/**
 * Enforces that dependencies only point to the same or a more permissive tier.
 * Known upward edges live in a shrink-only baseline until the owning decoupling lands.
 * @param {object} policy - Explicit license policy.
 * @param {object[]} entries - Workspace packages.
 * @returns {string[]} Boundary errors.
 */
export function validateBoundaries(policy, entries) {
  const errors = [];
  const names = new Set(entries.map((entry) => entry.manifest.name));
  const seen = new Set();
  for (const [tier, listed] of Object.entries(policy.packages)) {
    if (!policy.tiers[tier]) errors.push(`Policy lists packages for unknown tier: ${tier}`);
    for (const name of listed) {
      if (!names.has(name)) errors.push(`${tier} tier references missing workspace package: ${name}`);
      if (seen.has(name)) errors.push(`Package is assigned to more than one tier: ${name}`);
      seen.add(name);
    }
  }
  const { edges, errors: resolution } = collectUpwardEdges(policy, entries);
  errors.push(...resolution);
  const baseline = new Set(policy.boundaryBaseline);
  for (const edge of edges) {
    if (!baseline.has(edge)) {
      const [from, to] = edge.split(" -> ");
      errors.push(`${from}: depends on higher-tier (${packageTier(policy, to)}) package ${to}`);
    }
  }
  for (const edge of baseline) {
    if (!edges.includes(edge)) errors.push(`Stale boundary baseline entry, remove it: ${edge}`);
  }
  return errors;
}

/** Separates the shared notices from sections a package adds for its own third-party dependencies. */
export const packageNoticeMarker = "\n<!-- 本包附加声明 / Package-specific notices -->\n";

/**
 * Builds the notices a package must ship: the shared text, followed by any package-specific
 * section that already exists after the marker.
 * @param {string} shared - Repository-wide notices.
 * @param {string | undefined} existing - Current package notices, if any.
 * @returns {string} Expected package notices.
 */
export function packageNotices(shared, existing) {
  const start = existing?.indexOf(packageNoticeMarker) ?? -1;
  return start === -1 ? shared : `${shared}${existing.slice(start)}`;
}

/**
 * Verifies metadata, full license copies, notices, tier privacy and preserved source licenses.
 * @param {string} root - Repository root.
 * @param {object} policy - Explicit license policy.
 * @param {object[]} entries - Workspace packages.
 * @returns {string[]} All detected distribution-policy errors.
 */
export function validateLicenses(root, policy, entries) {
  const errors = [
    ...validateLicenseTemplates(root, policy),
    ...validateBoundaries(policy, entries),
    ...validatePreservedLicenses(root, policy, entries)
  ];
  const notices = readFileSync(join(root, policy.noticeFile), "utf8");
  for (const entry of entries) {
    const expected = packageLicense(policy, entry);
    const path = join(root, entry.directory, expected.file);
    const label = entry.manifest.name;
    if (entry.manifest.license !== expected.metadata) {
      errors.push(`${label}: license must be ${expected.metadata}`);
    }
    if (policy.tiers[expected.tier].requirePrivate && entry.manifest.private !== true) {
      errors.push(`${label}: ${expected.tier} packages must set "private": true`);
    }
    if (!existsSync(path)) errors.push(`${label}: missing ${expected.file}`);
    else if (expected.template && readFileSync(path, "utf8")
      !== readFileSync(join(root, expected.template), "utf8")) {
      errors.push(`${label}: stale or incomplete ${expected.file}`);
    }
    for (const file of readdirSync(join(root, entry.directory))) {
      if (/^licen[cs]e(?:\.[^/]*)?$/iu.test(file) && file !== expected.file) {
        errors.push(`${label}: ambiguous additional license file ${file}`);
      }
    }
    if (entry.directory === "") continue;
    const noticePath = join(root, entry.directory, policy.noticeFile);
    const actualNotices = existsSync(noticePath) ? readFileSync(noticePath, "utf8") : undefined;
    if (actualNotices !== packageNotices(notices, actualNotices)) {
      errors.push(`${label}: missing or stale ${policy.noticeFile}`);
    }
    if (Array.isArray(entry.manifest.files)) {
      for (const file of [expected.file, policy.noticeFile]) {
        if (!entry.manifest.files.includes(file)) errors.push(`${label}: files must include ${file}`);
      }
    }
  }
  return errors;
}
