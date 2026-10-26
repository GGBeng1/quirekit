import { defineConfig } from "vitest/config";
import { createWorkspaceAliases } from "./test-support/aliases";

export default defineConfig({
  resolve: { alias: createWorkspaceAliases() },
  test: { environment: "node", include: ["src/**/*.test.ts"] }
});
