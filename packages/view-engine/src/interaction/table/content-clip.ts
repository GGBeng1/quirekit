import { intersectQuireRects } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireCaretGeometry } from "../types";

/**
 * Constrains a caret to its source cell's fixed content frame, including hidden ranges.
 * @param path - Already resolved root-to-leaf path for the active visual occurrence.
 * @param position - Requested canonical source position.
 * @param caret - Candidate from generic text and structural resolution.
 * @returns Visible caret, or null when the source content is clipped away.
 */
export function clipQuireCaretToTableContent(
  path: readonly QuireLayoutNode[], position: number, caret: QuireCaretGeometry | null
): QuireCaretGeometry | null {
  if (caret === null) return null;
  let rect = caret.rect;
  for (const node of path) {
    const cell = node.table?.cells.find(candidate => candidate.clipsOverflow
      && position >= candidate.range.from && position <= candidate.range.to);
    if (cell === undefined) continue;
    const visible = intersectQuireRects(rect, cell.contentRect);
    if (visible === null) return null;
    rect = visible;
  }
  return { ...caret, rect };
}
