import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", vue: "src/vue/index.ts" },
  format: "esm",
  platform: "browser",
  fixedExtension: true,
  dts: true,
  clean: true,
  external: ["vue"]
});
