import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { progressStaticCss } from "./progress";

describe("Progress recipe", () => {
  it("publishes all shapes and preserves names when labels are visually hidden", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-progress__track");
    expect(result.css).toContain(".qk-progress__circle-range");
    expect(result.css).toContain(".qk-progress--spinner");
    const hiddenLabel = result.css.match(/\.qk-progress__label--hidden[^{}]*\{([^}]+)\}/u)?.[1];
    expect(hiddenLabel).toContain("clip:rect(0,0,0,0)");
    expect(hiddenLabel).not.toContain("display:none");
    expect(result.css).toContain("--qk-progress-color");
  });

  it("maps all progress fills to source-centered solid roles", () => {
    expect(progressStaticCss).toContain("var(--qk-color-action-primary)");
    expect(progressStaticCss).not.toMatch(/var\(--qk-color-[a-z]+-text\)/u);
    for (const family of ["info", "success", "warning", "danger"]) {
      expect(progressStaticCss).toContain(`var(--qk-color-${family}-solid)`);
    }
  });

  it("animates indeterminate shapes in either direction and respects reduced motion", () => {
    expect(progressStaticCss).toContain("qk-progress-linear");
    expect(progressStaticCss).toContain("qk-progress-circle");
    expect(progressStaticCss).toContain("[dir=rtl][data-state=indeterminate]{animation-name:qk-progress-linear-rtl}");
    expect(progressStaticCss).toContain("prefers-reduced-motion:reduce");
  });
});
