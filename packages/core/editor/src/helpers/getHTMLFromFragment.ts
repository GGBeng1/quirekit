import { DOMSerializer, type Fragment, type Schema } from "@quirekit/pm";

/**
 * Serializes a ProseMirror fragment to HTML.
 *
 * @param fragment - Fragment to serialize.
 * @param schema - Schema used for DOM serialization.
 * @returns HTML string.
 */
export function getHTMLFromFragment(fragment: Fragment, schema: Schema): string {
  const document = globalThis.document;

  if (!document) {
    throw new Error("[quirekit error]: getHTMLFromFragment() requires a DOM document.");
  }

  const container = document.createElement("div");
  const serialized = DOMSerializer.fromSchema(schema).serializeFragment(fragment, {
    document
  });
  container.appendChild(serialized);

  return container.innerHTML;
}
