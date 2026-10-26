import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: [
    { find: "@quirekit/msfe-core/source-provider", replacement: fileURLToPath(new URL("../core/src/source-provider/index.ts", import.meta.url)) },
    { find: "@quirekit/msfe-core", replacement: fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) },
  ] },
  test: { include: ["src/**/*.test.ts"], environment: "happy-dom" },
});
