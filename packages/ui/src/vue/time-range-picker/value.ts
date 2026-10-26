import { parseClockTime } from "../time-input/value";
import { clockSeconds, timeError } from "../time-picker/value";
import type { TimeRules } from "../time-picker/types";
import type { QuireKitTimeRangeValue, TimeRangeEndpoint, TimeRangeRules } from "./types";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as PickerMessages } from "../../locale/components/picker";

/**
 * Validates syntax while preserving endpoint identity and temporary editing states.
 * @param value - Current pure-time endpoints.
 * @returns A fresh range owned by the consumer.
 */
export function copyTimeRange(value: QuireKitTimeRangeValue): QuireKitTimeRangeValue {
  parseClockTime(value.start);
  parseClockTime(value.end);
  return { start: value.start, end: value.end };
}
/**
 * Adapts endpoint-specific rules to the already validated single-time engine.
 * @param rules - Whole-range rules and common time constraints.
 * @param endpoint - The endpoint whose candidates or direct input are being checked.
 * @returns Single-time rules without range-order coupling.
 */
export function timeRangeEndpointRules(rules: TimeRangeRules, endpoint: TimeRangeEndpoint): TimeRules {
  const { allowOvernight, isTimeUnavailable, isRangeUnavailable, ...time } = rules;
  return { ...time, ...(isTimeUnavailable ? { isTimeUnavailable: (value: string) => isTimeUnavailable(value, endpoint) } : {}) };
}
/**
 * Identifies an explicitly allowed next-day end without inventing a calendar date.
 * @param value - Complete or partial pure-time range.
 * @param allowOvernight - Whether the host opted into a next-day interpretation.
 * @returns True only for a complete range whose end is strictly earlier.
 */
export function rangeEndsNextDay(value: QuireKitTimeRangeValue, allowOvernight: boolean): boolean {
  return allowOvernight && value.start !== null && value.end !== null && clockSeconds(value.end) < clockSeconds(value.start);
}
/**
 * Checks endpoint validity before applying range order and business constraints.
 * @param value - Public input or a complete panel draft; never rewritten here.
 * @param rules - Shared constraints for every submission path.
 * @param text - Picker messages of the active language.
 * @returns Localized recovery guidance, or empty text when current endpoints are valid.
 */
export function timeRangeError(value: QuireKitTimeRangeValue, rules: TimeRangeRules, text: PickerMessages = quireKitDefaultLocale.messages.picker): string {
  copyTimeRange(value);
  // Endpoint validation remains independent so either side can recover first.
  for (const endpoint of ["start", "end"] as const) {
    const error = timeError(value[endpoint], timeRangeEndpointRules(rules, endpoint), text);
    if (error) return text.endpointError(endpoint, error);
  }
  if (value.start === null || value.end === null) return "";
  // Only complete valid endpoints enter order and whole-range business validation.
  if (!rules.allowOvernight && clockSeconds(value.end) < clockSeconds(value.start)) return text.timeRangeReversed;
  if (rules.isRangeUnavailable?.({ start: value.start, end: value.end })) return text.timeRangeUnavailable;
  return "";
}
