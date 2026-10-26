import { selectAll as pmSelectAll } from "@quirekit/pm";
import type { CommandSpec } from "../types";

/**
 * Selects the full document.
 *
 * @param context - Current command execution context.
 * @returns Whether the document was selected.
 */
export const selectAll: CommandSpec = () => (context) => {
  return pmSelectAll(context.state, context.dispatch);
};
