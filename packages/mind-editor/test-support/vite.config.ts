import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "@unocss/vite";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const paths = JSON.parse(readFileSync(`${root}tsconfig.base.json`, "utf8")).compilerOptions.paths as Record<string, string[]>;
export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  plugins: [vue(), UnoCSS({ configFile: fileURLToPath(new URL("./uno.config.ts", import.meta.url)) })],
  // Discover lazy third-party dependencies before editing starts so the first
  // file operation cannot trigger an optimizer reload and lose its result.
  // Local converters remain in the source graph for immediate invalidation.
  optimizeDeps: { include: ["@quirekit/mind-map > fflate", "@quirekit/mind-map > fast-xml-parser", "pdf-lib"] },
  resolve: { alias: [{ find: /^@quirekit\/mind-map\/xmind$/, replacement: `${root}packages/mind-map/src/xmind/index.ts` },
    ...Object.entries(paths).filter(([name]) => !name.includes("*")).map(([name, entries]) => ({
    find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), replacement: `${root}${entries[0]!}`,
  }))] },
  server: { host: "127.0.0.1", port: 8993, strictPort: true, fs: { allow: [root] } },
});
