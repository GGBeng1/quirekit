import { parseClockTime } from "../time-input/value";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as PickerMessages } from "../../locale/components/picker";
import type { TimeDraft, TimeRules } from "./types";

/** @param value - Complete time. @returns Seconds since midnight, without a time-zone conversion. */
export function clockSeconds(value: string): number {
  const time = parseClockTime(value)!;
  return time.hour * 3600 + time.minute * 60 + time.second;
}
/** @param step - Requested step. @param limit - Exclusive unit period. @returns Checked positive integer step. */
export function timeStep(step: number | undefined, limit: number): number {
  const value = step ?? 1;
  if (!Number.isInteger(value) || value < 1 || value >= limit) throw new RangeError(`Time step must be an integer from 1 to ${limit - 1}.`);
  return value;
}
/**
 * Validates a complete time against bounds, steps and the host predicate.
 * @param value - Complete time or null.
 * @param rules - Shared time constraints.
 * @param text - Picker messages of the active language.
 * @returns Recovery guidance, or empty text for a valid/empty value.
 */
export function timeError(value: string | null, rules: TimeRules, text: PickerMessages = quireKitDefaultLocale.messages.picker): string {
  const steps = [timeStep(rules.hourStep, 24), timeStep(rules.minuteStep, 60), timeStep(rules.secondStep, 60)];
  if (value === null) return "";
  const seconds = clockSeconds(value);
  if ((rules.min && seconds < clockSeconds(rules.min)) || (rules.max && seconds > clockSeconds(rules.max))) return text.timeBetween(rules.min ?? "00:00", rules.max ?? "23:59:59");
  const units = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  if (units.some((unit, index) => unit % steps[index]! !== 0)) return text.timeStep;
  if (rules.isTimeUnavailable?.(value)) return text.timeUnavailable;
  return "";
}
/**
 * Enumerates the finite wall-clock domain once per rule change, not per key press.
 * @param rules - Shared constraints for every editing surface.
 * @returns Valid seconds since midnight, in chronological order.
 */
export function availableTimes(rules: TimeRules): number[] {
  const hourStep = timeStep(rules.hourStep, 24), minuteStep = timeStep(rules.minuteStep, 60), secondStep = timeStep(rules.secondStep, 60);
  const min = rules.min ? clockSeconds(rules.min) : 0, max = rules.max ? clockSeconds(rules.max) : 86399;
  const result: number[] = [];
  for (let hour = 0; hour < 24; hour += hourStep) for (let minute = 0; minute < 60; minute += minuteStep) for (let second = 0; second < (rules.granularity === "second" ? 60 : 1); second += secondStep) {
    const seconds = hour * 3600 + minute * 60 + second;
    if (seconds < min || seconds > max) continue;
    const time = [hour, minute, ...(rules.granularity === "second" ? [second] : [])].map(unit => String(unit).padStart(2, "0")).join(":");
    if (!rules.isTimeUnavailable?.(time)) result.push(seconds);
  }
  return result;
}
/** @param value - Current complete time. @param cycle - Display cycle. @returns Independent panel columns without filling an empty value. */
export function timeDraft(value: string | null, cycle: 12 | 24): TimeDraft {
  const time = parseClockTime(value);
  return time ? { hour: cycle === 12 ? time.hour % 12 || 12 : time.hour, minute: time.minute, second: time.second, period: time.hour < 12 ? 0 : 12 } : { hour: null, minute: null, second: null, period: null };
}
/** @param draft - Current columns. @param cycle - Display cycle. @param precision - Visible precision. @returns Complete canonical time or null when any required column is missing. */
export function draftTime(draft: TimeDraft, cycle: 12 | 24, precision: "minute" | "second"): string | null {
  if (draft.hour === null || draft.minute === null || (precision === "second" && draft.second === null) || (cycle === 12 && draft.period === null)) return null;
  const hour = cycle === 12 ? draft.hour % 12 + draft.period! : draft.hour;
  return [hour, draft.minute, ...(precision === "second" ? [draft.second!] : [])].map(unit => String(unit).padStart(2, "0")).join(":");
}
