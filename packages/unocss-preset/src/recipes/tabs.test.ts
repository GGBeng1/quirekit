import { describe, expect, it } from "vitest";
import { tabsRecipeCatalog, tabsShortcuts } from "./tabs";

describe("tabs recipe", () => {
  it("publishes the complete anatomy catalog", () => {
    expect(tabsRecipeCatalog).toContain("qk-tabs__indicator");
    expect(tabsRecipeCatalog).toContain("qk-tabs__content");
  });

  it("keeps pointer and disabled cursor states explicit", () => {
    const trigger = tabsShortcuts.find(([name]) => name === "qk-tabs__trigger");
    expect(JSON.stringify(trigger)).toContain("cursor-pointer");
    expect(JSON.stringify(trigger)).toContain("data-[disabled]:cursor-not-allowed");
  });
});
