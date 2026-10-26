import type { FieldMeta } from "vee-validate";
import type { QuireKitFieldControlProps, QuireKitFieldStatus } from "../../components/field";
import type { QuireKitFormRule, QuireKitFormValidateOn } from "../form/types";

/** Registered field options; visual state remains owned by QuireField. */
export interface QuireKitFormFieldProps {
  /** VeeValidate path, including nested objects and array indices. */
  readonly name: string;
  /** Visible, accessible field label. */
  readonly label: string;
  /** Optional stable field id. */
  readonly id?: string | undefined;
  /** Help text displayed without errors. */
  readonly description?: string | undefined;
  /** Reason an explicitly disabled field cannot be edited. */
  readonly disabledReason?: string | undefined;
  /** Width of the field; defaults to its container width. */
  readonly width?: string | number | undefined;
  /** Enforce a nonempty value, including true for required booleans. */
  readonly required?: boolean | undefined;
  /** Field-specific required feedback; defaults to the language pack's message naming the label. */
  readonly requiredMessage?: string | undefined;
  /** Function rules evaluated sequentially, stopping on the first error. */
  readonly rules?: QuireKitFormRule | readonly QuireKitFormRule[] | undefined;
  /** Explicit dependencies revalidated after interaction. */
  readonly dependsOn?: readonly string[] | undefined;
  /** Override form-level validation timing. */
  readonly validateOn?: QuireKitFormValidateOn | undefined;
  /** Skip field-level validation and editing. */
  readonly disabled?: boolean | undefined;
  /** Prevent editing while continuing to validate. */
  readonly readOnly?: boolean | undefined;
  /** Preserve draft on unmount; true by default. */
  readonly keepValueOnUnmount?: boolean | undefined;
}

/** Bindings for a standard modelValue/update:modelValue Vue control. */
export interface QuireKitFormControlProps extends QuireKitFieldControlProps {
  /** Normalized required state for strict Vue component bindings. */
  readonly required: boolean;
  /** Normalized disabled state for strict Vue component bindings. */
  readonly disabled: boolean;
  /** Normalized readonly state, including the form submission lock. */
  readonly readOnly: boolean;
  /** Native field path. */
  readonly name: string;
  /** Controlled value, owned by VeeValidate. */
  readonly modelValue: unknown;
  /** Controlled update listener. */
  readonly "onUpdate:modelValue": (value: unknown) => void;
}

/** Custom control slot preserving the field registration and feedback contract. */
export interface QuireKitFormFieldSlotProps {
  /** Complete standard Vue control binding. */
  readonly controlProps: QuireKitFormControlProps;
  /** Current field value. */
  readonly value: unknown;
  /** Guarded update function for custom control models. */
  readonly setValue: (value: unknown) => void;
  /** Marks interaction and applies the configured blur policy. */
  readonly handleBlur: () => void;
  /** Explicitly validates the field. */
  readonly validate: () => Promise<unknown>;
  /** Live VeeValidate interaction/validation metadata. */
  readonly meta: FieldMeta<unknown>;
  /** Current first error. */
  readonly errorMessage: string | undefined;
  /** QuireField's single feedback lane status. */
  readonly status: QuireKitFieldStatus | undefined;
}

/** Feedback slots only expose actual value, metadata, error and visual status. */
export type QuireKitFormFieldFeedbackSlotProps = Pick<QuireKitFormFieldSlotProps, "value" | "meta" | "errorMessage" | "status">;
