import type { CommandSpec } from "../types";
import { resolvePosition } from "./position";

/**
 * Deletes the provided document range.
 *
 * @param context - Current command execution context.
 * @param range - Range to delete.
 * @returns Whether deletion succeeded.
 */
export const deleteRange: CommandSpec = (range) => (context) => {
  const resolved = resolvePosition(range, context.tr.selection.from);

  context.dispatch?.(context.tr.delete(resolved.from, resolved.to).scrollIntoView());
  return true;
};
