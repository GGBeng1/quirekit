import type { QuireClipboardData } from "./types";
import { canvasInternalClipboardMime } from "./internal";

/** HTML attribute carrying the private slice payload inside `text/html`. */
export const quireClipboardEmbedAttribute = "data-quirekit-clipboard";

const embedVersion = "v1:";
/** Payloads above this size are left out of HTML to keep external pastes light. */
const maxEmbeddedLength = 4 * 1024 * 1024;
// Browsers may re-serialize clipboard HTML, so attribute order and spacing are not fixed.
const markerPattern = new RegExp(`<span\\b[^>]*\\s${quireClipboardEmbedAttribute}="([^"]*)"[^>]*>\\s*</span>`);

/**
 * Prepends the private slice payload to clipboard HTML.
 *
 * Browsers expose only `text/plain` and `text/html` to the async Clipboard API,
 * so the exact slice rides inside the HTML as an empty element that other
 * applications ignore.
 *
 * @param html - Serialized clipboard HTML.
 * @param internal - Private slice JSON payload.
 * @returns HTML with the embedded payload, or the input when it is too large.
 */
export function embedQuireClipboardPayload(html: string, internal: string): string {
  if (internal.length === 0 || internal.length > maxEmbeddedLength) return html;
  return `<span ${quireClipboardEmbedAttribute}="${embedVersion}${encodeBase64(internal)}"></span>${html}`;
}

/**
 * Reads the private slice payload embedded by `embedQuireClipboardPayload`.
 *
 * @param html - Clipboard HTML.
 * @returns Private slice JSON, or null when absent or malformed.
 */
export function extractQuireEmbeddedClipboardPayload(html: string): string | null {
  const value = markerPattern.exec(html)?.[1];
  if (value === undefined || !value.startsWith(embedVersion)) return null;
  try {
    return decodeBase64(value.slice(embedVersion.length));
  } catch {
    return null;
  }
}

/**
 * Removes the embedded payload element before ordinary HTML parsing.
 *
 * @param html - Clipboard HTML.
 * @returns HTML without the payload element.
 */
export function stripQuireEmbeddedClipboardPayload(html: string): string {
  return html.replace(markerPattern, "");
}

/**
 * Reads the private slice payload from its MIME type, falling back to the copy embedded in HTML.
 *
 * @param data - Readable clipboard adapter.
 * @returns Private slice JSON, or an empty string.
 */
export function readQuireClipboardInternalData(data: Pick<QuireClipboardData, "getData"> | null | undefined): string {
  if (!data) return "";
  const direct = data.getData(canvasInternalClipboardMime);
  if (direct.trim().length > 0) return direct;
  return extractQuireEmbeddedClipboardPayload(data.getData("text/html")) ?? "";
}

/**
 * Encodes UTF-8 text as base64 without relying on Node buffers.
 * @param value - Text to encode.
 * @returns Base64 string.
 */
function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/**
 * Decodes base64 into UTF-8 text.
 * @param value - Base64 string.
 * @returns Decoded text.
 */
function decodeBase64(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}
