// @vitest-environment node
import { createRequire } from "node:module";
import { expect, it } from "vitest";

const require = createRequire(new URL("../../packages/ui/package.json", import.meta.url));
const families = [
  "color-picker", "combobox", "date-picker", "dialog", "drawer", "floating-panel",
  "hover-card", "menu", "popover", "select", "tooltip", "tour"
];

it.each(families)("declares both Presence events in %s ESM and CJS Roots", async (family) => {
  const name = `${family.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("")}Root`;
  const esm = await import(require.resolve(`@ark-ui/vue/${family}`).replace(/index\.cjs$/, "index.js"));
  const cjs = require(`@ark-ui/vue/${family}`);
  for (const entry of [esm, cjs]) {
    expect(entry[name].emits.filter((event: string) => event === "enterComplete")).toHaveLength(1);
    expect(entry[name].emits.filter((event: string) => event === "exitComplete")).toHaveLength(1);
  }
});
