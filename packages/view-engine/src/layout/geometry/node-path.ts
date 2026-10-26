import { intersectQuireRects } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../types";

/**
 * Finds the layout node path whose deepest node contains a document position.
 *
 * @param nodes - Layout nodes to search.
 * @param position - Document position to locate.
 * @returns Root-to-leaf layout node path, or an empty array when none matches.
 */
export function findQuireLayoutNodePathForPosition(
  nodes: readonly QuireLayoutNode[],
  position: number
): readonly QuireLayoutNode[] {
  for (const node of nodes) {
    if (!containsLayoutPosition(node, position)) {
      continue;
    }

    const childPath = findQuireLayoutNodePathForPosition(
      node.children ?? [],
      position
    );

    return childPath.length > 0 ? [node, ...childPath] : [node];
  }

  return [];
}

/**
 * Finds every layout node path whose deepest node contains a document position.
 *
 * Repeated visual instances can expose the same canonical source range more
 * than once. Callers that own visual context use this complete list to choose
 * an occurrence; document-order callers can keep using the singular helper.
 *
 * @param nodes - Layout nodes to search.
 * @param position - Document position to locate.
 * @returns Root-to-leaf paths in stable layout order.
 */
export function findQuireLayoutNodePathsForPosition(
  nodes: readonly QuireLayoutNode[],
  position: number
): readonly (readonly QuireLayoutNode[])[] {
  const paths: Array<readonly QuireLayoutNode[]> = [];

  for (const node of nodes) {
    if (!containsLayoutPosition(node, position)) {
      continue;
    }

    const childPaths = findQuireLayoutNodePathsForPosition(
      node.children ?? [],
      position
    );

    if (childPaths.length === 0) {
      paths.push([node]);
      continue;
    }

    paths.push(...childPaths.map((childPath) => [node, ...childPath]));
  }

  return paths;
}

/**
 * Tests occurrence ownership without assigning a forced break's trailing caret
 * to its outgoing page. That caret is supplied by the next page's first line.
 * @param node - Accepted layout occurrence.
 * @param position - Canonical document position.
 * @returns Whether this occurrence may own the requested caret.
 */
function containsLayoutPosition(node: QuireLayoutNode, position: number): boolean {
  if (position < node.range.from || position > node.range.to) return false;
  if (position !== node.range.to) return true;
  if (node.textFragments?.some(fragment => (
    fragment.breakAfter !== undefined && fragment.range.to === position
  ))) return false;
  const lastChild = node.children?.at(-1);
  return lastChild?.range.to === position ? containsLayoutPosition(lastChild, position) : true;
}

/**
 * Resolves the visible rectangle shared by every node in a layout path.
 *
 * @param path - Root-to-leaf layout node path.
 * @returns Positive-area visible rectangle, or null when the path is empty or clipped away.
 */
export function resolveQuireLayoutNodePathVisibleRect(
  path: readonly QuireLayoutNode[]
): QuireRect | null {
  let visibleRect: QuireRect | null = null;

  for (const node of path) {
    visibleRect = visibleRect === null
      ? node.rect
      : intersectQuireRects(visibleRect, node.rect);

    if (visibleRect === null) {
      return null;
    }
  }

  return visibleRect;
}
