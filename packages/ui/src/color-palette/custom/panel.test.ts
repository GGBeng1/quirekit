// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createQuireCustomColorPanel } from "./panel";

describe("shared custom-color panel", () => {
  it("edits hexadecimal and RGB channels through one controlled surface", () => {
    const onChange = vi.fn();
    const panel = createQuireCustomColorPanel({
      ownerDocument: document,
      value: "#0F9F6E",
      label: "更多填充颜色",
      onChange
    });
    document.body.append(panel.element);

    expect(panel.element.getAttribute("aria-label")).toBe("更多填充颜色");
    const hex = requireInput("[data-qk-custom-color-hex]");
    expect(hex.value).toBe("0F9F6E");
    hex.value = "D92D20";
    hex.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith("#D92D20");

    const red = requireInput("[data-qk-custom-color-red]");
    red.value = "15";
    red.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith("#0F2D20");

    panel.update({
      value: "#2563EB",
      label: "More fill colors"
    });
    expect(panel.element.getAttribute("aria-label")).toBe("More fill colors");
    expect(requireInput("[data-qk-custom-color-hex]").value).toBe("2563EB");

    panel.destroy();
    expect(panel.element.isConnected).toBe(false);
  });

  it("keeps invalid hexadecimal drafts local", () => {
    const onChange = vi.fn();
    const panel = createQuireCustomColorPanel({
      ownerDocument: document,
      value: "#111827",
      label: "More colors",
      onChange
    });
    document.body.append(panel.element);
    const hex = requireInput("[data-qk-custom-color-hex]");
    hex.value = "xyz";
    hex.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChange).not.toHaveBeenCalled();
    expect(hex.value).toBe("111827");
    panel.destroy();
  });
});

/**
 * Resolves one required custom-color input.
 *
 * @param selector - Stable input selector.
 * @returns Matching input element.
 */
function requireInput(selector: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (input === null) {
    throw new Error(`Expected custom-color input: ${selector}`);
  }
  return input;
}
