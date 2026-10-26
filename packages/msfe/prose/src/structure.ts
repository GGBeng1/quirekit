import type { EditorState } from "@quirekit/cm-state";
import { tableContext } from "./table/context";
import { listContext, previousListItem } from "./list/context";
import type { ProseStructure } from "./types";

/** @param state - Latest source selection. @returns Local semantic context without invoking whole-table edit planners. */
export function getProseStructure(state: EditorState): ProseStructure {
  const table = tableContext(state), list = table ? null : listContext(state, false);
  return { table: !!table, deleteRow: table?.row.node.name === "TableRow", deleteColumn: !!table && table.columns > 1,
    list: !!list, indentList: !!list && !!previousListItem(list.items[0]!) };
}
