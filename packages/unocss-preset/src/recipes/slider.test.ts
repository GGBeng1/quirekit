import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { sliderRecipeCatalog } from "./slider";

describe("slider recipe", () => {
  it("uses a keyboard focus surface while keeping thumb geometry stable", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css, matched } = await generator.generate(sliderRecipeCatalog.join(" "));
    expect(matched.has("qk-slider__thumb")).toBe(true);
    const focus = css.match(/\.qk-slider__thumb:focus-visible\{[^}]+\}/u)?.[0];
    expect(focus).toContain("background-color:var(--qk-color-action-soft)");
    expect(focus).not.toMatch(/outline|border|box-shadow/);
    expect(css).not.toContain(".qk-slider__thumb:hover");
    expect(css).toContain("cursor:default");
    expect(css).toContain("height:0.375rem");
  });
});
