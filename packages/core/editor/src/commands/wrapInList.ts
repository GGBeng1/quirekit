import {
  wrapInList as pmWrapInList,
  type NodeType
} from "@quirekit/pm";
import { getNodeType } from "../helpers";
import { toNodeAttrs } from "./node-attrs";
import { runProseMirrorCommand } from "./pm-command";
import { setListContainerSemanticOperation } from "./list-semantic-operation";
import type { CommandSpec } from "../types";

/**
 * Wraps the active selection in a list node.
 *
 * @param context - Current command execution context.
 * @param typeOrName - List node type or node type name.
 * @param attributes - Optional list node attributes.
 * @returns Whether the selection was wrapped in a list.
 */
export const wrapInList: CommandSpec = (typeOrName, attributes = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  const handled = runProseMirrorCommand(
    {
      ...context,
      dispatch: context.dispatch
        ? (transaction) => transaction && context.dispatch?.(
            setListContainerSemanticOperation(transaction, "wrap")
          )
        : undefined
    },
    pmWrapInList(type, toNodeAttrs(attributes))
  );
  return handled;
};
