import { describe, expect, it } from "vitest";
import { fieldRecipeCatalog, fieldShortcuts } from "./field";

describe("field recipes", () => {
  it("publishes one unframed feedback-lane anatomy", () => {
    const shortcuts = JSON.stringify(fieldShortcuts);

    expect(fieldRecipeCatalog).toContain("qk-field__message--error");
    expect(fieldRecipeCatalog).toContain("qk-field__busy-indicator");
    expect(shortcuts).not.toContain("border-dashed");
    expect(shortcuts).not.toContain("cursor-progress");
    expect(shortcuts).not.toContain("bg-qk-danger");
  });
});
