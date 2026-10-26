import { expect, it } from "vitest";
import { availableTimes, timeDraft } from "./value";
import { dayPeriodLabels, timeOptions } from "./options";
it("shows stepped rows and disables impossible prefixes without rewriting later selections", () => {
  const rules = { min: "09:00", max: "18:00", minuteStep: 15, isTimeUnavailable: (value: string) => value.startsWith("12:") };
  const allowed = availableTimes(rules), draft = timeDraft("18:30", 24);
  const minutes = timeOptions("minute", draft, 24, allowed, dayPeriodLabels("zh-CN"), rules);
  expect(minutes.map(item => item.value)).toEqual(["0", "15", "30", "45"]);
  expect(minutes.filter(item => !item.disabled).map(item => item.value)).toEqual(["0"]);
  expect(timeOptions("hour", draft, 24, allowed, dayPeriodLabels("zh-CN"), rules).find(item => item.value === "12")?.disabled).toBe(true);
  expect(draft.minute).toBe(30);
});
it("keeps both periods recoverable when a selected hour conflicts with a new period", () => {
  const rules = { min: "13:00", max: "18:00", hourStep: 2 };
  const allowed = availableTimes(rules), draft = timeDraft("14:00", 12);
  expect(timeOptions("period", draft, 12, allowed, dayPeriodLabels("en"), rules).filter(item => !item.disabled).map(item => item.label)).toEqual(["PM"]);
  expect(timeOptions("hour", draft, 12, allowed, dayPeriodLabels("en"), rules).filter(item => !item.disabled).map(item => item.label)).toEqual(["02", "04", "06"]);
});
it("names day periods in the active language", () => {
  expect(dayPeriodLabels("zh-CN")).toEqual(["上午", "下午"]);
  expect(dayPeriodLabels("en")).toEqual(["AM", "PM"]);
});
