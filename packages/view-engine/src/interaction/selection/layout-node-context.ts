import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireRect } from "@quirekit/renderer";
import {
  findQuireLayoutNodePathsForPosition,
  resolveQuireLayoutNodePathVisibleRect
} from "../../layout/geometry/node-path";
import type { QuireLayoutNode } from "../../layout";
import { createQuireLayoutNodeQueryProductOwner } from "../layout-node-owner";
import { selectQuireSelectionGeometryContextCandidates } from "./geometry-context-match";
import type { QuireSelectionGeometryContext } from "../types";

/** One ordinary layout occurrence that can represent a document position. */
interface QuireLayoutNodePathCandidate {
  /** Exact root-to-leaf occurrence path. */
  readonly path: readonly QuireLayoutNode[];
  /** Deepest node represented by the path. */
  readonly node: QuireLayoutNode;
  /** Visible document-space rectangle of the occurrence. */
  readonly rect: QuireRect;
  /** Query ownership derived from ordinary retained layout facts. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/**
 * Resolves the ordinary layout occurrence for a repeated document position.
 *
 * @param nodes - Layout nodes to search.
 * @param position - Canonical document position to locate.
 * @param selectionContext - Optional active retained visual context.
 * @returns Exact occurrence path, or an empty path when no node owns the position.
 */
export function resolveQuireLayoutNodePathForSelectionContext(
  nodes: readonly QuireLayoutNode[],
  position: number,
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly QuireLayoutNode[] {
  const candidates = findQuireLayoutNodePathsForPosition(nodes, position)
    .flatMap(createLayoutNodePathCandidate);

  if (candidates.length === 0) {
    return [];
  }

  if (selectionContext === undefined || candidates.length === 1) {
    return candidates[0]?.path ?? [];
  }

  const contextualCandidates = selectQuireSelectionGeometryContextCandidates(
    candidates,
    selectionContext,
    (candidate) => ({
      range: candidate.node.range,
      rect: candidate.rect,
      ...(candidate.queryOwner === undefined
        ? {}
        : { queryOwner: candidate.queryOwner })
    })
  );

  return contextualCandidates[0]?.path ?? candidates[0]?.path ?? [];
}

/**
 * Creates a selectable candidate from one exact layout path.
 *
 * @param path - Root-to-leaf layout path.
 * @returns One candidate, or an empty list when the path is invalid or clipped.
 */
function createLayoutNodePathCandidate(
  path: readonly QuireLayoutNode[]
): readonly QuireLayoutNodePathCandidate[] {
  const node = path.at(-1);
  const rect = resolveQuireLayoutNodePathVisibleRect(path);

  if (node === undefined || rect === null) {
    return [];
  }

  const queryOwner = createQuireLayoutNodeQueryProductOwner(node);

  return [{
    path,
    node,
    rect,
    ...(queryOwner === undefined ? {} : { queryOwner })
  }];
}
