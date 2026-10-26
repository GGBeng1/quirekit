import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Workspace root used by both package-consumer acceptance runners. */
export const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Resolves current workspace source while preserving the shared built PM identity.
 *
 * @param builtProduct - Whether to exercise the product's emitted public entry.
 * @returns Exact aliases matching the repository's TypeScript package map.
 */
export function createWorkspaceAliases(builtProduct = false) {
  const paths = JSON.parse(readFileSync(`${workspaceRoot}tsconfig.base.json`, "utf8"))
    .compilerOptions.paths as Record<string, string[]>;
  return Object.entries(paths).filter(([name]) => !name.includes("*")).map(([name, entries]) => ({
    find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    replacement: builtProduct && name === "@quirekit/block-editor"
      ? `${workspaceRoot}packages/block-editor/dist/index.mjs`
      : `${workspaceRoot}${entries[0]!.replace(/\.d\.mts$/, ".mjs")}`
  }));
}
