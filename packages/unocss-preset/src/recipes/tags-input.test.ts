import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("TagsInput recipe", () => {
  it("publishes label, control, item, editing, and feedback anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain(".qk-tags-input__control");
    expect(result.css).toContain(".qk-tags-input__item-preview");
    expect(result.css).toContain(".qk-tags-input__item-input");
    expect(result.css).toContain(".qk-tags-input__message");
  });

  it("uses semantic invalid, highlighted, disabled, and focus states", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain("border-color:var(--qk-color-danger-border)");
    expect(result.css).toContain("[data-highlighted]");
    expect(result.css).toContain("[data-disabled]");
    expect(result.css).toContain(":focus-within");
  });
});
