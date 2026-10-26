import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";

describe("Clipboard recipe", () => {
  it("publishes selectable content and copied, disabled and keyboard focus states", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    expect(css).toContain(".qk-clipboard__input");
    expect(css).toContain(".qk-clipboard__trigger[data-copied]");
    expect(css).toContain(".qk-clipboard__trigger:disabled");
    expect(css).toContain(".qk-clipboard__trigger:focus-visible");
    expect(css).toContain(".qk-clipboard__error");
    expect(css).toContain("grid-area:1/1");
    expect(css).toContain(".qk-clipboard__labels>[data-hidden]");
  });
});
