import {
  type NodeType
} from "@quirekit/pm";
import {
  getNodeType,
  isNodeActive
} from "../helpers";
import { setNode } from "./setNode";
import type { CommandSpec } from "../types";

/**
 * Toggles between two textblock node types.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Node type or name to activate.
 * @param toggleTypeOrName - Node type or name to use when the target is active.
 * @param attributes - Optional node attributes for the activated node.
 * @returns Whether the node type was toggled.
 */
export const toggleNode: CommandSpec = (
  typeOrName,
  toggleTypeOrName,
  attributes = {}
) => (context) => {
  if (
    (typeof typeOrName !== "string" && typeof typeOrName !== "object") ||
    (typeof toggleTypeOrName !== "string" && typeof toggleTypeOrName !== "object")
  ) {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);
  const toggleType = getNodeType(toggleTypeOrName as NodeType | string, context.state.schema);
  const isActive = isNodeActive(context.state, type, attributes as Record<string, unknown>);
  const attributesToCopy = context.tr.selection.$anchor.sameParent(context.tr.selection.$head)
    ? context.tr.selection.$anchor.parent.attrs
    : undefined;

  return isActive
    ? setNode(toggleType, attributesToCopy)(context)
    : setNode(type, {
      ...(attributesToCopy ?? {}),
      ...(attributes as Record<string, unknown>)
    })(context);
};
