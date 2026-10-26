import { expect, it } from "vitest";
import { createDataView } from "@quirekit/data-view";
import { blankDataRecord, displayDataValue, parseCellInput } from "./values";

it("keeps false, zero, empty title and unassigned cells distinct", () => {
  const source = createDataView("values").source;
  if (source.kind !== "inline") throw new Error("Expected inline fixture");
  expect(blankDataRecord(source.dataset, "one").values).toEqual({title: "", status: null});
  expect(displayDataValue({id: "b", name: "布尔", type: "boolean"}, false)).toBe("否");
  const number = {id: "n", name: "数量", type: "number"} as const;
  expect(parseCellInput(number, "0", false)).toBe(0);
  expect(parseCellInput(number, "", false)).toBe(null);
  expect(() => parseCellInput(number, " ", false)).toThrow();
  expect(() => parseCellInput(number, "0x10", false)).toThrow();
});
