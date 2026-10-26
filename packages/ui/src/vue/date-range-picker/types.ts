import type { QuireKitDateSinglePickerProps } from "../date-picker/types";

/** Two independently editable pure-date endpoints; no implicit ordering or time zone. */
export interface QuireKitDateRangeValue {
  /** Complete ISO start date, or an empty/incomplete endpoint. */
  readonly start: string | null;
  /** Complete ISO end date, or an empty/incomplete endpoint. */
  readonly end: string | null;
}
/** Date-range input and cancellable calendar projection under one value owner. */
export interface QuireKitDateRangePickerProps extends Omit<QuireKitDateSinglePickerProps, "modelValue" | "defaultValue"> {
  /** Controlled endpoints; preserves temporary incomplete or reversed input. */
  readonly modelValue?: QuireKitDateRangeValue;
  /** Initial uncontrolled value and native reset target. */
  readonly defaultValue?: QuireKitDateRangeValue;
  /** Accessible start-field name; derived from label and the active language by default. */
  readonly startLabel?: string;
  /** Accessible end-field name; derived from label and the active language by default. */
  readonly endLabel?: string;
  /** Visible calendar months, wrapping on narrow screens; defaults to two. */
  readonly numberOfMonths?: 1 | 2;
  /** Allow unavailable interior dates; endpoints must remain selectable. */
  readonly allowNonContiguousRange?: boolean;
}
/** Internal Ark endpoint bindings, with value ownership remaining in the range field. */
export interface DateRangeEndpointProps {
  /** Complete ISO date or empty endpoint. */ readonly modelValue: string | null;
  /** Contextual accessible field name. */ readonly label: string;
  /** Date display convention shared by both endpoints. */ readonly dateFormat: "iso" | "locale";
  /** Form field name. */ readonly name?: string;
  /** External native form association. */ readonly form?: string;
  /** Stable reference for empty segments. */ readonly placeholderValue?: string;
  /** Disallow all interaction. */ readonly disabled: boolean;
  /** Preserve selection without allowing edits. */ readonly readOnly: boolean;
  /** Required-field semantics. */ readonly required: boolean;
  /** Shared range validation state. */ readonly invalid: boolean;
  /** Shared range guidance element. */ readonly describedBy?: string;
}

/** Optional host rules, accepting Vue props whose absence is explicit undefined. */
export type DateRangeRules = {
  readonly [Key in "min" | "max" | "isDateUnavailable" | "allowNonContiguousRange"]?: QuireKitDateRangePickerProps[Key] | undefined;
};
