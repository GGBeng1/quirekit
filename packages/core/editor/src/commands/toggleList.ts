import {
  canJoin,
  wrapInList as pmWrapInList,
  type NodeType,
  type Transaction
} from "@quirekit/pm";
import {
  createChainableState,
  findParentNode,
  getNodeType,
  isList
} from "../helpers";
import { clearNodes } from "./clearNodes";
import { liftListItem } from "./liftListItem";
import { toNodeAttrs } from "./node-attrs";
import { wrapInList } from "./wrapInList";
import { setListContainerSemanticOperation } from "./list-semantic-operation";
import type {
  CommandProps,
  CommandSpec
} from "../types";

/**
 * Toggles between list wrapping and a plain block.
 *
 * @param context - Current command execution context.
 * @param listTypeOrName - List node type or node type name.
 * @param itemTypeOrName - List item node type or node type name.
 * @param keepMarks - Whether active marks should be preserved after wrapping.
 * @param attributes - Optional list node attributes.
 * @returns Whether the list state changed.
 */
export const toggleList: CommandSpec = (
  listTypeOrName,
  itemTypeOrName,
  keepMarks,
  attributes = {}
) => (context) => {
  if (
    (typeof listTypeOrName !== "string" && typeof listTypeOrName !== "object") ||
    (typeof itemTypeOrName !== "string" && typeof itemTypeOrName !== "object")
  ) {
    return false;
  }

  const listType = getNodeType(listTypeOrName as NodeType | string, context.state.schema);
  const itemType = getNodeType(itemTypeOrName as NodeType | string, context.state.schema);
  const state = createChainableState({
    state: context.state,
    transaction: context.tr
  });
  const { selection, storedMarks } = state;
  const { $from, $to } = selection;
  const range = $from.blockRange($to);
  const marks = storedMarks ?? (selection.$to.parentOffset ? selection.$from.marks() : undefined);

  if (!range) {
    return false;
  }

  const parentList = findParentNode((node) =>
    isList(node.type.name, context.editor.extensions)
  )(selection);

  if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
    if (parentList.node.type === listType) {
      return liftListItem(itemType)(context);
    }

    if (isList(parentList.node.type.name, context.editor.extensions) && listType.validContent(parentList.node.content)) {
      context.tr.setNodeMarkup(parentList.pos, listType);
      joinListBackwards(context.tr, listType);
      joinListForwards(context.tr, listType);
      context.dispatch?.(setListContainerSemanticOperation(
        context.tr,
        "kind-change"
      ));

      return true;
    }
  }

  if (keepMarks && marks) {
    context.tr.ensureMarks(
      marks.filter((mark) =>
        context.editor.extensionManager.splittableMarks.includes(mark.type.name)
      )
    );
  }

  if (!canWrapInList(context, listType, attributes)) {
    clearNodes()(context);
  }

  if (!wrapInList(listType, attributes)(context)) {
    return false;
  }

  joinListBackwards(context.tr, listType);
  joinListForwards(context.tr, listType);
  context.dispatch?.(context.tr);

  return true;
};

/**
 * Joins a list with the previous sibling list when the schema allows it.
 *
 * @param tr - Transaction whose selection anchors the active list.
 * @param listType - List type to join.
 * @returns Whether the check completed.
 */
function joinListBackwards(tr: Transaction, listType: NodeType): boolean {
  const list = findParentNode((node) => node.type === listType)(tr.selection);

  if (!list || list.pos < 0 || list.pos > tr.doc.content.size) {
    return true;
  }

  // The join authority is the exact sibling boundary before the current list.
  // Resolving `list.pos - 1` loses the wrapper depth when a list is the first
  // child of a section-like node and makes `.before(list.depth)` invalid.
  const boundary = tr.doc.resolve(list.pos);
  const nodeBefore = boundary.nodeBefore;
  const nodeAfter = boundary.nodeAfter;

  if (
    nodeBefore?.type === listType
    && nodeAfter?.type === listType
    && canJoin(tr.doc, list.pos)
  ) {
    tr.join(list.pos);
  }

  return true;
}

/**
 * Joins a list with the following sibling list when the schema allows it.
 *
 * @param tr - Transaction whose selection anchors the active list.
 * @param listType - List type to join.
 * @returns Whether the check completed.
 */
function joinListForwards(tr: Transaction, listType: NodeType): boolean {
  const list = findParentNode((node) => node.type === listType)(tr.selection);

  if (!list) {
    return true;
  }

  const currentList = tr.doc.nodeAt(list.pos);
  if (currentList?.type !== listType) return true;
  const after = list.pos + currentList.nodeSize;
  if (after < 0 || after > tr.doc.content.size) return true;
  const boundary = tr.doc.resolve(after);
  const nodeBefore = boundary.nodeBefore;
  const nodeAfter = boundary.nodeAfter;

  if (
    nodeBefore?.type === listType
    && nodeAfter?.type === listType
    && canJoin(tr.doc, after)
  ) {
    tr.join(after);
  }

  return true;
}

/**
 * Checks whether a selection can be wrapped in a list without dispatching.
 *
 * @param context - Current command execution context.
 * @param listType - List type to inspect.
 * @param attributes - Optional list attributes.
 * @returns Whether the current selection can be wrapped in a list.
 */
function canWrapInList(
  context: CommandProps,
  listType: NodeType,
  attributes: unknown
): boolean {
  const state = createChainableState({
    state: context.state,
    transaction: context.tr
  });

  return pmWrapInList(listType, toNodeAttrs(attributes))(state, undefined);
}
