import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { licenseHash, packageLicense, packageNoticeMarker, validateBoundaries, validateLicenses } from "./policy.mjs";

/**
 * Writes a minimal independent licensing fixture.
 * @param {string} root - Temporary root.
 * @param {string} path - Relative file.
 * @param {string} body - File contents.
 */
function write(root, path, body) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
}

/**
 * Builds valid MIT, AGPL and commercial packages without product build artifacts.
 * @param {object} context - Node test context managing cleanup.
 * @returns {object} Isolated valid repository, policy and workspace records.
 */
function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), "quirekit-license-test-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const policy = {
    defaultTier: "agpl",
    tiers: {
      mit: { rank: 0, metadata: "MIT", template: "licenses/MIT.txt" },
      agpl: { rank: 1, metadata: "AGPL-3.0-only", template: "licenses/AGPL-3.0-only.txt" },
      commercial: {
        rank: 2, metadata: "SEE LICENSE IN LICENSE.md", template: "licenses/Commercial.md", requirePrivate: true
      }
    },
    packages: { mit: ["@test/base"], commercial: ["@test/pro"] },
    boundaryBaseline: [], preservedLicenses: {}, noticeFile: "THIRD_PARTY_NOTICES.md"
  };
  const texts = { mit: "MIT license\n", agpl: "AGPL fixture\n", commercial: "Commercial fixture\n" };
  for (const [tier, text] of Object.entries(texts)) write(root, policy.tiers[tier].template, text);
  policy.tiers.agpl.templateSha256 = licenseHash(join(root, policy.tiers.agpl.template));
  write(root, policy.noticeFile, "Upstream notices\n");
  const entries = [
    { directory: "packages/base", manifest: { name: "@test/base", license: "MIT" } },
    { directory: "packages/editor", manifest: { name: "@test/editor", license: "AGPL-3.0-only" } },
    { directory: "packages/pro", manifest: { name: "@test/pro", license: "SEE LICENSE IN LICENSE.md", private: true } }
  ];
  for (const [index, entry] of entries.entries()) {
    entry.manifest.files = ["LICENSE.md", policy.noticeFile];
    write(root, `${entry.directory}/LICENSE.md`, Object.values(texts)[index]);
    write(root, `${entry.directory}/${policy.noticeFile}`, "Upstream notices\n");
  }
  return { root, policy, entries };
}

test("a mixed distribution retains independent MIT grants", (context) => {
  const { root, policy, entries } = fixture(context);
  entries[1].manifest.dependencies = { "@test/base": "workspace:*" };
  entries[2].manifest.dependencies = { "@test/editor": "workspace:*", "@test/base": "workspace:*" };
  assert.deepEqual(validateLicenses(root, policy, entries), []);
});

test("AGPL packages cannot depend on commercial packages outside the baseline", (context) => {
  const { policy, entries } = fixture(context);
  entries[1].manifest.dependencies = { "@test/pro": "workspace:*" };
  assert.match(validateBoundaries(policy, entries).join("\n"), /higher-tier \(commercial\) package @test\/pro/);
  policy.boundaryBaseline = ["@test/editor -> @test/pro"];
  assert.deepEqual(validateBoundaries(policy, entries), []);
});

test("baseline entries must shrink once the upward edge is removed", (context) => {
  const { policy, entries } = fixture(context);
  policy.boundaryBaseline = ["@test/editor -> @test/pro"];
  assert.match(validateBoundaries(policy, entries).join("\n"), /Stale boundary baseline entry/);
});

test("commercial packages must stay private", (context) => {
  const { root, policy, entries } = fixture(context);
  delete entries[2].manifest.private;
  assert.match(validateLicenses(root, policy, entries).join("\n"), /commercial packages must set "private": true/);
});

test("a package assigned to two tiers is rejected", (context) => {
  const { policy, entries } = fixture(context);
  policy.packages.commercial.push("@test/base");
  assert.match(validateBoundaries(policy, entries).join("\n"), /more than one tier/);
});

test("new packages default to AGPL rather than silently joining MIT", (context) => {
  const { policy } = fixture(context);
  assert.equal(packageLicense(policy, { directory: "packages/new", manifest: { name: "@test/new" } }).metadata,
    "AGPL-3.0-only");
});

test("MIT packages cannot gain higher-tier dependencies, optional dependencies or public peers", (context) => {
  const { policy, entries } = fixture(context);
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    entries[0].manifest[section] = { "@test/editor": "workspace:*" };
    assert.match(validateBoundaries(policy, entries).join("\n"), /higher-tier \(agpl\) package/);
    delete entries[0].manifest[section];
  }
  entries[0].manifest.dependencies = { renamed: "workspace:@test/editor@*" };
  assert.match(validateBoundaries(policy, entries).join("\n"), /higher-tier \(agpl\) package/);
});

test("missing policy packages and unresolved workspace edges fail closed", (context) => {
  const { policy, entries } = fixture(context);
  policy.packages.mit.push("@test/missing");
  entries[0].manifest.dependencies = { "@test/unknown": "workspace:*" };
  const errors = validateBoundaries(policy, entries).join("\n");
  assert.match(errors, /missing workspace package/);
  assert.match(errors, /unresolved workspace dependency/);
});

test("a stale MIT grant in an AGPL package is detected", (context) => {
  const { root, policy, entries } = fixture(context);
  write(root, "packages/editor/LICENSE.md", "MIT license\n");
  entries[1].manifest.license = "MIT";
  const errors = validateLicenses(root, policy, entries).join("\n");
  assert.match(errors, /license must be AGPL-3.0-only/);
  assert.match(errors, /stale or incomplete LICENSE/);
});

test("original third-party text and its MIT classification are protected", (context) => {
  const { root, policy, entries } = fixture(context);
  const path = "packages/base/LICENSE.md";
  policy.preservedLicenses[path] = licenseHash(join(root, path));
  write(root, path, "Changed author or grant\n");
  policy.packages.mit = [];
  const errors = validateLicenses(root, policy, entries).join("\n");
  assert.match(errors, /license changed or missing/);
  assert.match(errors, /outside the MIT tier/);
});

test("source check rejects missing notices, conflicting licenses and pack omissions", (context) => {
  const { root, policy, entries } = fixture(context);
  rmSync(join(root, "packages/editor/THIRD_PARTY_NOTICES.md"));
  write(root, "packages/editor/LICENSE", "An incompatible extra grant\n");
  entries[1].manifest.files = ["dist"];
  const errors = validateLicenses(root, policy, entries).join("\n");
  assert.match(errors, /ambiguous additional license/);
  assert.match(errors, /missing or stale THIRD_PARTY_NOTICES/);
  assert.match(errors, /files must include LICENSE/);
});

test("package notices may append their own section after the shared notices", (context) => {
  const { root, policy, entries } = fixture(context);
  write(root, "packages/base/THIRD_PARTY_NOTICES.md", `Upstream notices\n${packageNoticeMarker}\n## extra-lib\n`);
  assert.deepEqual(validateLicenses(root, policy, entries), []);
  write(root, "packages/base/THIRD_PARTY_NOTICES.md", "Upstream notices\n\n## unmarked extra-lib\n");
  assert.match(validateLicenses(root, policy, entries).join("\n"), /missing or stale THIRD_PARTY_NOTICES/);
});

test("the repository root carries the complete standard AGPL text", (context) => {
  const { root, policy, entries } = fixture(context);
  const repository = { directory: "", manifest: { name: "@test/root", license: "AGPL-3.0-only" } };
  write(root, "LICENSE.md", "AGPL fixture\n");
  assert.deepEqual(validateLicenses(root, policy, [...entries, repository]), []);
  write(root, "LICENSE.md", "See a custom license in another file.\n");
  assert.match(validateLicenses(root, policy, [...entries, repository]).join("\n"),
    /stale or incomplete LICENSE/);
});

test("a customized AGPL template is rejected even if every package copy matches", (context) => {
  const { root, policy, entries } = fixture(context);
  const customized = "AGPL fixture\nCommercial use requires separate permission.\n";
  write(root, policy.tiers.agpl.template, customized);
  write(root, "packages/editor/LICENSE.md", customized);
  assert.match(validateLicenses(root, policy, entries).join("\n"), /Standard license text changed/);
});
