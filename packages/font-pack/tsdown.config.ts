import { defineConfig } from "tsdown";
export default defineConfig({ entry: { index: "src/index.ts", "pdf/index": "src/pdf/index.ts", "pdf/browser": "src/pdf/browser.ts" }, format: "esm", fixedExtension: true, dts: true, clean: true, outDir: "dist" });
