import { describe, expect, it } from "vitest";
import { textareaRecipeCatalog, textareaShortcuts } from "./textarea";

describe("textarea recipe", () => {
  it("publishes every runtime anatomy class and non-overlapping count space", () => {
    const shortcutNames = textareaShortcuts.map(([name]) => name);

    expect(shortcutNames).toEqual(expect.arrayContaining([...textareaRecipeCatalog]));
    expect(shortcutNames).toContain("qk-textarea__field--resize-none");
    expect(shortcutNames).toContain("qk-textarea__field--counted");
    expect(shortcutNames).toContain("qk-textarea--embedded");
    expect(JSON.stringify(textareaShortcuts)).toContain("pb-6");
    expect(JSON.stringify(textareaShortcuts)).toContain("resize-y");
  });
});
