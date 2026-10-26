import { defineConfig } from "tsdown";
export default defineConfig([
  { entry: { index: "src/index.ts", browser: "src/browser/index.ts", markdown: "src/markdown/index.ts" }, format: "esm", fixedExtension: true, dts: true, outDir: "dist", clean: true },
  { entry: { runner: "src/runner/main.ts" }, format: "iife", platform: "browser", outDir: "dist/runner", clean: false, deps: { alwaysBundle: ["parse5", "entities"] } },
]);
