import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { inspectorRecipeCatalog, inspectorShortcuts } from "./inspector";

describe("inspector recipe", () => {
  it("anchors optional status and footer around the independently scrolling body", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");

    expect(css).toMatch(/\.qk-inspector\{[^}]*grid-template-rows:auto auto minmax\(0,1fr\) auto/);
    expect(css).toMatch(/\.qk-inspector\{[^}]*max-width:100%/);
    // Hidden native form inputs must be contained by this scrolling surface,
    // not by a positioned product sidebar outside its clipping boundary.
    expect(css).toMatch(/\.qk-inspector\{[^}]*position:relative/);
    expect(css).toMatch(/\.qk-inspector\{[^}]*overflow:clip/);
    expect(css).toMatch(/\.qk-inspector__header\{[^}]*grid-row-start:1/);
    expect(css).toMatch(/\.qk-inspector__status\{[^}]*grid-row-start:2/);
    expect(css).toMatch(/\.qk-inspector__body\{[^}]*grid-row-start:3/);
    expect(css).toMatch(/\.qk-inspector__body\{[^}]*min-height:0/);
    expect(css).toMatch(/\.qk-inspector__body\{[^}]*overflow-y:auto/);
    expect(css).toMatch(/\.qk-inspector__body\{[^}]*position:relative/);
    expect(css).toMatch(/\.qk-inspector__footer\{[^}]*grid-row-start:4/);
    expect(css).toMatch(/\.qk-inspector\{[^}]*border-left-width:1px/);
    expect(css).toMatch(/\.qk-inspector--embedded\.qk-inspector\{[^}]*border-width:0(?:px)?/);
    expect(css).toMatch(/\.qk-inspector--embedded\.qk-inspector\{[^}]*background-color:transparent/);
  });

  it("publishes a retained panel with one status lane and structural section boundaries", () => {
    const shortcuts = JSON.stringify(inspectorShortcuts);

    expect(inspectorRecipeCatalog).toContain("qk-inspector__status--error");
    expect(inspectorRecipeCatalog).toContain("qk-inspector__section");
    expect(inspectorRecipeCatalog).toContain("qk-inspector--embedded");
    expect(shortcuts).toContain("min-w-0 max-w-full");
    expect(shortcuts).toContain("overflow-y-auto");
    expect(shortcuts).toContain("overflow-clip");
    expect(shortcuts).toContain("first:border-t-0");
    expect(shortcuts).not.toContain("border-dashed");
    expect(shortcuts).not.toContain("cursor-progress");
  });
});
