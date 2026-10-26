import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import { containsQuirePoint, intersectQuireRects } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import { isQuireEmptyTextblockLayoutNode, isQuirePointerTransparentLayoutNode } from "../layout-node-role";
import {
  findQuireTextCaretStopAtX,
  findQuireTextCaretStopAtXWithinRect,
  findQuireTextFragmentAtPoint
} from "@quirekit/layout/text";
import {
  resolveQuireTransparentInlineBoundaryPosition
} from "./transparent-inline-boundary";

/** Options used to map a point inside an editable layout node to a caret. */
interface QuireEditableTextNodePointMapOptions {
  /** Editable layout node or ancestor to inspect. */
  readonly node: QuireLayoutNode;
  /** Canvas point being hit-tested. */
  readonly point: QuirePoint;
  /** Optional visible rectangle that clips text caret stops. */
  readonly clipRect?: QuireRect | undefined;
  /** Whether target-bounded mapping may inspect retained source geometry. */
  readonly includeSourceGeometry?: boolean | undefined;
}

/** Options used to map a point inside a document range to an editable caret. */
interface QuireEditableTextRangePointMapOptions {
  /** Layout nodes to search. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Document range that owns the editable text area. */
  readonly range: QuireDocumentRange;
  /** Canvas point being hit-tested. */
  readonly point: QuirePoint;
  /** Optional visible rectangle that clips text caret stops. */
  readonly clipRect?: QuireRect | undefined;
  /** Whether target-bounded mapping may inspect retained source geometry. */
  readonly includeSourceGeometry?: boolean | undefined;
}

/** Result of mapping an editable text point to a caret position. */
interface QuireEditableTextPointMapping {
  /** Document position represented by the caret. */
  readonly position: QuireDocumentPosition;
  /** Start position of the editable textblock that owns the caret. */
  readonly inside: number;
  /** Text or textblock rectangle used for caret placement. */
  readonly rect: QuireRect;
}

/**
 * Maps a point inside a layout node or its editable descendants to a caret.
 *
 * The rule is document-level rather than table-specific: same-line blanks map
 * to the nearest caret stop on that line, and blanks below the last editable
 * line map to the editable content end above the blank.
 *
 * @param options - Layout node or ancestor and point being hit-tested.
 * @returns Caret mapping for editable text blanks, or null when not applicable.
 */
export function mapQuireEditableTextNodePointToCaret(
  options: QuireEditableTextNodePointMapOptions
): QuireEditableTextPointMapping | null {
  const lineMapping = mapQuireEditableTextLinePointToCaret(
    options.node,
    options.point,
    options.clipRect,
    options.includeSourceGeometry === true
  );

  if (lineMapping) {
    return lineMapping;
  }

  const trailingNode = findTrailingEditableLayoutNode(
    options.node,
    options.includeSourceGeometry === true
  );

  if (!trailingNode) {
    return null;
  }

  const trailingFragment = findTrailingTextFragment(trailingNode);

  if (trailingFragment) {
    if (options.point.y <= trailingFragment.rect.y + trailingFragment.rect.height) {
      return null;
    }

    return {
      position: trailingFragment.caretStops.at(-1)?.position ?? {
        pos: trailingFragment.range.to,
        bias: -1
      },
      inside: trailingNode.range.from,
      rect: trailingFragment.rect
    };
  }

  if (
    isQuireEmptyTextblockLayoutNode(trailingNode) &&
    options.point.y > trailingNode.rect.y + trailingNode.rect.height
  ) {
    return {
      position: { pos: trailingNode.range.from + 1, bias: 0 },
      inside: trailingNode.range.from,
      rect: trailingNode.rect
    };
  }

  return null;
}

/**
 * Maps a point inside a document range or its editable descendants to a caret.
 *
 * @param options - Layout tree, owning range, and point being hit-tested.
 * @returns Caret mapping for editable text blanks, or null when not applicable.
 */
export function mapQuireEditableTextRangePointToCaret(
  options: QuireEditableTextRangePointMapOptions
): QuireEditableTextPointMapping | null {
  const node = findLayoutNodeByExactRange(options.nodes, options.range);

  return node
    ? mapQuireEditableTextNodePointToCaret({
        node,
        point: options.point,
        clipRect: options.clipRect,
        includeSourceGeometry: options.includeSourceGeometry
      })
    : null;
}

/**
 * Maps a point on an editable visual line to the nearest caret stop.
 *
 * @param node - Layout node or ancestor to inspect.
 * @param point - Canvas point being hit-tested.
 * @param clipRect - Optional visible rectangle that clips text caret stops.
 * @param includeSourceGeometry - Whether target-bounded mapping may inspect retained source geometry.
 * @returns Caret mapping for a visual line, or null when no line matches.
 */
function mapQuireEditableTextLinePointToCaret(
  node: QuireLayoutNode,
  point: QuirePoint,
  clipRect?: QuireRect | undefined,
  includeSourceGeometry = false
): QuireEditableTextPointMapping | null {
  if (isQuirePointerTransparentLayoutNode(node, includeSourceGeometry)) {
    return null;
  }

  const fragment = findQuireTextFragmentAtPoint(node.textFragments, point);

  if (fragment) {
    const clippedRect = clipRect
      ? intersectQuireRects(fragment.rect, clipRect)
      : null;
    const measuredPosition = clippedRect
      ? findQuireTextCaretStopAtXWithinRect(fragment, point.x, clippedRect).position
      : findQuireTextCaretStopAtX(fragment, point.x).position;

    return {
      position: resolveQuireTransparentInlineBoundaryPosition({
        textblockRange: node.range,
        fragments: node.textFragments ?? [],
        point,
        position: measuredPosition
      }),
      inside: node.range.from,
      rect: clippedRect ?? fragment.rect
    };
  }

  for (const child of node.children ?? []) {
    if (
      isQuirePointerTransparentLayoutNode(child, includeSourceGeometry) ||
      !containsQuirePoint(child.rect, point)
    ) {
      continue;
    }

    const childMapping = mapQuireEditableTextLinePointToCaret(
      child,
      point,
      clipRect,
      includeSourceGeometry
    );

    if (childMapping) {
      return childMapping;
    }
  }

  return null;
}

/**
 * Finds a layout node whose range exactly matches an owning hit-test range.
 *
 * @param nodes - Layout nodes to search.
 * @param range - Document range to match.
 * @returns Matching layout node, or null when none exists.
 */
function findLayoutNodeByExactRange(
  nodes: readonly QuireLayoutNode[],
  range: QuireDocumentRange
): QuireLayoutNode | null {
  for (const node of nodes) {
    if (node.interactionRole === "paint-only") continue;
    if (node.range.from === range.from && node.range.to === range.to) {
      return node;
    }

    const child = findLayoutNodeByExactRange(node.children ?? [], range);

    if (child) {
      return child;
    }
  }

  return null;
}

/**
 * Finds the last editable text-bearing descendant inside a layout node.
 *
 * @param node - Layout node to inspect.
 * @param includeSourceGeometry - Whether retained source geometry may be inspected.
 * @returns Last editable descendant, or null when no editable text node exists.
 */
function findTrailingEditableLayoutNode(
  node: QuireLayoutNode,
  includeSourceGeometry = false
): QuireLayoutNode | null {
  if (isQuirePointerTransparentLayoutNode(node, includeSourceGeometry)) {
    return null;
  }

  let trailing: QuireLayoutNode | null = isTextContentLayoutNode(
    node,
    includeSourceGeometry
  )
    ? node
    : null;

  for (const child of node.children ?? []) {
    const childTrailing = findTrailingEditableLayoutNode(
      child,
      includeSourceGeometry
    );

    if (childTrailing) {
      trailing = childTrailing;
    }
  }

  return trailing;
}

/**
 * Finds the logical trailing text fragment in one editable layout node.
 *
 * @param node - Editable text layout node.
 * @returns Text fragment at the content end, or null for empty textblocks.
 */
function findTrailingTextFragment(
  node: QuireLayoutNode
): NonNullable<QuireLayoutNode["textFragments"]>[number] | null {
  let trailing: NonNullable<QuireLayoutNode["textFragments"]>[number] | null =
    null;

  for (const fragment of node.textFragments ?? []) {
    if (!trailing || fragment.range.to >= trailing.range.to) {
      trailing = fragment;
    }
  }

  return trailing;
}

/**
 * Checks whether a layout node owns editable text placement.
 *
 * @param node - Layout node to inspect.
 * @param includeSourceGeometry - Whether retained source geometry may be treated as text content.
 * @returns Whether the node has text fragments or is an empty textblock slot.
 */
function isTextContentLayoutNode(
  node: QuireLayoutNode,
  includeSourceGeometry = false
): boolean {
  return (
    !isQuirePointerTransparentLayoutNode(node, includeSourceGeometry) &&
    ((node.textFragments?.length ?? 0) > 0 || isQuireEmptyTextblockLayoutNode(node))
  );
}
