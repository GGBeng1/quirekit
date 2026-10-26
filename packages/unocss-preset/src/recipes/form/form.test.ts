import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";
import { formRecipeCatalog } from "./form";

describe("form layout recipe", () => {
  it("generates every anatomy class with semantic gaps and wrapping actions", async () => {
    const uno = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await uno.generate(formRecipeCatalog.join(" "));
    for (const name of formRecipeCatalog) expect(css).toContain(`.${name}`);
    expect(css).toContain("flex-wrap:wrap");
    expect(css).toContain("min-width:0");
    expect(css).toMatch(/\.qk-form__control \.qk-select__control[^{}]*\{[^}]*width:100%/);
    expect(css).toContain("gap:var(--qk-");
    const actions = await uno.generate("qk-form__actions", { safelist: false });
    expect(actions.css).toMatch(/\.qk-form__actions\{[^}]*gap:var\(--qk-[^)]+\)/);
  });
});
