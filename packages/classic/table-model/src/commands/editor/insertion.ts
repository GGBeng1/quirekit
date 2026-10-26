import {
  insertContentAt,
  type QuireCommandPosition,
  type AnyCommands,
  type CommandProps,
  type CommandSpec
} from "@quirekit/core";
import {
  Selection,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";
import { isInsertWordTableCommandOptions } from "../derive/editor/table";
import { createWordTableNode } from "../insert";

/**
 * Creates the logical-table insertion command family.
 *
 * @returns Editor command map for table insertion.
 */
export function createWordTableInsertionEditorCommands(): AnyCommands {
  return { insertWordTable };
}

/** Inserts a new Word table at a provided position or current selection. */
const insertWordTable: CommandSpec = (options) => (context) => {
  if (!isInsertWordTableCommandOptions(options)) return false;

  const result = createWordTableNode(context.state.schema, options);
  if (!result.ok) return false;

  return insertWordTableNode(context, result.value, options.position);
};

/**
 * Inserts one validated Word table node and selects its first editable block.
 *
 * @param context - Active command context.
 * @param tableNode - Validated Word table node.
 * @param position - Optional insertion position or range.
 * @returns Whether the generic content insertion succeeded.
 */
export function insertWordTableNode(
  context: CommandProps,
  tableNode: PMNode,
  position?: QuireCommandPosition
): boolean {
  const insertionStepStart = context.tr.steps.length;
  return insertContentAt(
    position ?? {
      from: context.tr.selection.from,
      to: context.tr.selection.to
    },
    tableNode,
    { updateSelection: false }
  )({
    ...context,
    dispatch: context.dispatch === undefined
      ? undefined
      : (transaction) => {
          if (transaction === undefined) return;
          selectInsertedWordTableStart(transaction, insertionStepStart, tableNode);
          context.dispatch?.(transaction);
        }
  } satisfies CommandProps);
}

/**
 * Places selection in the first editable text block of the inserted table.
 *
 * @param transaction - Insertion transaction before dispatch.
 * @param insertionStepStart - Step count captured before table insertion.
 * @param insertedTable - Exact canonical table supplied to the replacement.
 */
function selectInsertedWordTableStart(
  transaction: Transaction,
  insertionStepStart: number,
  insertedTable: PMNode
): void {
  let tableStart: number | null = null;

  for (
    let index = insertionStepStart;
    index < transaction.mapping.maps.length && tableStart === null;
    index += 1
  ) {
    transaction.mapping.maps[index]?.forEach(
      (_oldStart, _oldEnd, newStart, newEnd) => {
        if (tableStart !== null || newEnd <= newStart) return;
        const remaining = transaction.mapping.slice(index + 1);
        const from = remaining.map(newStart, 1);
        const to = remaining.map(newEnd, -1);
        if (to <= from) return;
        // Paragraph splitting may put a closing boundary before the inserted table.
        // Search only this insertion's changed range; exclude enclosing old containers.
        transaction.doc.nodesBetween(from, to, (node, position) => {
          if (tableStart !== null) return false;
          if (position >= from && node.eq(insertedTable)) {
            tableStart = position;
            return false;
          }
          return true;
        });
      }
    );
  }

  if (tableStart === null) return;
  const selection = Selection.findFrom(
    transaction.doc.resolve(tableStart + 1),
    1,
    true
  );
  if (selection) transaction.setSelection(selection);
}
