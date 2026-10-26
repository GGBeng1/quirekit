import type { QuireKitListboxItem } from "../../components/listbox";
import type { TimeColumn, TimeDraft, TimeRules } from "./types";
import { timeStep } from "./value";

/**
 * Allows navigation when at least one valid completion remains under the earlier columns.
 * @param column - Column being chosen.
 * @param value - Candidate displayed unit.
 * @param draft - Other selected units, retained even when they need correction.
 * @param cycle - Display cycle.
 * @param allowed - Precomputed finite domain under all host rules.
 * @returns Whether the choice can lead to a valid complete time.
 */
function canChoose(column: TimeColumn, value: number, draft: TimeDraft, cycle: 12 | 24, allowed: readonly number[]): boolean {
  return allowed.some(seconds => {
    const hour = Math.floor(seconds / 3600), minute = Math.floor(seconds / 60) % 60;
    const displayedHour = cycle === 12 ? hour % 12 || 12 : hour, period = hour < 12 ? 0 : 12;
    if (column === "period") return period === value;
    if (cycle === 12 && draft.period !== null && period !== draft.period) return false;
    if (column === "hour") return displayedHour === value;
    if (draft.hour !== null && displayedHour !== draft.hour) return false;
    if (column === "minute") return minute === value;
    if (draft.minute !== null && minute !== draft.minute) return false;
    return seconds % 60 === value;
  });
}
/**
 * Reads the language's own morning and afternoon names instead of a fixed table.
 * @param locale - BCP 47 tag of the active language.
 * @returns Labels for the AM and PM rows.
 */
export function dayPeriodLabels(locale: string): readonly [string, string] {
  const format = new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12", timeZone: "UTC" });
  /** @param hour - Representative hour of the period. @returns Its localized day-period name. */
  const period = (hour: number): string => format.formatToParts(Date.UTC(2000, 0, 1, hour)).find(part => part.type === "dayPeriod")?.value ?? (hour < 12 ? "AM" : "PM");
  return [period(1), period(13)];
}
/**
 * Builds one column's candidates.
 * @param column - Visible time unit.
 * @param draft - Current independent selections.
 * @param cycle - Display cycle.
 * @param allowed - Legal seconds.
 * @param periods - AM and PM labels of the active language.
 * @param rules - Step configuration.
 * @returns Stable candidates retaining disabled rows and their context.
 */
export function timeOptions(column: TimeColumn, draft: TimeDraft, cycle: 12 | 24, allowed: readonly number[], periods: readonly [string, string], rules: TimeRules): QuireKitListboxItem[] {
  const values = column === "period" ? [0, 12] : Array.from({ length: column === "hour" ? cycle : 60 }, (_, index) => column === "hour" && cycle === 12 ? index + 1 : index);
  const step = column === "period" ? 1 : timeStep(column === "hour" ? rules.hourStep : column === "minute" ? rules.minuteStep : rules.secondStep, column === "hour" ? 24 : 60);
  const stepped = values.filter(value => column === "period" || (column === "hour" && cycle === 12 ? value % 12 % step === 0 || (value % 12 + 12) % step === 0 : value % step === 0));
  return stepped.map(value => ({ value: String(value), label: column === "period" ? periods[value === 0 ? 0 : 1] : String(value).padStart(2, "0"), disabled: !canChoose(column, value, draft, cycle, allowed) }));
}
