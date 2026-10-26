import type { MsfeCommand } from "@quirekit/msfe-core";
import type { TableAlignment } from "../types";
import { tableContext } from "./context";

/** @param alignment - Canonical GFM column alignment. @returns A local delimiter edit preserving all cell content and surrounding spelling. */
export function setTableColumnAlignment(alignment: TableAlignment): MsfeCommand {
  return state => {
    const context = tableContext(state);
    if (!context || !["left", "center", "right", "default"].includes(alignment)) return null;
    const source = state.sliceDoc(context.delimiter.from, context.delimiter.to);
    const fields = source.replace(/^\||\|$/gu, "").split("|");
    const field = fields[context.column];
    if (!field) return null;
    const from = context.delimiter.from + Number(source.startsWith("|"))
      + fields.slice(0, context.column).reduce((sum, value) => sum + value.length + 1, 0);
    const insert = field.replace(/:?-+:?/u, match => `${alignment === "left" || alignment === "center" ? ":" : ""}${match.replace(/:/gu, "")}${alignment === "right" || alignment === "center" ? ":" : ""}`);
    return { changes: { from, to: from + field.length, insert } };
  };
}
