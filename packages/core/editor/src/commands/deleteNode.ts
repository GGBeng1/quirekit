import type { NodeType } from "@quirekit/pm";
import { getNodeType } from "../helpers";
import type { CommandSpec } from "../types";

/**
 * Deletes the nearest ancestor node of the requested type.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Node type or node type name to delete.
 * @returns Whether a matching node was deleted.
 */
export const deleteNode: CommandSpec = (typeOrName) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);
  const $pos = context.tr.selection.$anchor;

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);

    if (node.type === type) {
      context.dispatch?.(
        context.tr.delete($pos.before(depth), $pos.after(depth)).scrollIntoView()
      );

      return true;
    }
  }

  return false;
};
