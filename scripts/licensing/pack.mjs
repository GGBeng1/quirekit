import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { packageLicense, validateLicenses } from "./policy.mjs";
import { readPolicy, readWorkspace } from "./workspace.mjs";

const root = resolve(import.meta.dirname, "../..");
const policy = readPolicy(root);
const entries = readWorkspace(root);
const errors = validateLicenses(root, policy, entries);
if (errors.length > 0) throw new Error(errors.join("\n"));
const publishable = entries.filter((entry) => !entry.manifest.private);
let count = 0;

// Inspect npm's real pack list; a manifest allowlist alone cannot prove delivery.
for (const entry of publishable) {
  const expected = packageLicense(policy, entry);
  const packed = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
    cwd: join(root, entry.directory), encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }));
  const files = new Set(packed[0].files.map((file) => file.path));
  for (const file of ["package.json", expected.file, policy.noticeFile]) {
    if (!files.has(file)) errors.push(`${entry.manifest.name}: packed artifact omits ${file}`);
  }
  // An old root grant copied into dist can contradict the newly shipped root license.
  for (const file of files) {
    if (/^dist\/LICENSE(?:\.md|\.txt)?$/u.test(file)) {
      const actual = readFileSync(join(root, entry.directory, file), "utf8");
      const required = readFileSync(join(root, entry.directory, expected.file), "utf8");
      if (actual !== required) errors.push(`${entry.manifest.name}: stale license inside ${file}`);
    }
  }
  if (entry.manifest.name === "@quirekit/font-pack") {
    for (const exported of Object.values(entry.manifest.exports)) {
      if (typeof exported === "string" && exported.startsWith("./dist/licenses/")) {
        if (!files.has(exported.slice(2))) errors.push(`Font license missing from artifact: ${exported}`);
      }
    }
  }
  count += 1;
  if (count % 15 === 0) process.stdout.write(`Checked license delivery for ${count}/${publishable.length} npm artifacts.\n`);
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`License delivery verified for ${count} publishable npm pack lists; nothing published.\n`);
}
