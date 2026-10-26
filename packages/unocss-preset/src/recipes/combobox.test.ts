import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("Combobox recipe", () => {
  it("publishes sizes and borderless overlay treatment", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-combobox__control--xs qk-combobox__control--sm qk-combobox__control--md qk-combobox__content--border-none qk-combobox__content--border-subtle qk-combobox__group qk-combobox__group-label qk-combobox__item",
      { preflights: true }
    );

    expect(result.css).toContain(".qk-combobox__control--xs");
    expect(result.css).toContain(".qk-combobox__control--md");
    expect(result.css).toContain(".qk-combobox__content--border-none");
    expect(result.css).toContain("border-width:0");
    expect(result.css).toContain(".qk-combobox__content--border-subtle");
    expect(result.css).toContain("cursor:pointer");
    expect(result.css).toContain("min-height:var(--qk-control-size-height)");
    expect(result.css).toContain("padding-block:max(0px, calc((var(--qk-control-size-height) - var(--qk-control-size-line-height)) / 2))");
    expect(result.css).toContain("font-size:var(--qk-type-helper-font-size)");
    expect(result.css).toContain("color:var(--qk-color-text-primary)");
    expect(result.css).toContain("font-weight:var(--qk-type-control-font-weight)");
    expect(result.css).toContain("margin-top:var(--qk-space-inline-tight)");
  });
});
