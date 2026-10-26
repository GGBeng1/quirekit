#!/usr/bin/env node
// Installs every publishable package from its real `pnpm pack` tarball into a throwaway
// consumer project, then loads each export the way an application would. Requires built
// packages (`pnpm build`) and network or store access for third-party dependencies.
// Nothing is published. Pass `--keep` to leave the consumer project for inspection.

import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { readWorkspace } from "../licensing/workspace.mjs";
import { checkPackedFiles, collectEntries } from "./install/entries.mjs";
import { runtimeSkips, thirdPartyExtensions } from "./install/allowances.mjs";
import { checkDeclarations } from "./install/types.mjs";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const keep = process.argv.includes("--keep");
const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/**
 * Runs `task` over `items` with bounded concurrency, preserving input order in the result.
 * @template T, R
 * @param {T[]} items - Work items.
 * @param {number} limit - Maximum concurrent tasks.
 * @param {(item: T) => Promise<R>} task - Async work per item.
 * @returns {Promise<R[]>} Results in input order.
 */
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Environment for child pnpm/node processes without the parent run's `npm_config_*`
 * overrides, so the consumer's own `.npmrc` decides resolution.
 * @returns {NodeJS.ProcessEnv} Sanitized environment.
 */
function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/iu.test(key)));
}

const workspace = mkdtempSync(join(tmpdir(), "quirekit-install-check-"));
const tarballs = join(workspace, "tarballs");
const consumer = join(workspace, "consumer");
mkdirSync(tarballs);
mkdirSync(consumer);
const publishable = readWorkspace(root).filter((entry) => !entry.manifest.private);
const errors = [];
let exitCode = 0;

try {
  // Phase 1: real tarballs, so `files`, protocol rewriting and pack ignores match what npm receives.
  process.stdout.write(`Packing ${publishable.length} publishable packages into ${tarballs}\n`);
  const packed = await mapLimit(publishable, 8, async (entry) => {
    const { stdout } = await run("pnpm", ["pack", "--json", "--pack-destination", tarballs], {
      cwd: join(root, entry.directory), env: cleanEnv(), maxBuffer: 64 * 1024 * 1024
    });
    return { name: entry.manifest.name, file: join(tarballs, basename(JSON.parse(stdout).filename)) };
  });

  // Phase 2: a plain consumer that pins every @quirekit edge to the local tarballs. `hoist=false`
  // keeps pnpm's hidden hoisting from satisfying dependencies a package forgot to declare.
  const local = Object.fromEntries(packed.map(({ name, file }) => [name, `file:${file}`]));
  const typescript = rootManifest.devDependencies.typescript;
  writeFileSync(join(consumer, "package.json"), `${JSON.stringify({
    name: "quirekit-install-check", private: true, type: "module",
    packageManager: rootManifest.packageManager,
    dependencies: local, devDependencies: { typescript }, pnpm: { overrides: local, packageExtensions: thirdPartyExtensions }
  }, null, 2)}\n`);
  writeFileSync(join(consumer, ".npmrc"), [
    "registry=https://registry.npmjs.org/", "auto-install-peers=true", "strict-peer-dependencies=false", "hoist=false", ""
  ].join("\n"));
  process.stdout.write("Installing tarballs with pnpm install --ignore-scripts\n");
  await run("pnpm", ["install", "--ignore-scripts", "--reporter=append-only"], {
    cwd: consumer, env: cleanEnv(), maxBuffer: 256 * 1024 * 1024
  }).catch((error) => {
    throw new Error(`pnpm install failed:\n${error.stdout}\n${error.stderr}`);
  });

  // Phase 3: manifest residue and export targets, read from the installed packed manifests.
  const packages = packed.map(({ name }) => {
    const directory = join(consumer, "node_modules", name);
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    const collected = collectEntries(directory, manifest);
    errors.push(...collected.errors, ...checkPackedFiles(directory, manifest, collected.entries));
    return { name, entries: collected.entries };
  });

  // Phase 4: load JS entries in fresh Node processes; CSS imports are stubbed as a bundler
  // would, and entries that need a browser are listed in allowances.mjs.
  copyFileSync(join(import.meta.dirname, "install/probe.mjs"), join(consumer, "probe.mjs"));
  const unusedSkips = new Set(Object.keys(runtimeSkips));
  let loaded = 0;
  await mapLimit(packages, 8, async ({ entries }) => {
    const loadable = entries.filter((entry) => {
      if (entry.kind !== "import" && entry.kind !== "require") return false;
      if (!(entry.specifier in runtimeSkips)) return true;
      unusedSkips.delete(entry.specifier);
      return false;
    });
    if (loadable.length === 0) return;
    const { stdout } = await run(process.execPath, ["probe.mjs", JSON.stringify(loadable)], {
      cwd: consumer, env: cleanEnv(), timeout: 120_000, maxBuffer: 16 * 1024 * 1024
    }).catch((error) => ({ stdout: JSON.stringify([{ specifier: loadable[0].specifier, error: `probe crashed: ${error.message.split("\n")[0]}` }]) }));
    const failures = JSON.parse(stdout);
    loaded += loadable.length - failures.length;
    errors.push(...failures.map(({ specifier, error }) => `${specifier}: ${error}`));
  });
  for (const specifier of unusedSkips) errors.push(`allowances.mjs lists ${specifier}, which no package exports or loads`);

  // Phase 5: declaration resolution under NodeNext, covering skipped runtime entries too.
  process.stdout.write("Resolving declarations with tsc (moduleResolution NodeNext)\n");
  const typed = packages.flatMap(({ entries }) => entries.filter((entry) => entry.types));
  errors.push(...await checkDeclarations(consumer, typed));

  const total = packages.reduce((sum, { entries }) => sum + entries.length, 0);
  if (errors.length > 0) {
    process.stderr.write(`${[...new Set(errors)].sort().join("\n")}\n\nInstall check failed: ${errors.length} problems.\n`);
    exitCode = 1;
  } else {
    process.stdout.write(`Install check passed: ${packages.length} tarballs installed, ${total} exports, ` +
      `${loaded} loaded in Node, ${Object.keys(runtimeSkips).length} browser-only, ${typed.length} declarations resolved; nothing published.\n`);
  }
} finally {
  if (keep) process.stdout.write(`Kept ${workspace}\n`);
  else rmSync(workspace, { recursive: true, force: true });
}
process.exitCode = exitCode;
