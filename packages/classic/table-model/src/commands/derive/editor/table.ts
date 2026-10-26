import type { CommandProps } from "@quirekit/core";
import { NodeSelection, TextSelection, type Node as PMNode } from "@quirekit/pm";
import type { InsertWordTableCommandOptions } from "../../types";

/** Located table node and absolute document position. */
export interface LocatedWordTable {
  /** Absolute document position of the table node. */
  readonly pos: number;
  /** Table node found at the position. */
  readonly node: PMNode;
}

/**
 * Locates a Word table by explicit position or current selection ancestry.
 *
 * @param context - Command execution context.
 * @param tablePos - Optional absolute document position of a table node.
 * @returns Located table information, or null.
 */
export function locateWordTable(
  context: CommandProps,
  tablePos?: number
): LocatedWordTable | null {
  const tableType = context.state.schema.nodes.wordTable;

  if (!tableType) {
    return null;
  }

  if (typeof tablePos === "number") {
    if (
      !Number.isSafeInteger(tablePos)
      || tablePos < 0
      || tablePos > context.tr.doc.content.size
    ) {
      return null;
    }
    const node = context.tr.doc.nodeAt(tablePos);

    return node?.type === tableType ? { pos: tablePos, node } : null;
  }

  const { selection } = context.tr;

  if (selection instanceof NodeSelection && selection.node.type === tableType) {
    return { pos: selection.from, node: selection.node };
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);

    if (node.type === tableType) {
      return { pos: selection.$from.before(depth), node };
    }
  }

  return null;
}

/**
 * Checks whether a value is a plain object-like record.
 *
 * @param value - Value to inspect.
 * @returns Whether the value can be treated as command options.
 */
export function isObjectRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value contains minimum insert table options.
 *
 * @param value - Value to inspect.
 * @returns Whether the value can be used to insert a Word table.
 */
export function isInsertWordTableCommandOptions(
  value: unknown
): value is InsertWordTableCommandOptions {
  return (
    isObjectRecord(value) &&
    Number.isInteger(value.rowCount) &&
    Number.isInteger(value.columnCount)
  );
}

/**
 * Keeps the document editable after deleting the only block node.
 *
 * @param context - Command execution context.
 */
export function ensureDocumentHasBlock(context: CommandProps): void {
  if (context.tr.doc.childCount > 0) {
    return;
  }

  const paragraph = context.state.schema.nodes.paragraph?.createAndFill();

  if (!paragraph) {
    return;
  }

  context.tr.insert(0, paragraph);
  context.tr.setSelection(TextSelection.create(context.tr.doc, 1));
}
