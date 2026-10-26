import { type AnyCommands, type CommandSpec } from "@quirekit/core";
import {
  WordTableSelection,
  type WordTableSelectionCreateOptions
} from "../../selection";

/**
 * Creates the structural-selection command family.
 *
 * @returns Editor command map for structural Table selection.
 */
export function createWordTableSelectionEditorCommands(): AnyCommands {
  return {
    setWordTableSelection: createSetWordTableSelectionCommand()
  };
}

/**
 * Creates the canonical structural Table selection command.
 *
 * @returns Command selecting one exact semantic cell range.
 */
function createSetWordTableSelectionCommand(): CommandSpec {
  return (options: WordTableSelectionCreateOptions) => (context) => {
    try {
      const selection = WordTableSelection.create(context.tr.doc, options);
      context.dispatch?.(context.tr.setSelection(selection));
      return true;
    } catch {
      return false;
    }
  };
}
