import type { Command, CommandProps, CommandSpec } from "../types";

/**
 * Runs command callbacks until the first one handles the request.
 *
 * @param context - Current command execution context.
 * @param commands - Commands or command factory to inspect.
 * @returns Whether one command handled the request.
 */
export const first: CommandSpec = (commands) => (context) => {
  const items = typeof commands === "function"
    ? (commands as (context: CommandProps) => readonly Command[])(context)
    : commands;

  if (!Array.isArray(items)) {
    return false;
  }

  return (items as readonly Command[]).some((item) => item(context));
};
