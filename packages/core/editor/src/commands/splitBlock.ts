import {
  NodeSelection,
  TextSelection,
  canSplit,
  type EditorState as PMEditorState,
  type Transaction
} from "@quirekit/pm";
import { defaultBlockAt, getSplittedAttributes } from "../helpers";
import type { CommandSpec } from "../types";

/** Options accepted by the Tiptap-compatible splitBlock command. */
export interface QuireSplitBlockOptions {
  /** Whether marks from the previous block should be kept after splitting. */
  readonly keepMarks?: boolean | undefined;
}

/**
 * Keeps active marks that opted into split preservation.
 *
 * @param transaction - Transaction that should receive preserved marks.
 * @param state - ProseMirror state used as the mark source.
 * @param splittableMarks - Mark names that should survive block splitting.
 * @returns Nothing.
 */
function ensureMarks(
  transaction: Transaction,
  state: PMEditorState,
  splittableMarks: readonly string[]
): void {
  const marks =
    state.storedMarks ||
    (state.selection.$to.parentOffset ? state.selection.$from.marks() : undefined);

  if (marks) {
    const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));

    transaction.ensureMarks(filteredMarks);
  }
}

/**
 * Splits the active textblock using Tiptap's mark and attribute preservation
 * semantics.
 *
 * @param context - Current command execution context.
 * @param options - Optional split behavior.
 * @returns Whether the block can be split.
 */
export const splitBlock: CommandSpec = (options = {}) => (context) => {
  const { keepMarks = true } = typeof options === "object" && options !== null
    ? options as QuireSplitBlockOptions
    : {};
  const { tr, state, editor } = context;
  const { selection, doc } = tr;
  const { $from, $to } = selection;
  const extensionAttributes = editor.extensionManager.attributes;
  const newAttributes = getSplittedAttributes(
    extensionAttributes,
    $from.node().type.name,
    $from.node().attrs
  );

  if (selection instanceof NodeSelection && selection.node.isBlock) {
    if (!$from.parentOffset || !canSplit(doc, $from.pos)) {
      return false;
    }

    if (keepMarks) {
      ensureMarks(tr, state, editor.extensionManager.splittableMarks);
    }

    tr.split($from.pos).scrollIntoView();
    context.dispatch?.(tr);

    return true;
  }

  if (!$from.parent.isBlock) {
    return false;
  }

  const atEnd = $to.parentOffset === $to.parent.content.size;
  const defaultType =
    $from.depth === 0
      ? undefined
      : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1))) ?? undefined;
  let types =
    atEnd && defaultType
      ? [{ type: defaultType, attrs: newAttributes }]
      : undefined;
  const canFallBackToDefault = types === undefined;
  // Middle splits keep Tiptap's original attribute inheritance. Explicit feature
  // projections still apply to the new node, without rescanning the document.
  if (!types && extensionAttributes.some(attribute =>
    attribute.type === $from.parent.type.name && attribute.attribute.splitValue != null
  )) {
    types = [{ type: $from.parent.type, attrs: { ...$from.parent.attrs, ...newAttributes } }];
  }
  let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types);

  if (
    canFallBackToDefault &&
    !can &&
    canSplit(tr.doc, tr.mapping.map($from.pos), 1, defaultType ? [{ type: defaultType }] : undefined)
  ) {
    can = true;
    types = defaultType
      ? [{ type: defaultType, attrs: newAttributes }]
      : undefined;
  }

  if (can) {
    if (selection instanceof TextSelection) {
      tr.deleteSelection();
    }

    tr.split(tr.mapping.map($from.pos), 1, types);

    if (defaultType && !atEnd && !$from.parentOffset && $from.parent.type !== defaultType) {
      const first = tr.mapping.map($from.before());
      const $first = tr.doc.resolve(first);

      if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, defaultType)) {
        tr.setNodeMarkup(tr.mapping.map($from.before()), defaultType);
      }
    }
  }

  if (keepMarks) {
    ensureMarks(tr, state, editor.extensionManager.splittableMarks);
  }

  tr.scrollIntoView();
  context.dispatch?.(tr);

  return can;
};
