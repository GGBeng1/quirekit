import type { CommandSpec } from "../types";
import { resolveOptionalPosition } from "./position";

/** Text direction values accepted by the text direction commands. */
export type QuireTextDirection = "ltr" | "rtl" | "auto";

/**
 * Sets the `dir` attribute for nodes in a range or the active selection.
 *
 * @param context - Current command execution context.
 * @param direction - Text direction to apply.
 * @param position - Optional position or range to update.
 * @returns Whether the command was accepted.
 */
export const setTextDirection: CommandSpec = (direction, position) => (context) => {
  if (direction !== "ltr" && direction !== "rtl" && direction !== "auto") {
    return false;
  }

  const range = resolveOptionalPosition(position, context.tr.selection.from, context.tr.selection.to);

  context.tr.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (node.isText) {
      return;
    }

    context.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      dir: direction
    });
  });
  context.dispatch?.(context.tr.scrollIntoView());

  return true;
};
