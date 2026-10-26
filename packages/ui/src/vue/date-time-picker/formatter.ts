import { DateFormatter } from '@internationalized/date';
/** Stable Gregorian date/time display; locale affects period words, never civil-field order. */
export class CivilDateTimeFormatter extends DateFormatter {
  /** @param locale - Locale for period names. @param precision - Smallest visible time unit. @param cycle - Visible hour cycle. */
  constructor(locale: string, precision: 'minute' | 'second', cycle: 12 | 24) {
    super(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', ...(precision === 'second' ? { second: '2-digit' } : {}), calendar: 'gregory', numberingSystem: 'latn', hourCycle: cycle === 12 ? 'h12' : 'h23', timeZone: 'UTC' });
  }
  /** @param date - UTC formatting projection of civil fields. @returns Explicit date, time and period segments with compact literals. */
  override formatToParts(date: Date): Intl.DateTimeFormatPart[] {
    const parts = super.formatToParts(date);
    const keys = ['year', 'month', 'day', 'hour', 'minute', ...(parts.some(part => part.type === 'second') ? ['second'] : [])] as Intl.DateTimeFormatPartTypes[];
    const result: Intl.DateTimeFormatPart[] = keys.flatMap((type, index) => [...(index ? [{ type: 'literal' as const, value: index < 3 ? '-' : index === 3 ? ' ' : ':' }] : []), { type, value: parts.find(part => part.type === type)!.value.padStart(type === 'year' ? 4 : 2, '0') }]);
    const period = parts.find(part => part.type === 'dayPeriod');
    if (period) result.push({ type: 'literal', value: ' ' }, period);
    return result;
  }
  /** @param date - UTC formatting projection. @returns The same representation as the visible segments. */
  override format(date: Date): string { return this.formatToParts(date).map(part => part.value).join(''); }
}
