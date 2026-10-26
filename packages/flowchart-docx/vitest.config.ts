import { defineConfig } from "vitest/config";
export default defineConfig({ resolve: { alias: {
  "@quirekit/flowchart": new URL("../flowchart/src/index.ts", import.meta.url).pathname,
  "@quirekit/media": new URL("../media/src/index.ts", import.meta.url).pathname,
  "@quirekit/lit-docx-contract": new URL("../lit-docx-contract/src/index.ts", import.meta.url).pathname,
  "@quirekit/lit-docx": new URL("../lit-docx/src/index.ts", import.meta.url).pathname,
} }, test: { include: ["src/**/*.test.ts"] } });
