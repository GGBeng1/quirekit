import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import type { WordTableCommandResult } from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";
import { repairWordTable } from "./repair";
import type {
  PreparedWordTableCommand,
  WordTableRepairMode
} from "./types";

/**
 * Applies the selected repair mode before a table-map command executes.
 *
 * @param tableNode - Source table node.
 * @param mode - Requested repair mode. Safe repair is the default.
 * @returns Prepared table or typed malformed-table failure.
 */
export function prepareWordTableCommand(
  tableNode: PMNode,
  mode: WordTableRepairMode = "safe"
): WordTableCommandResult<PreparedWordTableCommand> {
  if (mode === "never") {
    const diagnostics = createWordTableMap(tableNode).diagnostics;
    return diagnostics.length > 0
      ? wordTableCommandFailure("malformed-table", diagnostics)
      : wordTableCommandSuccess({ tableNode });
  }

  const result = repairWordTable(tableNode, mode === "explicit"
    ? {
        mode,
        overflow: "expand-grid",
        malformedContinuation: "restart"
      }
    : { mode });

  if (!result.ok) return result;
  return wordTableCommandSuccess(result.value.report.changed
    ? {
        tableNode: result.value.tableNode,
        repair: result.value.report
      }
    : { tableNode: result.value.tableNode });
}
