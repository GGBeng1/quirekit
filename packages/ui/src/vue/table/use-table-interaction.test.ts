import { reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { QuireKitTableProps } from "../../components/table";
import { useTableInteraction } from "./use-table-interaction";
const rows = [{ id: "a", value: 12 }, { id: "b", value: 2 }];
const column = { id: "value", title: "Value", field: "value" as const, compare: (a: typeof rows[number], b: typeof rows[number]) => a.value - b.value };
describe("Table interaction ownership", () => {
  it("emits requests but waits for controlled props, including explicit null and empty keys", () => {
    const props = reactive<QuireKitTableProps<typeof rows[number]>>({ rows, columns: [column], rowKey: "id", sorting: null, selectedKeys: [], selectable: true });
    const sort = vi.fn(); const selection = vi.fn();
    const state = useTableInteraction(props, sort, selection);
    state.headerContext(column).toggleSorting();
    expect(sort).toHaveBeenCalledWith({ columnId: "value", direction: "asc" });
    expect(state.sorting.value).toBeNull();
    state.select(["a"], true);
    expect(selection).toHaveBeenCalledWith(["a"]);
    expect(state.selectedKeys.value).toEqual([]);
    Object.assign(props, { sorting: sort.mock.calls[0]![0], selectedKeys: ["a"] });
    expect(state.sorting.value?.direction).toBe("asc");
    expect(state.pageChecked.value).toBe("indeterminate");
    expect(state.rows.value).toEqual(rows); // Manual mode does not sort the current server page.
  });
  it("captures defaults once, keeps page identity and prevents disabled/loading interactions", () => {
    const props = reactive<QuireKitTableProps<typeof rows[number]>>({ rows, columns: [column], rowKey: "id", sortingMode: "local", defaultSorting: { columnId: "value", direction: "asc" }, defaultSelectedKeys: ["off-page"], selectable: true, rowSelectable: row => row.id !== "b" });
    const state = useTableInteraction(props, vi.fn(), vi.fn());
    expect(state.ids.value).toEqual(["b", "a"]);
    state.select(["a", "b"], true);
    expect(state.selectedKeys.value).toEqual(["off-page", "a"]);
    Object.assign(props, { rows: [{ id: "c", value: 5 }], defaultSelectedKeys: [] });
    expect(state.pageChecked.value).toBe(false);
    state.select(["c"], true);
    expect(state.selectedKeys.value).toEqual(["off-page", "a", "c"]);
    Object.assign(props, { loading: true });
    state.select(["c"], false);
    state.headerContext(column).toggleSorting();
    expect(state.selectedKeys.value).toContain("c");
    expect(state.sorting.value?.direction).toBe("asc");
  });
});
