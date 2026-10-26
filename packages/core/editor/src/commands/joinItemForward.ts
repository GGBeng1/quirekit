import { joinPoint } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { setListContainerSemanticOperation } from "./list-semantic-operation";

/**
 * Joins two sibling items after the current selection.
 *
 * @param context - Current command execution context.
 * @returns Whether two items were joined forward.
 */
export const joinItemForward: CommandSpec = () => (context) => {
  try {
    const point = joinPoint(context.state.doc, context.state.selection.$from.pos, 1);

    if (point === null || point === undefined) {
      return false;
    }

    context.tr.join(point, 2);
    context.dispatch?.(setListContainerSemanticOperation(context.tr, "item-delete"));

    return true;
  } catch {
    return false;
  }
};
