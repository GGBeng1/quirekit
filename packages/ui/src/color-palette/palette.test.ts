// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createQuireColorPalette } from "./palette";
import { quireDocumentColorRows } from "./presets";
import { createQuireCustomColorPanel } from "./custom";
import { en } from "../locale/components/color-picker";

describe("shared document color palette", () => {
  it("renders the complete controlled palette and semantic callbacks", () => {
    const initialColor = quireDocumentColorRows[2]![7]!;
    const nextColor = quireDocumentColorRows[1]![1]!;
    const onReset = vi.fn();
    const onSelect = vi.fn();
    const onMoreColors = vi.fn();
    const palette = createQuireColorPalette({
      ownerDocument: document,
      value: initialColor,
      defaultColor: null,
      recentColors: ["#123456"],
      labels: {
        label: "形状填充",
        defaultColor: "无填充",
        moreColors: "更多颜色",
        recentColors: "最近使用"
      },
      onReset,
      onSelect,
      onMoreColors
    });
    document.body.append(palette.element);

    expect(palette.element.querySelectorAll("[data-qk-color-grid] button"))
      .toHaveLength(quireDocumentColorRows.flat().length);
    const selected = requireButton(`[data-qk-color-value="${initialColor}"]`);
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    const pointerDown = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true
    });
    selected.dispatchEvent(pointerDown);
    expect(pointerDown.defaultPrevented).toBe(true);
    selected.click();
    requireButton("[data-qk-color-default]").click();
    requireButton("[data-qk-color-more]").click();
    expect(onSelect).toHaveBeenCalledWith(initialColor);
    expect(onReset).toHaveBeenCalledOnce();
    expect(onMoreColors).toHaveBeenCalledOnce();

    palette.update({
      value: nextColor,
      defaultColor: "#000000",
      recentColors: [],
      labels: {
        label: "Shape outline",
        defaultColor: "No outline",
        moreColors: "More colors",
        recentColors: "Recent colors"
      }
    });
    expect(palette.element.getAttribute("aria-label")).toBe("Shape outline");
    expect(requireButton(`[data-qk-color-value="${nextColor}"]`)
      .getAttribute("aria-pressed")).toBe("true");
    expect(palette.element.querySelector("[data-qk-recent-colors]")).toBeNull();

    palette.destroy();
    expect(palette.element.isConnected).toBe(false);
  });

  it("fills missing copy from the given language and defaults to Chinese", () => {
    const options = {
      ownerDocument: document, value: null, defaultColor: null, recentColors: ["#123456"],
      onReset: vi.fn(), onSelect: vi.fn(), onMoreColors: vi.fn()
    };
    const chinese = createQuireColorPalette(options);
    expect(chinese.element.getAttribute("aria-label")).toBe("颜色");
    expect(chinese.element.querySelector("[data-qk-color-more]")!.textContent).toContain("更多颜色");

    const english = createQuireColorPalette({ ...options, messages: en, labels: { defaultColor: "No fill" } });
    expect(english.element.querySelector("[data-qk-color-default]")!.textContent).toBe("No fill");
    expect(english.element.querySelector("[data-qk-color-more]")!.textContent).toContain("More colors");
    expect(english.element.textContent).not.toMatch(/[\p{Script=Han}]/u);
    const panel = createQuireCustomColorPanel({ ownerDocument: document, value: "#000000", messages: en, onChange: vi.fn() });
    expect(panel.element.getAttribute("aria-label")).toBe("More colors");
  });
});

/**
 * Resolves one required palette button.
 *
 * @param selector - Selector scoped to the test document.
 * @returns Matching button.
 */
function requireButton(selector: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (button === null) {
    throw new Error(`Expected palette button: ${selector}`);
  }
  return button;
}
