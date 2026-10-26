import { parseDate } from "@ark-ui/vue/date-picker";
import type { DateInputDateValue } from "@ark-ui/vue/date-input";

/**
 * Parses only calendar dates, preventing accidental time-zone or timestamp coercion.
 * @param value - A complete ISO calendar date, or an empty value.
 * @returns An Ark date value, with no attached time or time zone.
 */
export function parseCalendarDate(value: string | null | undefined): DateInputDateValue | undefined {
  if (value == null) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("DateInput expects YYYY-MM-DD or null.");
  const date = parseDate(value);
  if (date.toString() !== value) throw new RangeError("DateInput expects a valid calendar date.");
  return date;
}
