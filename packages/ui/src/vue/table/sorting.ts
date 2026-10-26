import { createTable, getCoreRowModel, getSortedRowModel } from "@tanstack/vue-table";
import type { QuireKitTableColumn, QuireKitTableSorting } from "../../components/table";
import { tableColumns } from "./model";

/**
 * Resolves a column's explicit sorting capability.
 * @param column - Public column definition.
 * @returns Whether the header can request sorting.
 */
export function tableColumnSortable<Row>(column: QuireKitTableColumn<Row>): boolean {
  return column.sortable ?? Boolean(column.compare);
}

/**
 * Ignores stale sorting without erasing the host's controlled preference.
 * @param columns - Currently visible columns.
 * @param sorting - Requested ordering.
 * @returns Applicable ordering, or null.
 */
export function resolveTableSorting<Row>(columns: readonly QuireKitTableColumn<Row>[], sorting: QuireKitTableSorting | null | undefined): QuireKitTableSorting | null {
  return sorting && columns.some(column => column.id === sorting.columnId && tableColumnSortable(column)) ? sorting : null;
}

/**
 * Cycles one column through ascending, descending and the original order.
 * @param sorting - Effective current ordering.
 * @param columnId - Activated column.
 * @returns The next single-column state.
 */
export function nextTableSorting(sorting: QuireKitTableSorting | null, columnId: string): QuireKitTableSorting | null {
  if (sorting?.columnId !== columnId) return { columnId, direction: "asc" };
  return sorting.direction === "asc" ? { columnId, direction: "desc" } : null;
}

/**
 * Orders complete data before a host slices it into pages. Original objects are retained.
 * @param rows - Complete filtered data, never just a server page.
 * @param columns - Columns with explicit ascending row comparators.
 * @param sorting - Requested single-column ordering, or null for input order.
 * @returns A new array in stable sorted order.
 */
export function sortTableRows<Row>(rows: readonly Row[], columns: readonly QuireKitTableColumn<Row>[], sorting: QuireKitTableSorting | null): Row[] {
  const definitions = tableColumns(columns);
  const active = resolveTableSorting(columns, sorting);
  if (!active) return [...rows];
  const comparator = columns.find(column => column.id === active.columnId)!.compare;
  if (!comparator) throw new Error(`QuireTable local sorting requires compare for column: ${active.columnId}`);
  // The engine owns stable tie ordering. Display accessors must not override the
  // comparator's null/locale policy, including when a column has no display value.
  const engine = createTable<Row>({
    data: [...rows],
    columns: definitions.map(column => ({
      ...column, sortUndefined: false,
      sortingFn: (left, right) => {
        const result = comparator(left.original, right.original);
        if (!Number.isFinite(result)) throw new Error("QuireTable compare must return a finite number.");
        return result;
      }
    })),
    state: { sorting: [{ id: active.columnId, desc: active.direction === "desc" }] },
    onStateChange() {}, renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel()
  });
  return engine.getRowModel().rows.map(row => row.original);
}
