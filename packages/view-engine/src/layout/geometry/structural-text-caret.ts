import type {
  QuireDocumentPosition,
  QuireRect
} from "@quirekit/renderer";
import { doQuireRectsIntersect, intersectQuireRects } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { findQuireTextCaretStopAtXWithinRect } from "@quirekit/layout/text";
import type { QuireLayoutNode } from "../types";

/** Side of visible text that should own a structural caret position. */
export type QuireStructuralTextCaretAffinity = "leading" | "trailing";

/** Options used to resolve text caret geometry for a non-text layout node. */
export interface QuireStructuralTextCaretOptions {
  /** Layout nodes to search for visible text fragments. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Structural layout node that currently owns the document position. */
  readonly node: QuireLayoutNode;
  /** Document position being mapped to caret geometry. */
  readonly position: number;
  /** Optional visible rectangle inherited from the structural node path. */
  readonly clipRect?: QuireRect | undefined;
  /** Preferred visible text edge for ambiguous structural positions. */
  readonly affinity?: QuireStructuralTextCaretAffinity | undefined;
}

/** Visible caret geometry resolved from a text fragment. */
export interface QuireStructuralTextCaret {
  /** Document position represented by the visible caret stop. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle without caller-specific width. */
  readonly rect: QuireRect;
}

/** Text fragment candidate clipped by a structural search rectangle. */
interface QuireStructuralTextFragmentCandidate {
  /** Text fragment that overlaps the structural search rectangle. */
  readonly fragment: QuireTextFragment;
  /** Visible rectangle shared by the fragment and structural search rectangle. */
  readonly visibleRect: QuireRect;
}

/**
 * Resolves a structural position to visible text that overlaps the same box.
 *
 * Paginated nested layouts can expose a page-local structural shell while the
 * visible editable text belongs to a source-range sibling. This helper keeps the
 * fallback visual: it only considers fragments that strictly overlap the shell
 * rectangle, so adjacent table cells that merely touch at an edge are ignored.
 *
 * @param options - Layout nodes, structural node, position, and edge preference.
 * @returns Visible text caret geometry, or null when no overlapping text exists.
 */
export function resolveQuireStructuralTextCaret(
  options: QuireStructuralTextCaretOptions
): QuireStructuralTextCaret | null {
  const searchRect = options.clipRect
    ? intersectQuireRects(options.node.rect, options.clipRect) ?? options.node.rect
    : options.node.rect;
  const fragments = flattenTextFragmentsInsideRect(options.nodes, searchRect);

  if (fragments.length === 0) {
    return null;
  }

  const affinity =
    options.affinity ?? inferStructuralTextCaretAffinity(options.node, options.position);
  const candidate = pickTextFragmentByAffinity(fragments, affinity);
  const edgeX = affinity === "leading"
    ? candidate.visibleRect.x
    : candidate.visibleRect.x + candidate.visibleRect.width;
  const caretStop = findQuireTextCaretStopAtXWithinRect(
    candidate.fragment,
    edgeX,
    candidate.visibleRect
  );

  if (!caretStop) {
    return null;
  }

  return {
    position: caretStop.position,
    rect: {
      x: candidate.fragment.rect.x + caretStop.localX,
      y: candidate.visibleRect.y,
      width: 1,
      height: candidate.visibleRect.height
    }
  };
}

/**
 * Infers the visible edge to use for a structural position.
 *
 * @param node - Structural node that owns the position.
 * @param position - Document position being mapped.
 * @returns Preferred visible text edge.
 */
export function inferStructuralTextCaretAffinity(
  node: QuireLayoutNode,
  position: number
): QuireStructuralTextCaretAffinity {
  return position <= node.range.from ? "leading" : "trailing";
}

/**
 * Flattens text fragments that visually overlap a rectangle.
 *
 * @param nodes - Layout nodes to search.
 * @param rect - Structural rectangle bounding the search.
 * @returns Text fragments whose line boxes overlap the rectangle.
 */
function flattenTextFragmentsInsideRect(
  nodes: readonly QuireLayoutNode[],
  rect: QuireRect
): readonly QuireStructuralTextFragmentCandidate[] {
  const fragments: QuireStructuralTextFragmentCandidate[] = [];

  for (const node of nodes) {
    if (!doQuireRectsIntersect(node.rect, rect)) {
      continue;
    }

    for (const fragment of node.textFragments ?? []) {
      const visibleRect = intersectQuireRects(fragment.rect, rect);

      if (visibleRect) {
        fragments.push({ fragment, visibleRect });
      }
    }

    fragments.push(...flattenTextFragmentsInsideRect(node.children ?? [], rect));
  }

  return fragments;
}

/**
 * Selects the leading or trailing fragment in document order.
 *
 * @param fragments - Candidate visible text fragments.
 * @param affinity - Preferred edge in logical document order.
 * @returns Best fragment for the requested affinity.
 */
function pickTextFragmentByAffinity(
  fragments: readonly QuireStructuralTextFragmentCandidate[],
  affinity: QuireStructuralTextCaretAffinity
): QuireStructuralTextFragmentCandidate {
  return fragments.reduce((best, fragment) => {
    if (affinity === "leading") {
      return compareTextFragmentOrder(fragment, best) < 0 ? fragment : best;
    }

    return compareTextFragmentOrder(fragment, best) > 0 ? fragment : best;
  });
}

/**
 * Compares text fragments by logical range, then visual position.
 *
 * @param first - First text fragment.
 * @param second - Second text fragment.
 * @returns Negative when first is before second, positive when after.
 */
function compareTextFragmentOrder(
  first: QuireStructuralTextFragmentCandidate,
  second: QuireStructuralTextFragmentCandidate
): number {
  if (first.fragment.range.from !== second.fragment.range.from) {
    return first.fragment.range.from - second.fragment.range.from;
  }

  if (first.fragment.range.to !== second.fragment.range.to) {
    return first.fragment.range.to - second.fragment.range.to;
  }

  if (first.visibleRect.y !== second.visibleRect.y) {
    return first.visibleRect.y - second.visibleRect.y;
  }

  return first.visibleRect.x - second.visibleRect.x;
}
