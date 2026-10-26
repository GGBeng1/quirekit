import { getBrowserDocumentProvider } from "./browser-dom";
import { parseHTMLToJSON } from "./parse";
import type {
  QuireHTMLJSONContent,
  QuireHTMLExtensions,
  QuireHTMLParseOptions
} from "./types";

/**
 * Generates JSON content from HTML in a browser DOM environment.
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
  return parseHTMLToJSON(html, extensions, getBrowserDocumentProvider(), options);
}
