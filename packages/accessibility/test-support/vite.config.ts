import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const config = JSON.parse(readFileSync(`${root}tsconfig.base.json`, "utf8"));
const paths = {
  ...config.compilerOptions.paths,
  "@quirekit/pm-schema-list": ["packages/pm/schema-list/src/schema-list.ts"]
} as Record<string, string[]>;

export default defineConfig({
  resolve: {
    // One source identity avoids races with another workspace build cleaning dist.
    alias: Object.entries(paths).filter(([name]) => !name.includes("*")).map(([name, entries]) => {
      const source = entries[0]!.replace("/dist/", "/src/").replace(/\.d\.mts$/, ".ts");
      return { find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
        replacement: `${root}${existsSync(`${root}${source}`) ? source : entries[0]!.replace(/\.d\.mts$/, ".mjs")}` };
    })
  },
  server: { host: "127.0.0.1", port: 8985, strictPort: true, fs: { allow: [root] } },
  test: { environment: "happy-dom" }
});
