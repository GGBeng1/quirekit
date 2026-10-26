import type { HtmlSandboxSource } from "../types";
export const MAX_SOURCE_BYTES = 1024 * 1024;
/** Capture bounded source without retaining a mutable caller-owned object.
 * @param source - Atomic host input. @returns Immutable snapshot.
 */
export function captureSource(source: HtmlSandboxSource): HtmlSandboxSource {
  if (!source || typeof source.html !== "string" || typeof source.complete !== "boolean" || typeof source.identity !== "string" || !source.identity || source.identity.length > 1024) throw new TypeError("sandbox.invalid-source");
  if (source.html.length > MAX_SOURCE_BYTES || new TextEncoder().encode(source.html).length > MAX_SOURCE_BYTES) throw new RangeError("sandbox.source-too-large");
  return Object.freeze({ html: source.html, complete: source.complete, identity: source.identity });
}
