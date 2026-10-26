import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", styles: "src/styles.css" },
  format: "esm", fixedExtension: true, dts: true, clean: true,
  deps: { neverBundle: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/], dts: { neverBundle: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] } },
});
