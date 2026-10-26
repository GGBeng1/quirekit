import type { QuireKitPickerValue } from '../date-picker/types';
import type { PickerPresentation } from "../shared/picker/types";
import type { QuireKitTimeInputProps } from "../time-input/types";

/** Pure time field with a separately confirmed, cancellable selection panel. */
export interface QuireKitTimeSinglePickerProps extends QuireKitTimeInputProps {
  /** Auto uses a bottom sheet below 768px; a session keeps its opening presentation. */
  readonly presentation?: PickerPresentation;
  /** Open when the editable field receives focus or a click; defaults to true. */
  readonly openOnFocus?: boolean;
  /** Controlled panel visibility. */ readonly open?: boolean | undefined;
  /** Initial uncontrolled panel visibility. */ readonly defaultOpen?: boolean;
  /** Hour candidates advance from zero by this positive integer, at most 23. */ readonly hourStep?: number;
  /** Minute candidates advance from zero by this positive integer, at most 59. */ readonly minuteStep?: number;
  /** Second candidates advance from zero by this positive integer, at most 59. */ readonly secondStep?: number;
  /** Pure predicate shared by the panel and directly entered complete times. */ readonly isTimeUnavailable?: (time: string) => boolean;
}
/** Shared validation inputs; omitted values use the component defaults. */
export type TimeRules = { readonly [Key in "min" | "max" | "hourStep" | "minuteStep" | "secondStep" | "granularity" | "isTimeUnavailable"]?: QuireKitTimeSinglePickerProps[Key] | undefined };
/** Independently selected time columns; missing units remain explicit. */
export interface TimeDraft {
  /** Displayed hour, 0–23 or 1–12 according to the display cycle. */ hour: number | null;
  /** Minute, or an unselected column. */ minute: number | null;
  /** Second, or an unselected column. */ second: number | null;
  /** 0 for AM and 12 for PM; used only with a 12-hour display. */ period: number | null;
}
/** One of the independently keyboard-navigable time columns. */
export type TimeColumn = keyof TimeDraft;
/** Private time panel inputs; the owning picker retains the public value. */
export interface TimePanelProps {
  /** Initial or externally replaced committed value. */ readonly value: string | null;
  /** Time validation and option rules. */ readonly rules: TimeRules;
  /** Display cycle; serialization always stays 24-hour. */ readonly hourCycle: 12 | 24;
  /** Names the panel's controls. */ readonly label: string;
}

/** Shared time-column view; the owning single/range panel retains partial drafts. */
export interface TimeColumnsProps {
  /** Time validation and option rules. */ readonly rules: TimeRules;
  /** Display cycle; serialization always stays 24-hour. */ readonly hourCycle: 12 | 24;
  /** Names the panel columns. */ readonly label: string;
  /** Independently selected units, including incomplete selections. */ readonly modelValue: TimeDraft;
}

/** A pure-time picker with optional independently editable range endpoints. */
export interface QuireKitTimePickerProps<Range extends boolean = false> extends Omit<QuireKitTimeSinglePickerProps, 'modelValue' | 'defaultValue' | 'isTimeUnavailable'> {
  /** Select a start and end time through the same field. */ readonly range?: Range & boolean;
  /** Controlled value; range determines the model shape. */ readonly modelValue?: QuireKitPickerValue<Range>;
  /** Initial value and native form-reset target. */ readonly defaultValue?: QuireKitPickerValue<Range>;
  /** Accessible name of the start field. */ readonly startLabel?: string;
  /** Accessible name of the end field. */ readonly endLabel?: string;
  /** Explicitly allow next-day end times. */ readonly allowOvernight?: boolean;
  /** Time restriction; range mode supplies its endpoint. */ readonly isTimeUnavailable?: (value: string, endpoint: 'start' | 'end') => boolean;
  /** Whole-range restriction after both endpoints are valid. */ readonly isRangeUnavailable?: (value: { start: string; end: string }) => boolean;
}

/** Footer setters follow the same explicit range mode as the model. */
export type TimePickerFooterProps<Range extends boolean> = Range extends true
  ? { /** Replace the whole range draft. */ setRange: (value: import('../date-picker/types').QuireKitPickerRange) => void }
  : { /** Replace the scalar time draft. */ setTime: (value: string) => void };
