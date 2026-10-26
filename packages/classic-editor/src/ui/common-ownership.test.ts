import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** @param directory - Source boundary to inspect. @returns Maintained Vue and TypeScript leaves. */
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "image-gallery" ? [] : sources(path);
    return /\.(?:vue|ts)$/.test(path) && !path.endsWith(".test.ts") && entry.name !== "naive.ts" ? [path] : [];
  });
}

it("keeps Classic common controls and shell components independent from Naive", () => {
  const paths = [new URL("./", import.meta.url), new URL("../shell/components/", import.meta.url)]
    .flatMap(url => sources(fileURLToPath(url)));
  for (const path of paths) {
    const source = readFileSync(path, "utf8");
    expect(source, path).not.toMatch(/from\s+["'][^"']*naive[^"']*["']/);
    expect(source, path).not.toMatch(/<N[A-Z]\w*\b/);
  }
});
