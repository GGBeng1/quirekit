import { clipQuireCaretToTableContent } from "../table/content-clip";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import {
  resolveQuireLayoutNodePathVisibleRect
} from "../../layout/geometry/node-path";
import { resolveQuireTextCaretAnchorForPath } from "../../layout/geometry/text-caret";
import { buildQuireSubLayoutCaretGeometry } from "../sub-layout-query";
import type {
  QuireCaretGeometry,
  QuireSelectionGeometryContext
} from "../types";
import { createQuireLayoutNodeQueryProductOwner } from "../layout-node-owner";
import { resolveQuireLayoutNodePathForSelectionContext } from "./layout-node-context";

/** Default caret width used by selection geometry. */
export const defaultCaretWidth = 1;

/**
 * Builds caret geometry for a collapsed document position.
 *
 * @param nodes - Layout nodes to search.
 * @param position - Collapsed document position.
 * @param caretWidth - Width used for the caret rectangle.
 * @param selectionContext - Optional active selection context used for repeated visual instances.
 * @returns Caret geometry, or null when the position is outside all nodes.
 */
export function buildCaretGeometry(
  nodes: readonly QuireLayoutNode[],
  position: number,
  caretWidth: number,
  selectionContext?: QuireSelectionGeometryContext | undefined
): QuireCaretGeometry | null {
  const contextualSubLayoutCaret = !hasSpecificSelectionGeometryContext(
    selectionContext
  )
    ? null
    : buildQuireSubLayoutCaretGeometry(
        nodes,
        position,
        caretWidth,
        1,
        selectionContext
      );

  if (contextualSubLayoutCaret) {
    return contextualSubLayoutCaret;
  }

  // Without an active retained context, painted text fragments remain the
  // canonical caret source. A context-bearing sub-layout hit represents a
  // specific repeated visual instance, so it resolves before flattened fallback.
  const nodePath = resolveQuireLayoutNodePathForSelectionContext(
    nodes,
    position,
    selectionContext
  );
  const node = nodePath.at(-1);
  const queryOwner = node === undefined
    ? undefined
    : createQuireLayoutNodeQueryProductOwner(node);
  const anchor = resolveQuireTextCaretAnchorForPath({
    nodes,
    nodePath,
    position,
    side: 1,
    caretWidth
  });

  if (anchor) {
    return clipQuireCaretToTableContent(nodePath, position, {
      position: anchor.position,
      rect: anchor.rect,
      ...(queryOwner === undefined ? {} : { queryOwner })
    });
  }

  const subLayoutCaret = buildQuireSubLayoutCaretGeometry(
    nodes,
    position,
    caretWidth,
    1,
    selectionContext
  );

  if (subLayoutCaret) {
    return subLayoutCaret;
  }

  if (!node) {
    return null;
  }

  const visibleRect = resolveQuireLayoutNodePathVisibleRect(nodePath) ?? node.rect;

  return clipQuireCaretToTableContent(nodePath, position, {
    position: { pos: position, bias: 0 },
    rect: {
      x: isEmptyTextblockContentPosition(node, position)
        ? visibleRect.x
        : mapDocumentPositionToRectX(node.range, visibleRect, position),
      y: visibleRect.y,
      width: caretWidth,
      height: visibleRect.height
    },
    ...(queryOwner === undefined ? {} : { queryOwner })
  });
}

/**
 * Checks whether a selection context identifies a retained visual instance.
 *
 * @param selectionContext - Active selection context to inspect.
 * @returns Whether the context contains identity stronger than a reference rectangle.
 */
function hasSpecificSelectionGeometryContext(
  selectionContext?: QuireSelectionGeometryContext | undefined
): boolean {
  return selectionContext?.queryOwner?.sourceFragmentId !== undefined ||
    selectionContext?.queryOwner?.region?.visualInstanceId !== undefined ||
    selectionContext?.viewRegion?.visualInstanceId !== undefined;
}

/**
 * Checks whether a position represents the editable content slot of an empty textblock.
 *
 * @param node - Layout node found for a collapsed selection.
 * @param position - Document position to inspect.
 * @returns Whether the position is the only content position inside an empty textblock.
 */
function isEmptyTextblockContentPosition(
  node: QuireLayoutNode,
  position: number
): boolean {
  return (
    node.kind === "block" &&
    node.range.to - node.range.from === 2 &&
    position === node.range.from + 1
  );
}

/**
 * Maps a document position to an approximate horizontal coordinate in a rect.
 *
 * @param range - Document range represented by the rectangle.
 * @param rect - Rectangle used for the geometry approximation.
 * @param position - Document position to map.
 * @returns Approximate x coordinate for the position.
 */
function mapDocumentPositionToRectX(
  range: QuireDocumentRange,
  rect: QuireRect,
  position: number
): number {
  const rangeSize = range.to - range.from;

  if (rangeSize <= 0) {
    return rect.x;
  }

  const ratio = (position - range.from) / rangeSize;

  return rect.x + rect.width * Math.min(Math.max(ratio, 0), 1);
}
