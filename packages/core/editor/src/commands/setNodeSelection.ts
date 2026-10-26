import { NodeSelection } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { minMax } from "../utilities";

/**
 * Creates a node selection at a document position.
 *
 * @param context - Current command execution context.
 * @param position - Position before the node to select.
 * @returns Whether the node selection was set.
 */
export const setNodeSelection: CommandSpec = (position) => (context) => {
  if (typeof position !== "number") {
    return false;
  }

  const from = minMax(position, 0, context.tr.doc.content.size);

  context.dispatch?.(
    context.tr.setSelection(NodeSelection.create(context.tr.doc, from))
  );
  return true;
};
