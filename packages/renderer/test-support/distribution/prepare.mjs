import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../../..");
const preview = mkdtempSync(join(tmpdir(), "quire-render-preview-"));
const archives = join(preview, "archives");
const source = join(preview, "source");
const consumer = join(preview, "consumer");
const records = [];
for (const directory of [archives, source, consumer]) mkdirSync(directory, { recursive: true });

/**
 * Runs an isolated distribution step, retaining useful failure output.
 * @param {string} command - Program to execute.
 * @param {string[]} args - Program arguments.
 * @param {string} cwd - Working directory, outside the repository for consumer checks.
 * @returns {string} Captured stdout.
 */
function run(command, args, cwd) {
  console.log(`${command} ${args.join(" ")}`);
  try {
    return execFileSync(command, args, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024
    });
  } catch (error) {
    process.stderr.write(`${error.stdout ?? ""}${error.stderr ?? ""}`);
    throw error;
  }
}

/**
 * Writes portable JSON without repository-specific absolute paths.
 * @param {string} path - Destination path.
 * @param {object} data - Serializable contents.
 */
function json(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Hashes an exact archive or rebuilt output.
 * @param {string} path - File path.
 * @returns {string} Hexadecimal SHA-256 digest.
 */
function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Pack only the two reviewed packages. pnpm resolves catalog/workspace metadata before extraction.
for (const name of ["render-contract", "renderer"]) {
  const directory = join(root, "packages", name);
  run("pnpm", ["--filter", `@quirekit/${name}`, "build"], root);
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  run("pnpm", ["pack", "--pack-destination", archives], directory);
  const archive = `quirekit-${name}-${manifest.version}.tgz`;
  const extracted = join(source, name);
  mkdirSync(extracted);
  run("tar", ["-xzf", join(archives, archive), "--strip-components=1", "-C", extracted], preview);
  const packed = JSON.parse(readFileSync(join(extracted, "package.json"), "utf8"));
  assert.equal(packed.license, "MIT");
  assert.doesNotMatch(JSON.stringify(packed), /workspace:|catalog:/u);
  assert.deepEqual(Object.keys(packed.dependencies ?? {}).sort(),
    name === "renderer" ? ["@quirekit/render-contract", "bidi-js"] : []);
  for (const file of ["LICENSE.md", "THIRD_PARTY_NOTICES.md", "tsconfig.json", "src/index.ts"]) {
    assert.equal(readFileSync(join(extracted, file), "utf8"), readFileSync(join(directory, file), "utf8"));
  }
  records.push({ name: packed.name, version: packed.version, license: packed.license, archive, sha256: hash(join(archives, archive)) });
}

const renderer = JSON.parse(readFileSync(join(source, "renderer/package.json"), "utf8"));
cpSync(join(import.meta.dirname, "fixture"), consumer, { recursive: true });
json(join(consumer, "package.json"), {
  name: "quire-render-preview-consumer", private: true, type: "module", license: "MIT",
  scripts: { test: "tsc -p tsconfig.json && node verify.mjs" },
  dependencies: Object.fromEntries(records.map((record) => [record.name, `file:../archives/${record.archive}`])),
  devDependencies: { typescript: renderer.devDependencies.typescript }
});
json(join(consumer, "tsconfig.json"), {
  compilerOptions: {
    target: "ES2022", lib: ["ES2022", "DOM"], module: "NodeNext", moduleResolution: "NodeNext",
    strict: true, skipLibCheck: false, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    verbatimModuleSyntax: true, types: [], outDir: "dist"
  },
  include: ["*.ts"]
});

// A real npm install detects unresolved dependencies that manually unpacking node_modules would hide.
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], consumer);
console.log(run("npm", ["test"], consumer).trim());
assert.doesNotMatch(readFileSync(join(consumer, "package-lock.json"), "utf8"), /"@quirekit\/(?:layout|view|pdf|classic|ofd-renderer)/u);

// Rebuild from packed sources with no root tsconfig, aliases or private dependencies available.
json(join(source, "package.json"), {
  name: "quire-render-preview-source", private: true, type: "module", license: "MIT",
  packageManager: `pnpm@${run("pnpm", ["--version"], root).trim()}`,
  scripts: {
    build: "pnpm --filter @quirekit/render-contract build && pnpm --filter @quirekit/renderer build",
    typecheck: "pnpm -r typecheck",
    test: "pnpm --filter @quirekit/renderer test"
  }
});
writeFileSync(join(source, "pnpm-workspace.yaml"), "packages:\n  - render-contract\n  - renderer\n");
writeFileSync(join(source, ".npmrc"), "link-workspace-packages=true\n");
const snapshots = ["render-contract", "renderer"].flatMap((name) =>
  ["index.mjs", "index.d.mts"].map((file) => ({ path: join(source, name, "dist", file), sha256: hash(join(source, name, "dist", file)) })));
for (const name of ["render-contract", "renderer"]) rmSync(join(source, name, "dist"), { recursive: true });
run("pnpm", ["install", "--ignore-scripts"], source);
run("pnpm", ["run", "build"], source);
run("pnpm", ["run", "typecheck"], source);
console.log(run("pnpm", ["test"], source).trim());
for (const snapshot of snapshots) assert.equal(hash(snapshot.path), snapshot.sha256, `Rebuild drift: ${snapshot.path}`);

// Keep only portable reviewed files. Unique output directories preserve prior preview artifacts.
cpSync(join(root, "licenses/MIT.txt"), join(preview, "LICENSE.md"));
cpSync(join(import.meta.dirname, "README.zh-CN.md"), join(preview, "README.zh-CN.md"));
cpSync(join(root, "THIRD_PARTY_NOTICES.md"), join(preview, "THIRD_PARTY_NOTICES.md"));
json(join(preview, "manifest.json"), {
  created: new Date().toISOString(), node: process.version, packages: records,
  verified: ["npm tarball installation", "strict declarations and legacy aliases", "Canvas calls and SVG output", "source rebuild and tests", "identical runtime and declaration hashes"],
  publication: "local-only; history, copyright and commercial terms review still required"
});
const outputRoot = join(root, "outputs/quire-render-preview");
mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(join(outputRoot, "preview-"));
cpSync(preview, output, { recursive: true, filter: (path) => !path.split(/[\\/]/u).includes("node_modules") });
run("tar", ["-czf", `${output}.tar.gz`, "-C", output, "."], outputRoot);
rmSync(preview, { recursive: true, force: true });
console.log(`Developer preview verified: ${output}\nArchive: ${output}.tar.gz\nNothing published.`);
