#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const artifactUrl = new URL(
  "../dist/view/shared/layout-jobs/worker/entry.mjs",
  import.meta.url
);

/** Verifies that the package build ships the deliberate module Worker entry. */
function main() {
  if (!existsSync(artifactUrl)) {
    throw new Error(`Missing layout Worker artifact: ${fileURLToPath(artifactUrl)}`);
  }
  const source = readFileSync(artifactUrl, "utf8");
  if (!source.includes('"remainder-pagination"')) {
    throw new Error("Layout Worker artifact does not register remainder pagination.");
  }
  if (source.includes('"background-shaping"')) {
    throw new Error("Layout Worker artifact must not register local-only background shaping.");
  }
  console.log("Layout Worker artifact check passed.");
}

main();
