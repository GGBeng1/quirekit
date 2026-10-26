import type { TimeRangeEndpointProps } from '../time-range-picker/types';
import type { DateTimePanelProps, DateTimeRules, QuireKitDateTimePickerProps } from '../date-time-picker/types';

/** Independent civil date-time endpoints; neither side supplies missing fields for the other. */
export interface QuireKitDateTimeRangeValue {
  /** Complete start date-time, or an empty/incomplete endpoint. */
  readonly start: string | null;
  /** Complete end date-time, or an empty/incomplete endpoint. */
  readonly end: string | null;
}
/** A complete ordered range passed to the host's business predicate. */
export interface CompleteDateTimeRange {
  /** Canonical start in the configured minute or second precision. */
  readonly start: string;
  /** Canonical end in the configured minute or second precision. */
  readonly end: string;
}
/** Stable endpoint identity, including during reversed and partial editing. */
export type DateTimeRangeEndpoint = 'start' | 'end';
/** Shared civil-date input rules extended with explicit endpoint and whole-range restrictions. */
export interface QuireKitDateTimeRangePickerProps extends Omit<QuireKitDateTimePickerProps, 'modelValue' | 'defaultValue' | 'isDateUnavailable' | 'isDateTimeUnavailable'> {
  /** Controlled independent endpoints; defaults to second precision. */
  readonly modelValue?: QuireKitDateTimeRangeValue;
  /** Initial uncontrolled range and native form-reset target. */
  readonly defaultValue?: QuireKitDateTimeRangeValue;
  /** Start-field accessible name, otherwise derived from label and the active language. */
  readonly startLabel?: string;
  /** End-field accessible name, otherwise derived from label and the active language. */
  readonly endLabel?: string;
  /** Sequential editing by default; dual shows both desktop editors, while mobile stays single. */
  readonly rangeLayout?: 'single' | 'dual';
  /** Pure endpoint-day restriction; does not enumerate dates inside the range. */
  readonly isDateUnavailable?: (date: string, endpoint: DateTimeRangeEndpoint) => boolean;
  /** Pure endpoint-instant restriction on civil fields, without timezone inference. */
  readonly isDateTimeUnavailable?: (value: string, endpoint: DateTimeRangeEndpoint) => boolean;
  /** Whole-range restriction, called only with complete individually valid ordered endpoints. */
  readonly isRangeUnavailable?: (range: CompleteDateTimeRange) => boolean;
}
/** Constraints shared by direct input, range drafts and confirmation. */
export type DateTimeRangeRules = Omit<DateTimeRules, 'isDateUnavailable' | 'isDateTimeUnavailable'> & {
  readonly [Key in 'isDateUnavailable' | 'isDateTimeUnavailable' | 'isRangeUnavailable']?: QuireKitDateTimeRangePickerProps[Key] | undefined;
};

/** Private civil endpoint; the outer range owns form reset and shared field appearance. */
export interface DateTimeRangeEndpointProps extends Omit<TimeRangeEndpointProps, 'modelValue' | 'placeholderValue'> {
  /** Complete civil fields or no complete endpoint. */ readonly modelValue: string | null;
  /** Stable full civil reference for editing empty segments. */ readonly placeholderValue?: string;
}
/** Private atomic range panel built from two shared date/time editors. */
export interface DateTimeRangePanelProps extends Omit<DateTimePanelProps, 'value' | 'rules'> {
  /** Committed range copied into independent partial drafts. */ readonly value: QuireKitDateTimeRangeValue;
  /** Shared endpoint and whole-range restrictions. */ readonly rules: DateTimeRangeRules;
  /** Last focused or first incomplete endpoint. */ readonly initialEndpoint: DateTimeRangeEndpoint;
  /** Desktop endpoint layout; mobile always presents one. */ readonly rangeLayout: 'single' | 'dual';
  /** Contextual name of the start editor. */ readonly startLabel: string;
  /** Contextual name of the end editor. */ readonly endLabel: string;
}
