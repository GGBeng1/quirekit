import type { RawCommands } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { readDataView, serializeDataView } from "@quirekit/data-view";
import type { DataViewInsertion, DataViewReplacement } from "./types";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Document source mutations. */
    readonly dataView: {
      /** @param input - Source and mapped range. @returns Command acceptance. */
      insertDataView: (input: DataViewInsertion) => ReturnType;
      /** @param input - Compare-and-swap target. @returns Command acceptance. */
      replaceDataView: (input: DataViewReplacement) => ReturnType;
    };
  }
}
/** @returns Commands that participate in the existing transaction authority. */
export function dataViewCommands(): Pick<RawCommands, "insertDataView" | "replaceDataView"> {
  return {
    /** @param input - Source and range. @returns One transaction command. */
    insertDataView: input => ({editor, tr, commands, dispatch}) => {
      if (!editor.isEditable || input.from < 0 || input.to < input.from || input.to > tr.doc.content.size) return false;
      try {
        const dataView = readDataView(input.value);
        if (dispatch) closeHistory(tr);
        return commands.insertContentAt({from: input.from, to: input.to}, {type: "dataView", attrs: {dataView}}, {selectInsertedNode: true});
      } catch { return false; }
    },
    /** @param input - Conditional target. @returns One transaction command. */
    replaceDataView: input => ({editor, tr, dispatch}) => {
      if (!editor.isEditable || input.position < 0 || input.position >= tr.doc.content.size) return false;
      const node = tr.doc.nodeAt(input.position); if (node?.type.name !== "dataView") return false;
      try {
        const current = readDataView(node.attrs.dataView), next = readDataView(input.value);
        if (serializeDataView(current) !== input.expected || current.id !== next.id) return false;
        // Attribute edits keep the atom's mapping identity, so inline controls
        // survive a value change and native focus does not leave the widget.
        if (dispatch) closeHistory(tr).setNodeAttribute(input.position, "dataView", next);
        return true;
      } catch { return false; }
    }
  };
}
