import { parseDateTime, type CalendarDateTime } from '@internationalized/date';
import type { DateInputDateValue } from '@ark-ui/vue/date-input';

/**
 * Parses civil fields without native Date parsing or ambient-zone coercion.
 * @param value - Canonical space-separated civil date-time, or no value.
 * @returns The same date/time fields in Ark's calendar representation.
 */
export function parseCivilDateTime(value: string | null | undefined): CalendarDateTime | undefined {
  if (value == null) return undefined;
  if (!/^(?!0000)\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new TypeError('DateTimePicker expects YYYY-MM-DD HH:mm[:ss], without a time zone.');
  const parsed = parseDateTime(value.replace(' ', 'T'));
  const expected = value.length === 16 ? `${value}:00` : value;
  if (parsed.toString().replace('T', ' ') !== expected) throw new RangeError('DateTimePicker expects valid Gregorian date and time fields.');
  return parsed;
}
/**
 * Serializes complete fields while rejecting hidden precision and zoned values.
 * @param value - Ark's complete date-time value.
 * @param precision - Public/display precision.
 * @returns Space-separated wall-clock fields or null; never an instant.
 */
export function serializeCivilDateTime(value: DateInputDateValue | undefined, precision: 'minute' | 'second' = 'second'): string | null {
  if (!value) return null;
  if (!('hour' in value) || 'timeZone' in value || value.millisecond || value.year < 1 || value.year > 9999 || value.era !== 'AD' || value.calendar.identifier !== 'gregory') throw new TypeError('DateTimePicker requires an unzoned Gregorian date-time with whole seconds.');
  if (precision === 'minute' && value.second !== 0) throw new RangeError('Minute precision cannot hide non-zero seconds.');
  const date = [String(value.year).padStart(4, '0'), String(value.month).padStart(2, '0'), String(value.day).padStart(2, '0')].join('-');
  const time = [value.hour, value.minute, ...(precision === 'second' ? [value.second] : [])].map(unit => String(unit).padStart(2, '0')).join(':');
  return `${date} ${time}`;
}
/** @param value - External civil value. @param precision - Requested field precision. @returns A validated canonical value without changing its civil fields. */
export function normalizeCivilDateTime(value: string | null | undefined, precision: 'minute' | 'second' = 'second'): string | null {
  return serializeCivilDateTime(parseCivilDateTime(value), precision);
}
