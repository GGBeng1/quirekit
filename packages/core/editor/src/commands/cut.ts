import { TextSelection } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { resolvePosition } from "./position";

/**
 * Cuts content from a range and inserts it at a mapped target position.
 *
 * @param context - Current command execution context.
 * @param range - Range to cut.
 * @param targetPos - Position where the cut content should be inserted.
 * @returns Whether the content was cut and inserted.
 */
export const cut: CommandSpec = (range, targetPos) => (context) => {
  if (typeof targetPos !== "number") {
    return false;
  }

  const resolved = resolvePosition(range, context.tr.selection.from);

  if (resolved.from > resolved.to) {
    return false;
  }

  const contentSlice = context.state.doc.slice(resolved.from, resolved.to);

  context.tr.deleteRange(resolved.from, resolved.to);
  const mappedTarget = context.tr.mapping.map(targetPos);
  context.tr.insert(mappedTarget, contentSlice.content);
  context.tr.setSelection(
    TextSelection.create(context.tr.doc, Math.max(mappedTarget - 1, 0))
  );
  context.dispatch?.(context.tr.scrollIntoView());

  return true;
};
