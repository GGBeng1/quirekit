import type { FakeCanvasMountElement } from "./element";

/**
 * Collects fake overlay descendants below a root.
 *
 * @param root - Root element to traverse.
 * @returns Descendants with overlay ids.
 */
export function collectFakeOverlayDescendants(
  root: FakeCanvasMountElement
): FakeCanvasMountElement[] {
  const elements: FakeCanvasMountElement[] = [];

  for (const child of root.children) {
    if (child.dataset.quirekitOverlayId) {
      elements.push(child);
    }

    elements.push(...collectFakeOverlayDescendants(child));
  }

  return elements;
}
