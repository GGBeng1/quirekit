import { createGenerator } from "@unocss/core";
import { defineQuireKitUnoConfig } from "../preset/config";
import { describe, expect, it } from "vitest";
import { switchRecipeCatalog, switchShortcuts } from "./switch";

describe("Switch recipe", () => {
  it("publishes stable tracks with thumb edges inherited from the track", async () => {
    expect(switchRecipeCatalog).toContain("qk-switch__control--md");
    expect(switchRecipeCatalog).toContain("qk-switch__thumb--sm");
    const css = switchShortcuts.flatMap(shortcut => shortcut).join(" ");
    expect(css).toContain("relative inline-flex");
    expect(css).toContain("items-center");
    expect(css).toContain("p-0");
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const result = await generator.generate("qk-switch__thumb");
    expect(result.css).toContain("border-color:inherit");
    expect(css).toContain("data-[state=checked]:translate-x-3");
    expect(css).toContain("shadow-qk-raised");
    expect(css).toContain("data-[disabled]:shadow-none");
    expect(css).not.toContain("outline-qk-text-tertiary");
  });
});
