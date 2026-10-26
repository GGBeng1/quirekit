import { deleteSelection as pmDeleteSelection } from "@quirekit/pm";
import type { CommandSpec } from "../types";

/**
 * Deletes the active selection.
 *
 * @param context - Current command execution context.
 * @returns Whether the selection was deleted.
 */
export const deleteSelection: CommandSpec = () => (context) => {
  return pmDeleteSelection(context.state, context.dispatch);
};
