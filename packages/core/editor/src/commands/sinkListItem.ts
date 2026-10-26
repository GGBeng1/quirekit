import {
  sinkListItem as pmSinkListItem,
  type NodeType
} from "@quirekit/pm";
import { getNodeType } from "../helpers";
import { runProseMirrorCommand } from "./pm-command";
import { setListContainerSemanticOperation } from "./list-semantic-operation";
import type { CommandSpec } from "../types";

/**
 * Sinks the selected list item into a nested list.
 *
 * @param context - Current command execution context.
 * @param typeOrName - List item node type or node type name.
 * @returns Whether the list item was sunk.
 */
export const sinkListItem: CommandSpec = (typeOrName) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  return runProseMirrorCommand({
    ...context,
    dispatch: context.dispatch
      ? transaction => transaction && context.dispatch?.(
          setListContainerSemanticOperation(transaction, "indent")
        )
      : undefined
  }, pmSinkListItem(type));
};
