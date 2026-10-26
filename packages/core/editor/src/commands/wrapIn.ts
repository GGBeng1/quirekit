import {
  wrapIn as pmWrapIn,
  type NodeType
} from "@quirekit/pm";
import { getNodeType } from "../helpers";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Wraps the active selection in a node type.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Node type or node type name to wrap with.
 * @param attributes - Optional node attributes.
 * @returns Whether ProseMirror wrapped the selection.
 */
export const wrapIn: CommandSpec = (typeOrName, attributes = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  return runProseMirrorCommand(
    context,
    pmWrapIn(type, attributes as Record<string, unknown>)
  );
};
