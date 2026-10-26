import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireDecorationNodeGeometry } from "./node";

const fragments = new WeakMap<QuireLayoutNode, Map<string, readonly QuireDecorationNodeGeometry[]>>();

/**
 * Resolves a source node to its outermost retained physical fragments.
 * Pagination can narrow a wrapper's range, so no single fragment contains the
 * complete source node. Containment in the opposite direction admits only its
 * descendants and never expands to an unrelated ancestor or page gap.
 * @param snapshot - Accepted layout in document CSS coordinates.
 * @param range - Complete source node range owned by a node decoration.
 * @returns Physical fragments, cached independently of selection and paint.
 */
export function findQuireDecorationNodeFragments(snapshot: QuireLayoutSnapshot, range: QuireDocumentRange): readonly QuireDecorationNodeGeometry[] {
  let cache = fragments.get(snapshot.root);
  if (!cache) { cache = new Map(); fragments.set(snapshot.root, cache); }
  const key = `${range.from}:${range.to}`, previous = cache.get(key);
  if (previous) return previous;
  const result: QuireDecorationNodeGeometry[] = [];
  /** @param node - Retained physical subtree, never canonical document traversal. */
  function visit(node: QuireLayoutNode): void {
    if (node.interactionRole === "source-geometry" || node.range.to <= range.from || node.range.from >= range.to) return;
    if (node !== snapshot.root && node.range.from >= range.from && node.range.to <= range.to) {
      if (node.rect.width > 0 && node.rect.height > 0) result.push(node);
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(snapshot.root);
  cache.set(key, result);
  return result;
}
