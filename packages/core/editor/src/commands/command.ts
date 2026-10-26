import type { Command } from "../types";

/** Inline callback accepted by the `command` command. */
export type QuireInlineCommand = Command;

/**
 * Runs an inline command callback.
 *
 * @param context - Current command execution context.
 * @param callback - Inline command callback to execute.
 * @returns Whether the callback handled the command.
 */
export const command = (callback: QuireInlineCommand): Command => (context) => {
  return typeof callback === "function" ? callback(context) : false;
};
