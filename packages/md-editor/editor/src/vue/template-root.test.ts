import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lists Vue single-file components below a directory.
 * @param directory - Directory to scan.
 * @returns Absolute component paths.
 */
function components(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? components(path) : entry.name.endsWith(".vue") ? [path] : [];
  });
}

describe("component template roots", () => {
  // A top-level HTML comment survives the build and turns the component into a fragment:
  // the parent's class, attributes and scoped-style id no longer reach the element, and node views lose their root.
  it("keeps comments inside the root element", () => {
    const offenders = components(import.meta.dirname)
      .filter(path => /<template>\s*<!--/u.test(readFileSync(path, "utf8")))
      .map(path => relative(import.meta.dirname, path));
    expect(offenders).toEqual([]);
  });
});
