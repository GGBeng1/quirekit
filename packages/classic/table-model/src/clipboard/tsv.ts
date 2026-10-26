import {
  Fragment,
  Slice,
  type Node as PMNode
} from "@quirekit/pm";
import {
  createWordTableMap,
  getRectEndRow,
  getRangeEndColumn
} from "../map";
import type { WordTableSelection } from "../selection";
import type { WordTableTsvParseOptions } from "./types";
import { readExplicitCellNode, readSelectedTable } from "./slice";
import { readTsvFields, writeTsvField } from "./delimited-text";

/**
 * Serializes a structural Word table selection to TSV plain text.
 *
 * @param selection - Structural Word table selection.
 * @returns TSV fallback preserving the selected rectangle shape.
 */
export function serializeWordTableSelectionTsv(
  selection: WordTableSelection
): string {
  const sourceTable = readSelectedTable(selection);
  const map = createWordTableMap(sourceTable);
  const rows: string[] = [];

  for (
    let rowIndex = selection.rect.startRow;
    rowIndex < getRectEndRow(selection.rect);
    rowIndex += 1
  ) {
    const cells: string[] = [];

    for (
      let column = selection.rect.startColumn;
      column < getRangeEndColumn(selection.rect);
      column += 1
    ) {
      const semanticCell = map.cellAt(rowIndex, column);

      cells.push(
        semanticCell?.rect.startRow === rowIndex &&
          semanticCell.rect.startColumn === column
          ? readSemanticCellText(sourceTable, map, semanticCell.originExplicitCellId)
          : ""
      );
    }

    rows.push(cells.map(writeTsvField).join("\t"));
  }

  return rows.join("\n");
}

/**
 * Parses TSV clipboard text into an internal Word table slice.
 *
 * @param options - TSV payload and owning schema.
 * @returns Slice containing one Word table.
 */
export function parseWordTableTsv(options: WordTableTsvParseOptions): Slice {
  const rowValues = readTsvFields(options.tsv);
  const tableType = options.schema.nodes.wordTable;
  const rowType = options.schema.nodes.wordTableRow;
  const cellType = options.schema.nodes.wordTableCell;
  const paragraphType = options.schema.nodes.paragraph;

  if (!tableType || !rowType || !cellType || !paragraphType) {
    throw new RangeError("Word table TSV parsing requires table schema nodes");
  }

  const rows = rowValues.map((values) => rowType.create(null, values.map(
    (value) => cellType.create(null, value.split(/\r\n|\n|\r/).map(line => paragraphType.create(
      null,
      line.length > 0 ? options.schema.text(line) : null
    )))
  )));

  return new Slice(Fragment.from(tableType.create(null, rows)), 0, 0);
}

/**
 * Reads a semantic cell's origin text content.
 *
 * @param tableNode - Source table node.
 * @param map - Derived table map.
 * @param explicitCellId - Origin explicit cell id.
 * @returns Plain text content.
 */
function readSemanticCellText(
  tableNode: PMNode,
  map: ReturnType<typeof createWordTableMap>,
  explicitCellId: string
): string {
  const explicit = map.explicitCells.find((cell) => cell.id === explicitCellId);

  const node = explicit ? readExplicitCellNode(tableNode, explicit) : null;
  return node?.textBetween(0, node.content.size, "\n") ?? "";
}
