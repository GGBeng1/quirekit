import type { QuireLayoutNode } from "../../layout";
import {
  findQuireLayoutNodePathForPosition,
  resolveQuireLayoutNodePathVisibleRect
} from "../../layout/geometry/node-path";
import { resolveQuireTextCaretAnchor } from "../../layout/geometry/text-caret";
import {
  buildCaretGeometry,
  defaultCaretWidth
} from "../selection/caret";
import type {
  QuireInteractionRectAtPositionOptions,
  QuireInteractionRectAtPositionResult
} from "./types";

/**
 * Resolves a document-position rectangle from a layout snapshot.
 *
 * @param options - Snapshot, document position, and side preference.
 * @returns Rectangle query result with provenance.
 */
export function resolveQuireInteractionRectAtPosition(
  options: QuireInteractionRectAtPositionOptions
): QuireInteractionRectAtPositionResult {
  const contextualCaret = options.selectionContext === undefined
    ? null
    : buildCaretGeometry(
        options.snapshot.root.children ?? [],
        options.position,
        defaultCaretWidth,
        options.selectionContext
      );
  const snapshotVersion = options.snapshot.viewGraph?.version;

  if (contextualCaret !== null) {
    return {
      rect: contextualCaret.rect,
      source: "layout-caret",
      ...(contextualCaret.queryOwner === undefined
        ? {}
        : { queryOwner: contextualCaret.queryOwner }),
      ...(contextualCaret.queryOwner?.region === undefined
        ? {}
        : { viewRegion: contextualCaret.queryOwner.region }),
      ...(snapshotVersion === undefined ? {} : { snapshotVersion })
    };
  }

  const rect = resolveLayoutRectAtPos(
    options.snapshot.root.children ?? [],
    options.position,
    options.side ?? 1
  );

  if (rect !== null) {
    return {
      rect,
      source: "layout-rect",
      ...(snapshotVersion === undefined ? {} : { snapshotVersion })
    };
  }

  return {
    rect: {
      x: options.snapshot.viewportRect.x,
      y: options.snapshot.viewportRect.y,
      width: 1,
      height: options.snapshot.viewportRect.height
    },
    source: "viewport-fallback",
    ...(snapshotVersion === undefined ? {} : { snapshotVersion })
  };
}

/**
 * Finds a layout rectangle for a document position.
 *
 * @param nodes - Layout nodes to inspect.
 * @param position - Document position to map.
 * @param side - Side preference for boundary positions.
 * @returns Rectangle in mounted surface coordinates, or null when unavailable.
 */
export function resolveLayoutRectAtPos(
  nodes: readonly QuireLayoutNode[],
  position: number,
  side: number
): QuireLayoutNode["rect"] | null {
  const anchor = resolveQuireTextCaretAnchor({
    nodes,
    position,
    side
  });

  if (anchor) {
    return anchor.rect;
  }

  const nodePath = findQuireLayoutNodePathForPosition(nodes, position);
  const node = nodePath.at(-1);

  if (!node) {
    return null;
  }

  const visibleRect = resolveQuireLayoutNodePathVisibleRect(nodePath) ?? node.rect;

  return {
    x: position <= node.range.from || side < 0
      ? visibleRect.x
      : visibleRect.x + visibleRect.width,
    y: visibleRect.y,
    width: 1,
    height: visibleRect.height
  };
}
