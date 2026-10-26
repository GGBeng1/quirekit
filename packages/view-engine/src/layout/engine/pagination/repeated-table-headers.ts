import type {
  QuireMeasuredContainerPageLeadingBand,
  QuirePageEndInfo
} from "@quirekit/layout/pagination";
import type { QuireTableLayoutSnapshot } from "../table";

const repeatedTableHeadersKey = "repeatedTableHeaders";

/** Source row metadata for a repeated table header band. */
export interface QuireRepeatedTableHeaderRowState {
  /** Source row index inside the table grid. */
  readonly rowIndex: number;
  /** Stable source row id represented by the repeated header row. */
  readonly sourceRowId: string;
  /** Editable source range represented by the repeated header row. */
  readonly range: QuireTableLayoutSnapshot["rows"][number]["range"];
  /** Source row height in CSS pixels. */
  readonly height: number;
}

/** Repeated table header metadata shared by page driving and projection. */
export interface QuireRepeatedTableHeaderState {
  /** Stable table id whose header is repeated on this continuation page. */
  readonly tableId: string;
  /** Source row indexes that form the repeated header band. */
  readonly rowIndexes: readonly number[];
  /** Source rows that form the repeated header band. */
  readonly rows: readonly QuireRepeatedTableHeaderRowState[];
  /** Total repeated header band height in CSS pixels. */
  readonly height: number;
}

/**
 * Builds repeated table-header state from a table layout snapshot.
 *
 * @param table - Table snapshot to inspect.
 * @returns Repeated header state, or undefined when the table has no header rows.
 */
export function createQuireRepeatedTableHeaderState(
  table: QuireTableLayoutSnapshot | undefined
): QuireRepeatedTableHeaderState | undefined {
  if (table === undefined) {
    return undefined;
  }

  const headerRows = table.rows.filter((row) => row.isHeader);

  if (headerRows.length === 0) {
    return undefined;
  }

  return {
    tableId: table.tableId,
    rowIndexes: headerRows.map((row) => row.rowIndex),
    rows: headerRows.map((row) => ({
      rowIndex: row.rowIndex,
      sourceRowId: row.sourceRowId,
      range: row.range,
      height: row.rect.height
    })),
    height: headerRows.reduce((height, row) => height + row.rect.height, 0)
  };
}

/**
 * Compiles repeated table-header state into the neutral page-leading-band contract.
 *
 * @param header - Repeated header state owned by the View table adapter.
 * @returns Neutral page-leading band carrying explicit projection state.
 */
export function createQuireRepeatedTableHeaderPageLeadingBand(
  header: QuireRepeatedTableHeaderState
): QuireMeasuredContainerPageLeadingBand {
  return {
    id: `repeated-table-header:${header.tableId}`,
    height: header.height,
    continuationState: {
      [repeatedTableHeadersKey]: header
    }
  };
}

/**
 * Reads repeated table-header state for one table from page end-info payload.
 *
 * @param endInfo - Page end info to inspect.
 * @param tableId - Table id expected by the caller.
 * @returns Repeated header state for the table, or null when none applies.
 */
export function readQuireRepeatedTableHeaderState(
  endInfo: QuirePageEndInfo,
  tableId: string
): QuireRepeatedTableHeaderState | null {
  const value = endInfo.continuationState?.[repeatedTableHeadersKey];

  if (!isQuireRepeatedTableHeaderState(value) || value.tableId !== tableId) {
    return null;
  }

  return value;
}

/**
 * Checks whether a page end-info payload carries repeated table-header state.
 *
 * @param endInfo - Page end info to inspect.
 * @returns Whether repeated table-header state is present and well-formed.
 */
export function hasQuireRepeatedTableHeaderState(
  endInfo: QuirePageEndInfo
): boolean {
  return isQuireRepeatedTableHeaderState(
    endInfo.continuationState?.[repeatedTableHeadersKey]
  );
}

/**
 * Checks whether a continuation payload is repeated table-header state.
 *
 * @param value - Unknown continuation payload.
 * @returns Whether the value satisfies the repeated header contract.
 */
function isQuireRepeatedTableHeaderState(
  value: unknown
): value is QuireRepeatedTableHeaderState {
  const candidate = value as Partial<QuireRepeatedTableHeaderState>;

  return (
    typeof candidate?.tableId === "string" &&
    Array.isArray(candidate.rowIndexes) &&
    candidate.rowIndexes.every((rowIndex) => Number.isInteger(rowIndex)) &&
    Array.isArray(candidate.rows) &&
    candidate.rows.every(isQuireRepeatedTableHeaderRowState) &&
    typeof candidate.height === "number"
  );
}

/**
 * Checks whether a continuation payload is repeated table-header row metadata.
 *
 * @param value - Unknown row payload.
 * @returns Whether the value satisfies the repeated header row contract.
 */
function isQuireRepeatedTableHeaderRowState(
  value: unknown
): value is QuireRepeatedTableHeaderRowState {
  const candidate = value as Partial<QuireRepeatedTableHeaderRowState>;

  return (
    Number.isInteger(candidate?.rowIndex) &&
    typeof candidate.sourceRowId === "string" &&
    isQuireHeaderRowRange(candidate.range) &&
    typeof candidate.height === "number"
  );
}

/**
 * Checks whether a value is a document range.
 *
 * @param value - Unknown range value.
 * @returns Whether the value has numeric `from` and `to` fields.
 */
function isQuireHeaderRowRange(
  value: unknown
): value is QuireRepeatedTableHeaderRowState["range"] {
  const candidate = value as Partial<QuireRepeatedTableHeaderRowState["range"]>;

  return (
    typeof candidate?.from === "number" &&
    typeof candidate.to === "number"
  );
}
