import type { CommandProps, CommandSpec } from "@quirekit/core";
import {
  TextSelection,
  type Node as PMNode,
  type Selection
} from "@quirekit/pm";
import type {
  WordTableCommandResult,
  WordTableEditorLocateOptions,
  WordTableMaybeDeleted
} from "../../types";
import { WordTableSelection } from "../../../selection";
import {
  resolveWordTableSelectionOptions,
  type WordTableSelectionOptionsResolver
} from "./selection/options";
import {
  ensureDocumentHasBlock,
  isObjectRecord,
  locateWordTable
} from "./table";
import { wordTableRepairTransactionMeta } from "../../repair";
import { replaceWordTableNode } from "../steps/replace";
import type { TableTransformCommandOptions } from "./types";

/**
 * Creates an editor command that replaces or deletes a located table node.
 *
 * @param transform - Pure table transform helper.
 * @param resolveSelectionOptions - Optional structural selection option resolver.
 * @param behavior - Optional transaction behavior for this transform.
 * @returns Editor command that applies the helper through a transaction.
 */
export function createTableTransformCommand<
  Options extends WordTableEditorLocateOptions
>(
  transform: (
    tableNode: PMNode,
    options: Options
  ) => WordTableCommandResult<PMNode | WordTableMaybeDeleted>,
  resolveSelectionOptions?: WordTableSelectionOptionsResolver,
  behavior: TableTransformCommandOptions<Options> = {}
): CommandSpec {
  return (options) => (context) => {
    if (!context.editor.isEditable) {
      return rejectTableTransform(context);
    }
    const rawOptions = isObjectRecord(options)
      ? options
      : undefined;

    if (!rawOptions && !resolveSelectionOptions) {
      return false;
    }

    const resolvedOptions = resolveWordTableSelectionOptions(
      context,
      rawOptions ?? {},
      resolveSelectionOptions
    );

    if (!resolvedOptions) {
      return false;
    }

    const commandOptions = resolvedOptions as Options;
    const located = locateWordTable(context, commandOptions.tablePos);

    if (!located) {
      return false;
    }

    const result = transform(located.node, commandOptions);

    if (!result.ok) {
      return false;
    }

    if (result.repair) {
      context.tr.setMeta(wordTableRepairTransactionMeta, result.repair);
    }

    if (result.value === located.node) {
      return true;
    }

    const selectionBeforeTransform = context.tr.selection;

    if (result.value === null) {
      context.tr.delete(located.pos, located.pos + located.node.nodeSize);
      ensureDocumentHasBlock(context);
    } else {
      replaceWordTableNode(
        context.tr,
        located.pos,
        located.node,
        result.value,
        behavior.granularity ?? "whole-table"
      );
      const resolvedSelection = behavior.resolveSelectionAfterTransform?.({
        tr: context.tr,
        tablePos: located.pos,
        previousTable: located.node,
        nextTable: result.value,
        selection: selectionBeforeTransform,
        options: commandOptions
      }) ?? null;
      if (resolvedSelection !== null) {
        context.tr.setSelection(resolvedSelection);
      } else {
        preserveSelectionWithinTable(
          context.tr,
          located.pos,
          located.node,
          result.value,
          selectionBeforeTransform,
          behavior
        );
      }
    }

    // Capability queries and execution must consult the same complete transaction.
    // This keeps document protection and host locks aligned with the visible UI state.
    if (!context.editor.state.pm.filterTransaction(context.tr)) {
      return rejectTableTransform(context);
    }

    // Size edits are not caret navigation. Preserve any scroll intent already
    // requested by a caller's chain, but do not add one for a remote selection.
    if (context.dispatch) {
      if (behavior.scrollIntoView !== false) context.tr.scrollIntoView();
      context.dispatch(context.tr);
    }

    return true;
  };
}

/**
 * Rejects a Table transform and prevents a shared command chain from dispatching partial steps.
 *
 * @param context - Active command context whose transaction may already contain chain steps.
 * @returns Always false.
 */
function rejectTableTransform(context: CommandProps): false {
  if (context.dispatch !== undefined) {
    context.tr.setMeta("preventDispatch", true);
  }
  return false;
}

/**
 * Restores a semantic or text selection after a same-topology table replacement.
 *
 * @param tr - Transaction containing the table replacement.
 * @param tablePos - Absolute position before the replaced table.
 * @param previousTable - Table node before the transform.
 * @param nextTable - Replacement table node.
 * @param selection - Selection captured before the replacement.
 * @param options - Command behavior controlling selection preservation.
 */
function preserveSelectionWithinTable(
  tr: CommandProps["tr"],
  tablePos: number,
  previousTable: PMNode,
  nextTable: PMNode,
  selection: Selection,
  options: Pick<TableTransformCommandOptions, "preserveSelectionWithinTable">
): void {
  if (
    !options.preserveSelectionWithinTable ||
    previousTable.nodeSize !== nextTable.nodeSize
  ) {
    return;
  }

  if (
    selection instanceof WordTableSelection &&
    selection.tablePos === tablePos
  ) {
    tr.setSelection(WordTableSelection.create(tr.doc, {
      tablePos,
      anchorCellPos: selection.anchorCellPos,
      headCellPos: selection.headCellPos,
      mode: selection.mode
    }));
    return;
  }

  const tableEnd = tablePos + previousTable.nodeSize;

  if (selection.from <= tablePos || selection.to >= tableEnd) {
    return;
  }

  tr.setSelection(TextSelection.create(
    tr.doc,
    selection.from,
    selection.to
  ));
}
