import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createToolbarTokens } from "./create";
import {
  resolveToolbarNavigationTarget,
  resolveToolbarTabStop
} from "./navigation";
import {
  createToolbarCssVariables,
  toolbarCssVariableNames,
  toolbarVariableReferences
} from "./variables";

describe("Toolbar component contract", () => {
  it("derives dense editor actions from semantic theme roles", () => {
    const theme = createTheme({ scheme: "dark" });
    const tokens = createToolbarTokens(theme);

    expect(tokens.geometry.itemHeight).toBe(theme.control.default);
    expect(tokens.geometry.iconSize).toBe(theme.control.icon);
    expect(tokens.geometry.splitDisclosureWidth).toBe(theme.control.icon);
    expect(tokens.color.surface).toBe(theme.color.surface.chrome);
    expect(tokens.color.hoverBackground).toBe(theme.color.surface.hover);
    expect(tokens.color.selectedBackground).toBe(theme.color.surface.selected);
    expect(tokens.color.focusBorder).toBe(theme.color.border.focus);
    expect(JSON.stringify(tokens)).not.toContain("shadow");
    expect(JSON.stringify(tokens)).not.toContain("outline");
  });

  it("projects only explicit Toolbar CSS variables", () => {
    const declarations = createToolbarCssVariables(
      createToolbarTokens(createTheme())
    );

    expect(declarations).toHaveProperty(
      toolbarCssVariableNames.geometry.itemHeight,
      "28px"
    );
    expect(declarations).toHaveProperty(
      toolbarCssVariableNames.color.selectedBackground
    );
    expect(toolbarVariableReferences.color.focusBorder).toBe(
      "var(--qk-toolbar-focus-border)"
    );
    expect(JSON.stringify(declarations)).not.toContain("shadow");
    expect(JSON.stringify(declarations)).not.toContain("ring");
  });

  it("keeps one enabled item in the Tab sequence", () => {
    const items = [
      { id: "undo", disabled: true },
      { id: "bold" },
      { id: "italic" }
    ];

    expect(resolveToolbarTabStop(items)).toBe("bold");
    expect(resolveToolbarTabStop(items, "italic")).toBe("italic");
    expect(resolveToolbarTabStop(items, "undo")).toBe("bold");
  });

  it("supports horizontal, vertical, RTL, Home, End, and disabled skipping", () => {
    const items = [
      { id: "undo" },
      { id: "redo", disabled: true },
      { id: "bold" }
    ];

    expect(resolveToolbarNavigationTarget(items, "undo", "ArrowRight", {
      orientation: "horizontal"
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "undo", "ArrowLeft", {
      orientation: "horizontal"
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "undo", "ArrowRight", {
      orientation: "horizontal",
      direction: "rtl"
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "undo", "ArrowDown", {
      orientation: "vertical"
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "bold", "Home", {
      orientation: "horizontal"
    })).toBe("undo");
    expect(resolveToolbarNavigationTarget(items, "undo", "End", {
      orientation: "horizontal"
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "bold", "ArrowRight", {
      orientation: "horizontal",
      loop: false
    })).toBe("bold");
    expect(resolveToolbarNavigationTarget(items, "undo", "ArrowDown", {
      orientation: "horizontal"
    })).toBeUndefined();
  });
});
