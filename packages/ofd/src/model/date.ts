/** Strict four-digit calendar-date pattern used by the 2016 document metadata. */
const ofdDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;

/**
 * Tests whether a value is a valid OFD calendar date.
 *
 * @param value - Candidate `YYYY-MM-DD` value.
 * @returns Whether the value is a valid non-zero calendar date.
 */
export function isValidOFDDate(value: string): boolean {
  const match = value.match(ofdDatePattern);
  if (!match) return false;
  return isValidCalendarDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3])
  );
}

/**
 * Tests whether a value is a valid attachment date or date-time.
 *
 * @param value - Candidate ISO-8601 date or date-time value.
 * @returns Whether the value can be normalized to OFDRW's second precision.
 */
export function isValidOFDAttachmentDate(value: string): boolean {
  if (isValidOFDDate(value)) return true;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))?$/u
  );
  if (!match) return false;
  const offsetHours = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinutes = match[8] === undefined ? 0 : Number(match[8]);
  return isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
    && Number(match[4]) <= 23
    && Number(match[5]) <= 59
    && Number(match[6]) <= 59
    && offsetHours <= 14
    && offsetMinutes <= 59
    && (offsetHours !== 14 || offsetMinutes === 0);
}

/**
 * Normalizes a validated attachment date to OFDRW-readable second precision.
 *
 * Offset-bearing values are converted to UTC before the offset is removed;
 * local values retain their authored wall-clock time.
 *
 * @param value - Previously validated attachment date or date-time.
 * @returns `YYYY-MM-DDTHH:mm:ss` without fractional seconds or a timezone.
 */
export function normalizeOFDAttachmentDate(value: string): string {
  if (isValidOFDDate(value)) return `${value}T00:00:00`;
  if (/[zZ]|[+-]\d{2}:\d{2}$/u.test(value)) {
    return new Date(value).toISOString().slice(0, 19);
  }
  return value.slice(0, 19);
}

/**
 * Tests one parsed calendar date without relying on host date parsing.
 *
 * @param year - Four-digit calendar year.
 * @param month - One-based calendar month.
 * @param day - One-based calendar day.
 * @returns Whether the values name a real non-zero Gregorian calendar date.
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31];
  return day <= days[month - 1]!;
}

/**
 * Tests whether one Gregorian calendar year contains 29 February.
 *
 * @param year - Positive Gregorian calendar year.
 * @returns Whether February has 29 days in this year.
 */
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
