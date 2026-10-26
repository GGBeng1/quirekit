/**
 * Decodes the HTML entities admitted by Tiptap Markdown text paths.
 *
 * @param value - Encoded text.
 * @returns Decoded text without recursively decoding nested entities.
 */
export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&amp;", "&");
}

/**
 * Encodes HTML delimiters while leaving ordinary Markdown quotes unchanged.
 *
 * @param value - Literal text.
 * @returns Text safe to round-trip through Markdown HTML boundaries.
 */
export function encodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
