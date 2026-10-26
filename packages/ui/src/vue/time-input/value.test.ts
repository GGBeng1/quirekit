import { expect, test } from "vitest";
import { parseClockTime, serializeClockTime } from "./value";
test("round trips wall-clock values without exposing the internal date anchor", () => {
  for (const value of ["00:00", "12:30", "23:59"]) expect(serializeClockTime(parseClockTime(value), "minute")).toBe(value);
  expect(serializeClockTime(parseClockTime("23:59:58"), "second")).toBe("23:59:58");
  expect(serializeClockTime(parseClockTime(null), "minute")).toBeNull();
  for (const value of ["24:00", "12:60", "9:30", "12:30Z", "2026-01-01T12:30"]) expect(() => parseClockTime(value)).toThrow();
});
