import { describe, expect, it } from "vitest";
import { checkboxRecipeCatalog, checkboxShortcuts } from "./checkbox";
import { createGenerator } from "@unocss/core";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("Checkbox recipe", () => {
  it("keeps the hidden input in the checkbox containing block", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("qk-checkbox", { safelist: false });
    expect(css).toMatch(/\.qk-checkbox\{[^}]*position:relative/);
  });
  it("publishes checked, mixed, invalid, disabled, and five-size anatomy", () => {
    expect(checkboxRecipeCatalog).toContain("qk-checkbox__mixed-mark");
    expect(checkboxRecipeCatalog).toContain("qk-checkbox--invalid");
    expect(checkboxRecipeCatalog).toContain("qk-checkbox--xs");
    expect(checkboxRecipeCatalog).toContain("qk-checkbox--xl");
    expect(checkboxShortcuts.flatMap(shortcut => shortcut).join(" "))
      .toContain("data-[state=indeterminate]");
  });
});
