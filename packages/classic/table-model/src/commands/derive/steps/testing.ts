import { createEditor, type QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import {
  AttrStep,
  ReplaceStep,
  type Node as PMNode,
  type Step,
  type Transaction
} from "@quirekit/pm";
import { WordTableExtensions } from "../../../schema";

/** One generated cell's attrs and content override. */
export interface TestCellOverride {
  /** Cell attrs. */
  readonly attrs?: Readonly<Record<string, unknown>>;
  /** Whether the cell holds an empty paragraph. */
  readonly empty?: boolean;
}

/** Cell overrides keyed by `row:column`; null omits that explicit cell. */
export type TestCellOverrides = Readonly<Record<string, TestCellOverride | null>>;

/**
 * Creates a table whose cells hold distinct `R{row}C{column}` text.
 *
 * @param rowCount - Row count.
 * @param columnCount - Cells per row before overrides remove any.
 * @param cells - Per-cell overrides, or null to omit that explicit cell.
 * @param empty - Whether cells hold empty paragraphs unless overridden.
 * @returns Table JSON with an explicit unit grid.
 */
export function createTextTable(
  rowCount: number,
  columnCount: number,
  cells: TestCellOverrides = {},
  empty = false
): QuireJSONContent {
  return {
    type: "wordTable",
    attrs: {
      grid: Array.from({ length: columnCount }, () => ({ width: { value: 1200, unit: "dxa" } }))
    },
    content: Array.from({ length: rowCount }, (_row, row) => ({
      type: "wordTableRow",
      content: Array.from({ length: columnCount }, (_cell, column) => (
        createTextCell(row, column, cells[`${row}:${column}`], empty)
      )).filter((cell): cell is QuireJSONContent => cell !== null)
    }))
  };
}

/**
 * Creates one generated table cell.
 *
 * @param row - Row index used in the cell text.
 * @param column - Column index used in the cell text.
 * @param override - Cell override, or null to omit the cell.
 * @param empty - Default empty-content choice.
 * @returns Cell JSON, or null when omitted.
 */
function createTextCell(
  row: number,
  column: number,
  override: TestCellOverride | null | undefined,
  empty: boolean
): QuireJSONContent | null {
  if (override === null) return null;
  const paragraph: QuireJSONContent = override?.empty ?? empty
    ? { type: "paragraph" }
    : { type: "paragraph", content: [{ type: "text", text: `R${row}C${column}` }] };
  return {
    type: "wordTableCell",
    ...(override?.attrs === undefined ? {} : { attrs: { ...override.attrs } }),
    content: [paragraph]
  };
}

/**
 * Creates an undoable editor with text around one table.
 *
 * @param table - Table JSON.
 * @returns Editor whose table starts after one paragraph.
 */
export function createStepEditor(table: QuireJSONContent): QuireEditor {
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "before" }] },
        table,
        { type: "paragraph", content: [{ type: "text", text: "after" }] }
      ]
    }
  });
}

/**
 * Runs one command and returns the single root transaction it dispatched.
 *
 * @param editor - Editor under test.
 * @param run - Command invocation.
 * @returns Dispatched transaction.
 */
export function captureTransaction(editor: QuireEditor, run: () => boolean): Transaction {
  const emitted: Transaction[] = [];
  const listener = ({ transaction }: { readonly transaction: Transaction }) => {
    emitted.push(transaction);
  };
  editor.on("transaction", listener);
  try {
    if (!run()) throw new Error("The table command was rejected.");
  } finally {
    editor.off("transaction", listener);
  }
  if (emitted.length !== 1) throw new Error(`Expected one transaction, got ${emitted.length}.`);
  return emitted[0]!;
}

/**
 * Finds the first table position in a document.
 *
 * @param doc - Document.
 * @returns Absolute position before the table.
 */
export function findTablePos(doc: PMNode): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === "wordTable") found = pos;
    return found < 0;
  });
  if (found < 0) throw new Error("Missing table.");
  return found;
}

/**
 * Describes each step by its table-relative structural location.
 *
 * Replace steps read `parent@index -deleted +inserted`; attribute steps read
 * `owner.attr`. Rows are `r{index}` and cells `c{row}.{index}`.
 *
 * @param tr - Transaction to describe.
 * @returns One stable description per step.
 */
export function describeSteps(tr: Transaction): readonly string[] {
  return tr.steps.map((step, index) => describeStep(step, tr.docs[index]!));
}

/**
 * Describes one step against the document it applies to.
 *
 * @param step - Step.
 * @param doc - Document before the step.
 * @returns Stable description.
 */
function describeStep(step: Step, doc: PMNode): string {
  if (step instanceof AttrStep) {
    return `${describeOwner(doc, step.pos)}.${step.attr}`;
  }
  if (!(step instanceof ReplaceStep)) return step.constructor.name;
  const $from = doc.resolve(step.from);
  const deleted = doc.slice(step.from, step.to).content.childCount;
  const inserted: string[] = [];
  step.slice.content.forEach(node => inserted.push(node.type.name));
  const parent = $from.depth === 0 ? "doc" : describeOwner(doc, $from.before());
  return `${parent}@${$from.index()} -${deleted} +${inserted.join("+")}`;
}

/**
 * Names a table, row, or cell by its indexes.
 *
 * @param doc - Document.
 * @param pos - Absolute position before the node.
 * @returns `table`, `r{row}`, or `c{row}.{cell}`.
 */
function describeOwner(doc: PMNode, pos: number): string {
  const node = doc.nodeAt(pos);
  const $pos = doc.resolve(pos);
  if (node?.type.name === "wordTableRow") return `r${$pos.index()}`;
  if (node?.type.name === "wordTableCell") {
    return `c${$pos.index($pos.depth - 1)}.${$pos.index()}`;
  }
  return node?.type.name === "wordTable" ? "table" : node?.type.name ?? "none";
}

/**
 * Finds the start position of a unique text in a document.
 *
 * @param doc - Document.
 * @param text - Unique text.
 * @returns Position before the text's first character.
 */
export function findText(doc: PMNode, text: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text === text) found = pos;
    return found < 0;
  });
  if (found < 0) throw new Error(`Missing text ${text}.`);
  return found;
}

/**
 * Lists texts whose source positions do not map onto the same text and cell.
 *
 * A continuous cell keeps both its text position and its own cell boundary;
 * a whole-table replacement maps both into the replaced range end.
 *
 * @param tr - Command transaction.
 * @param texts - Texts expected to survive in place.
 * @returns Texts whose mapping is not continuous.
 */
export function findDiscontinuousTexts(tr: Transaction, texts: readonly string[]): readonly string[] {
  return texts.filter((text) => {
    const source = findText(tr.before, text);
    const mapped = tr.mapping.mapResult(source, 1);
    const $source = tr.before.resolve(source);
    const cellStart = $source.before($source.depth - 1);
    const mappedCell = tr.mapping.mapResult(cellStart + 1, 1);
    return mapped.deleted
      || mappedCell.deleted
      || tr.doc.textBetween(mapped.pos, mapped.pos + text.length) !== text
      || tr.doc.resolve(mapped.pos).before(tr.doc.resolve(mapped.pos).depth - 1)
        !== mappedCell.pos - 1;
  });
}
