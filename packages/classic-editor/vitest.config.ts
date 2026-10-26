import { fileURLToPath } from "node:url";
import Vue from "unplugin-vue/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      "@classic": fileURLToPath(new URL("./src", import.meta.url)),
      "@quirekit/web-fonts": fileURLToPath(
        new URL("../web-fonts/src/index.ts", import.meta.url)
      )
    }
  }
});
