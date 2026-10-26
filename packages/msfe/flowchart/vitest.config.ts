import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({ resolve: { alias: { "@quirekit/flowchart": fileURLToPath(new URL("../../flowchart/src/index.ts", import.meta.url)) } }, test: { include: ["src/**/*.test.ts"] } });
