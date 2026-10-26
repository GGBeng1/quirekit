import { intersectQuireDocumentRanges, intersectQuireRects } from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireRect } from "@quirekit/renderer";
import { findQuireTextCaretStopAtPosition } from "@quirekit/layout/text";
import { buildQuireSubLayoutRangeGeometriesForNode } from "../sub-layout-query";
import { filterQuireSelectionGeometryDuplicateCandidatesByContext } from "./geometry-context-filter";
import type {
  QuireSelectionGeometryContext,
  QuireSelectionRangeGeometry
} from "../types";
import { createQuireLayoutNodeQueryProductOwner } from "../layout-node-owner";

/**
 * Builds range rectangles for every layout node overlapping a selection.
 *
 * @param nodes - Layout nodes to inspect.
 * @param selectionRange - Selected document range.
 * @param visibleClip - Optional ancestor visible rectangle.
 * @param selectionContext - Optional active selection context for repeated visual instances.
 * @returns Selection range geometries for overlapping layout nodes.
 */
export function buildRangeGeometries(
  nodes: readonly QuireLayoutNode[],
  selectionRange: QuireDocumentRange,
  visibleClip?: QuireRect | undefined,
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly QuireSelectionRangeGeometry[] {
  const geometries: QuireSelectionRangeGeometry[] = [];

  for (const node of nodes) {
    const nodeClip = visibleClip
      ? intersectQuireRects(visibleClip, node.rect)
      : node.rect;

    if (!nodeClip) {
      continue;
    }

    const subLayoutGeometries = buildQuireSubLayoutRangeGeometriesForNode(
      node,
      selectionRange,
      nodeClip,
      selectionContext
    );

    if (node.subLayoutQueryProducts !== undefined) {
      geometries.push(...subLayoutGeometries);
      continue;
    }

    const childGeometries = buildRangeGeometries(
      node.children ?? [],
      selectionRange,
      nodeClip,
      selectionContext
    );

    // Containers do not invent a fallback selection for clipped-away descendants.
    if (childGeometries.length > 0 || ((node.children?.length ?? 0) > 0 && !node.textFragments?.length)) {
      geometries.push(...childGeometries);
      continue;
    }

    if (node.textFragments && node.textFragments.length > 0) {
      geometries.push(...buildTextFragmentRangeGeometries(
        node,
        selectionRange,
        nodeClip
      ));
      continue;
    }

    const overlap = intersectQuireDocumentRanges(node.range, selectionRange);

    if (!overlap) {
      continue;
    }

    const queryOwner = createQuireLayoutNodeQueryProductOwner(node);
    geometries.push({
      range: overlap,
      rect: nodeClip,
      ...(queryOwner === undefined ? {} : { queryOwner })
    });
  }

  return filterRangeGeometriesBySelectionContext(
    geometries,
    selectionContext
  );
}

/**
 * Filters aggregated range geometries to the active repeated visual instance.
 *
 * @param geometries - Candidate selection range geometries.
 * @param selectionContext - Optional active selection context.
 * @returns Context-matched range geometries, or the original list when context is not applicable.
 */
function filterRangeGeometriesBySelectionContext(
  geometries: readonly QuireSelectionRangeGeometry[],
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly QuireSelectionRangeGeometry[] {
  return filterQuireSelectionGeometryDuplicateCandidatesByContext(
    geometries,
    selectionContext,
    (geometry) => ({
      range: geometry.range,
      rect: geometry.rect,
      ...(geometry.queryOwner === undefined
        ? {}
        : { queryOwner: geometry.queryOwner })
    })
  );
}

/**
 * Builds range rectangles from measured text fragments.
 *
 * @param node - Layout node that owns measured text fragments.
 * @param selectionRange - Selected document range.
 * @param visibleClip - Visible rectangle inherited from ancestor layout nodes.
 * @returns Selection range geometries for overlapping text fragments.
 */
function buildTextFragmentRangeGeometries(
  node: QuireLayoutNode,
  selectionRange: QuireDocumentRange,
  visibleClip: QuireRect
): readonly QuireSelectionRangeGeometry[] {
  const geometries: QuireSelectionRangeGeometry[] = [];
  const queryOwner = createQuireLayoutNodeQueryProductOwner(node);
  const emptyTextblockPosition = resolveEmptyTextblockContentPosition(node);

  if (
    emptyTextblockPosition !== null
    && selectionRange.from <= emptyTextblockPosition
    && emptyTextblockPosition <= selectionRange.to
  ) {
    const overlap = intersectQuireDocumentRanges(node.range, selectionRange);
    if (overlap !== null) {
      return [{
        range: overlap,
        rect: visibleClip,
        ...(queryOwner === undefined ? {} : { queryOwner })
      }];
    }
  }

  for (const fragment of node.textFragments ?? []) {
    const overlap = intersectQuireDocumentRanges(fragment.range, selectionRange);

    if (!overlap) {
      continue;
    }

    const fromStop = findQuireTextCaretStopAtPosition(fragment, overlap.from);
    const toStop = findQuireTextCaretStopAtPosition(fragment, overlap.to);
    const startX = fragment.rect.x + Math.min(fromStop.localX, toStop.localX);
    const endX = fragment.rect.x + Math.max(fromStop.localX, toStop.localX);
    const clippedRect = intersectQuireRects(
      {
        x: startX,
        y: fragment.rect.y,
        width: endX - startX,
        height: fragment.lineHeight
      },
      visibleClip
    );

    if (!clippedRect) {
      continue;
    }

    geometries.push({
      range: overlap,
      rect: clippedRect,
      ...(queryOwner === undefined ? {} : { queryOwner })
    });
  }

  return geometries;
}

/**
 * Resolves the sole editable content position of a retained empty textblock.
 *
 * Empty paragraphs retain a collapsed text fragment. Range selection that
 * reaches their opening or closing token must use the exact paragraph box;
 * returning no child geometry would let an ancestor owner become a coarse
 * fallback rectangle.
 *
 * @param node - Retained layout node to classify.
 * @returns Empty textblock content position, or null for ordinary nodes.
 */
function resolveEmptyTextblockContentPosition(
  node: QuireLayoutNode
): number | null {
  if (node.kind !== "block" || node.range.to - node.range.from !== 2) {
    return null;
  }

  const contentPosition = node.range.from + 1;
  const hasCollapsedContentFragment = node.textFragments?.some((fragment) =>
    fragment.range.from === contentPosition
    && fragment.range.to === contentPosition
  ) ?? false;

  return hasCollapsedContentFragment ? contentPosition : null;
}
