import type { Node as PMNode, Schema } from "@quirekit/pm";
import type { WordTableCommandNodeTypes } from "../shared/types";

/**
 * Resolves command node types from a schema.
 *
 * @param schema - Schema containing Word table nodes and paragraph.
 * @returns Required node types.
 */
export function getWordTableCommandNodeTypes(
  schema: Schema
): WordTableCommandNodeTypes {
  const { wordTable, wordTableRow, wordTableCell, paragraph } = schema.nodes;

  if (!wordTable || !wordTableRow || !wordTableCell || !paragraph) {
    throw new Error("Schema is missing Word table command node types.");
  }

  return {
    table: wordTable,
    row: wordTableRow,
    cell: wordTableCell,
    paragraph
  };
}

/**
 * Resolves command node types from an existing table node.
 *
 * @param tableNode - Existing table node.
 * @returns Required node types.
 */
export function getWordTableCommandNodeTypesFromTable(
  tableNode: PMNode
): WordTableCommandNodeTypes {
  return getWordTableCommandNodeTypes(tableNode.type.schema);
}

/**
 * Creates an empty paragraph node.
 *
 * @param nodeTypes - Command node types.
 * @returns Empty paragraph node.
 */
export function createEmptyParagraphNode(
  nodeTypes: WordTableCommandNodeTypes
): PMNode {
  const paragraph = nodeTypes.paragraph.createAndFill();

  if (!paragraph) {
    throw new Error("Unable to create an empty paragraph for a table cell.");
  }

  return paragraph;
}

/**
 * Creates an empty table cell node.
 *
 * @param nodeTypes - Command node types.
 * @param attrs - Optional attrs merged onto the cell.
 * @returns Empty table cell node.
 */
export function createEmptyWordTableCellNode(
  nodeTypes: WordTableCommandNodeTypes,
  attrs: Readonly<Record<string, unknown>> = {}
): PMNode {
  return nodeTypes.cell.create({
    colspan: 1,
    gridSpan: 1,
    rowspan: 1,
    vMerge: null,
    ...attrs
  }, [createEmptyParagraphNode(nodeTypes)]);
}

/**
 * Creates a table row from prepared cell nodes.
 *
 * @param nodeTypes - Command node types.
 * @param cells - Cells to place inside the row.
 * @param attrs - Optional row attrs.
 * @returns Table row node.
 */
export function createWordTableRowNode(
  nodeTypes: WordTableCommandNodeTypes,
  cells: readonly PMNode[],
  attrs: Readonly<Record<string, unknown>> = {}
): PMNode {
  return nodeTypes.row.create({
    gridBefore: 0,
    gridAfter: 0,
    ...attrs
  }, cells);
}
