import { parseHTMLToJSON } from "../parse";
import type {
  QuireHTMLJSONContent,
  QuireHTMLExtensions,
  QuireHTMLParseOptions
} from "../types";
import { assertNodeRuntime, createServerDocumentScope } from "./server-dom";

/**
 * Generates JSON content from HTML in a Node environment.
 *
 * @param html - HTML string to parse.
 * @param extensions - Extensions used to build the schema.
 * @param options - Optional ProseMirror parse options.
 * @returns Parsed JSON content.
 */
export function generateJSON(
  html: string,
  extensions: QuireHTMLExtensions,
  options?: QuireHTMLParseOptions
): QuireHTMLJSONContent {
  assertNodeRuntime();

  const scope = createServerDocumentScope();

  try {
    return parseHTMLToJSON(html, extensions, scope, options);
  } finally {
    scope.dispose();
  }
}
