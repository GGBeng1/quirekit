import { describe, expect, it } from "vitest";
import { calendarRange, copyDateRange, dateRangeError } from "./value";

describe("date range editing contract", () => {
  it("keeps independently empty endpoints and rejects non-calendar values", () => {
    expect(copyDateRange({ start: null, end: "2026-10-03" })).toEqual({ start: null, end: "2026-10-03" });
    expect(calendarRange({ start: null, end: "2026-10-03" })).toEqual([]);
    expect(() => copyDateRange({ start: "2026-02-29", end: null })).toThrow();
    expect(() => copyDateRange({ start: "2026-01-01T00:00:00Z", end: null })).toThrow();
  });
  it("reports reversed and out-of-bounds dates without sorting or clamping", () => {
    const value = { start: "2026-10-03", end: "2026-09-28" };
    expect(calendarRange(value)).toEqual([]);
    expect(dateRangeError(value, {})).toContain("开始日期不能晚于");
    expect(value).toEqual({ start: "2026-10-03", end: "2026-09-28" });
    expect(dateRangeError({ start: null, end: "2026-09-04" }, { min: "2026-09-05" })).toContain("2026-09-05");
  });
  it("checks leap-day interiors and still rejects unavailable endpoints when gaps are allowed", () => {
    const value = { start: "2024-02-28", end: "2024-03-01" };
    const rules = { isDateUnavailable: (date: string) => date === "2024-02-29" };
    expect(dateRangeError(value, rules)).toContain("2024-02-29");
    expect(dateRangeError(value, { ...rules, allowNonContiguousRange: true })).toBe("");
    expect(dateRangeError({ start: "2024-02-29", end: "2024-03-01" }, { ...rules, allowNonContiguousRange: true })).toContain("2024-02-29");
  });
});
