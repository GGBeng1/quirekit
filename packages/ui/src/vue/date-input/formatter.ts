import { DateFormatter } from "@internationalized/date";

/** Stable Gregorian date display for pickers, independent of locale punctuation. */
export class IsoDateFormatter extends DateFormatter {
  /** Creates the shared year-month-day format without a local time-zone conversion. */
  constructor() {
    super("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory", numberingSystem: "latn", timeZone: "UTC" });
  }
  /**
   * Keeps Ark segment ownership while fixing order, padding and separators.
   * @param date - Internal Gregorian date anchor.
   * @returns Editable year, month and day parts separated by hyphens.
   */
  override formatToParts(date: Date): Intl.DateTimeFormatPart[] {
    const parts = super.formatToParts(date);
    return (["year", "month", "day"] as const).flatMap((type, index) => {
      const value = parts.find(part => part.type === type)!.value.padStart(type === "year" ? 4 : 2, "0");
      return [...(index ? [{ type: "literal" as const, value: "-" }] : []), { type, value }];
    });
  }
  /** @param date - Internal date anchor. @returns The same representation as the segmented display. */
  override format(date: Date): string { return this.formatToParts(date).map(part => part.value).join(""); }
}
