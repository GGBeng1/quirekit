import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { cloneTableWithRows } from "../derive/node/clone";
import type { WordTableCommandResult } from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import { applySafeWordTableRepairs } from "./safe";
import {
  repairMalformedVerticalMergeContinuations
} from "./continuation";
import { repairWordTableVerticalMerges } from "./vertical";
import type {
  RepairWordTableOptions,
  WordTableRepairOutcome
} from "./types";

/**
 * Repairs one malformed Word table under an explicit, reportable policy.
 *
 * @param tableNode - Source table node.
 * @param options - Safe or guarded repair choices.
 * @returns Repaired table and diagnostic report, or remaining blockers.
 */
export function repairWordTable(
  tableNode: PMNode,
  options: RepairWordTableOptions = {}
): WordTableCommandResult<WordTableRepairOutcome> {
  const mode = options.mode ?? "safe";
  const before = createWordTableMap(tableNode).diagnostics;
  let repaired = applySafeWordTableRepairs(tableNode);

  if (mode === "explicit") {
    if (options.overflow === "expand-grid") {
      repaired = expandDeclaredGridToOccupiedWidth(repaired);
      repaired = applySafeWordTableRepairs(repaired);
    }
    if (
      options.malformedContinuation === "restart"
      || options.malformedContinuation === "clear"
    ) {
      repaired = repairMalformedVerticalMergeContinuations(
        repaired,
        options.malformedContinuation
      );
    }

    const verticalResult = repairWordTableVerticalMerges(repaired);
    if (verticalResult.ok) repaired = verticalResult.value;
  }

  const remaining = createWordTableMap(repaired).diagnostics;
  const report = {
    mode,
    before,
    applied: findRemovedDiagnostics(before, remaining),
    remaining,
    changed: !repaired.eq(tableNode)
  } as const;

  return remaining.length > 0
    ? wordTableCommandFailure("malformed-table", remaining)
    : wordTableCommandSuccess({ tableNode: repaired, report });
}

/**
 * Adapts the repair outcome to the table-transform command value shape.
 *
 * @param tableNode - Source table node.
 * @param options - Safe or guarded repair choices.
 * @returns Repaired table carrying transaction-visible repair evidence.
 */
export function repairWordTableNode(
  tableNode: PMNode,
  options: RepairWordTableOptions = {}
): WordTableCommandResult<PMNode> {
  const result = repairWordTable(tableNode, options);
  return result.ok
    ? wordTableCommandSuccess(
        result.value.tableNode,
        result.value.report.changed ? result.value.report : undefined
      )
    : result;
}

/**
 * Expands the declared table grid to the widest occupied source row.
 *
 * @param tableNode - Source table node.
 * @returns Table whose canonical grid can contain every existing cell.
 */
function expandDeclaredGridToOccupiedWidth(tableNode: PMNode): PMNode {
  const map = createWordTableMap(tableNode);
  const sourceGrid = Array.isArray(tableNode.attrs.grid)
    ? [...tableNode.attrs.grid]
    : [];

  while (sourceGrid.length < map.width) {
    sourceGrid.push({ width: null });
  }

  return cloneTableWithRows(tableNode, { grid: sourceGrid }, tableNode.children);
}

/**
 * Finds diagnostics eliminated by the selected repair policy.
 *
 * @param before - Diagnostics observed before repair.
 * @param remaining - Diagnostics observed after repair.
 * @returns Diagnostics no longer present after repair.
 */
function findRemovedDiagnostics(
  before: ReturnType<typeof createWordTableMap>["diagnostics"],
  remaining: ReturnType<typeof createWordTableMap>["diagnostics"]
) {
  return before.filter((diagnostic) => !remaining.some((candidate) =>
    candidate.code === diagnostic.code
    && candidate.rowIndex === diagnostic.rowIndex
    && candidate.cellIndex === diagnostic.cellIndex
  ));
}
