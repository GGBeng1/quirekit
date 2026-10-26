import { containsQuirePoint } from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../../layout";
import type { QuireLayoutSnapshot } from "../../../../editor-layout";
import {
  findQuireTableRowOffsetSlotAtPoint
} from "../../../table";
import type { QuireHitTestResult } from "../../../types";
import {
  readQuireLayoutHitCandidateNodesAtPoint
} from "../query-candidates";
import { mapQuireTableRowOffsetSlotToAdjacentCellCaret } from "./row-offset-caret";
import type { QuireTableRowOffsetSlotLayoutHit } from "./types";

/**
 * Maps a row-offset grid slot in a layout snapshot to a position hit.
 *
 * Row-offset slots are table-owned omitted grid areas, not source cells. This
 * query walks retained table metadata and maps the slot to the neighboring
 * real-cell boundary, matching WPS online behavior without mutating the
 * document or inventing a missing cell.
 *
 * @param options - Snapshot and document-space point to inspect.
 * @returns Row-offset slot position hit result, or null when no slot applies.
 */
export function hitTestQuireTableRowOffsetSlotInLayoutSnapshot(options: {
  /** Layout snapshot whose table metadata should be queried. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to inspect. */
  readonly point: QuirePoint;
}): QuireHitTestResult | null {
  const tableRowOffsetSlot = findQuireTableRowOffsetSlotInLayoutNodes(
    readQuireLayoutHitCandidateNodesAtPoint({
      snapshot: options.snapshot,
      point: options.point
    }),
    options.point
  );

  if (tableRowOffsetSlot === null) {
    return null;
  }

  return mapQuireTableRowOffsetSlotToAdjacentCellCaret({
    snapshot: options.snapshot,
    table: tableRowOffsetSlot.table,
    slot: tableRowOffsetSlot.slot,
    point: options.point
  }) ?? {
    kind: "miss"
  };
}

/**
 * Finds a row-offset slot in retained table metadata.
 *
 * @param nodes - Layout nodes to traverse.
 * @param point - Document-space point to inspect.
 * @returns Matching row-offset slot and table, or null when no retained table owns it.
 */
function findQuireTableRowOffsetSlotInLayoutNodes(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuireTableRowOffsetSlotLayoutHit | null {
  for (const node of nodes) {
    const childSlot = findQuireTableRowOffsetSlotInLayoutNodes(
      node.children ?? [],
      point
    );

    if (childSlot !== null) {
      return childSlot;
    }

    if (node.table === undefined || !containsQuirePoint(node.table.rect, point)) {
      continue;
    }

    const tableRowOffsetSlot = findQuireTableRowOffsetSlotAtPoint({
      table: node.table,
      point
    });

    if (tableRowOffsetSlot !== null) {
      return {
        table: node.table,
        slot: tableRowOffsetSlot
      };
    }
  }

  return null;
}
