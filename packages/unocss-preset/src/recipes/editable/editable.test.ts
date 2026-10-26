import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";

describe("Editable recipe", () => {
  it("ships preview, input and accessible operation states in standalone CSS", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    expect(css).toContain(".qk-editable__preview");
    expect(css).toContain(".qk-editable__input");
    expect(css).toContain(".qk-editable__label[data-hidden]");
    expect(css).toContain(".qk-editable__action:focus-visible");
    expect(css).toContain(".qk-editable__message[data-invalid]");
  });
});
