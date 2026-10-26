import Vue from "unplugin-vue/rolldown";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "html-sandbox": "src/vue/html-sandbox/index.ts",
    vue: "src/vue/index.ts",
    chat: "src/vue/chat/index.ts"
  },
  format: "esm",
  platform: "browser",
  fixedExtension: true,
  dts: { vue: true },
  clean: true,
  outDir: "dist",
  plugins: [Vue({ isProduction: true })],
  deps: {
    dts: { neverBundle: [/^vue$/, /^@vue\//, /^@ark-ui\/vue/] },
    neverBundle: [/^vue$/, /^@vue\//, /^@ark-ui\/vue/]
  }
});
