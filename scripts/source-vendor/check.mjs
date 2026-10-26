import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readWorkspace } from "../licensing/workspace.mjs";

/**
 * Checks the immutable provenance fields that must travel with each source package.
 * @param {object} upstream - Original npm/Git source record.
 * @param {string} license - Exact retained license bytes.
 * @returns {string[]} Invalid provenance fields.
 */
export function validateUpstream(upstream, license) {
  const errors = [];
  if (!/^@(codemirror|lezer)\/[\w-]+$/.test(upstream.name ?? "")) errors.push("upstream name");
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(upstream.version ?? "")) errors.push("upstream version");
  if (!/^[a-f0-9]{40}$/.test(upstream.commit ?? "")) errors.push("upstream commit");
  if (!/^https:\/\/(?:github\.com|code\.haverbeke\.berlin)\//.test(upstream.repository ?? "")) errors.push("upstream repository");
  if (!/^sha512-[A-Za-z0-9+/]+=*$/.test(upstream.integrity ?? "")) errors.push("npm integrity");
  if (!/^[a-f0-9]{64}$/.test(upstream.sourceSha256 ?? "")) errors.push("source digest");
  if (upstream.license !== "MIT" || !license.includes("Permission is hereby granted")) errors.push("upstream license");
  if (createHash("sha256").update(license).digest("hex") !== upstream.licenseSha256) errors.push("license digest");
  if (!upstream.localChanges?.length) errors.push("local changes");
  return errors;
}

/**
 * Identifies official packages that cannot share an MSFE extension graph.
 * @param {string} name - Dependency name or source import.
 * @returns {boolean} Whether the import introduces an official editor identity.
 */
export function isOfficialEditor(name) {
  return name.startsWith("@codemirror/") || name === "@lezer/markdown";
}

/**
 * Audits package provenance and the declared workspace runtime graph.
 * @param {string} root - Repository root.
 * @returns {string[]} Violations with package or file ownership.
 */
export function checkVendors(root) {
  const entries = readWorkspace(root);
  const problems = [];
  const ignored = new Set(["node_modules", "dist", ".nuxt", ".output", "coverage", "test-results"]);
  /** @param {string} directory - Owned source subtree. Checks actual imports, including type-only and dynamic imports. */
  function scan(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { if (!ignored.has(entry.name)) scan(file); continue; }
      if (!/\.(?:[cm]?[jt]sx?|vue)$/.test(entry.name)) continue;
      const source = readFileSync(file, "utf8");
      const imports = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](@[^"']+)["']/g;
      for (const match of source.matchAll(imports)) if (isOfficialEditor(match[1])) {
        problems.push(`${file}: official editor import ${match[1]}`);
      }
    }
  }
  for (const { directory, manifest } of entries) {
    const vendor = manifest.name.startsWith("@quirekit/cm-") || manifest.name === "@quirekit/lezer-markdown";
    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const name of Object.keys(manifest[section] ?? {})) if (isOfficialEditor(name)) {
        problems.push(`${manifest.name}: ${section} reintroduces ${name}`);
      }
    }
    if (vendor) {
      try {
        const upstream = JSON.parse(readFileSync(join(root, directory, "UPSTREAM.json"), "utf8"));
        const license = readFileSync(join(root, directory, "LICENSE"), "utf8");
        problems.push(...validateUpstream(upstream, license).map(issue => `${manifest.name}: ${issue}`));
        if (manifest.license !== upstream.license) problems.push(`${manifest.name}: license metadata mismatch`);
        for (const file of ["UPSTREAM.json", "LICENSE"]) if (!manifest.files?.includes(file)) {
          problems.push(`${manifest.name}: package omits ${file}`);
        }
      } catch (error) { problems.push(`${manifest.name}: ${error.message}`); }
    }
    // The graph gate covers every manifest; inspect source only for this product
    // family so unrelated applications do not add unbounded scan work here.
    if (vendor || /^(packages\/(?:msfe\/|md-editor\/)|apps\/msfe-)/.test(directory + "/")) {
      scan(join(root, directory));
    }
  }
  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  if (/patches\/@(?:codemirror__view|lezer__markdown)/.test(workspace)) problems.push("retired dist patch remains configured");
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const problems = checkVendors(resolve(import.meta.dirname, "../.."));
  if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; }
  else console.log("MSFE source provenance, preserved licenses and editor identities verified.");
}
