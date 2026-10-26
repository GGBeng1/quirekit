import { defineConfig } from "tsdown";
export default defineConfig({ entry: { index: "src/index.ts", fonts: "src/fonts/index.ts" }, format: "esm", fixedExtension: true, dts: true, clean: true });
