import type { QuireHTMLJSONContent, QuireHTMLExtensions } from "./types";
import { getBrowserDocumentProvider } from "./browser-dom";
import { serializeJSONToHTML } from "./serialize";

/**
 * Generates HTML from JSON content in a browser DOM environment.
 *
 * @param doc - JSON document content.
 * @param extensions - Extensions used to build the schema.
 * @returns Serialized HTML string.
 */
export function generateHTML(
  doc: QuireHTMLJSONContent,
  extensions: QuireHTMLExtensions
): string {
  return serializeJSONToHTML(doc, extensions, getBrowserDocumentProvider());
}
