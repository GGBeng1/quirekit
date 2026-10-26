import type { CommandSpec } from "@quirekit/core";
import { distributeWordTableColumns, distributeWordTableRows } from "../formatting";
import { distributeMeasuredColumns } from "../derive/distribution/columns";
import { distributeMeasuredRows } from "../derive/distribution/rows";
import { distributionRange } from "../derive/distribution/sizing";
import { createWordTableMap } from "../../map";
import { isObjectRecord, locateWordTable } from "../derive/editor/table";
import { createTableTransformCommand } from "../derive/editor/transform";
import { resolveWordTableSelectionOptions, withSelectedColumnRange, withSelectedRowRange } from "../derive/editor/selection/options";
import type { DistributeWordTableColumnsCommandOptions, DistributeWordTableRowsCommandOptions } from "../types";

/**
 * Resolves measured sizing in the Word owner, shared by every UI command entry.
 * @param axis - Source axis to equalize.
 * @returns Canonical command with explicit-total/headless compatibility.
 */
export function createWordTableDistributionCommand(axis: "row" | "column"): CommandSpec {
  return options => context => {
    const resolver = axis === "row" ? withSelectedRowRange : withSelectedColumnRange;
    const resolved = resolveWordTableSelectionOptions(context, isObjectRecord(options) ? options : {}, resolver);
    if (!resolved) return false;
    const commandOptions = resolved as unknown as DistributeWordTableColumnsCommandOptions & DistributeWordTableRowsCommandOptions;
    const located = locateWordTable(context, commandOptions.tablePos);
    if (!located) return false;
    const hasTotal = axis === "row" ? commandOptions.totalHeight !== undefined : commandOptions.totalWidth !== undefined;
    const readChrome = context.editor.view.getTableChrome;
    if (!hasTotal && readChrome !== undefined) {
      const map = createWordTableMap(located.node);
      if (map.diagnostics.length || !distributionRange(commandOptions.from, commandOptions.to, axis === "row" ? map.height : map.width)) return false;
    }
    const chrome = !hasTotal && readChrome !== undefined
      ? readChrome.call(context.editor.view, located.pos, context.tr.selection.head) : null;
    // Never turn stale mounted layout into a guess from direct attrs. A chain
    // which already changed the document must provide an explicit total instead.
    if (!hasTotal && readChrome !== undefined
      && (chrome?.sourceDocument !== context.tr.doc || !chrome.sizing)) return false;
    const sizing = chrome?.sizing;
    const behavior = { preserveSelectionWithinTable: true, scrollIntoView: false };
    if (axis === "row") {
      return createTableTransformCommand<DistributeWordTableRowsCommandOptions>(
        (node, value) => sizing ? distributeMeasuredRows(node, value, sizing) : distributeWordTableRows(node, value),
        undefined, behavior
      )(commandOptions)(context);
    }
    return createTableTransformCommand<DistributeWordTableColumnsCommandOptions>(
      (node, value) => sizing ? distributeMeasuredColumns(node, value, sizing) : distributeWordTableColumns(node, value),
      undefined, behavior
    )(commandOptions)(context);
  };
}
