/**
 * Formats a compact comment time: time only for today, date for this year, full date otherwise.
 * @param value - ISO 8601 time.
 * @param locale - Display locale.
 * @param now - Reference time.
 * @returns Compact text, or the original value when it is not a valid time.
 */
export function formatCommentTime(value: string, locale: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  const sameDay = date.toDateString() === now.toDateString(), sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    ...(sameDay ? {} : { month: "numeric", day: "numeric" } as const),
    ...(sameYear ? {} : { year: "numeric" } as const),
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}
