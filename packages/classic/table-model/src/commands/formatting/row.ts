import type { Node as PMNode } from "@quirekit/pm";
import { cloneRowWithAttrs, cloneTableWithRows } from "../derive/node/clone";
import type {
  SetWordTableRowAttrsOptions,
  SetWordTableRowHeightOptions,
  ToggleWordTableRowPolicyOptions,
  WordTableCommandResult
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

/**
 * Updates attrs on one Word table row.
 *
 * @param tableNode - Source table node.
 * @param options - Row attr update options.
 * @returns Command result containing the updated table node.
 */
export function setWordTableRowAttrs(
  tableNode: PMNode,
  options: SetWordTableRowAttrsOptions
): WordTableCommandResult<PMNode> {
  if (options.rowIndex < 0 || options.rowIndex >= tableNode.childCount) {
    return wordTableCommandFailure("invalid-selection");
  }

  const rows = tableNode.children.map((row, rowIndex) =>
    rowIndex === options.rowIndex
      ? cloneRowWithAttrs(row, options.attrs)
      : row
  );

  return wordTableCommandSuccess(cloneTableWithRows(tableNode, {}, rows));
}

/**
 * Updates one Word table row height.
 *
 * @param tableNode - Source table node.
 * @param options - Row height update options.
 * @returns Command result containing the updated table node.
 */
export function setWordTableRowHeight(
  tableNode: PMNode,
  options: SetWordTableRowHeightOptions
): WordTableCommandResult<PMNode> {
  return setWordTableRowAttrs(tableNode, {
    rowIndex: options.rowIndex,
    attrs: { height: options.height },
  });
}

/**
 * Toggles whether a row repeats as a table header row.
 *
 * @param tableNode - Source table node.
 * @param options - Row toggle options.
 * @returns Command result containing the updated table node.
 */
export function toggleWordTableHeaderRow(
  tableNode: PMNode,
  options: ToggleWordTableRowPolicyOptions
): WordTableCommandResult<PMNode> {
  return toggleWordTableRowBooleanAttr(tableNode, options, "isHeader");
}

/**
 * Toggles whether a row should avoid splitting across pages.
 *
 * @param tableNode - Source table node.
 * @param options - Row toggle options.
 * @returns Command result containing the updated table node.
 */
export function toggleWordTableRowCantSplit(
  tableNode: PMNode,
  options: ToggleWordTableRowPolicyOptions
): WordTableCommandResult<PMNode> {
  return toggleWordTableRowBooleanAttr(tableNode, options, "cantSplit");
}

/**
 * Toggles a boolean row attr.
 *
 * @param tableNode - Source table node.
 * @param options - Row toggle options.
 * @param attrName - Boolean row attr to update.
 * @returns Command result containing the updated table node.
 */
function toggleWordTableRowBooleanAttr(
  tableNode: PMNode,
  options: ToggleWordTableRowPolicyOptions,
  attrName: "cantSplit" | "isHeader"
): WordTableCommandResult<PMNode> {
  if (options.rowIndex < 0 || options.rowIndex >= tableNode.childCount) {
    return wordTableCommandFailure("invalid-selection");
  }

  const row = tableNode.child(options.rowIndex);
  const value = options.value ?? !Boolean(row.attrs[attrName]);

  return setWordTableRowAttrs(tableNode, {
    rowIndex: options.rowIndex,
    attrs: { [attrName]: value },
  });
}
