import { createAbsolutePositionFromRelativePosition, decodeRelativePosition, type Doc } from "yjs";

/**
 * Resolves activity targets anchored with Yjs relative positions (scheme `yjs-relative`, base64 `from` / `to`).
 * @param document - Shared session document.
 * @param field - Shared text holding the Markdown source; default `source`.
 * @returns Resolver giving the current source range, or null when an endpoint is malformed, missing or collected.
 */
export function relativeActivityResolver(document: Doc, field = "source") {
  return (target: { readonly scheme: string; readonly value: unknown }): { readonly from: number; readonly to: number } | null => {
    if (target.scheme !== "yjs-relative" || typeof target.value !== "object" || target.value === null) return null;
    const { from, to } = target.value as { from?: unknown; to?: unknown };
    if (typeof from !== "string" || typeof to !== "string") return null;
    const text = document.getText(field);
    /** @param encoded - Base64 relative position. @returns Index in the shared text, or null. */
    const resolve = (encoded: string): number | null => {
      try {
        const position = createAbsolutePositionFromRelativePosition(decodeRelativePosition(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))), document);
        return position && position.type === text ? position.index : null;
      } catch { return null; }
    };
    const start = resolve(from), end = resolve(to);
    return start === null || end === null || end < start ? null : { from: start, to: end };
  };
}
