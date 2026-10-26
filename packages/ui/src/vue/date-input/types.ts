import type { QuireKitControlSize } from "../../components/control";

/** A Gregorian calendar date serialized without a time or time zone. */
export type QuireKitDateInputValue = string | null;

/** Public contract for a segmented, single-date input. */
export interface QuireKitDateInputProps {
  /** Accessible field name, visible unless hideLabel is set. */
  readonly label: string;
  /** Controlled ISO YYYY-MM-DD value; null represents an empty input. */
  readonly modelValue?: QuireKitDateInputValue;
  /** Initial value and native form-reset target in uncontrolled mode. */
  readonly defaultValue?: QuireKitDateInputValue;
  /** Shared single-line control size. */
  readonly size?: QuireKitControlSize;
  /** CSS width; the field never exceeds its containing block. */
  readonly width?: string;
  /** Keep the accessible name while letting an external layout present the label. */
  readonly hideLabel?: boolean;
  /** Date display convention; iso by default, locale follows the active language. */
  readonly dateFormat?: "iso" | "locale";
  /** Inclusive minimum ISO calendar date. */
  readonly min?: string;
  /** Inclusive maximum ISO calendar date. */
  readonly max?: string;
  /** Stable reference date for empty segments, independent of the current clock. */
  readonly placeholderValue?: string;
  /** Native form field name. */
  readonly name?: string;
  /** Associated native form ID, including forms outside the DOM ancestry. */
  readonly form?: string;
  /** Prevent interaction and omit the field from native form data. */
  readonly disabled?: boolean;
  /** Allow reading and focus, without changing the value. */
  readonly readOnly?: boolean;
  /** Required-field semantics; validation is owned by the host Form. */
  readonly required?: boolean;
  /** Host-owned validation state, in addition to date-bound validation. */
  readonly invalid?: boolean;
  /** Supporting text associated with each editable segment. */
  readonly description?: string;
  /** Recovery guidance presented when the host marks the field invalid. */
  readonly errorText?: string;
  /** Offer a clear action, including while date segments are incomplete. */
  readonly clearable?: boolean;
}
