import { expect, test } from "vitest";
import { parseCalendarSelection, serializeCalendarSelection, findUnavailableRangeDate } from "./value";
test("keeps selection shapes and date order explicit", () => {
  expect(serializeCalendarSelection(parseCalendarSelection("2024-02-29", "single"), "single")).toBe("2024-02-29");
  expect(serializeCalendarSelection([], "single")).toBeNull();
  expect(() => parseCalendarSelection(["2026-09-02", "2026-09-01"], "range")).toThrow();
  expect(() => parseCalendarSelection(["2026-09-01"], "single")).toThrow();
  expect(() => parseCalendarSelection("2026-09-01", "multiple")).toThrow();
});
test("checks unavailable dates inside a leap-day range", () => {
  const range = parseCalendarSelection(["2024-02-28", "2024-03-01"], "range");
  expect(findUnavailableRangeDate(range, date => date === "2024-02-29")).toBe("2024-02-29");
  expect(findUnavailableRangeDate(range, () => false)).toBeUndefined();
  expect(findUnavailableRangeDate(parseCalendarSelection(["9999-12-30", "9999-12-31"], "range"), () => false)).toBeUndefined();
  expect(findUnavailableRangeDate(range.slice(0, 1), () => true)).toBeUndefined();
});
