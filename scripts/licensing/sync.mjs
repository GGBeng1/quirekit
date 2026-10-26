import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { packageLicense, packageNotices, validateBoundaries, validateLicenseTemplates, validatePreservedLicenses } from "./policy.mjs";
import { readPolicy, readWorkspace } from "./workspace.mjs";

const root = resolve(import.meta.dirname, "../..");
const policy = readPolicy(root);
const entries = readWorkspace(root);
const errors = [
  ...validateLicenseTemplates(root, policy),
  ...validateBoundaries(policy, entries),
  ...validatePreservedLicenses(root, policy, entries)
];
if (errors.length > 0) throw new Error(errors.join("\n"));
const notices = readFileSync(join(root, policy.noticeFile), "utf8");

// Apply the checked-in legal decisions without reformatting unrelated manifest fields.
for (const entry of entries) {
  const expected = packageLicense(policy, entry);
  let source = entry.source;
  if (entry.manifest.license !== expected.metadata) {
    source = typeof entry.manifest.license === "string"
      ? source.replace(/("license"\s*:\s*)"[^"\n]*"/u, `$1${JSON.stringify(expected.metadata)}`)
      : source.replace(/^(\s*"version"\s*:\s*"[^"\n]+",)$/mu,
        `$1\n  "license": ${JSON.stringify(expected.metadata)},`);
  }
  if (Array.isArray(entry.manifest.files)) {
    const additions = [expected.file, policy.noticeFile]
      .filter((file) => !entry.manifest.files.includes(file));
    if (additions.length > 0) {
      source = source.replace(/("files"\s*:\s*\[)/u,
        `$1\n${additions.map((file) => `    ${JSON.stringify(file)},`).join("\n")}`);
    }
  }
  if (source !== entry.source) writeFileSync(join(root, entry.directory, "package.json"), source);
  if (expected.template) {
    writeFileSync(join(root, entry.directory, expected.file),
      readFileSync(join(root, expected.template)));
  }
  if (entry.directory !== "") {
    const noticePath = join(root, entry.directory, policy.noticeFile);
    writeFileSync(noticePath, packageNotices(notices, existsSync(noticePath) ? readFileSync(noticePath, "utf8") : undefined));
  }
}
process.stdout.write(`Synchronized license metadata and copies for ${entries.length} workspaces.\n`);
