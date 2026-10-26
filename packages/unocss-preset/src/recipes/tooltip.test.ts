import { createGenerator } from "@unocss/core";
import presetWind3 from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import { tooltipShortcuts } from "./tooltip";

describe("Tooltip recipe", () => {
  it("compiles a compact inverse overlay without an outline or ring", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: tooltipShortcuts
    });
    const result = await generator.generate(
      "qk-tooltip__positioner qk-tooltip__content qk-tooltip__arrow qk-tooltip__arrow-tip"
    );
    const contentRule = result.css.match(
      /\.qk-tooltip__content\{[^}]+\}/u
    )?.[0];

    expect(contentRule).toBeDefined();
    expect(contentRule).toContain(
      "background:var(--qk-tooltip-background)"
    );
    expect(contentRule).toContain(
      "border-radius:var(--qk-tooltip-radius)"
    );
    expect(contentRule).toContain(
      "box-shadow:var(--qk-tooltip-shadow)"
    );
    expect(contentRule).toContain("outline:0");
    expect(contentRule).not.toContain("--un-ring-");
  });

  it("keeps box shadow on the physical shell only", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: tooltipShortcuts
    });
    const result = await generator.generate(
      "qk-tooltip__content qk-tooltip__arrow qk-tooltip__arrow-tip"
    );
    const arrowRule = result.css.match(
      /\.qk-tooltip__arrow\{[^}]+\}/u
    )?.[0];
    const arrowTipRule = result.css.match(
      /\.qk-tooltip__arrow-tip\{[^}]+\}/u
    )?.[0];

    expect(arrowRule).toBeDefined();
    expect(arrowTipRule).toBeDefined();
    expect(arrowRule).toContain(
      "--arrow-size:var(--qk-tooltip-arrow-size)"
    );
    expect(arrowRule).toContain(
      "--arrow-background:var(--qk-tooltip-background)"
    );
    expect(arrowRule).not.toContain("box-shadow");
    expect(arrowTipRule).not.toContain("box-shadow");
  });

  it("uses the dedicated tooltip layer and reduced-motion fallback", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: tooltipShortcuts
    });
    const result = await generator.generate(
      "qk-tooltip__positioner qk-tooltip__content"
    );

    expect(result.css).toContain(
      "--z-index:var(--qk-tooltip-layer) !important"
    );
    expect(result.css).toContain("prefers-reduced-motion: reduce");
    expect(result.css).toContain("transition:none");
  });
});
