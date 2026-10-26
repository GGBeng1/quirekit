import { createGenerator } from "@unocss/core";
import presetWind3 from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import {
  accordionRecipeCatalog,
  accordionShortcuts
} from "./accordion";

describe("Accordion recipe", () => {
  it("compiles every public anatomy class", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: accordionShortcuts
    });
    const result = await generator.generate(accordionRecipeCatalog.join(" "));

    for (const className of accordionRecipeCatalog) {
      expect(result.css).toContain(`.${className}`);
    }
  });

  it("keeps focus feedback inside the physical trigger", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: accordionShortcuts
    });
    const result = await generator.generate("qk-accordion__trigger");

    expect(result.css).not.toContain("inset 0 0 0 2px");
    expect(JSON.stringify(accordionShortcuts)).toContain("data-[focus-visible]:bg-qk-surface-hover");
    expect(result.css).toContain("cursor:pointer");
    expect(result.css).toContain("cursor:not-allowed");
  });

  it("keeps expanded content away from every item edge", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      shortcuts: accordionShortcuts
    });
    const result = await generator.generate("qk-accordion__content-inner");

    expect(result.css).toContain("padding:0.75rem");
  });
});
