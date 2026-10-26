import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { collectQuireCssRulesByPrelude } from "../../test-support/css-rules";
import { dialogRecipeCatalog, dialogShortcuts, dialogStaticCss } from "./dialog";

describe("dialog recipes", () => {
  it("uses neutral status text and reserves danger text for alerts", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    const statusRules = collectQuireCssRulesByPrelude(css, ["qk-dialog__status"]);

    expect(statusRules).toMatch(/\.qk-dialog__status\{[^}]*color:var\(--qk-color-text-secondary\)/);
    expect(statusRules).toMatch(/\.qk-dialog__status\[role=alert\][^{]*\{[^}]*color:var\(--qk-color-danger-foreground\)/);
    const closeRules = css.split("\n").filter(line => line.includes(".qk-dialog__close-trigger"));
    expect(closeRules.join("\n")).toContain("background-color:transparent");
    expect(closeRules.filter(line => /:(hover|active|focus-visible)/u.test(line)).join("\n")).not.toContain("background-color:");
    expect(closeRules.join("\n")).toContain(":focus-visible");
  });

  it("publishes fixed task scales without decorative borders", () => {
    const shortcuts = JSON.stringify(dialogShortcuts);

    expect(dialogRecipeCatalog).toContain("qk-dialog__content--small");
    expect(dialogRecipeCatalog).toContain("qk-dialog__content--medium");
    expect(dialogRecipeCatalog).toContain("qk-dialog__content--large");
    expect(shortcuts).toContain("shadow-qk-modal");
    expect(shortcuts).toContain("border-0");
    expect(shortcuts).not.toContain("cursor-progress");
  });

  it("does not override the visual state of footer close actions", () => {
    const actionTrigger = dialogShortcuts.find(
      ([name]) => name === "qk-dialog__action-trigger"
    );

    expect(actionTrigger).toBeDefined();
    expect(JSON.stringify(actionTrigger)).not.toContain("hover:");
    expect(JSON.stringify(actionTrigger)).not.toContain("bg-qk-");
  });

  it("publishes entry, exit, and reduced-motion animation contracts", () => {
    expect(dialogStaticCss).toContain("qk-dialog-content-enter");
    expect(dialogStaticCss).toContain("qk-dialog-content-exit");
    expect(dialogStaticCss).toContain("prefers-reduced-motion:reduce");
    expect(dialogStaticCss).toContain("--qk-motion-overlay-duration");
  });
});
