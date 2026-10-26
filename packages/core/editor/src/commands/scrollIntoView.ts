import type { CommandSpec } from "../types";

/**
 * Marks the current transaction as needing scroll into view.
 *
 * @param context - Current command execution context.
 * @returns Whether the command was handled.
 */
export const scrollIntoView: CommandSpec = () => (context) => {
  context.dispatch?.(context.tr.scrollIntoView());

  return true;
};
