import type { QuireHTMLJSONContent, QuireHTMLExtensions } from "../types";
import { serializeJSONToHTML } from "../serialize";
import { assertNodeRuntime, createServerDocumentScope } from "./server-dom";

/**
 * Generates HTML from JSON content in a Node environment.
 *
 * @param doc - JSON document content.
 * @param extensions - Extensions used to build the schema.
 * @returns Serialized HTML string.
 */
export function generateHTML(
  doc: QuireHTMLJSONContent,
  extensions: QuireHTMLExtensions
): string {
  assertNodeRuntime();

  const scope = createServerDocumentScope();

  try {
    return serializeJSONToHTML(doc, extensions, scope);
  } finally {
    scope.dispose();
  }
}
