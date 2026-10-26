import type { HtmlValidatedViewMount } from "./types";

/**
 * Validates untrusted structural factory output without global constructors.
 *
 * @param candidate - Unknown runtime factory result.
 * @param mountedRoot - Mounted editor root that factories must not reuse.
 * @returns Validated mount facts, or null when root DOM is invalid.
 */
export function validateHtmlViewMount(
  candidate: unknown,
  mountedRoot: HTMLElement
): HtmlValidatedViewMount | null {
  if (!isRecord(candidate) || !isElement(candidate.dom) || candidate.dom === mountedRoot) {
    return null;
  }
  const contentValue = candidate.contentDOM;
  const contentDOM = contentValue === undefined || contentValue === null
    ? null
    : isElement(contentValue) ? contentValue : null;
  const contentValid = contentValue === undefined || contentValue === null || (
    contentDOM !== null && isDescendantOrSelf(candidate.dom, contentDOM)
  );

  return { dom: candidate.dom, contentDOM, contentValid };
}

/**
 * Narrows an unknown value to a property record.
 *
 * @param value - Runtime value to inspect.
 * @returns Whether the value can expose structural factory properties.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Narrows browser or fake-DOM values to an element contract.
 *
 * @param value - Runtime value to inspect.
 * @returns Whether the value is an element node.
 */
function isElement(value: unknown): value is HTMLElement {
  return isRecord(value) && value.nodeType === 1;
}

/**
 * Checks DOM containment using parent ownership rather than global APIs.
 *
 * @param root - Factory-owned root element.
 * @param candidate - Possible editable boundary.
 * @returns Whether the candidate is the root or one of its descendants.
 */
function isDescendantOrSelf(root: HTMLElement, candidate: HTMLElement): boolean {
  for (let current: Node | null = candidate; current; current = current.parentNode) {
    if (current === root) {
      return true;
    }
  }
  return false;
}
