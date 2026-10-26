import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

/**
 * Resolves a repository-relative source file for Vite aliases.
 *
 * @param path - Repository-relative source path.
 * @returns Absolute file-system path for Vite resolution.
 */
function sourceAlias(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@quirekit/view-engine/test-support/layout",
        replacement: sourceAlias("packages/view-engine/test-support/layout/index.ts")
      },
      {
        find: /^@quirekit\/view-engine$/,
        replacement: sourceAlias("packages/view-engine/src/index.ts")
      },
      ...Object.entries({
      "@quirekit/clipboard": sourceAlias("packages/input/clipboard/src/index.ts"),
      "@quirekit/core": sourceAlias("packages/core/editor/src/index.ts"),
      "@quirekit/pm": sourceAlias("packages/pm/pm/src/index.ts"),
      "@quirekit/pm-collab": sourceAlias("packages/pm/collab/src/collab.ts"),
      "@quirekit/pm-commands": sourceAlias("packages/pm/commands/src/commands.ts"),
      "@quirekit/pm-history": sourceAlias("packages/pm/history/src/history.ts"),
      "@quirekit/pm-inputrules": sourceAlias("packages/pm/inputrules/src/index.ts"),
      "@quirekit/pm-keymap": sourceAlias("packages/pm/keymap/src/keymap.ts"),
      "@quirekit/pm-model": sourceAlias("packages/pm/model/src/index.ts"),
      "@quirekit/pm-state": sourceAlias("packages/pm/state/src/index.ts"),
      "@quirekit/pm-transform": sourceAlias("packages/pm/transform/src/index.ts"),
      "@quirekit/extension-text-style": sourceAlias(
        "packages/extensions/text-style/src/index.ts"
      ),
      "@quirekit/renderer": sourceAlias("packages/renderer/src/index.ts"),
      "@quirekit/starter-kit": sourceAlias("packages/core/starter-kit/src/index.ts"),
      "@quirekit/classic-field": sourceAlias("packages/classic/field/src/index.ts"),
      "@quirekit/classic-page": sourceAlias("packages/classic/page/src/index.ts"),
      "@quirekit/classic-table": sourceAlias("packages/classic/table/src/index.ts")
      }).map(([find, replacement]) => ({ find, replacement }))
    ]
  }
});
