#!/usr/bin/env node
// Packs every commercial package as a compiled-only tarball in `.release/commercial/`.
// Requires built packages (`pnpm build`). Nothing is published; see the release section of
// docs/changes/commercial-license-key/proposal.zh-CN.md for the full flow.
// Options: `--only @quirekit/a,@quirekit/b` limits the batch; `--offline` skips registry checks.

import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { readPolicy, readWorkspace } from "../../licensing/workspace.mjs";
import { compileArtifact, verifyArtifact } from "./artifact.mjs";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "../../..");
const out = join(root, ".release/commercial");
const option = (name) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const only = option("--only")?.split(",");
const offline = process.argv.includes("--offline");

const policy = readPolicy(root);
const licenseHeading = readFileSync(join(root, policy.tiers.commercial.template), "utf8").split("\n")[0];
const batch = readWorkspace(root).filter(({ directory, manifest }) =>
  directory.startsWith("packages/") && policy.packages.commercial.includes(manifest.name) && (!only || only.includes(manifest.name)));
const versions = new Map(batch.map(({ manifest }) => [manifest.name, manifest.version]));

/**
 * @param {string} name - Package name.
 * @param {string} version - Exact version.
 * @returns {Promise<boolean>} Whether that version is already on the public registry.
 */
async function onRegistry(name, version) {
  const result = await run("npm", ["view", `${name}@${version}`, "version", "--registry", "https://registry.npmjs.org/"]).catch(() => ({ stdout: "" }));
  return result.stdout.trim() === version;
}

/**
 * @param {object[]} items - Work items.
 * @param {number} limit - Maximum concurrent tasks.
 * @param {(item: object) => Promise<void>} task - Async work per item.
 * @returns {Promise<void>} Resolves when every item is done.
 */
async function forEachLimit(items, limit, task) {
  let next = 0;
  const worker = async () => { while (next < items.length) await task(items[next++]); };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const staging = mkdtempSync(join(tmpdir(), "quirekit-commercial-"));
const errors = [];
const external = new Map();

try {
  process.stdout.write(`Packing ${batch.length} commercial packages into ${out}\n`);
  await forEachLimit(batch, 6, async ({ directory, manifest: source }) => {
    // Phase 1: pnpm's own pack rewrites workspace protocols exactly as for open-source packages.
    const work = join(staging, source.name.replace("/", "__"));
    mkdirSync(work);
    const { stdout } = await run("pnpm", ["pack", "--json", "--pack-destination", work], { cwd: join(root, directory), maxBuffer: 64 * 1024 * 1024 });
    await run("tar", ["-xzf", JSON.parse(stdout).filename, "-C", work]);

    // Phase 2: strip source, minify, then verify the result before it may leave the staging area.
    const extracted = join(work, "package");
    const manifest = await compileArtifact(extracted);
    errors.push(...verifyArtifact(extracted, manifest, licenseHeading));
    for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.optionalDependencies })) {
      if (!name.startsWith("@quirekit/")) continue;
      if (versions.has(name)) {
        if (versions.get(name) !== version) errors.push(`${manifest.name}: depends on ${name}@${version}, batch has ${versions.get(name)}`);
      } else {
        external.set(`${name}@${version}`, manifest.name);
      }
    }
    await run("tar", ["-czf", join(out, `${basename(JSON.parse(stdout).filename)}`), "-C", work, "package"]);
  });

  // Phase 3: open-source dependencies must already be public at the exact version.
  if (!offline) {
    await forEachLimit([...external.keys()], 8, async (spec) => {
      const at = spec.lastIndexOf("@");
      if (!await onRegistry(spec.slice(0, at), spec.slice(at + 1))) errors.push(`${external.get(spec)}: ${spec} is not on npm`);
    });
  }

  if (errors.length > 0) {
    process.stderr.write(`${[...new Set(errors)].sort().join("\n")}\n\nCommercial pack failed: ${errors.length} problems.\n`);
    process.exitCode = 1;
  } else {
    const bytes = batch.reduce((sum, { manifest }) => sum + statSync(join(out, `${manifest.name.slice(1).replace("/", "-")}-${manifest.version}.tgz`)).size, 0);
    process.stdout.write(`Commercial pack passed: ${batch.length} tarballs, ${(bytes / 1024 / 1024).toFixed(1)} MB, ` +
      `${external.size} open-source dependencies ${offline ? "not checked (offline)" : "found on npm"}; nothing published.\n`);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
