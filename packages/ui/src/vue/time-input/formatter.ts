import { DateFormatter } from "@internationalized/date";

/** Keeps locale separators stable between Node ICU and browser ICU during hydration. */
export class StableTimeFormatter extends DateFormatter {
  /**
   * Normalizes equivalent spaces without altering digits, order, or day-period words.
   * @param date - Internal date used solely to format its time segments.
   * @returns Locale parts with stable whitespace in literal separators.
   */
  override formatToParts(date: Date): Intl.DateTimeFormatPart[] {
    return super.formatToParts(date).map(part => part.type === "literal" ? { ...part, value: part.value.replace(/[\u00a0\u202f]/g, " ") } : part);
  }
}
