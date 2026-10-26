import { describe, expect, it } from "vitest";
import { IsoDateFormatter } from "./formatter";

describe("ISO picker date display", () => {
  it("keeps padded year-month-day parts and literal hyphens", () => {
    const formatter = new IsoDateFormatter();
    expect(formatter.format(new Date("2026-09-06T00:00:00Z"))).toBe("2026-09-06");
    expect(formatter.formatToParts(new Date("2026-09-06T00:00:00Z")).map(part => part.type)).toEqual(["year", "literal", "month", "literal", "day"]);
  });
  it("keeps year and leap-day boundaries without local time-zone shifts", () => {
    const formatter = new IsoDateFormatter();
    expect(formatter.format(new Date("2028-02-29T00:00:00Z"))).toBe("2028-02-29");
    expect(formatter.format(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
  });
});
