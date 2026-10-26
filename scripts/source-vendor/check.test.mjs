import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isOfficialEditor, validateUpstream } from "./check.mjs";

const license = readFileSync(new URL("../../packages/cm/view/LICENSE", import.meta.url), "utf8");
const source = JSON.parse(readFileSync(new URL("../../packages/cm/view/UPSTREAM.json", import.meta.url), "utf8"));

test("source provenance preserves exact license bytes and an immutable commit", () => {
  assert.deepEqual(validateUpstream(source, license), []);
  assert(validateUpstream({ ...source, commit: "main" }, license).includes("upstream commit"));
  assert(validateUpstream(source, license + "\n").includes("license digest"));
  assert.equal(source.licenseSha256, createHash("sha256").update(license).digest("hex"));
});

test("only the owned editor identities are blocked; other Lezer parsers stay shared", () => {
  for (const name of ["@codemirror/state", "@codemirror/lang-html", "@codemirror/legacy-modes/mode/yaml", "@lezer/markdown"]) {
    assert.equal(isOfficialEditor(name), true);
  }
  for (const name of ["@lezer/common", "@lezer/html", "@quirekit/cm-state", "@quirekit/lezer-markdown"]) {
    assert.equal(isOfficialEditor(name), false);
  }
});
