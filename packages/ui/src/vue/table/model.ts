import type { ColumnDef } from "@tanstack/vue-table";
import type { QuireKitTableColumn, QuireKitTableRowKey } from "../../components/table";

/**
 * Resolves stable row identities before the engine sees the current page.
 * @param rows - Host-owned displayed data.
 * @param rowKey - Business identity field or accessor.
 * @returns Validated identities in display order.
 */
export function tableRowIds<Row>(rows: readonly Row[], rowKey: QuireKitTableRowKey<Row>): string[] {
  const seen = new Set<string>();
  return rows.map(row => {
    const value = typeof rowKey === "function" ? rowKey(row) : row[rowKey];
    if ((typeof value !== "string" && typeof value !== "number") || value === "" || (typeof value === "number" && !Number.isFinite(value))) {
      throw new Error("QuireTable requires a non-empty string or finite numeric rowKey.");
    }
    const id = String(value);
    if (seen.has(id)) throw new Error(`QuireTable received duplicate rowKey: ${id}`);
    seen.add(id);
    return id;
  });
}

/**
 * Adapts the small public column contract to the headless core model.
 * @param columns - Host-ordered column definitions.
 * @returns Engine-only column definitions, without implicit sort or page features.
 */
export function tableColumns<Row>(columns: readonly QuireKitTableColumn<Row>[]): ColumnDef<Row>[] {
  const ids = new Set<string>();
  return columns.map(column => {
    if (!column.id || ids.has(column.id)) throw new Error(`QuireTable requires unique non-empty column ids: ${column.id}`);
    ids.add(column.id);
    return {
      id: column.id,
      header: column.title,
      accessorFn: row => column.value ? column.value(row) : column.field === undefined ? undefined : row[column.field]
    };
  });
}
