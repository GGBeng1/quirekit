import { normalizeCivilDateTime } from '../date-time-picker/value';
import { dateTimeError } from '../date-time-picker/rules';
import type { DateTimeRules } from '../date-time-picker/types';
import type { DateTimeRangeEndpoint, DateTimeRangeRules, QuireKitDateTimeRangeValue } from './types';
import { quireKitDefaultLocale } from '../../locale/resolve';
import type { Messages as PickerMessages } from '../../locale/components/picker';

/**
 * Copies validated canonical fields without swapping endpoints or inventing missing data.
 * @param value - Public endpoints or a pending complete/partial range.
 * @param precision - Explicit display precision, rejecting hidden nonzero seconds.
 * @returns Independent canonical endpoints owned by the caller.
 */
export function copyDateTimeRange(value: QuireKitDateTimeRangeValue, precision: 'minute' | 'second' = 'second'): QuireKitDateTimeRangeValue {
  return { start: normalizeCivilDateTime(value.start, precision), end: normalizeCivilDateTime(value.end, precision) };
}
/**
 * Adapts endpoint predicates without coupling its limits to the other endpoint.
 * @param rules - Common and whole-range host rules.
 * @param endpoint - Stable identity for business restrictions and candidate generation.
 * @returns Single-date-time rules consumed by the accepted date/time engine.
 */
export function dateTimeRangeEndpointRules(rules: DateTimeRangeRules, endpoint: DateTimeRangeEndpoint): DateTimeRules {
  const { isDateUnavailable, isDateTimeUnavailable, isRangeUnavailable, ...common } = rules;
  return {
    ...common,
    ...(isDateUnavailable ? { isDateUnavailable: (date: string) => isDateUnavailable(date, endpoint) } : {}),
    ...(isDateTimeUnavailable ? { isDateTimeUnavailable: (value: string) => isDateTimeUnavailable(value, endpoint) } : {})
  };
}
/**
 * Validates each endpoint before evaluating full-range order and business acceptance.
 * @param value - Public input or popup draft, never changed by validation.
 * @param rules - Shared limits, precision, steps and pure business predicates.
 * @param text - Picker messages of the active language.
 * @returns Localized contextual recovery guidance, or empty text for valid current fields.
 */
export function dateTimeRangeError(value: QuireKitDateTimeRangeValue, rules: DateTimeRangeRules, text: PickerMessages = quireKitDefaultLocale.messages.picker): string {
  const normalized = copyDateTimeRange(value, rules.granularity ?? 'second');
  // Independent validation preserves recovery in either order, including an empty first endpoint.
  for (const endpoint of ['start', 'end'] as const) {
    const error = dateTimeError(normalized[endpoint], dateTimeRangeEndpointRules(rules, endpoint), text);
    if (error) return text.endpointError(endpoint, error);
  }
  if (normalized.start === null || normalized.end === null) return '';
  // Canonical civil fields have lexical calendar order; no Date/UTC conversion or span enumeration.
  if (normalized.end < normalized.start) return text.dateTimeRangeReversed;
  if (rules.isRangeUnavailable?.({ start: normalized.start, end: normalized.end })) return text.dateTimeRangeUnavailable;
  return '';
}
