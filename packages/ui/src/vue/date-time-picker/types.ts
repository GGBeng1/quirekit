import type { TimeDraft } from '../time-picker/types';
import type { QuireKitTimeSinglePickerProps } from '../time-picker/types';
import type { QuireKitCalendarDensity } from '../calendar/types';

/** Public Gregorian wall-clock date and time, without an offset or time zone. */
export type QuireKitDateTimeValue = string | null;
/** One complete date-time input with a separately confirmed calendar/time panel. */
export interface QuireKitDateTimePickerProps extends Omit<QuireKitTimeSinglePickerProps, 'modelValue' | 'defaultValue' | 'min' | 'max' | 'placeholderValue' | 'granularity' | 'isTimeUnavailable'> {
  /** Controlled YYYY-MM-DD HH:mm:ss (or minute precision) value; null means empty/incomplete. */
  readonly modelValue?: QuireKitDateTimeValue;
  /** Initial uncontrolled value and native form-reset target. */
  readonly defaultValue?: QuireKitDateTimeValue;
  /** Inclusive complete date-time lower boundary, without a time-zone conversion. */
  readonly min?: string;
  /** Inclusive complete date-time upper boundary, without a time-zone conversion. */
  readonly max?: string;
  /** Stable complete reference date-time for editing empty segments. */
  readonly placeholderValue?: string;
  /** Smallest displayed unit; defaults to second. Non-zero seconds cannot be hidden. */
  readonly granularity?: 'minute' | 'second';
  /** Calendar geometry independent of the input's five shared sizes. */
  readonly calendarDensity?: QuireKitCalendarDensity;
  /** First weekday: Sunday is 0 and Monday is 1; otherwise follows the active language. */
  readonly startOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Pure whole-day restriction receiving YYYY-MM-DD. */
  readonly isDateUnavailable?: (date: string) => boolean;
  /** Pure full date-time restriction; the host may apply explicit business-zone validation. */
  readonly isDateTimeUnavailable?: (value: string) => boolean;
}
/** Constraint projection shared by input, calendar, time columns and confirmation. */
export type DateTimeRules = { readonly [Key in 'min' | 'max' | 'granularity' | 'hourStep' | 'minuteStep' | 'secondStep' | 'isDateUnavailable' | 'isDateTimeUnavailable']?: QuireKitDateTimePickerProps[Key] | undefined };
/** Private panel inputs; field ownership stays with the public picker. */
export interface DateTimePanelProps {
  /** Current complete field value or empty value. */ readonly value: QuireKitDateTimeValue;
  /** Shared field and candidate constraints. */ readonly rules: DateTimeRules;
  /** Accessible base name for the editing surface. */ readonly label: string;
  /** Time display cycle, independent of the public 24-hour value. */ readonly hourCycle: 12 | 24;
  /** Calendar spacing independent of input height. */ readonly density: QuireKitCalendarDensity;
  /** Explicit initial calendar date for deterministic examples and SSR. */ readonly placeholderValue?: string;
  /** First weekday; otherwise follows the active language. */ readonly startOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Partial date and time selections, retained independently across editing surfaces. */
export interface DateTimeDraft {
  /** Complete calendar date or no chosen date. */ readonly date: string | null;
  /** Independent time units, without filling missing units. */ readonly time: TimeDraft;
}
/** Reusable date/time editor without popup, confirmation or committed-value ownership. */
export interface DateTimeEditorProps extends Omit<DateTimePanelProps, 'value'> {
  /** Parent-owned partial draft. */ readonly modelValue: DateTimeDraft;
}
