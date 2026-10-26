import { computed, nextTick, readonly, ref } from "vue";
import type { Ref } from "vue";
import { useForm } from "vee-validate";
import type { QuireKitFormContext, QuireKitFormProps, QuireKitFormValues } from "./types";
import { focusFormError } from "./focus";
import { provideFormLifecycle } from "./lifecycle";
import { useQuireKitMessages } from "../locale-provider/context";

/** Creates the sole values authority and wraps its submission/reset lifecycle.
 * @param props - Reactive form options.
 * @param root - Owning native form element.
 * @param emit - Public lifecycle notification callback.
 * @returns Form context with guarded submission and reset operations.
 */
export function useFormController(
  props: QuireKitFormProps,
  root: Ref<HTMLFormElement | undefined>,
  emit: (event: "error" | "success" | "invalidSubmit" | "reset", payload?: unknown) => void
): QuireKitFormContext {
  const lifecycle = provideFormLifecycle();
  const text = useQuireKitMessages("form");
  // Pass a plain initial object, never a ref: VeeValidate captures its own deep baseline.
  const form = useForm<QuireKitFormValues>({
    initialValues: props.initialValues ?? {},
    keepValuesOnUnmount: true
  });
  const locked = ref(false);
  const submitError = ref<string>();

  /** Focuses after field feedback and busy restrictions have rendered.
   * @returns Completion of focus placement.
   */
  async function focusFirstError(): Promise<void> {
    await nextTick();
    focusFormError(root.value, form.errors.value);
  }

  /** Preserves the draft and publishes an unexpected failure.
   * @param error - Rejected save or validation operation.
   */
  function reportError(error: unknown): void {
    submitError.value = error instanceof Error ? error.message : typeof error === "string" ? error : text.value.submitFailed;
    emit("error", error);
  }

  const runSubmit = form.handleSubmit(async values => {
    await props.onSubmit?.(values, context);
    if (!Object.keys(form.errors.value).length) emit("success", values);
  }, result => { emit("invalidSubmit", result.errors); });

  /** Locks before the first await, covering validation and application persistence.
   * @param event - Optional native submit event.
   * @returns Completion after feedback and focus are restored.
   */
  async function submit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (locked.value || props.disabled) return;
    locked.value = true;
    submitError.value = undefined;
    try { await runSubmit(event); }
    catch (error) { reportError(error); }
    finally {
      locked.value = false;
      if (props.focusOnError !== false) await focusFirstError();
    }
  }

  const context: QuireKitFormContext = {
    values: form.values, errors: form.errors, meta: form.meta,
    isSubmitting: readonly(locked), isValidating: readonly(form.isValidating),
    submitCount: readonly(form.submitCount), submitError: readonly(submitError),
    disabled: computed(() => props.disabled ?? false), readOnly: computed(() => props.readOnly ?? false),
    validateOn: computed(() => props.validateOn ?? "blur"),
    /** Updates one path only outside a pending validation/save snapshot.
     * @param path - Nested path.
     * @param value - Next draft value.
     * @param shouldValidate - Whether to validate the updated field.
     * @returns Whether the write was accepted.
     */
    setFieldValue(path, value, shouldValidate) {
      if (locked.value) return false;
      form.setFieldValue(path, value, shouldValidate);
      return true;
    },
    /** Merges a values update outside a pending submit snapshot.
     * @param values - Draft values to merge.
     * @param shouldValidate - Whether to validate afterward.
     * @returns Whether the write was accepted.
     */
    setValues(values, shouldValidate) {
      if (locked.value) return false;
      form.setValues(values, shouldValidate);
      return true;
    },
    setErrors: form.setErrors, setFieldError: form.setFieldError,
    setFieldTouched: form.setFieldTouched,
    validate: form.validate,
    validateField: form.validateField,
    submit, focusFirstError, reportError,
    /** Restores the baseline only when no save can subsequently affect this draft.
     * @param state - Optional explicit new baseline and metadata.
     * @param options - VeeValidate reset merge/replace policy.
     * @returns Whether reset was accepted.
     */
    resetForm(state, options) {
      if (locked.value) return false;
      lifecycle.resetEpoch.value++;
      form.resetForm(state, options);
      submitError.value = undefined;
      emit("reset");
      return true;
    }
  };
  return context;
}
