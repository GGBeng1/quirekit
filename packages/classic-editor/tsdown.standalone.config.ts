import { fileURLToPath } from "node:url";
import Vue from "unplugin-vue/rolldown";
import { defineConfig } from "tsdown";

const classicSourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  entry: {
    index: "src/distribution/standalone.ts",
    headless: "src/distribution/headless.ts"
  },
  format: "esm",
  platform: "browser",
  fixedExtension: true,
  dts: { vue: true },
  minify: true,
  sourcemap: false,
  clean: true,
  css: { fileName: "standalone-components.css" },
  outDir: "dist",
  outputOptions: {
    codeSplitting: {
      groups: [{
        name: "classic-vendor",
        test: /node_modules[\\/](?!.*\.d\.(?:c|m)?ts$)/u
      }, {
        name: "classic-vendor.d",
        test: /node_modules[\\/].*\.d\.(?:c|m)?ts$/u
      }]
    }
  },
  alias: { "@classic": classicSourceRoot },
  plugins: [Vue({ isProduction: true })],
  deps: {
    dts: {
      neverBundle: [/^vue$/, /^@vue\//]
    },
    alwaysBundle: [
      /^@quirekit\/ui\/vue$/,
      /^@ark-ui\/vue/,
      /^@zag-js\/vue$/,
      /^vue$/,
      /^@vue\//
    ]
  }
});
