import { parseCalendarDate } from "../date-input/value";
import { findUnavailableRangeDate } from "../calendar/value";
import type { DateRangeRules, QuireKitDateRangeValue } from "./types";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as PickerMessages } from "../../locale/components/picker";

/**
 * Validates endpoint syntax without discarding partial or reversed editing states.
 * @param value - Public pure-date endpoints.
 * @returns A fresh value object owned by the range field.
 */
export function copyDateRange(value: QuireKitDateRangeValue): QuireKitDateRangeValue {
  parseCalendarDate(value.start);
  parseCalendarDate(value.end);
  return { start: value.start, end: value.end };
}
/**
 * Projects only a representable ordered range into the calendar controller.
 * @param value - Field endpoints, including temporary invalid order.
 * @returns Ordered dates or a single start; an end-only field stays unselected.
 */
export function calendarRange(value: QuireKitDateRangeValue): string[] {
  if (!value.start) return [];
  if (value.end && value.start > value.end) return [];
  return value.end ? [value.start, value.end] : [value.start];
}
/**
 * Reports business constraints without rewriting user input or crossing time zones.
 * @param value - Pure-date endpoints to evaluate.
 * @param rules - Host constraints.
 * @param text - Picker messages of the active language.
 * @returns Recovery guidance, or an empty string when current complete dates are valid.
 */
export function dateRangeError(value: QuireKitDateRangeValue, rules: DateRangeRules, text: PickerMessages = quireKitDefaultLocale.messages.picker): string {
  copyDateRange(value);
  if (value.start && value.end && value.start > value.end) return text.dateRangeReversed;
  const endpoints = [value.start, value.end].filter((date): date is string => date !== null);
  if (endpoints.some(date => (rules.min && date < rules.min) || (rules.max && date > rules.max))) return text.dateBetween(rules.min, rules.max);
  const unavailable = endpoints.find(date => rules.isDateUnavailable?.(date)) ?? (!rules.allowNonContiguousRange && value.start && value.end ? findUnavailableRangeDate([parseCalendarDate(value.start)!, parseCalendarDate(value.end)!], rules.isDateUnavailable) : undefined);
  return unavailable ? text.rangeIncludesUnavailable(unavailable) : "";
}
