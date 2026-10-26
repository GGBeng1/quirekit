import { describe, expect, it } from "vitest";
import { createTable, getCoreRowModel } from "@tanstack/vue-table";
import { tableColumns, tableRowIds } from "./model";

const rows = [{ id: "b", name: "Beta" }, { id: "a", name: "Alpha" }];
describe("Table display model", () => {
  it("preserves stable keys when a host filters or reorders data", () => {
    expect(tableRowIds(rows, "id")).toEqual(["b", "a"]);
    expect(tableRowIds([...rows].reverse(), row => row.id)).toEqual(["a", "b"]);
    expect(tableRowIds([{ id: 0 }], "id")).toEqual(["0"]);
    expect(() => tableRowIds([{ id: "" }], "id")).toThrow(/rowKey/);
    expect(() => tableRowIds([{ id: NaN }], "id")).toThrow(/rowKey/);
    expect(() => tableRowIds([rows[0]!, rows[0]!], "id")).toThrow(/duplicate/);
    expect(() => tableRowIds([{ id: 1 }, { id: "1" }], "id")).toThrow(/duplicate/);
  });
  it("does not reorder or slice the host page and supports computed/action columns", () => {
    const columns = tableColumns<typeof rows[number]>([
      { id: "name", title: "Name", field: "name" },
      { id: "derived", title: "Derived", value: row => row.name.toUpperCase() },
      { id: "actions", title: "Actions" }
    ]);
    const ids = tableRowIds(rows, "id");
    const table = createTable({ data: rows, columns, state: {}, onStateChange() {}, renderFallbackValue: "—", getRowId: (_row, index) => ids[index]!, getCoreRowModel: getCoreRowModel() });
    expect(table.getRowModel().rows.map(row => row.id)).toEqual(["b", "a"]);
    expect(table.getRowModel().rows[0]?.getValue("derived")).toBe("BETA");
    expect(table.getRowModel().rows[0]?.getValue("actions")).toBeUndefined();
    expect(() => tableColumns([{ id: "a", title: "One" }, { id: "a", title: "Two" }])).toThrow(/column ids/);
  });
});
