import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import { findQuireTextCaretStopAtPosition } from "@quirekit/layout/text";

const fallbackWidgetWidth = 1;

/**
 * Resolves a widget decoration anchor rectangle in snapshot coordinates.
 *
 * @param snapshot - Layout snapshot to inspect.
 * @param position - Widget document position.
 * @returns Anchor rectangle for DOM overlay and hit-test targets.
 */
export function resolveQuireDecorationWidgetRect(
  snapshot: QuireLayoutSnapshot,
  position: number
): QuireRect {
  const fragmentMatch = findFragmentContainingPosition(snapshot.root, position);

  if (fragmentMatch) {
    const caret = findQuireTextCaretStopAtPosition(fragmentMatch.fragment, position);

    return {
      x: fragmentMatch.fragment.rect.x + caret.localX,
      y: fragmentMatch.fragment.rect.y,
      width: fallbackWidgetWidth,
      height: fragmentMatch.fragment.lineHeight
    };
  }

  const node = findNodeContainingPosition(snapshot.root, position) ?? snapshot.root;

  return {
    x: node.rect.x,
    y: node.rect.y,
    width: fallbackWidgetWidth,
    height: node.rect.height
  };
}

/**
 * Resolves the complete visual-line content rectangle containing one widget.
 *
 * Styled and bidirectional text can split one visual line into multiple measured
 * fragments. The returned rectangle spans every co-baseline fragment owned by
 * the same layout node so line-edge adornments never cover a later run.
 *
 * @param snapshot - Layout snapshot to inspect.
 * @param position - Widget document position.
 * @returns Visual-line content rectangle, or the ordinary caret rectangle fallback.
 */
export function resolveQuireDecorationWidgetLineRect(
  snapshot: QuireLayoutSnapshot,
  position: number
): QuireRect {
  const fragmentMatch = findFragmentContainingPosition(snapshot.root, position);

  if (!fragmentMatch) {
    return resolveQuireDecorationWidgetRect(snapshot, position);
  }

  const lineFragments = collectTextFragments(fragmentMatch.lineOwner).filter(
    (fragment) => Math.abs(
      fragment.baseline - fragmentMatch.fragment.baseline
    ) < 0.5
  );
  if (lineFragments.length === 0) {
    return resolveQuireDecorationWidgetRect(snapshot, position);
  }

  const left = Math.min(...lineFragments.map((fragment) => fragment.rect.x));
  const right = Math.max(...lineFragments.map(
    (fragment) => fragment.rect.x + fragment.rect.width
  ));
  const top = Math.min(...lineFragments.map((fragment) => fragment.rect.y));
  const bottom = Math.max(...lineFragments.map(
    (fragment) => fragment.rect.y + fragment.lineHeight
  ));

  return {
    x: left,
    y: top,
    width: Math.max(fallbackWidgetWidth, right - left),
    height: Math.max(1, bottom - top)
  };
}

/**
 * Finds a text fragment that contains a document position.
 *
 * @param node - Layout node to inspect recursively.
 * @param position - Document position to resolve.
 * @returns Matching text fragment wrapper or null.
 */
function findFragmentContainingPosition(
  node: QuireLayoutNode,
  position: number
):
  | {
      readonly lineOwner: QuireLayoutNode;
      readonly fragment: NonNullable<QuireLayoutNode["textFragments"]>[number];
    }
  | null {
  return findFragmentContainingPositionBelow(node, position, node);
}

/**
 * Finds a text fragment while retaining the nearest block line owner.
 *
 * @param node - Current layout node.
 * @param position - Document position to resolve.
 * @param lineOwner - Nearest block ancestor whose descendants share line flow.
 * @returns Matching fragment and its block line owner, or null.
 */
function findFragmentContainingPositionBelow(
  node: QuireLayoutNode,
  position: number,
  lineOwner: QuireLayoutNode
): {
    readonly lineOwner: QuireLayoutNode;
    readonly fragment: NonNullable<QuireLayoutNode["textFragments"]>[number];
  } | null {
  const currentLineOwner = node.kind === "block" ? node : lineOwner;
  for (const fragment of node.textFragments ?? []) {
    if (fragment.range.from <= position && fragment.range.to >= position) {
      return { lineOwner: currentLineOwner, fragment };
    }
  }

  for (const child of node.children ?? []) {
    const match = findFragmentContainingPositionBelow(
      child,
      position,
      currentLineOwner
    );

    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Collects measured fragments below one block line owner in document order.
 *
 * @param node - Block or inline layout subtree to traverse.
 * @returns Every measured text fragment below the subtree.
 */
function collectTextFragments(
  node: QuireLayoutNode
): readonly NonNullable<QuireLayoutNode["textFragments"]>[number][] {
  return [
    ...(node.textFragments ?? []),
    ...(node.children?.flatMap(collectTextFragments) ?? [])
  ];
}

/**
 * Finds the deepest node that contains a document position.
 *
 * @param node - Layout node to inspect recursively.
 * @param position - Document position to resolve.
 * @returns Matching layout node or null.
 */
function findNodeContainingPosition(
  node: QuireLayoutNode,
  position: number
): QuireLayoutNode | null {
  if (node.range.from > position || node.range.to < position) {
    return null;
  }

  for (const child of node.children ?? []) {
    const match = findNodeContainingPosition(child, position);

    if (match) {
      return match;
    }
  }

  return node;
}
