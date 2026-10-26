import { describe, expect, it } from "vitest";
import {
  capturePanelScrollState,
  restorePanelScrollState
} from "./scroll";

describe("panel scroll state", () => {
  it("restores JSON tree scroll after a render", () => {
    const before = createScrollableElement(240, 18);
    const after = createScrollableElement(0, 0);
    const root = createRoot([before, after]);

    const state = capturePanelScrollState(root as unknown as HTMLElement);
    root.current = after;
    restorePanelScrollState(root as unknown as HTMLElement, state);

    expect(after.scrollTop).toBe(240);
    expect(after.scrollLeft).toBe(18);
  });
});

/**
 * Creates a fake scrollable element.
 *
 * @param scrollTop - Vertical scroll offset.
 * @param scrollLeft - Horizontal scroll offset.
 * @returns Scrollable element fixture.
 */
function createScrollableElement(scrollTop: number, scrollLeft: number): Element {
  return {
    scrollLeft,
    scrollTop
  } as Element;
}

/**
 * Creates a fake root with a queryable current element.
 *
 * @param elements - Elements available to the fake root.
 * @returns Fake root fixture.
 */
function createRoot(elements: readonly Element[]): {
  current: Element;
  querySelector(selector: string): Element | null;
} {
  const root = {
    current: elements[0]!,
    querySelector: (selector: string) => {
      return selector === ".qk-devtools-json-tree" ? root.current : null;
    }
  };
  return root;
}
