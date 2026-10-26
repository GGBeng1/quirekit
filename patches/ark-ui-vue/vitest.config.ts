import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Runs the dependency patch checks without loading Quire adapters. */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@ark-ui/vue/menu": fileURLToPath(new URL("../../packages/ui/node_modules/@ark-ui/vue/dist/components/menu/index.js", import.meta.url)),
      vue: fileURLToPath(new URL("../../packages/ui/node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url))
    }
  },
  test: { include: ["*.test.ts"], environment: "happy-dom", maxWorkers: 1 }
});
