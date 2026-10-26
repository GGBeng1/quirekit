import { captureSource } from "../policy/source";
import type { HtmlSandboxDocument } from "./types";
/** Read portable data without importing a DOM parser or framework.
 * @param input - Untrusted imported object. @returns Validated immutable source object.
 */
export function readHtmlSandboxDocument(input: unknown): HtmlSandboxDocument {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("sandbox.invalid-document");
  const value = input as Record<string, unknown>;
  if (value.version !== 1 || typeof value.html !== "string" || Object.keys(value).some(key => !["version", "html", "title", "height"].includes(key))) throw new TypeError("sandbox.invalid-document");
  captureSource({ html: value.html, complete: true, identity: "validation" });
  if (value.title !== undefined && (typeof value.title !== "string" || value.title.length > 200)) throw new TypeError("sandbox.invalid-title");
  if (value.height !== undefined && (typeof value.height !== "number" || !Number.isFinite(value.height) || value.height < 80 || value.height > 2000)) throw new TypeError("sandbox.invalid-height");
  return Object.freeze({ version: 1, html: value.html, ...(value.title === undefined ? {} : { title: value.title as string }), ...(value.height === undefined ? {} : { height: value.height as number }) });
}
