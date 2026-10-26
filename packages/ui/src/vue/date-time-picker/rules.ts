import type { DateTimeRules } from './types';
import type { TimeRules } from '../time-picker/types';
import { parseCalendarDate } from '../date-input/value';
import { timeError } from '../time-picker/value';
import { normalizeCivilDateTime, parseCivilDateTime } from './value';
import { quireKitDefaultLocale } from '../../locale/resolve';
import type { Messages as PickerMessages } from '../../locale/components/picker';

/** @param rules - Host date-time limits. @returns Parsed canonical boundaries, rejecting reversed configuration. */
function boundaries(rules: DateTimeRules): { min: string | null; max: string | null } {
  const min = normalizeCivilDateTime(rules.min), max = normalizeCivilDateTime(rules.max);
  if (min && max && min > max) throw new RangeError('DateTimePicker min must not be later than max.');
  return { min, max };
}
/**
 * Projects the full interval onto one chosen day without restricting interior days.
 * @param date - Chosen calendar date; null permits time-first drafting without fabricating a date.
 * @param rules - Shared date-time constraints.
 * @returns TimePicker-compatible candidates for this date.
 */
export function dateTimeTimeRules(date: string | null, rules: DateTimeRules): TimeRules {
  if (date) parseCalendarDate(date);
  const { min, max } = boundaries(rules);
  const forbiddenDay = Boolean(date && ((min && date < min.slice(0, 10)) || (max && date > max.slice(0, 10)) || rules.isDateUnavailable?.(date)));
  return {
    granularity: rules.granularity ?? 'second',
    hourStep: rules.hourStep, minuteStep: rules.minuteStep, secondStep: rules.secondStep,
    ...(date && min?.startsWith(`${date} `) ? { min: min.slice(11) } : {}),
    ...(date && max?.startsWith(`${date} `) ? { max: max.slice(11) } : {}),
    isTimeUnavailable: time => forbiddenDay || Boolean(date && rules.isDateTimeUnavailable?.(`${date} ${time}`))
  };
}
/**
 * Validates a complete civil date-time against bounds, steps and host predicates.
 * @param value - Complete or empty civil date-time.
 * @param rules - Input/panel constraints.
 * @param text - Picker messages of the active language.
 * @returns Localized recovery guidance, preserving invalid user values.
 */
export function dateTimeError(value: string | null, rules: DateTimeRules, text: PickerMessages = quireKitDefaultLocale.messages.picker): string {
  const { min, max } = boundaries(rules);
  const precision = rules.granularity ?? 'second';
  timeError(null, rules);
  if (value === null) return '';
  const parsed = parseCivilDateTime(value)!;
  const canonical = normalizeCivilDateTime(value)!;
  // Display precision and interval boundaries are checked before business predicates.
  normalizeCivilDateTime(value, precision);
  if ((min && canonical < min) || (max && canonical > max)) return text.dateTimeBetween(min ?? undefined, max ?? undefined);
  const date = canonical.slice(0, 10);
  if (rules.isDateUnavailable?.(date)) return text.dateUnavailable;
  const stepError = timeError(`${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:${String(parsed.second).padStart(2, '0')}`, { hourStep: rules.hourStep, minuteStep: rules.minuteStep, secondStep: rules.secondStep }, text);
  if (stepError) return stepError;
  if (rules.isDateTimeUnavailable?.(normalizeCivilDateTime(value, precision)!)) return text.dateTimeUnavailable;
  return '';
}
