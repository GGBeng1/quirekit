import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireSelectionGeometryContext } from "../types";
import { resolveQuireLayoutNodePathForSelectionContext } from "../selection/layout-node-context";

/**
 * Reads a retained textblock's content width without interpreting format attributes.
 * @param snapshot - Accepted source-backed layout snapshot.
 * @param position - Canonical inline insertion position.
 * @param context - Active repeated visual occurrence, when known.
 * @returns Document CSS-pixel width, or null for unrealized or non-text geometry.
 */
export function resolveQuireTextblockContentWidth(snapshot: QuireLayoutSnapshot, position: number,
  context?: QuireSelectionGeometryContext): number | null {
  const path = resolveQuireLayoutNodePathForSelectionContext([snapshot.root], position, context);
  let index = path.length - 1;
  while (index >= 0 && !(path[index]!.kind === "block"
    && (path[index]!.textRuns !== undefined || path[index]!.textFragments !== undefined))) index--;
  if (index < 0) return null;
  // Shaping owns indentation and character-relative typography. Read its length
  // fact rather than deriving available space from occupied glyphs or format attrs.
  const width = Math.min(path[index]!.inlineContentWidth ?? Infinity,
    ...path.slice(0, index + 1).map(node => node.rect.width));
  return Number.isFinite(width) && width > 0 ? width : null;
}
