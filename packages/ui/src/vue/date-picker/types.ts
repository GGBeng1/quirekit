import type { PickerPresentation } from "../shared/picker/types";
import type { QuireKitCalendarDensity } from "../calendar/types";
import type { QuireKitDateInputProps } from "../date-input/types";

/** A single-date field composed from the shared segmented input and calendar. */
export interface QuireKitDateSinglePickerProps extends QuireKitDateInputProps {
  /** Auto uses a bottom sheet below 768px; a session keeps its opening presentation. */
  readonly presentation?: PickerPresentation;
  /** Open when the editable field receives focus or a click; defaults to true. */
  readonly openOnFocus?: boolean;
  /** Controlled popup visibility. */
  readonly open?: boolean | undefined;
  /** Initial uncontrolled popup visibility. */
  readonly defaultOpen?: boolean;
  /** Calendar panel spacing, independent of the input size; comfortable by default. */
  readonly calendarDensity?: QuireKitCalendarDensity;
  /** Zone used only to determine today's date. */
  readonly timeZone?: string;
  /** First weekday; otherwise follows the active language. */
  readonly startOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Business dates forbidden in both the calendar and field validation. */
  readonly isDateUnavailable?: (date: string) => boolean;
}

/** A range selected through the unified picker, retaining independent empty endpoints. */
export interface QuireKitPickerRange {
  /** Complete start value, or an empty/incomplete endpoint. */ readonly start: string | null;
  /** Complete end value, or an empty/incomplete endpoint. */ readonly end: string | null;
}
/** Model shape is inferred from the explicit range prop. */
export type QuireKitPickerValue<Range extends boolean = false> = Range extends true ? QuireKitPickerRange : string | null;
/** Single date, date range, date-time or date-time range through one entry point. */
export interface QuireKitDatePickerProps<Range extends boolean = false> extends Omit<QuireKitDateSinglePickerProps, 'modelValue' | 'defaultValue'> {
  /** Choose independent start and end values instead of one date. */ readonly range?: Range & boolean;
  /** Include time selection with one confirmation boundary; defaults to false. */ readonly showTime?: boolean;
  /** Controlled scalar or range model, inferred from range. */ readonly modelValue?: QuireKitPickerValue<Range>;
  /** Initial value and native form-reset target. */ readonly defaultValue?: QuireKitPickerValue<Range>;
  /** Start-field accessible name. */ readonly startLabel?: string;
  /** End-field accessible name. */ readonly endLabel?: string;
  /** Date-time range editors: sequential by default, or two simultaneous desktop editors. */ readonly rangeLayout?: 'single' | 'dual';
  /** Desktop month count for date ranges; bottom sheets use one. */ readonly numberOfMonths?: 1 | 2;
  /** Permit unavailable interior dates in pure date ranges. */ readonly allowNonContiguousRange?: boolean;
  /** Time precision when showTime is enabled; defaults to minute. */ readonly granularity?: 'minute' | 'second';
  /** Time display cycle; serialized values always use 24 hours. */ readonly hourCycle?: 12 | 24;
  /** Hour candidate step. */ readonly hourStep?: number;
  /** Minute candidate step. */ readonly minuteStep?: number;
  /** Second candidate step. */ readonly secondStep?: number;
  /** Date-time restriction; range mode also supplies the endpoint. */ readonly isDateTimeUnavailable?: (value: string, endpoint: 'start' | 'end') => boolean;
  /** Reject a complete date-time range. */ readonly isRangeUnavailable?: (value: { start: string; end: string }) => boolean;
}
