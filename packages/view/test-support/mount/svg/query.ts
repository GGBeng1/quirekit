import type { FakeSvgMountElement } from "./element";

/**
 * Finds fake descendants for overlay synchronization tests.
 *
 * @param root - Root fake element to inspect.
 * @param selector - CSS selector requested by runtime code.
 * @returns Matching fake descendants.
 */
export function queryFakeSvgDescendants(
  root: FakeSvgMountElement,
  selector: string
): FakeSvgMountElement[] {
  if (
    selector !== "[data-quirekit-overlay-id]" &&
    selector !== "text[data-quirekit-command-id]"
  ) {
    return [];
  }

  const matches: FakeSvgMountElement[] = [];

  visitFakeSvgDescendants(root, selector, matches);
  return matches;
}

/**
 * Visits fake descendants matching one supported selector.
 *
 * @param element - Element to inspect.
 * @param selector - Supported selector being matched.
 * @param matches - Mutable match list.
 */
function visitFakeSvgDescendants(
  element: FakeSvgMountElement,
  selector: string,
  matches: FakeSvgMountElement[]
): void {
  if (matchesFakeSvgSelector(element, selector)) {
    matches.push(element);
  }

  for (const child of element.children) {
    visitFakeSvgDescendants(child, selector, matches);
  }
}

/**
 * Checks whether a fake element matches one supported selector.
 *
 * @param element - Element to inspect.
 * @param selector - Supported selector being matched.
 * @returns Whether the element matches.
 */
function matchesFakeSvgSelector(
  element: FakeSvgMountElement,
  selector: string
): boolean {
  if (selector === "[data-quirekit-overlay-id]") {
    return element.dataset.quirekitOverlayId !== undefined;
  }

  return element.tagName === "text" &&
    element.getAttribute("data-quirekit-command-id") !== null;
}
