import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import { setGridColumnWidth } from "../derive/formatting/grid";
import { cloneTableWithRows } from "../derive/node/clone";
import type {
  SetWordTableAttrsOptions,
  SetWordTableColumnWidthOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

/**
 * Updates attrs on a Word table node without changing table topology.
 *
 * @param tableNode - Source table node.
 * @param options - Table attr update options.
 * @returns Command result containing the updated table node.
 */
export function setWordTableAttrs(
  tableNode: PMNode,
  options: SetWordTableAttrsOptions
): WordTableCommandResult<PMNode> {
  return wordTableCommandSuccess(
    cloneTableWithRows(tableNode, options.attrs, tableNode.children)
  );
}

/**
 * Updates one declared grid column width.
 *
 * @param tableNode - Source table node.
 * @param options - Column width update options.
 * @returns Command result containing the updated table node.
 */
export function setWordTableColumnWidth(
  tableNode: PMNode,
  options: SetWordTableColumnWidthOptions
): WordTableCommandResult<PMNode> {
  const map = createWordTableMap(tableNode);

  if (options.columnIndex < 0 || options.columnIndex >= map.width) {
    return wordTableCommandFailure("invalid-selection");
  }

  return wordTableCommandSuccess(
    cloneTableWithRows(tableNode, {
      ...(options.width === null ? {} : { tableLayout: "fixed" }),
      grid: setGridColumnWidth(
        tableNode.attrs.grid,
        map.width,
        options.columnIndex,
        options.width
      )
    }, tableNode.children)
  );
}
