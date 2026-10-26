import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import {
  intersectQuireRects,
  measureQuireRectDistanceSquaredToPoint
} from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import {
  mapQuireEditableTextNodePointToCaret,
  mapQuireEditableTextRangePointToCaret
} from "./blank-space";

/** Options used to map a retained hit target to editable text geometry. */
export interface QuireEditableTextHitTargetMapOptions {
  /** Layout nodes to search for visible editable text. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Document range represented by the retained hit target. */
  readonly range: QuireDocumentRange;
  /** Visual rectangle represented by the retained hit target. */
  readonly rect: QuireRect;
  /** Canvas point being hit-tested. */
  readonly point: QuirePoint;
}

/** Result of mapping a retained hit target to editable text geometry. */
interface QuireEditableTextHitTargetMapping {
  /** Document position represented by the caret. */
  readonly position: QuireDocumentPosition;
  /** Start position of the editable textblock that owns the caret. */
  readonly inside: number;
  /** Text or textblock rectangle used for caret placement. */
  readonly rect: QuireRect;
}

/**
 * Maps a retained structural hit target to visible editable text geometry.
 *
 * The rule is shared by retained hit targets rather than table-specific:
 * target-owned blanks first look for an exact range owner, then for the nearest
 * visible editable text bounded by the target rectangle. The target-bounded
 * search can use retained source geometry because the hit target has already
 * established the interactive visual owner; global pointer hit testing still
 * skips source geometry before it reaches this mapper.
 *
 * @param options - Layout tree, retained target range, target rect, and point.
 * @returns Caret mapping for editable text, or null when none applies.
 */
export function mapQuireEditableTextHitTargetPointToCaret(
  options: QuireEditableTextHitTargetMapOptions
): QuireEditableTextHitTargetMapping | null {
  const rangeMapping = mapQuireEditableTextRangePointToCaret({
    nodes: options.nodes,
    range: options.range,
    point: options.point,
    clipRect: options.rect,
    includeSourceGeometry: true
  });

  if (rangeMapping && containsPosition(options.range, rangeMapping.position)) {
    return rangeMapping;
  }

  return mapVisibleEditableTextHitTargetPointToCaret(options);
}

/**
 * Maps a hit-target blank to visible editable text intersecting the target.
 *
 * @param options - Layout tree, retained target range, target rect, and point.
 * @returns Nearest visible editable text mapping, or null when none applies.
 */
function mapVisibleEditableTextHitTargetPointToCaret(
  options: QuireEditableTextHitTargetMapOptions
): QuireEditableTextHitTargetMapping | null {
  let best:
    | {
        readonly distance: number;
        readonly mapping: QuireEditableTextHitTargetMapping;
      }
    | null = null;

  for (const node of flattenEditableTextNodesInsideRect(
    options.nodes,
    options.rect,
    options.range
  )) {
    const clipRect = intersectQuireRects(node.rect, options.rect);

    if (clipRect === null) {
      continue;
    }

    const mapping = mapQuireEditableTextNodePointToCaret({
      node,
      point: options.point,
      clipRect,
      includeSourceGeometry: true
    });

    if (mapping === null || !containsPosition(options.range, mapping.position)) {
      continue;
    }

    const distance = measureQuireRectDistanceSquaredToPoint(
      mapping.rect,
      options.point
    );

    if (best === null || distance < best.distance) {
      best = { distance, mapping };
    }
  }

  return best?.mapping ?? null;
}

/**
 * Flattens editable text nodes whose visible rectangles intersect a target.
 *
 * @param nodes - Layout nodes to search.
 * @param rect - Retained hit target rectangle bounding the search.
 * @param range - Accepted target's document ownership boundary.
 * @returns Editable text nodes visible inside the target rectangle.
 */
function flattenEditableTextNodesInsideRect(
  nodes: readonly QuireLayoutNode[],
  rect: QuireRect,
  range: QuireDocumentRange
): readonly QuireLayoutNode[] {
  const editableNodes: QuireLayoutNode[] = [];

  for (const node of nodes) {
    // Source geometry may serve its accepted target, but inactive stories and
    // unrelated document ranges cannot lend caret positions through overlap.
    if (node.interactionRole === "paint-only"
      || node.range.to < range.from || node.range.from > range.to
      || intersectQuireRects(node.rect, rect) === null) {
      continue;
    }

    if (isEditableTextLayoutNode(node)) {
      editableNodes.push(node);
    }

    editableNodes.push(
      ...flattenEditableTextNodesInsideRect(node.children ?? [], rect, range)
    );
  }

  return editableNodes;
}

/** @param range - Target-owned document span. @param position - Measured candidate. @returns Whether the target owns this caret, including its boundaries. */
function containsPosition(range: QuireDocumentRange, position: QuireDocumentPosition): boolean {
  return position.pos >= range.from && position.pos <= range.to;
}

/**
 * Checks whether a layout node can directly own editable caret placement.
 *
 * @param node - Layout node to inspect.
 * @returns Whether the node is text-bearing or an empty textblock slot.
 */
function isEditableTextLayoutNode(node: QuireLayoutNode): boolean {
  return (
    (node.textFragments?.length ?? 0) > 0 ||
    (node.kind === "block" &&
      node.range.to - node.range.from === 2 &&
      (node.textFragments?.length ?? 0) === 0)
  );
}
