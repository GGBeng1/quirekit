import type { QuireHTMLAttributes } from "../types";

/**
 * Creates HTML attributes from a ProseMirror attrs object.
 *
 * @param attrs - ProseMirror attrs object from a node or mark.
 * @returns Attribute object with null and undefined values omitted.
 */
export function createHTMLAttributes(
  attrs: Readonly<Record<string, unknown>>
): QuireHTMLAttributes {
  const htmlAttributes: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      htmlAttributes[name] = value;
    }
  }

  return htmlAttributes;
}
