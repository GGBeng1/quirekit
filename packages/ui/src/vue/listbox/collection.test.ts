import { describe, expect, it } from "vitest";
import type { GridCollection } from "@ark-ui/vue/collection";
import type { QuireKitListboxItem } from "../../components/listbox";
import { createListboxCollection, filterListboxSelection, groupListboxItems } from "./collection";

const items: QuireKitListboxItem[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta", disabled: true },
  { value: "c", label: "Charlie" },
  { value: "d", label: "Delta" },
  { value: "e", label: "Echo" },
  { value: "f", label: "Foxtrot" },
  { value: "g", label: "Golf" }
];

describe("Listbox collection boundary", () => {
  it("delegates linear focus to the enabled collection order", () => {
    const collection = createListboxCollection(items, "list", 1);
    expect(collection.firstValue).toBe("a");
    expect(collection.getNextValue("a")).toBe("c");
    expect(collection.getPreviousValue("c")).toBe("a");
    expect(collection.lastValue).toBe("g");
    const disabled = createListboxCollection(items.map(item => ({ ...item, disabled: true })), "list", 1);
    expect(disabled.firstValue).toBeNull();
    expect(disabled.lastValue).toBeNull();
  });

  it("uses actual columns for row navigation and preserves value identity on resize and reorder", () => {
    const grid = createListboxCollection(items, "grid", 3) as GridCollection<QuireKitListboxItem>;
    expect(grid.getNextRowValue("a")).toBe("d");
    expect(grid.getPreviousRowValue("g")).toBe("d");
    const narrow = createListboxCollection(items, "grid", 2) as GridCollection<QuireKitListboxItem>;
    expect(narrow.getNextRowValue("a")).toBe("c");
    expect(narrow.getValueCell("d")).toEqual({ row: 1, column: 1 });
    const reordered = createListboxCollection([...items].reverse(), "grid", 2) as GridCollection<QuireKitListboxItem>;
    expect(reordered.find("d")).toBe(items[3]);
    expect(reordered.getValueCell("a")).toEqual({ row: 3, column: 0 });
  });

  it("keeps grouped DOM and navigation order identical", () => {
    const groups = groupListboxItems([
      { value: "a", label: "A", group: "字体" },
      { value: "b", label: "B", group: "图片" },
      { value: "c", label: "C", group: "字体" },
      { value: "d", label: "D" }
    ]);
    expect(groups.map(group => group.label)).toEqual(["字体", "图片", undefined]);
    const collection = createListboxCollection(groups.flatMap(group => group.items), "list", 1);
    expect(collection.getValues()).toEqual(["a", "c", "b", "d"]);
    expect(collection.getNextValue("c")).toBe("b");
  });

  it("projects loopFocus into grid row navigation without replacing selection behavior", () => {
    const entries = ["a", "b", "c", "d"].map(value => ({ value, label: value }));
    const fixed = createListboxCollection(entries, "grid", 2) as GridCollection<QuireKitListboxItem>;
    expect(fixed.getNextRowValue("d")).toBe("d");
    expect(fixed.getPreviousRowValue("a")).toBe("a");
    const looping = createListboxCollection(entries, "grid", 2, true) as GridCollection<QuireKitListboxItem>;
    expect(looping.getNextRowValue("d")).toBe("b");
    expect(looping.getPreviousRowValue("a")).toBe("c");
    expect(looping.getNextRowValue("d", false)).toBe("d");
    expect(looping.getPreviousRowValue("a", false)).toBe("a");
    const resized = createListboxCollection(entries, "grid", 1, true) as GridCollection<QuireKitListboxItem>;
    expect(resized.getNextRowValue("d")).toBe("a");
    expect(resized.find("d")).toBe(entries[3]);
    const disabled = createListboxCollection([
      { value: "a", label: "A", disabled: true }, ...entries.slice(1),
      { value: "e", label: "E" }, { value: "f", label: "F" }
    ], "grid", 2, true) as GridCollection<QuireKitListboxItem>;
    expect(disabled.getNextRowValue("e")).toBe("c");
    expect(disabled.getPreviousRowValue("c")).toBe("e");
  });

  it("prevents bulk selection from adding disabled items without clearing retained choices", () => {
    expect(filterListboxSelection(["a", "b", "c", "hidden"], ["hidden"], items)).toEqual(["a", "c", "hidden"]);
    expect(filterListboxSelection(["a", "b"], ["b"], items)).toEqual(["a", "b"]);
    expect(filterListboxSelection(["a", "b"], [], items.map(item => ({ ...item, disabled: true })))).toEqual([]);
    expect(filterListboxSelection([], ["hidden"], items)).toEqual([]);
  });

  it("rejects ambiguous identities and layouts before they reach the state machine", () => {
    expect(() => createListboxCollection([{ value: "", label: "Empty" }], "list", 1)).toThrow("unique values");
    expect(() => createListboxCollection([items[0]!, items[0]!], "list", 1)).toThrow("unique values");
    expect(() => createListboxCollection(items, "grid", 1.5)).toThrow("positive integer");
    expect(() => createListboxCollection([{ ...items[0]!, group: "字体" }], "grid", 2)).toThrow("grouped items");
  });
});
