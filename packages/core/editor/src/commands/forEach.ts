import type { CommandProps, CommandSpec } from "../types";

/**
 * Runs a callback for every item and succeeds only when each callback succeeds.
 *
 * @param context - Current command execution context.
 * @param items - Items to iterate.
 * @param callback - Callback invoked for each item.
 * @returns Whether every callback returned true.
 */
export const forEach: CommandSpec = (items, callback) => (context) => {
  if (!Array.isArray(items) || typeof callback !== "function") {
    return false;
  }

  return items.every((item, index) =>
    (callback as (
      item: unknown,
      context: CommandProps & { readonly index: number }
    ) => boolean)(item, { ...context, index })
  );
};
