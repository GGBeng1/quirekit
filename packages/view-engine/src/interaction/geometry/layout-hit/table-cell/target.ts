import {
  containsQuirePoint,
  measureQuireRectDistanceSquaredToPoint
} from "@quirekit/renderer";
import {
  findQuireTableHitTargetAtPoint
} from "../../../table";
import type {
  QuireLayoutNode,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot
} from "../../../../layout";
import {
  mapQuireEditableTextHitTargetPointToCaret
} from "../../../text";
import type { QuireHitTestResult } from "../../../types";
import { isTextContentLayoutNode } from "../node-position";
import {
  readQuireLayoutHitCandidateNodesInRect
} from "../query-candidates";
import type {
  QuireNearestTableCellHitTargetOptions,
  QuireTableCellLayoutHitOptions
} from "./types";

/**
 * Maps a retained table-cell hit target to a document-position hit.
 *
 * Table-cell boxes expose retained structural hit targets. Normal text
 * fragments and identified sub-layout query products win first; this helper
 * handles the remaining cell box areas that should still land inside the cell
 * document.
 *
 * @param options - Snapshot, point, and current normal-flow candidate node.
 * @returns Table-cell hit result, or null when no table structural target applies.
 */
export function hitTestQuireTableCellLayoutTargetAtPoint(
  options: QuireTableCellLayoutHitOptions
): QuireHitTestResult | null {
  if (isTextContentLayoutNode(options.candidateNode)) {
    return null;
  }

  const tableTarget = options.tableTarget
    ?? findQuireTableHitTargetAtPoint({
      hitTargets: options.snapshot.hitTargets,
      point: options.point
    });

  if (!tableTarget) {
    return null;
  }

  const textTarget = mapQuireEditableTextHitTargetPointToCaret({
    nodes: readQuireLayoutHitCandidateNodesInRect({
      snapshot: options.snapshot,
      rect: tableTarget.rect
    }),
    range: tableTarget.range,
    rect: tableTarget.rect,
    point: options.point
  });

  if (textTarget) {
    return {
      kind: "position",
      ...textTarget
    };
  }

  return {
    kind: "position",
    position: { pos: tableTarget.range.from + 1, bias: 1 },
    inside: tableTarget.range.from,
    rect: tableTarget.rect
  };
}

/**
 * Resolves the nearest page-local cell while a drag crosses table-owned gaps.
 *
 * Exact cell rectangles remain authoritative. This fallback is only consumed
 * by nearest-caret drag queries after the caller has established that the
 * pointer lies inside a retained table surface. Keeping the lookup page-local
 * prevents a repeated or paginated occurrence from borrowing a distant cell.
 *
 * @param options - Snapshot candidates and pointer point to resolve.
 * @returns Nearest cell hit target owned by the containing table, or null.
 */
export function findNearestQuireTableCellHitTargetAtPoint(
  options: QuireNearestTableCellHitTargetOptions
): QuireTableHitTarget | null {
  const table = findDeepestQuireTableAtPoint(
    options.candidateNodes,
    options.point
  );

  if (table === null) {
    return null;
  }

  let nearest: QuireTableHitTarget | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestArea = Number.POSITIVE_INFINITY;

  // Table geometry owns the gap; choose a deterministic adjacent cell without
  // escaping to the document-wide nearest-caret fallback.
  for (const target of table.hitTargets) {
    const distance = measureQuireRectDistanceSquaredToPoint(
      target.rect,
      options.point
    );
    const area = target.rect.width * target.rect.height;

    if (
      distance < nearestDistance
      || (distance === nearestDistance && area < nearestArea)
    ) {
      nearest = target;
      nearestDistance = distance;
      nearestArea = area;
    }
  }

  return nearest;
}

/**
 * Finds the deepest retained table surface containing a point.
 *
 * @param nodes - Shallow query candidates to inspect recursively.
 * @param point - Document-space point whose table ownership is requested.
 * @returns Deepest containing table snapshot, or null.
 */
function findDeepestQuireTableAtPoint(
  nodes: readonly QuireLayoutNode[],
  point: QuireNearestTableCellHitTargetOptions["point"]
): QuireTableLayoutSnapshot | null {
  for (const node of nodes) {
    const childTable = findDeepestQuireTableAtPoint(
      node.children ?? [],
      point
    );

    if (childTable !== null) {
      return childTable;
    }

    if (
      node.table !== undefined
      && containsQuirePoint(node.table.rect, point)
    ) {
      return node.table;
    }
  }

  return null;
}
