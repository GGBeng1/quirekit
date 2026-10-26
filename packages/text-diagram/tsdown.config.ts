import { defineConfig } from "tsdown";
export default defineConfig([
  { entry: { index: "src/index.ts", browser: "src/browser/index.ts" }, format: "esm", fixedExtension: true, dts: true, outDir: "dist", clean: true,
    plugins: [{ name: "diagram-asset-location",
      /** @param code - Source module. @param id - Resolved source path. @returns Asset path relocated beside the published browser entry. */
      transform(code, id) { if (id.endsWith("/browser/isolated.ts")) return code.replace("../../dist/diagram-frame.iife.js", "./diagram-frame.iife.js"); },
    }] },
  { entry: { "diagram-frame": "src/browser/frame.ts" }, format: "iife", platform: "browser", outDir: "dist", clean: false,
    deps: { alwaysBundle: ["@plantuml/core", "@viz-js/viz"] }, minify: true },
]);
