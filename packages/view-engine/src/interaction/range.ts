import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../layout";
import { resolveQuireWordRangeAt, type QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireTextblockSelectionRangeOptions,
  QuireTextSelectionRangeOptions
} from "./types";
import { resolveQuireSubLayoutLineSelectionRange } from "./sub-layout-query/line-range";

/** Small tolerance used when grouping measured fragments into one visual line. */
const lineCoordinateTolerance = 0.5;

/**
 * Resolves a word-like range around a hit-tested document position.
 *
 * @param options - Layout snapshot and hit-tested document position.
 * @returns Word range around the position, or null when no measured word is found.
 */
export function resolveQuireWordSelectionRange(
  options: QuireTextSelectionRangeOptions
): QuireDocumentRange | null {
  const match = findTextFragmentAtDocumentPosition(
    options.snapshot.root.children ?? [],
    options.position.pos
  );

  if (!match) {
    return null;
  }

  const index = clampTextOffset(options.position.pos - match.fragment.range.from, match.fragment);
  const word = resolveQuireWordRangeAt(match.fragment.text, index);

  if (!word) {
    return null;
  }

  return {
    from: match.fragment.range.from + word.from,
    to: match.fragment.range.from + word.to
  };
}

/**
 * Resolves the measured visual line range around a hit-tested document position.
 *
 * @param options - Layout snapshot and hit-tested document position.
 * @returns Visual line document range, or null when no measured line is found.
 */
export function resolveQuireLineSelectionRange(
  options: QuireTextSelectionRangeOptions
): QuireDocumentRange | null {
  const subLayoutLineRange = resolveQuireSubLayoutLineSelectionRange(
    options.snapshot.root.children ?? [],
    options
  );

  if (subLayoutLineRange !== null) {
    return subLayoutLineRange;
  }

  const match = findTextFragmentAtDocumentPosition(
    options.snapshot.root.children ?? [],
    options.position.pos
  );

  if (!match) {
    return null;
  }

  const lineFragments = (match.node.textFragments ?? []).filter((fragment) =>
    areQuireTextFragmentsOnSameLine(fragment, match.fragment)
  );

  if (lineFragments.length === 0) {
    return null;
  }

  return {
    from: Math.min(...lineFragments.map((fragment) => fragment.range.from)),
    to: Math.max(...lineFragments.map((fragment) => fragment.range.to))
  };
}

/**
 * Resolves the complete canonical textblock around a hit-tested position.
 *
 * Triple-click selection is a document semantic, not a backend line-layout
 * product. Resolving through PM structure keeps the result stable when Canvas,
 * SVG, and continuous-flow HTML wrap the same text differently.
 *
 * @param options - ProseMirror document and hit-tested document position.
 * @returns Content range of the nearest owning textblock, or null outside one.
 */
export function resolveQuireTextblockSelectionRange(
  options: QuireTextblockSelectionRangeOptions
): QuireDocumentRange | null {
  const $position = options.doc.resolve(options.position.pos);

  for (let depth = $position.depth; depth > 0; depth -= 1) {
    if ($position.node(depth).isTextblock) {
      return {
        from: $position.start(depth),
        to: $position.end(depth)
      };
    }
  }

  return null;
}

/**
 * Finds the measured text fragment that contains a document position.
 *
 * @param nodes - Layout nodes to search.
 * @param position - Document position to resolve.
 * @returns Matching node and fragment, or null when none contains the position.
 */
function findTextFragmentAtDocumentPosition(
  nodes: readonly QuireLayoutNode[],
  position: number
): { readonly node: QuireLayoutNode; readonly fragment: QuireTextFragment } | null {
  for (const node of nodes) {
    const childMatch = findTextFragmentAtDocumentPosition(node.children ?? [], position);

    if (childMatch) {
      return childMatch;
    }

    for (const fragment of node.textFragments ?? []) {
      if (isDocumentPositionInsideFragment(position, fragment)) {
        return { node, fragment };
      }
    }
  }

  return null;
}

/**
 * Checks whether a document position is inside or at the trailing edge of a fragment.
 *
 * @param position - Document position to test.
 * @param fragment - Text fragment to inspect.
 * @returns Whether the fragment should handle the position.
 */
function isDocumentPositionInsideFragment(
  position: number,
  fragment: QuireTextFragment
): boolean {
  return position >= fragment.range.from && position <= fragment.range.to;
}

/**
 * Clamps a document-relative offset to a selectable character index.
 *
 * @param offset - Offset derived from document position and fragment range.
 * @param fragment - Text fragment whose text bounds should clamp the offset.
 * @returns Character index inside the fragment text.
 */
function clampTextOffset(offset: number, fragment: QuireTextFragment): number {
  return Math.min(Math.max(offset, 0), Math.max(fragment.text.length - 1, 0));
}

/**
 * Checks whether two fragments belong to the same visual line box.
 *
 * @param first - First text fragment.
 * @param second - Second text fragment.
 * @returns Whether the fragments share one visual line.
 */
function areQuireTextFragmentsOnSameLine(
  first: QuireTextFragment,
  second: QuireTextFragment
): boolean {
  return (
    Math.abs(first.rect.y - second.rect.y) <= lineCoordinateTolerance &&
    Math.abs(first.lineHeight - second.lineHeight) <= lineCoordinateTolerance
  );
}
