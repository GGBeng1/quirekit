import Vue from "unplugin-vue/vite";
import { defineConfig } from "vitest/config";

/** Verify product Vue components alongside source commands and extension contracts. */
export default defineConfig({ plugins: [Vue()], test: { environment: "node", include: ["src/**/*.test.ts"] } });
