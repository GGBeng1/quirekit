import { expect, it } from "vitest";
import { parseCalendarDate } from "./value";
it("preserves plain dates and validates leap days without timestamp coercion", () => {
  expect(parseCalendarDate("2024-02-29")?.toString()).toBe("2024-02-29");
  expect(parseCalendarDate(null)).toBeUndefined();
  expect(() => parseCalendarDate("2025-02-29")).toThrow();
  expect(() => parseCalendarDate("2026-09-06T00:00:00Z")).toThrow();
  expect(() => parseCalendarDate("09/06/2026")).toThrow();
});
