import { getSchema, type QuireJSONContent } from "@quirekit/core";
import { DOMParser as PMDOMParser } from "@quirekit/pm";
import type {
  QuireHTMLDocumentProvider,
  QuireHTMLExtensions,
  QuireHTMLParseOptions
} from "./types";

/**
 * Parses an HTML string with the given DOM document.
 *
 * @param html - HTML string to parse.
 * @param provider - DOM document provider.
 * @returns Parsed HTML document.
 */
export function parseHTMLDocument(
  html: string,
  provider: QuireHTMLDocumentProvider
): Document {
  const parser = new provider.document.defaultView!.DOMParser();
  const document = parser.parseFromString(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    "text/html"
  );

  if (!document) {
    throw new Error("[quirekit error]: Failed to parse HTML string.");
  }

  return document;
}

/**
 * Generates JSON content from HTML and extensions.
 *
 * @param html - HTML string to parse.
 * @param extensions - Extensions used to build the schema.
 * @param provider - DOM document provider.
 * @param options - Optional ProseMirror parse options.
 * @returns Parsed JSON content.
 */
export function parseHTMLToJSON(
  html: string,
  extensions: QuireHTMLExtensions,
  provider: QuireHTMLDocumentProvider,
  options?: QuireHTMLParseOptions
): QuireJSONContent {
  const schema = getSchema(extensions);
  const document = parseHTMLDocument(html, provider);

  return PMDOMParser.fromSchema(schema)
    .parse(document.body as unknown as Node, options)
    .toJSON() as QuireJSONContent;
}
