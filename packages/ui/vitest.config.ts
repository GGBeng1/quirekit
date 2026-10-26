import Vue from "unplugin-vue/vite";
import { defineConfig } from "vitest/config";

/** Runs public Vue adapters directly from their source components. */
export default defineConfig({
  plugins: [Vue()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
