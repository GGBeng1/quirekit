import { expect, it } from "vitest";
import { checkboxAllState, checkboxToggleAll } from "./model";
const items = [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "locked", label: "Locked", disabled: true }];
it("calculates mixed state from enabled choices and preserves protected or hidden values", () => {
  expect(checkboxAllState(items, ["locked"])).toBe(false);
  expect(checkboxAllState(items, ["a", "locked"])).toBe("indeterminate");
  expect(checkboxAllState(items, ["a", "b"])).toBe(true);
  expect(checkboxToggleAll(items, ["locked", "hidden", "a"])).toEqual(["locked", "hidden", "a", "b"]);
  expect(checkboxToggleAll(items, ["locked", "hidden", "a", "b"])).toEqual(["locked", "hidden"]);
  expect(checkboxAllState([], ["hidden"])).toBe(false);
  expect(checkboxToggleAll([], ["hidden"])).toEqual(["hidden"]);
});
