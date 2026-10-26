import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import base from "./vitest.config";

/** Component mount harnesses that need a DOM and source-resolved UI packages. */
export default mergeConfig(base, {
  resolve: {
    alias: {
      "@quirekit/ui/vue": fileURLToPath(new URL("../ui/src/vue/index.ts", import.meta.url)),
      "@quirekit/ui": fileURLToPath(new URL("../ui/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.mount.ts"]
  }
});
