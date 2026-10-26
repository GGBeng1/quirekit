import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { splitterShortcuts } from "./splitter";

describe("Splitter recipe", () => {
  it("publishes panels and orientation-aware resize handles", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-splitter__panel");
    expect(result.css).toContain(".qk-splitter__handle");
    expect(result.css).toContain("[data-orientation=horizontal]");
    expect(result.css).toContain("[data-orientation=vertical]");
  });

  it("keeps drag, focus and disabled states distinct", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain("[data-dragging]");
    expect(result.css).toContain("[data-focus]");
    expect(result.css).toContain("[data-disabled]");
  });

  it("separates the one-pixel visual divider from the pointer hit area", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-splitter__handle--sm[data-orientation=horizontal]");
    expect(result.css).toContain("width:1px");
    expect(result.css).toContain(".qk-splitter__indicator");
    expect(result.css).toContain("background-color:var(--qk-color-border-subtle)");
    expect(result.css).toContain(
      ".qk-splitter__handle--line:not([data-disabled]):hover .qk-splitter__indicator"
    );
  });

  it("publishes hidden-until-interaction and grip handle variants", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-splitter__handle--hover-line");
    expect(result.css).toContain(".qk-splitter__handle--grip");
    expect(result.css).toContain(".qk-splitter__handle--custom");
    expect(result.css).toContain("width:8px;height:36px");
    expect(result.css).toContain("opacity:0;transform:scale(.88)");
    expect(result.css).toContain("opacity:1;transform:scale(1)");
  });

  it("leaves indicator backgrounds to state-aware static rules", () => {
    const indicatorShortcut = splitterShortcuts.find(
      ([name]) => name === "qk-splitter__indicator"
    );
    const markShortcut = splitterShortcuts.find(
      ([name]) => name === "qk-splitter__indicator-mark"
    );

    expect(String(indicatorShortcut?.[1])).not.toContain("bg-transparent");
    expect(String(markShortcut?.[1])).not.toContain("bg-transparent");
  });

  it("keeps the hover-bar hit strip present while the mark alone changes visibility", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("", { preflights: true });
    expect(css).toMatch(/\.qk-splitter__handle--hover-bar\[data-orientation=horizontal\]\{[^}]*min-width:/);
    expect(css).toMatch(/\.qk-splitter__handle--hover-bar\[data-orientation=vertical\]\{[^}]*min-height:/);
    expect(css).toContain("width:4px;height:32px");
    expect(css).toContain("width:32px;height:4px");
    for (const state of [":hover", ":focus-visible", "[data-dragging]"]) {
      expect(css).toContain(`.qk-splitter__handle--hover-bar:not([data-disabled])${state} .qk-splitter__indicator-mark`);
    }
    expect(css).toContain("@media (hover:none)");
    expect(css).not.toMatch(/\.qk-splitter__handle--hover-bar\{[^}]*opacity:0/);
  });

  it("matches pointer hover to the registry hit margin without retaining mouse focus color", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("", { preflights: true });
    expect(css).toContain('.qk-splitter__handle:not([data-disabled])::before');
    expect(css).toContain("inset:0 -5px");
    expect(css).toContain("inset:-5px 0");
    expect(css).not.toContain(".qk-splitter__indicator[data-focus]");
    for (const variant of ["line", "hover-line", "hover-bar", "grip"]) {
      expect(css).toContain(`.qk-splitter__handle--${variant}:not([data-disabled]):focus-visible`);
    }
  });
});
