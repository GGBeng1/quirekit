import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { avatarStaticCss } from "./avatar";

describe("Avatar recipe", () => {
  it("publishes image, fallback, status, and group anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-avatar__surface");
    expect(result.css).toContain(".qk-avatar__status--online");
    expect(result.css).toContain(".qk-avatar-group__overflow");
  });

  it("keeps every size and group overlap in preset-owned CSS", () => {
    for (const size of ["xs", "sm", "md", "lg", "xl"]) {
      expect(avatarStaticCss).toContain(`.qk-avatar--${size}`);
    }
    expect(avatarStaticCss).toContain("margin-inline-start:-8px");
  });
});
