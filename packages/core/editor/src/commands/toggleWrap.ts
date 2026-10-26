import {
  type NodeType
} from "@quirekit/pm";
import {
  getNodeType,
  isNodeActive
} from "../helpers";
import { lift } from "./lift";
import { wrapIn } from "./wrapIn";
import type { CommandSpec } from "../types";

/**
 * Toggles a wrapping node around the current selection.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Node type or node type name.
 * @param attributes - Optional node attributes.
 * @returns Whether the wrap was toggled.
 */
export const toggleWrap: CommandSpec = (typeOrName, attributes = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  return isNodeActive(context.state, type, attributes as Record<string, unknown>)
    ? lift(type, attributes)(context)
    : wrapIn(type, attributes)(context);
};
