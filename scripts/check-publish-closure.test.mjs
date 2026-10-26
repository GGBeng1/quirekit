import assert from "node:assert/strict";
import test from "node:test";

import { collectPublishClosureViolations } from "./check-publish-closure.mjs";

/**
 * Creates one workspace record.
 *
 * @param {Record<string, unknown>} manifest - Package manifest fields.
 * @returns {{ manifest: Record<string, unknown> }} Workspace record.
 */
function entry(manifest) {
  return { manifest };
}

test("accepts published packages that depend on published packages", () => {
  assert.deepEqual(collectPublishClosureViolations([
    entry({ name: "@test/view", dependencies: { "@test/engine": "workspace:*" } }),
    entry({ name: "@test/engine" })
  ]), []);
});

test("rejects installable edges from a published package to a private package", () => {
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    assert.deepEqual(collectPublishClosureViolations([
      entry({ name: "@test/view", [section]: { "@test/engine": "workspace:*" } }),
      entry({ name: "@test/engine", private: true })
    ]), [`@test/view: ${section} includes private workspace package @test/engine`]);
  }
});

test("resolves workspace aliases to their real target", () => {
  assert.equal(collectPublishClosureViolations([
    entry({ name: "@test/view", dependencies: { engine: "workspace:@test/engine@*" } }),
    entry({ name: "@test/engine", private: true })
  ]).length, 1);
});

test("ignores private consumers and development-only edges", () => {
  assert.deepEqual(collectPublishClosureViolations([
    entry({ name: "@test/demo", private: true, dependencies: { "@test/engine": "workspace:*" } }),
    entry({ name: "@test/view", devDependencies: { "@test/engine": "workspace:*" } }),
    entry({ name: "@test/engine", private: true })
  ]), []);
});
