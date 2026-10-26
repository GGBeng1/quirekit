import { expect, it, vi } from "vitest";
import { copyTimeRange, rangeEndsNextDay, timeRangeError, timeRangeEndpointRules } from "./value";
import { quireKitEn } from "../../locale/packs/en";

it("preserves end-first and reversed values without mutating input", () => {
  const value = { start: null, end: "17:30" };
  expect(copyTimeRange(value)).toEqual(value);
  expect(copyTimeRange(value)).not.toBe(value);
  expect(timeRangeError(value, {})).toBe("");
  expect(copyTimeRange({ start: "17:30", end: "09:00" })).toEqual({ start: "17:30", end: "09:00" });
  expect(() => copyTimeRange({ start: "24:00", end: null })).toThrow(TypeError);
});
it("distinguishes same-day reversal, overnight and zero duration", () => {
  const overnight = { start: "23:30", end: "01:00" };
  expect(timeRangeError(overnight, {})).toContain("结束时间");
  expect(timeRangeError(overnight, { allowOvernight: true })).toBe("");
  expect(rangeEndsNextDay(overnight, true)).toBe(true);
  expect(rangeEndsNextDay(overnight, false)).toBe(false);
  expect(rangeEndsNextDay({ start: "00:00", end: "00:00:00" }, true)).toBe(false);
  expect(timeRangeError({ start: "00:00", end: "00:00" }, {})).toBe("");
  expect(rangeEndsNextDay({ start: null, end: "00:00" }, true)).toBe(false);
});
it("applies endpoint rules independently and identifies the affected field", () => {
  const rules = { min: "09:00", max: "18:00", minuteStep: 15, isTimeUnavailable: (time: string, endpoint: string) => endpoint === "start" && time === "12:00" };
  expect(timeRangeError({ start: "08:00", end: null }, rules)).toContain("开始时间");
  expect(timeRangeError({ start: "09:00", end: "17:07" }, rules)).toContain("结束时间");
  expect(timeRangeError({ start: "09:00", end: "12:00" }, rules)).toBe("");
  expect(timeRangeError({ start: "12:00", end: "17:00" }, rules)).toContain("不可选");
  expect(timeRangeEndpointRules(rules, "end").isTimeUnavailable?.("12:00")).toBe(false);
});
it("checks whole-range rules only after both endpoints are complete and individually valid", () => {
  const unavailable = vi.fn(() => true);
  const rules = { minuteStep: 15, isRangeUnavailable: unavailable };
  expect(timeRangeError({ start: null, end: "17:00" }, rules)).toBe("");
  timeRangeError({ start: "09:07", end: "17:00" }, rules);
  timeRangeError({ start: "17:00", end: "09:00" }, rules);
  expect(unavailable).not.toHaveBeenCalled();
  expect(timeRangeError({ start: "09:00", end: "17:00" }, rules)).toContain("范围不可用");
  expect(unavailable).toHaveBeenCalledWith({ start: "09:00", end: "17:00" });
});
it("uses numeric wall-clock ordering and preserves second precision", () => {
  expect(timeRangeError({ start: "09:00:30", end: "09:00:15" }, { granularity: "second" }, quireKitEn.messages.picker)).toContain("End time");
  expect(timeRangeError({ start: "09:00", end: "09:00:00" }, {})).toBe("");
  expect(timeRangeError({ start: "09:00:15", end: "09:00:30" }, { granularity: "second", secondStep: 15 })).toBe("");
});
