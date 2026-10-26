/** Numeric typography scale, independent of surrounding control size. */
export type QuireKitStatisticSize = 'sm' | 'md';

/** Static named metric; data collection and business calculations belong to the consumer. */
export interface QuireKitStatisticProps {
  /** Visible metric name, rendered as a native definition term. */
  readonly title: string;
  /** Numeric value; missing and nonfinite numbers show the empty state. Use bigint for exact large integers. */
  readonly value?: number | bigint | null;
  /** Native grouping, precision, percentage, currency and unit formatting options. */
  readonly formatOptions?: Intl.NumberFormatOptions;
  /** Plain text before a valid value; the prefix slot takes precedence. */
  readonly prefix?: string;
  /** Plain text after a valid value; the suffix slot takes precedence. */
  readonly suffix?: string;
  /** Additional context after the value; the description slot takes precedence. */
  readonly description?: string;
  /** Numeric typography and content spacing. Defaults to md. */
  readonly size?: QuireKitStatisticSize;
  /** Replaces the value and affixes with a decorative placeholder. Defaults to false. */
  readonly loading?: boolean;
  /** Visible placeholder for missing and nonfinite values. Defaults to —. */
  readonly emptyValue?: string;
}

/** Available value and its formatted text, supplied only when not loading or empty. */
export interface QuireKitStatisticValueSlotProps {
  /** Original finite number or exact integer. */
  readonly value: number | bigint;
  /** Intl.NumberFormat output for the active language and options. */
  readonly formattedValue: string;
}

/** Static content positions; supplementary actions retain their native behavior. */
export interface QuireKitStatisticSlots {
  /** Replaces the metric name while retaining native dt semantics. */
  readonly title?: () => unknown;
  /** Content before a valid value; omitted during loading and empty states. */
  readonly prefix?: () => unknown;
  /** Replaces the available value's presentation without changing the surrounding dd. */
  readonly value?: (props: QuireKitStatisticValueSlotProps) => unknown;
  /** Content after a valid value; omitted during loading and empty states. */
  readonly suffix?: () => unknown;
  /** Context, trend explanation or independent actions after the value. */
  readonly description?: () => unknown;
}
