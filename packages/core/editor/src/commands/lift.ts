import {
  lift as pmLift,
  type NodeType
} from "@quirekit/pm";
import { getNodeType, isNodeActive } from "../helpers";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Lifts the active node out of an existing wrapping node.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Node type or node type name to guard.
 * @param attributes - Optional attributes that must be active.
 * @returns Whether ProseMirror lifted the active block.
 */
export const lift: CommandSpec = (typeOrName, attributes = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  if (!isNodeActive(context.state, type, attributes as Record<string, unknown>)) {
    return false;
  }

  return runProseMirrorCommand(context, pmLift);
};
