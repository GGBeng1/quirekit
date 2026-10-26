import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";
import { actionSheetRecipeCatalog } from ".";

describe("ActionSheet delivery", () => {
  it("publishes touch targets and separate keyboard, disabled, and danger states in the consumer preset", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css, matched } = await generator.generate("");
    for (const name of actionSheetRecipeCatalog) expect(matched.has(name)).toBe(true);
    expect(css).toMatch(/\.qk-action-sheet__action[^{]*\{[^}]*min-height:var\(--qk-control-touch-target\)/u);
    expect(css).toMatch(/\.qk-action-sheet__cancel[^{]*\{[^}]*min-height:var\(--qk-control-touch-target\)/u);
    expect(css).toContain(".qk-action-sheet__action:focus-visible");
    expect(css).toContain(".qk-action-sheet__action:disabled");
    expect(css).toContain(".qk-action-sheet__action[data-danger]");
    const actionRules = css.split("\n").filter(line => line.includes(".qk-action-sheet__action")).join("\n");
    expect(actionRules).toMatch(/\.qk-action-sheet__action:not\(:active\):hover\[data-danger\]\{[^}]*background-color:var\(--qk-color-danger-hover-surface\)/u);
    expect(actionRules).toMatch(/\.qk-action-sheet__action:active\[data-danger\]\{[^}]*background-color:var\(--qk-color-danger-pressed-surface\)/u);
    expect(css).toContain("text-align:start");
    const cancelRules = css.split("\n").filter(line => line.includes(".qk-action-sheet__cancel")).join("\n");
    expect(cancelRules).not.toContain("background-color:");
    expect(css).toMatch(/\.qk-button--neutral-text[^:{]*\{[^}]*background-color:transparent/u);
    expect(css.split("\n").filter(line => /\.qk-button--neutral-text.*:(hover|active)/u.test(line)).join("\n")).not.toContain("background-color:");
  });
});
