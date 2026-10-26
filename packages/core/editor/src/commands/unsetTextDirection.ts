import type { CommandSpec } from "../types";
import { resolveOptionalPosition } from "./position";

/**
 * Removes the `dir` attribute from nodes in a range or the active selection.
 *
 * @param context - Current command execution context.
 * @param position - Optional position or range to update.
 * @returns Whether the command was accepted.
 */
export const unsetTextDirection: CommandSpec = (position) => (context) => {
  const range = resolveOptionalPosition(position, context.tr.selection.from, context.tr.selection.to);

  context.tr.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (node.isText) {
      return;
    }

    const attrs: Record<string, unknown> = { ...node.attrs };
    delete attrs.dir;
    context.tr.setNodeMarkup(pos, undefined, attrs);
  });
  context.dispatch?.(context.tr.scrollIntoView());

  return true;
};
