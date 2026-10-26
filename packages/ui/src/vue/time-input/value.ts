import { CalendarDateTime } from "@internationalized/date";
import type { DateInputDateValue } from "@ark-ui/vue/date-input";
/**
 * Supplies Ark's date controller a stable internal anchor for pure time segments.
 * @param value - ISO wall-clock value or an empty value.
 * @returns An internal calendar value; its anchor never leaves the adapter.
 */
export function parseClockTime(value: string | null | undefined): CalendarDateTime | undefined {
  if (value == null) return undefined;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new TypeError("TimeInput expects HH:mm, HH:mm:ss, or null.");
  const [hour, minute, second = 0] = value.split(":").map(Number);
  return new CalendarDateTime(2000, 1, 1, hour!, minute!, second);
}
/**
 * Serializes time only, without converting through the host time zone.
 * @param value - Internal complete time segments from Ark.
 * @param granularity - Smallest public precision.
 * @returns Canonical 24-hour time or null for an empty value.
 */
export function serializeClockTime(value: DateInputDateValue | undefined, granularity: "minute" | "second"): string | null {
  if (value === undefined) return null;
  if (!("hour" in value)) throw new TypeError("TimeInput requires time segments.");
  const fields = [value.hour, value.minute, ...(granularity === "second" ? [value.second] : [])];
  return fields.map(field => String(field).padStart(2, "0")).join(":");
}
