import { describe, expect, it } from "vitest";
import { nextTableSorting, resolveTableSorting, sortTableRows } from "./sorting";
const rows = [{ id: "a", n: 12 }, { id: "b", n: 2 }, { id: "c", n: 2 }];
const columns = [{ id: "n", title: "Size", value: (row: typeof rows[number]) => `${row.n} KB`, compare: (a: typeof rows[number], b: typeof rows[number]) => a.n - b.n }];
describe("Table sorting", () => {
  it("sorts original values stably before host paging, without mutating input", () => {
    const sorted = sortTableRows(rows, columns, { columnId: "n", direction: "asc" });
    expect(sorted.map(row => row.id)).toEqual(["b", "c", "a"]);
    expect(sorted[0]).toBe(rows[1]);
    expect(rows.map(row => row.id)).toEqual(["a", "b", "c"]);
    expect(sortTableRows(rows, columns, { columnId: "n", direction: "desc" }).map(row => row.id)).toEqual(["a", "b", "c"]);
  });
  it("requires explicit local semantics but permits manual sortable columns", () => {
    const manual = [{ id: "n", title: "Size", sortable: true }];
    expect(resolveTableSorting(manual, { columnId: "n", direction: "asc" })).not.toBeNull();
    expect(() => sortTableRows(rows, manual, { columnId: "n", direction: "asc" })).toThrow(/compare/);
    expect(() => sortTableRows(rows, [{ ...columns[0]!, compare: () => NaN }], { columnId: "n", direction: "asc" })).toThrow(/finite/);
  });
  it("cycles and ignores removed or disabled columns without changing caller state", () => {
    const asc = nextTableSorting(null, "n");
    const desc = nextTableSorting(asc, "n");
    expect(desc).toEqual({ columnId: "n", direction: "desc" });
    expect(nextTableSorting(desc, "n")).toBeNull();
    expect(nextTableSorting(desc, "other")).toEqual({ columnId: "other", direction: "asc" });
    expect(resolveTableSorting([{ ...columns[0]!, sortable: false }], asc)).toBeNull();
    expect(sortTableRows(rows, [], asc)).toEqual(rows);
  });
});
