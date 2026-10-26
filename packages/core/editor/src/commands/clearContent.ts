import type { CommandSpec } from "../types";
import { setContent } from "./setContent";

/**
 * Clears the whole document.
 *
 * @param context - Current command execution context.
 * @param emitUpdate - Whether editor update events should be emitted.
 * @returns Whether the document was cleared.
 */
export const clearContent: CommandSpec = (emitUpdate = true) => (context) => {
  return setContent("", { emitUpdate: emitUpdate !== false })(context);
};
