import type { ComputedRef, Ref, UnwrapNestedRefs } from "vue";
import type { FormContext, FormMeta, FormState, FormValidationResult, GenericValidateFunction, ResetFormOpts } from "vee-validate";

/** Form-owned values, including nested object and array paths. */
export type QuireKitFormValues = Record<string, unknown>;
/** Sync or async field validation, with VeeValidate's cross-field context. */
export type QuireKitFormRule = GenericValidateFunction;
/** Consumer save operation, awaited by the submission lock. */
export type QuireKitFormSubmitHandler = (values: QuireKitFormValues, form: QuireKitFormContext) => unknown | Promise<unknown>;
/** Field validation trigger; errors are rechecked on change after they are shown. */
export type QuireKitFormValidateOn = "blur" | "change" | "submit";

/** Public native form inputs. */
export interface QuireKitFormProps {
  /** Initial/reset baseline, captured once; load another record with resetForm. */
  readonly initialValues?: QuireKitFormValues | undefined;
  /** Awaited application save handler. */
  readonly onSubmit?: QuireKitFormSubmitHandler | undefined;
  /** Disable editing and submission. */
  readonly disabled?: boolean | undefined;
  /** Preserve focus/selection while disallowing field edits. */
  readonly readOnly?: boolean | undefined;
  /** Default field validation timing. */
  readonly validateOn?: QuireKitFormValidateOn | undefined;
  /** Focus the first mounted actionable error after failed submission. */
  readonly focusOnError?: boolean | undefined;
}

/** Existing form authority injected into descendants; no second values store. */
export interface QuireKitFormContext {
  /** Read-only live values; use the setter methods to edit them. */
  readonly values: QuireKitFormValues;
  /** First error for each registered or server-reported path. */
  readonly errors: FormContext<QuireKitFormValues>["errors"];
  /** Aggregated dirty, touched, validity and pending state. */
  readonly meta: ComputedRef<FormMeta<QuireKitFormValues>>;
  /** Lock spanning validation and application save. */
  readonly isSubmitting: Readonly<Ref<boolean>>;
  /** Whole-form validation activity. */
  readonly isValidating: Readonly<Ref<boolean>>;
  /** Number of accepted submit attempts since reset. */
  readonly submitCount: Readonly<Ref<number>>;
  /** Recoverable request/validator failure message. */
  readonly submitError: Readonly<Ref<string | undefined>>;
  /** Explicit editing/submission disablement. */
  readonly disabled: ComputedRef<boolean>;
  /** Explicit editing restriction. */
  readonly readOnly: ComputedRef<boolean>;
  /** Default validation timing. */
  readonly validateOn: ComputedRef<QuireKitFormValidateOn>;
  /** Set a nested value using VeeValidate's path semantics. */
  readonly setFieldValue: (path: string, value: unknown, shouldValidate?: boolean) => boolean;
  /** Merge a set of values into the draft. */
  readonly setValues: (values: QuireKitFormValues, shouldValidate?: boolean) => boolean;
  /** Attach server errors without erasing the draft. */
  readonly setErrors: FormContext<QuireKitFormValues>["setErrors"];
  /** Set or clear a single field error. */
  readonly setFieldError: FormContext<QuireKitFormValues>["setFieldError"];
  /** Set interaction state for one path. */
  readonly setFieldTouched: FormContext<QuireKitFormValues>["setFieldTouched"];
  /** Validate the complete form. */
  readonly validate: () => Promise<FormValidationResult<QuireKitFormValues>>;
  /** Validate one path. */
  readonly validateField: FormContext<QuireKitFormValues>["validateField"];
  /** Validate and await save; repeat calls during the lock are ignored. */
  readonly submit: (event?: Event) => Promise<void>;
  /** Reset baseline and metadata; returns false while submitting. */
  readonly resetForm: (state?: Partial<FormState<QuireKitFormValues>>, options?: Partial<ResetFormOpts>) => boolean;
  /** Focus the first available field error in DOM order. */
  readonly focusFirstError: () => Promise<void>;
  /** Surface an unexpected asynchronous failure and emit error. */
  readonly reportError: (error: unknown) => void;
}

/** Automatically unwrapped state exposed to Vue slots and template refs. */
export type QuireKitFormSlotProps = UnwrapNestedRefs<QuireKitFormContext>;
/** Lifecycle events shared by handwritten and generated forms. */
export interface QuireKitFormEmits {
  /** Validation prevented application submission. */
  invalidSubmit: [errors: Record<string, string | undefined>];
  /** Application save resolved without field errors. */
  success: [values: QuireKitFormValues];
  /** Unexpected validator or save failure. */
  error: [error: unknown];
  /** A permitted reset completed. */
  reset: [];
}

/** Internal lifecycle seam; it owns generations and identities, never values. */
export interface QuireKitFormLifecycle {
  /** Reset invalidates pending field validation without creating a new form. */
  readonly resetEpoch: Ref<number>;
  /** Registers one path owner and returns its unregistration callback. */
  readonly register: (name: string) => () => void;
}
