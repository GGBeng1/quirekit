/** Single mode uses ISO/null; range and multiple modes use ordered ISO arrays. */
export type QuireKitCalendarValue = string | readonly string[] | null;
/** Selection behavior supplied by Ark's date-picker controller. */
export type QuireKitCalendarSelectionMode = "single" | "range" | "multiple";
/** Panel density independent of the five-size input control scale. */
export type QuireKitCalendarDensity = "compact" | "comfortable";
/** Public contract for an inline calendar, independent of any input or popup. */
export interface QuireKitCalendarProps {
  /** Accessible calendar name. */
  readonly label: string;
  /** Controlled ISO dates, without time-zone conversion. */
  readonly modelValue?: QuireKitCalendarValue;
  /** Initial uncontrolled selection. */
  readonly defaultValue?: QuireKitCalendarValue;
  /** Single date, ordered start/end range, or independent multiple dates. */
  readonly selectionMode?: QuireKitCalendarSelectionMode;
  /** Compact or comfortable panel spacing; comfortable by default. */
  readonly density?: QuireKitCalendarDensity;
  /** Time zone used to determine today; supply consistently when server rendering. */
  readonly timeZone?: string;
  /** Initial visible/focused ISO date, useful for empty server-rendered calendars. */
  readonly defaultFocusedValue?: string;
  /** Inclusive minimum selectable ISO date. */
  readonly min?: string;
  /** Inclusive maximum selectable ISO date. */
  readonly max?: string;
  /** Dates that cannot be selected; receives a plain ISO date. */
  readonly isDateUnavailable?: (date: string) => boolean;
  /** Disables calendar interaction. */
  readonly disabled?: boolean;
  /** Allows browsing while keeping the current selection unchanged. */
  readonly readOnly?: boolean;
  /** Number of visible months; two months wrap on narrow screens. */
  readonly numberOfMonths?: 1 | 2;
  /** Always render six weeks to keep month navigation stable. */
  readonly fixedWeeks?: boolean;
  /** First weekday: Sunday is 0, Monday is 1; otherwise follows the active language. */
  readonly startOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Allow a range to include unavailable interior dates; false by default. */
  readonly allowNonContiguousRange?: boolean;
  /** Maximum selection count in multiple mode. */
  readonly maxSelectedDates?: number;
}

/** Minimal date-cell state consumed by QuireKit's localized announcements. */
export interface CalendarDayAnnouncement {
  /** Full localized calendar-date text. */ readonly valueText: string;
  /** Whether the date is selected. */ readonly selected: boolean;
  /** Whether the date is today in the configured time zone. */ readonly today: boolean;
  /** Whether this date can be chosen. */ readonly selectable: boolean;
  /** Whether the date starts the selected range. */ readonly firstInRange: boolean;
  /** Whether the date ends the selected range. */ readonly lastInRange: boolean;
}
