import { defineConfig } from "vitest/config";
import Vue from "unplugin-vue/vite";
import { createWorkspaceAliases } from "../block-editor/test-support/aliases";
export default defineConfig({ plugins: [Vue()], resolve: { alias: createWorkspaceAliases() }, test: { environment: "node", include: ["src/**/*.test.ts"] } });
