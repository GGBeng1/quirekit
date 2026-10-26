import {
  Fragment,
  NodeSelection,
  Slice,
  TextSelection,
  canSplit,
  type NodeType,
  type ResolvedPos
} from "@quirekit/pm";
import {
  createChainableState,
  getNodeType,
  getSplittedAttributes
} from "../helpers";
import { toNodeAttrs } from "./node-attrs";
import { setListContainerSemanticOperation } from "./list-semantic-operation";
import type {
  CommandProps,
  CommandSpec
} from "../types";

/**
 * Splits one list item into two list items.
 *
 * @param context - Current command execution context.
 * @param typeOrName - List item node type or node type name.
 * @param overrideAttrs - Attributes forced onto newly created nodes.
 * @returns Whether the list item was split.
 */
export const splitListItem: CommandSpec = (typeOrName, overrideAttrs = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const state = createChainableState({
    state: context.state,
    transaction: context.tr
  });
  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);
  const { $from, $to } = state.selection;
  const node = state.selection instanceof NodeSelection ? state.selection.node : undefined;

  if ((node?.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false;
  }

  const grandParent = $from.node(-1);

  if (grandParent.type !== type) {
    return false;
  }

  const overrideAttributes = toNodeAttrs(overrideAttrs);

  if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
    if ($from.depth === 2 || $from.node(-3).type !== type || $from.index(-2) !== $from.node(-2).childCount - 1) {
      return false;
    }

    splitEmptyNestedListItem(context, type, overrideAttributes, $from);

    return true;
  }

  const nextType = $to.pos === $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
  const newTypeAttributes = {
    ...getSplittedAttributes(
      context.editor.extensionManager.attributes,
      grandParent.type.name,
      grandParent.attrs
    ),
    ...overrideAttributes
  };
  const newNextTypeAttributes = {
    ...getSplittedAttributes(
      context.editor.extensionManager.attributes,
      $from.node().type.name,
      $from.node().attrs
    ),
    ...overrideAttributes
  };

  context.tr.delete($from.pos, $to.pos);

  const types = nextType
    ? [
        { type, attrs: newTypeAttributes },
        { type: nextType, attrs: newNextTypeAttributes }
      ]
    : [{ type, attrs: newTypeAttributes }];

  if (!canSplit(context.tr.doc, $from.pos, 2)) {
    return false;
  }

  const { selection, storedMarks } = state;
  const marks = storedMarks ?? (selection.$to.parentOffset ? selection.$from.marks() : undefined);

  context.tr.split($from.pos, 2, types).scrollIntoView();

  if (marks) {
    const filteredMarks = marks.filter((mark) =>
      context.editor.extensionManager.splittableMarks.includes(mark.type.name)
    );

    context.tr.ensureMarks(filteredMarks);
  }

  context.dispatch?.(setListContainerSemanticOperation(context.tr, "item-insert"));

  return true;
};

/**
 * Splits an empty nested list item using Tiptap's wrapper-building algorithm.
 *
 * @param context - Current command execution context.
 * @param type - List item node type.
 * @param overrideAttributes - Attributes forced onto newly created nodes.
 * @param $from - Current selection start position.
 */
function splitEmptyNestedListItem(
  context: CommandProps,
  type: NodeType,
  overrideAttributes: Record<string, unknown>,
  $from: ResolvedPos
): void {
  let wrap = Fragment.empty;
  const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;

  for (let depth = $from.depth - depthBefore; depth >= $from.depth - 3; depth -= 1) {
    wrap = Fragment.from($from.node(depth).copy(wrap));
  }

  const depthAfter =
    $from.indexAfter(-1) < $from.node(-2).childCount
      ? 1
      : $from.indexAfter(-2) < $from.node(-3).childCount
        ? 2
        : 3;
  const nextTypeAttributes = {
    ...getSplittedAttributes(
      context.editor.extensionManager.attributes,
      $from.node().type.name,
      $from.node().attrs
    ),
    ...overrideAttributes
  };
  const nextType = type.contentMatch.defaultType?.createAndFill(nextTypeAttributes);

  wrap = wrap.append(Fragment.from(type.createAndFill(null, nextType ?? undefined) ?? undefined));

  const start = $from.before($from.depth - (depthBefore - 1));

  context.tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));

  let selectionPosition = -1;

  context.tr.doc.nodesBetween(start, context.tr.doc.content.size, (currentNode, pos) => {
    if (selectionPosition > -1) {
      return false;
    }

    if (currentNode.isTextblock && currentNode.content.size === 0) {
      selectionPosition = pos + 1;
    }

    return undefined;
  });

  if (selectionPosition > -1) {
    context.tr.setSelection(TextSelection.near(context.tr.doc.resolve(selectionPosition)));
  }

  context.dispatch?.(setListContainerSemanticOperation(
    context.tr.scrollIntoView(),
    "item-insert"
  ));
}
