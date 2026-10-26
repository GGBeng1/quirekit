import type { QuireKitControlSize } from "../../components/control";

/** A Wall-clock time serialized without a date or time zone. */
export type QuireKitTimeInputValue = string | null;

/** Public contract for a segmented, single-time input. */
export interface QuireKitTimeInputProps {
  /** Accessible field name, visible unless hideLabel is set. */
  readonly label: string;
  /** Controlled 24-hour HH:mm or HH:mm:ss value; null represents an empty input. */
  readonly modelValue?: QuireKitTimeInputValue;
  /** Initial value and native form-reset target in uncontrolled mode. */
  readonly defaultValue?: QuireKitTimeInputValue;
  /** Shared single-line control size. */
  readonly size?: QuireKitControlSize;
  /** CSS width; the field never exceeds its containing block. */
  readonly width?: string;
  /** Keep the accessible name while letting an external layout present the label. */
  readonly hideLabel?: boolean;
  /** Inclusive minimum wall-clock time. */
  readonly min?: string;
  /** Inclusive maximum wall-clock time. */
  readonly max?: string;
  /** Stable reference date for empty segments, independent of the current clock. */
  readonly placeholderValue?: string;
  /** Smallest displayed unit; defaults to minute. */
  readonly granularity?: "minute" | "second";
  /** Display cycle, independent of the 24-hour public value; defaults to 24. */
  readonly hourCycle?: 12 | 24;
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
  /** Host-owned validation state, in addition to time-bound validation. */
  readonly invalid?: boolean;
  /** Supporting text associated with each editable segment. */
  readonly description?: string;
  /** Recovery guidance presented when the host marks the field invalid. */
  readonly errorText?: string;
  /** Offer a clear action, including while time segments are incomplete. */
  readonly clearable?: boolean;
}
