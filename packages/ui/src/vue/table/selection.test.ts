import { describe, expect, it } from "vitest";
import { changeTableSelection, tablePageChecked } from "./selection";
describe("Table page selection", () => {
  it("reports mixed state from enabled page keys only", () => {
    expect(tablePageChecked(["a", "b"], ["off-page", "a"])).toBe("indeterminate");
    expect(tablePageChecked(["a"], ["a", "disabled"])).toBe(true);
    expect(tablePageChecked([], ["off-page"])).toBe(false);
  });
  it("selects and deselects the page without losing disabled or off-page keys", () => {
    const selected = ["off-page", "disabled", "a"];
    expect(changeTableSelection(selected, ["a", "b"], true)).toEqual([...selected, "b"]);
    expect(changeTableSelection(selected, ["a", "b"], false)).toEqual(["off-page", "disabled"]);
    expect(selected).toEqual(["off-page", "disabled", "a"]);
  });
});
