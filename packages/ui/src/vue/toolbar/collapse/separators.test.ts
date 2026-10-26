// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { hideLineEdgeSeparators } from "./separators";

/**
 * Builds a panel whose children report fixed line centers.
 * @param layout - Child kinds with the vertical center of their wrapped line.
 * @returns Panel element.
 */
function panel(layout: readonly (readonly ["control" | "separator", number])[]): HTMLElement {
  const root = document.createElement("div");
  for (const [kind, center] of layout) {
    const child = document.createElement("span");
    if (kind === "separator") child.className = "qk-toolbar__separator";
    child.getBoundingClientRect = () => ({ top: center - 10, height: 20 } as DOMRect);
    root.append(child);
  }
  return root;
}

it("hides separators at the start or end of a wrapped line and keeps those between controls", () => {
  const root = panel([
    ["control", 20], ["separator", 20], ["control", 20], ["separator", 20],
    ["separator", 60], ["control", 60], ["separator", 60], ["control", 60]
  ]);
  hideLineEdgeSeparators(root);
  const hidden = [...root.children].map(child => (child as HTMLElement).style.display === "none");
  expect(hidden).toEqual([false, false, false, true, true, false, false, false]);
});

it("restores separators before re-checking a new layout", () => {
  const root = panel([["control", 20], ["separator", 20], ["control", 20]]);
  (root.children[1] as HTMLElement).style.display = "none";
  hideLineEdgeSeparators(root);
  expect((root.children[1] as HTMLElement).style.display).toBe("");
});
