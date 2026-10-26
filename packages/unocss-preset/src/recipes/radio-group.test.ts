import { describe, expect, it } from "vitest";
import { radioGroupRecipeCatalog, radioGroupShortcuts } from "./radio-group";

describe("RadioGroup recipe", () => {
  it("publishes two directions, five sizes, and stable selected marks", () => {
    expect(radioGroupRecipeCatalog).toContain("qk-radio-group__items--horizontal");
    expect(radioGroupRecipeCatalog).toContain("qk-radio-group--xs");
    expect(radioGroupRecipeCatalog).toContain("qk-radio-group--xl");
    expect(radioGroupRecipeCatalog).toContain("qk-radio-group__mark--selected");
    expect(radioGroupShortcuts.flatMap(shortcut => shortcut).join(" "))
      .toContain("rounded-full");
  });
});
