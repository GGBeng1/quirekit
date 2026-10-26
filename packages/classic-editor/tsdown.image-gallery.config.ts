import { fileURLToPath } from "node:url";
import Vue from "unplugin-vue/rolldown";
import { defineConfig } from "tsdown";

const classicSourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  entry: { "image-gallery": "src/distribution/image-gallery.ts" },
  format: "esm",
  platform: "browser",
  fixedExtension: true,
  dts: true,
  minify: true,
  sourcemap: false,
  clean: false,
  css: { fileName: "image-gallery-components.css" },
  outDir: "dist",
  outputOptions: {
    codeSplitting: {
      groups: [{
        name: "image-gallery-vendor",
        test: /node_modules[\\/](?!.*\.d\.(?:c|m)?ts$)/u
      }, {
        name: "image-gallery-vendor.d",
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
    neverBundle: [/^vue$/, /^@vue\//],
    alwaysBundle: []
  }
});
