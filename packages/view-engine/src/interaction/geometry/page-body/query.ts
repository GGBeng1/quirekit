import type {
  QuireLayoutNode,
  QuireLayoutPage
} from "../../../layout";
import {
  doQuireDocumentRangesIntersect,
  doQuireRectsIntersect
} from "@quirekit/renderer";
import { createQuireInteractionNearestCaretResult } from "../nearest-caret";
import { findQuirePageBodyNearestCaret } from "./nearest";
import type {
  QuireInteractionNearestCaretAtPointResult,
  QuireInteractionPageBodyNearestCaretOptions
} from "../types";

/**
 * Resolves the nearest caret from one page's canonical body-owned geometry.
 *
 * Page chrome is intentionally excluded before distance comparison. This keeps
 * a nearby header or footer caret from winning when a mounted pointer session
 * projects a body drag onto the page's body edge.
 *
 * @param options - Retained snapshot, page, projected point, and body source.
 * @returns Page-local body caret hit, or a miss when body ownership is absent.
 */
export function resolveQuireInteractionPageBodyNearestCaret(
  options: QuireInteractionPageBodyNearestCaretOptions
): QuireInteractionNearestCaretAtPointResult {
  const children = collectQuirePageBodyRoots(
    options.snapshot.root.children ?? [],
    options.page,
    options.sourceId
  );
  return createQuireInteractionNearestCaretResult(
    options.snapshot,
    findQuirePageBodyNearestCaret(children, options)
  );
}

/**
 * Collects the highest canonical body roots intersecting one page body.
 *
 * Retaining each complete root preserves nested provider query products such
 * as Table caret stops while excluding sibling header and footer geometry.
 *
 * @param nodes - Candidate retained layout nodes.
 * @param page - Page whose body rectangle and range bound the query.
 * @param sourceId - Canonical body source identity.
 * @returns Page-local body roots in stable layout order.
 */
function collectQuirePageBodyRoots(
  nodes: readonly QuireLayoutNode[],
  page: QuireLayoutPage,
  sourceId: string
): readonly QuireLayoutNode[] {
  const roots: QuireLayoutNode[] = [];

  for (const node of nodes) {
    if (
      !doQuireRectsIntersect(node.rect, page.bodyRect)
      || !doQuireDocumentRangesIntersect(node.range, page.range)
    ) {
      continue;
    }

    if (isCanonicalBodyLayoutNode(node, sourceId)) {
      roots.push(node);
      continue;
    }

    roots.push(...collectQuirePageBodyRoots(
      node.children ?? [],
      page,
      sourceId
    ));
  }

  return roots;
}

/**
 * Checks whether a retained node belongs to the requested canonical body source.
 *
 * @param node - Retained layout node to classify.
 * @param sourceId - Canonical body source identity.
 * @returns Whether the node can root a body-only page query.
 */
function isCanonicalBodyLayoutNode(
  node: QuireLayoutNode,
  sourceId: string
): boolean {
  return node.layoutOwner?.region.kind === "body"
    && node.layoutOwner.source.sourceId === sourceId;
}
