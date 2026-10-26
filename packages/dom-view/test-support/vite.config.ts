import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const config = JSON.parse(readFileSync(`${root}tsconfig.base.json`, "utf8"));
const paths = config.compilerOptions.paths as Record<string, string[]>;

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  resolve: {
    // Exact aliases keep all consumers on current Core/extensions source while
    // preserving the repository's single built PM class identity.
    alias: Object.entries(paths).filter(([name]) => !name.includes("*")).map(([name, entries]) => ({
      find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      replacement: `${root}${entries[0]!.replace(/\.d\.mts$/, ".mjs")}`
    }))
  },
  server: { host: "127.0.0.1", port: 8984, strictPort: true, fs: { allow: [root] } }
});
