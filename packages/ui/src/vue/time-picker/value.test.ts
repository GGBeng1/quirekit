import { expect, it } from "vitest";
import { availableTimes, draftTime, timeDraft, timeError } from "./value";
it("keeps empty columns incomplete and converts noon/midnight explicitly", () => {
  expect(draftTime(timeDraft(null, 12), 12, "minute")).toBeNull();
  expect(draftTime({ hour: 12, minute: 0, second: null, period: 0 }, 12, "minute")).toBe("00:00");
  expect(draftTime({ hour: 12, minute: 0, second: 5, period: 12 }, 12, "second")).toBe("12:00:05");
});
it("applies bounds, steps and unavailable rules to the same finite domain", () => {
  const rules = { min: "09:00", max: "10:00", minuteStep: 15, isTimeUnavailable: (value: string) => value === "09:30" };
  expect(availableTimes(rules)).toEqual([32400, 33300, 35100, 36000]);
  expect(timeError("09:07", rules)).toContain("步长");
  expect(timeError("09:30", rules)).toContain("不可选");
  expect(timeError("08:45", rules)).toContain("之间");
});
it("rejects invalid steps and exposes an empty domain without looping", () => {
  expect(() => availableTimes({ minuteStep: 0 })).toThrow(RangeError);
  expect(() => availableTimes({ hourStep: 1.5 })).toThrow(RangeError);
  expect(availableTimes({ min: "18:00", max: "09:00" })).toEqual([]);
  expect(availableTimes({ isTimeUnavailable: () => true })).toEqual([]);
});
