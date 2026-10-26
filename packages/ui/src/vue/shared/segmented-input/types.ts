import type { DateInputDateValue, UseDateInputProps } from '@ark-ui/vue/date-input';

/** Internal Ark provider shared by date and time fields, with independent incomplete drafts. */
export interface SegmentedInputRootProps {
  /** Accepted complete value; an empty array represents an incomplete or empty field. */
  readonly modelValue: DateInputDateValue[];
  /** Stable anatomy identity supplied by the field. */
  readonly id?: string;
  /** Prevent all editing. */
  readonly disabled?: boolean;
  /** Preserve focus and reading without editing. */
  readonly readOnly?: boolean;
  /** Required-field semantics. */
  readonly required?: boolean;
  /** Validation state owned by the enclosing field. */
  readonly invalid?: boolean;
  /** Finest editable date or time segment. */
  readonly granularity?: UseDateInputProps['granularity'];
  /** Explicit date or time display formatter; Ark retains segment editing. */
  readonly formatter?: UseDateInputProps['formatter'];
  /** Zone used for formatting, independent of the public value. */
  readonly timeZone?: string;
  /** Reference date used to populate empty segment ranges. */
  readonly placeholderValue?: DateInputDateValue;
  /** Native serialized field name. */
  readonly name?: string;
  /** Associated native form. */
  readonly form?: string;
}
