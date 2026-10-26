import { describe, expect, it } from "vitest";

declare global {
  /** Import metadata extended by Vitest's Vite transform. */
  interface ImportMeta {
    /**
     * Expands module paths that match a static glob pattern.
     *
     * @param pattern - Static glob pattern to expand.
     * @param options - Glob loading options used by the test.
     * @returns Matched module paths keyed to loaded module values.
     */
    glob(
      pattern: string,
      options: { readonly eager: true; readonly import: string; readonly query: string }
    ): Record<string, unknown>;
  }
}

const allowedRootProductionModules = new Set(["index.ts"]);
const rootTypeScriptModules = import.meta.glob("../*.ts", {
  eager: true,
  import: "default",
  query: "?raw"
});
const domainEntryModules = import.meta.glob(
  "../{display-list,document,geometry,input,interaction,invalidation,layout,overlay,text,view,view-graph}/index.ts",
  {
    eager: true,
    import: "default",
    query: "?raw"
  }
);
const domainProductionModules = import.meta.glob(
  "../{display-list,document,geometry,input,interaction,invalidation,layout,overlay,text,view,view-graph}/*.ts",
  {
    eager: true,
    import: "default",
    query: "?raw"
  }
);
const entrypointDeclarationPattern =
  /\bexport\s+(?:class|function|interface|type)\s+[A-Za-z_$]/;
const typeDeclarationPattern = /\bexport\s+(?:interface|type)\s+[A-Za-z_$]/;

/**
 * Returns the final path segment for a module path.
 *
 * @param modulePath - Module path returned by Vite glob expansion.
 * @returns The module filename.
 */
function basename(modulePath: string): string {
  return modulePath.split("/").at(-1) ?? modulePath;
}

/**
 * Returns raw module source text from a Vite raw import value.
 *
 * @param moduleSource - Raw import value returned by Vite glob expansion.
 * @returns Source text for the matched module.
 */
function getRawModuleSource(moduleSource: unknown): string {
  return typeof moduleSource === "string" ? moduleSource : "";
}

/**
 * Lists production TypeScript modules that live directly under the source root.
 *
 * @returns Direct child production module filenames.
 */
function listRootProductionModules(): string[] {
  return Object.keys(rootTypeScriptModules)
    .map((entry) => basename(entry))
    .filter((entry) => !entry.endsWith(".test.ts"))
    .filter((entry) => !entry.endsWith(".d.ts"));
}

describe("canvas view source structure", () => {
  it("keeps canvas domain modules inside focused directories", () => {
    const flatDomainModules = listRootProductionModules()
      .filter((entry) => !allowedRootProductionModules.has(entry))
      .map((entry) => basename(entry));

    expect(flatDomainModules).toEqual([]);
  });

  it("keeps domain entrypoints as barrel modules only", () => {
    const entrypointsWithDeclarations = Object.entries(domainEntryModules)
      .filter(([, source]) =>
        entrypointDeclarationPattern.test(getRawModuleSource(source))
      )
      .map(([modulePath]) => modulePath);

    expect(entrypointsWithDeclarations).toEqual([]);
  });

  it("keeps exported type declarations in types modules", () => {
    const misplacedTypeDeclarations = Object.entries(domainProductionModules)
      .filter(([, source]) =>
        typeDeclarationPattern.test(getRawModuleSource(source))
      )
      .map(([modulePath]) => modulePath)
      .filter((modulePath) => basename(modulePath) !== "types.ts");

    expect(misplacedTypeDeclarations).toEqual([]);
  });
});
