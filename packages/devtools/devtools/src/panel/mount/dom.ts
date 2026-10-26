/**
 * Creates the internal mount root without replacing the host content.
 *
 * @param element - Host element passed by the app.
 * @returns Element that should receive devtools HTML.
 */
export function createMountRoot(element: HTMLElement): HTMLElement {
  const ownerDocument = getOwnerDocument(element);

  if (!ownerDocument || typeof element.appendChild !== "function") {
    return element;
  }

  const root = ownerDocument.createElement("div");
  root.setAttribute("data-qk-devtools-mount", "");
  element.appendChild(root);
  return root;
}

/**
 * Removes the internal mount root.
 *
 * @param host - Host element passed by the app.
 * @param root - Internal root created for panel HTML.
 */
export function removeMountRoot(host: HTMLElement, root: HTMLElement): void {
  if (root === host) {
    host.innerHTML = "";
    return;
  }

  root.remove();
}

/**
 * Finds the document associated with a host element.
 *
 * @param element - Host element.
 * @returns Owner document when available.
 */
export function getOwnerDocument(element: HTMLElement): Document | undefined {
  if (element.ownerDocument) {
    return element.ownerDocument;
  }

  return typeof document === "undefined" ? undefined : document;
}

/**
 * Checks whether a value is a DOM Element.
 *
 * @param value - Value to test.
 * @returns True when the value is an Element.
 */
export function isElement(value: unknown): value is Element {
  return typeof Element !== "undefined" && value instanceof Element;
}

/**
 * Checks whether a value supports DOM event target methods.
 *
 * @param value - Value to test.
 * @returns True when event listeners can be attached.
 */
export function isEventTarget(value: unknown): value is EventTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EventTarget).addEventListener === "function" &&
    typeof (value as EventTarget).removeEventListener === "function"
  );
}
