import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createWorkspaceAliases, workspaceRoot } from "./aliases";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  resolve: {
    // Exercise the built product entry while keeping its existing dependencies
    // on current source and the repository's single built PM class identity.
    alias: createWorkspaceAliases(true)
  },
  server: { host: "127.0.0.1", port: 8986, strictPort: true, fs: { allow: [workspaceRoot] } }
});
