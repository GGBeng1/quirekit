import type { DateValue } from "@ark-ui/vue/date-picker";
import { parseCalendarDate } from "../date-input/value";
import type { QuireKitCalendarSelectionMode, QuireKitCalendarValue } from "./types";
/**
 * Validates and adapts the public selection to Ark's date array.
 * @param value - Plain calendar selection.
 * @param mode - Selection contract governing its shape.
 * @returns Complete calendar dates without time conversion.
 */
export function parseCalendarSelection(value: QuireKitCalendarValue | undefined, mode: QuireKitCalendarSelectionMode): DateValue[] {
  if (value == null) return [];
  if (mode === "single" && typeof value !== "string") throw new TypeError("Single calendar selection expects ISO date or null.");
  if (mode !== "single" && typeof value === "string") throw new TypeError("Range and multiple calendars expect an ISO date array.");
  const dates = (typeof value === "string" ? [value] : value).map(date => parseCalendarDate(date)!);
  if (mode === "range" && (dates.length > 2 || (dates.length === 2 && dates[0]!.compare(dates[1]!) > 0))) throw new RangeError("Calendar range expects an ordered start and end.");
  return dates;
}
/**
 * Serializes selection according to the public selection mode.
 * @param dates - Ark's selected dates.
 * @param mode - Selection mode.
 * @returns A single ISO date/null or an ISO array.
 */
export function serializeCalendarSelection(dates: DateValue[], mode: QuireKitCalendarSelectionMode): QuireKitCalendarValue {
  const values = dates.map(date => date.toString());
  return mode === "single" ? values[0] ?? null : values;
}

/**
 * Checks a completed continuous range without converting it to timestamps.
 * @param dates - Ordered start and end selected by Ark.
 * @param unavailable - Host business rule for individual ISO dates.
 * @returns The first unavailable date, or undefined when the range is permitted.
 */
export function findUnavailableRangeDate(dates: DateValue[], unavailable: ((date: string) => boolean) | undefined): string | undefined {
  if (!unavailable || dates.length !== 2) return undefined;
  // Calendar-day arithmetic preserves leap days and does not depend on DST length.
  for (let date = dates[0]!; date.compare(dates[1]!) <= 0;) {
    if (unavailable(date.toString())) return date.toString();
    if (date.compare(dates[1]!) === 0) break;
    date = date.add({ days: 1 });
  }
  return undefined;
}
