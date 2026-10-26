import type { Node as PMNode } from "@quirekit/pm";
import type { QuireLayoutInteractionQueryEntry, QuireLayoutInteractionQueryIndexBucket, QuireLayoutProductSnapshot } from "../../layout/types";
import { queryQuireLayoutInteractionQueryIndexInRect, resolveQuireLayoutInteractionQueryEntryNode } from "../../layout/query-index";
import type { QuireBlockGeometryFragment } from "./types";

const queryRadius = 160;

/**
 * Resolves nearby exact source fragments through retained page buckets.
 * @param snapshot - Current immutable layout product.
 * @param doc - Source document described by the snapshot.
 * @param documentY - Pointer height in document coordinates.
 * @returns Nearby source occurrences, falling back to the same realized page in blank space.
 */
export function queryQuireBlockFragments(snapshot: QuireLayoutProductSnapshot, doc: PMNode, documentY: number): readonly QuireBlockGeometryFragment[] {
  const index = snapshot.interactionQueryIndex;
  if (!index) return [];
  const entries = queryQuireLayoutInteractionQueryIndexInRect(index, { x: snapshot.documentRect.x, y: documentY - queryRadius, width: snapshot.documentRect.width, height: queryRadius * 2 });
  const nearby = projectSourceFragments(snapshot, doc, entries);
  if (nearby.length) return nearby;
  // Edge scrolling includes the workspace gutter beyond the paper. Reuse only
  // the nearest page within the query band, never an arbitrary distant page.
  let page: QuireLayoutInteractionQueryIndexBucket | undefined;
  let distance = queryRadius;
  for (const bucket of index.buckets) {
    if (bucket.pageIndex === undefined) continue;
    const candidateDistance = Math.max(bucket.rect.y - documentY, documentY - bucket.rect.y - bucket.rect.height, 0);
    if (candidateDistance > distance) continue;
    page = bucket; distance = candidateDistance;
    if (distance === 0) break;
  }
  return page ? projectSourceFragments(snapshot, doc, queryQuireLayoutInteractionQueryIndexInRect(index, page.rect)) : [];
}

/**
 * Resolves exact retained entries to complete logical source owners.
 * @param snapshot - Immutable layout product.
 * @param doc - Matching source document.
 * @param entries - Bounded nearby or single-page candidates.
 * @returns Source-backed occurrences; estimates and repeated paint are excluded.
 */
function projectSourceFragments(snapshot: QuireLayoutProductSnapshot, doc: PMNode, entries: readonly QuireLayoutInteractionQueryEntry[]): readonly QuireBlockGeometryFragment[] {
  const result: QuireBlockGeometryFragment[] = [];
  for (const entry of entries) {
    const node = resolveQuireLayoutInteractionQueryEntryNode(snapshot.root, entry);
    if (!node || node.kind !== "block" || node.interactionRole === "paint-only" || node.paintTransform) continue;
    const owner = node.layoutOwner;
    if (!owner || !owner.capabilities.commandable || !owner.capabilities.editable) continue;
    if (!["body", "node-body", "block-container", "section"].includes(owner.region.kind)) continue;
    const start = node.range.from;
    if (start < 0 || start >= doc.content.size) continue;
    const sources: { node: PMNode; from: number }[] = [];
    const direct = doc.nodeAt(start);
    if (direct?.isBlock && direct.attrs.blockId) sources.push({ node: direct, from: start });
    const position = doc.resolve(start);
    for (let depth = position.depth; depth > 0; depth--) {
      const ancestor = position.node(depth);
      if (ancestor.isBlock && ancestor.attrs.blockId) sources.push({ node: ancestor, from: position.before(depth) });
    }
    // A formerly top-level paragraph can retain an ID after being wrapped. Offer
    // its ancestors too; the semantic catalog alone chooses the active scope owner.
    for (const { node: source, from } of sources) {
      const range = { from, to: from + source.nodeSize };
      // Estimates cannot authorize a drop, even inside an identified container.
      if (!node.table && !source.isLeaf && !node.textFragments?.length) continue;
      let first = range.from + 1, last = range.to - 1;
      for (let child = source.firstChild; child?.isBlock && !child.isLeaf; child = child.firstChild) first++;
      for (let child = source.lastChild; child?.isBlock && !child.isLeaf; child = child.lastChild) last--;
      result.push({ from: range.from, to: range.to, occurrenceId: entry.entryId, rect: node.rect, first: node.range.from <= first, last: node.range.to >= last });
    }
  }
  return result;
}
