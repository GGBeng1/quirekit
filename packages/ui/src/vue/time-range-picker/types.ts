import type { QuireKitTimeSinglePickerProps, TimeRules } from "../time-picker/types";

/** Independently editable wall-clock endpoints, without inferred dates or time zones. */
export interface QuireKitTimeRangeValue {
  /** Complete start time, or an empty/incomplete endpoint. */ readonly start: string | null;
  /** Complete end time, or an empty/incomplete endpoint. */ readonly end: string | null;
}
/** Complete range passed to whole-range business validation. */
export interface CompleteTimeRange {
  /** Complete 24-hour start time. */ readonly start: string;
  /** Complete 24-hour end time. */ readonly end: string;
}
/** Endpoint identity remains stable even during reversed or incomplete editing. */
export type TimeRangeEndpoint = "start" | "end";
/** Combined pure-time field with one atomic confirmation boundary. */
export interface QuireKitTimeRangePickerProps extends Omit<QuireKitTimeSinglePickerProps, "modelValue" | "defaultValue" | "isTimeUnavailable"> {
  /** Controlled endpoints, preserving partial and temporarily reversed input. */ readonly modelValue?: QuireKitTimeRangeValue;
  /** Initial uncontrolled endpoints and native form-reset target. */ readonly defaultValue?: QuireKitTimeRangeValue;
  /** Accessible start-field name, derived from label and the active language when omitted. */ readonly startLabel?: string;
  /** Accessible end-field name, derived from label and the active language when omitted. */ readonly endLabel?: string;
  /** Interpret an earlier end as next-day only when explicitly enabled; equal times remain zero-length. */ readonly allowOvernight?: boolean;
  /** Pure endpoint predicate; it does not reject interior times in a span. */ readonly isTimeUnavailable?: (time: string, endpoint: TimeRangeEndpoint) => boolean;
  /** Pure whole-range predicate, called only with complete, individually valid endpoints. */ readonly isRangeUnavailable?: (range: CompleteTimeRange) => boolean;
}
/** Shared constraints for direct input, panel candidates and final range confirmation. */
export type TimeRangeRules = Omit<TimeRules, "isTimeUnavailable"> & {
  readonly [Key in "allowOvernight" | "isTimeUnavailable" | "isRangeUnavailable"]?: QuireKitTimeRangePickerProps[Key] | undefined;
};

/** Internal range panel; the outer field owns committed values and popup visibility. */
export interface TimeRangePanelProps {
  /** Current committed range, copied when the panel mounts or changes externally. */ readonly value: QuireKitTimeRangeValue;
  /** Shared endpoint and whole-range constraints. */ readonly rules: TimeRangeRules;
  /** Display cycle; public values always remain 24-hour. */ readonly hourCycle: 12 | 24;
  /** Accessible name for the endpoint tab list. */ readonly label: string;
  /** Full name for the start-time columns. */ readonly startLabel: string;
  /** Full name for the end-time columns. */ readonly endLabel: string;
  /** Most recently focused field, or the first incomplete endpoint. */ readonly initialEndpoint: TimeRangeEndpoint;
}

/** Private endpoint adapter, sharing the range field's visual and form ownership. */
export interface TimeRangeEndpointProps {
  /** Complete time or an empty endpoint. */ readonly modelValue: string | null;
  /** Full contextual accessible name. */ readonly label: string;
  /** Displayed hour cycle. */ readonly hourCycle: 12 | 24;
  /** Smallest visible unit. */ readonly granularity: "minute" | "second";
  /** Stable reference for empty segments. */ readonly placeholderValue?: string;
  /** Native endpoint form name. */ readonly name?: string;
  /** External native form association. */ readonly form?: string;
  /** Prevent interaction and native submission. */ readonly disabled: boolean;
  /** Reading and focus without editing. */ readonly readOnly: boolean;
  /** Required-field semantics. */ readonly required: boolean;
  /** Whole-range validation state. */ readonly invalid: boolean;
  /** Shared guidance element ID. */ readonly describedBy?: string;
}
