/**
 * Removes formatting-only whitespace text nodes from an element subtree.
 *
 * @param element - Element whose descendants should be cleaned.
 * @returns The same element after cleanup.
 */
function removeFormattingWhitespace(element: HTMLElement): HTMLElement {
  for (let index = element.childNodes.length - 1; index >= 0; index -= 1) {
    const child = element.childNodes[index];

    if (!child) {
      continue;
    }

    if (child.nodeType === Node.TEXT_NODE && /^(\n\s\s|\n)$/.test(child.nodeValue ?? "")) {
      element.removeChild(child);
      continue;
    }

    if (child instanceof HTMLElement) {
      removeFormattingWhitespace(child);
    }
  }

  return element;
}

/**
 * Parses an HTML string into a body element while preserving edge whitespace.
 *
 * @param value - HTML string to parse.
 * @returns Parsed body element.
 */
export function elementFromString(value: string): HTMLElement {
  if (typeof window === "undefined") {
    throw new Error("[quirekit error]: elementFromString() requires a window object.");
  }

  const html = new window.DOMParser()
    .parseFromString(`<body>${value}</body>`, "text/html")
    .body;

  return removeFormattingWhitespace(html);
}
