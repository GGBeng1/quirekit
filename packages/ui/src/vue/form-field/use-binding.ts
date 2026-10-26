import { computed, onBeforeUnmount, watch } from "vue";
import { useField } from "vee-validate";
import type { FieldContext } from "vee-validate";
import { useQuireForm } from "../form/context";
import { useFormLifecycle } from "../form/lifecycle";
import { useQuireKitMessages } from "../locale-provider/context";
import { readFormPath } from "./path";
import type { QuireKitFormRule } from "../form/types";
import type { QuireKitFormFieldProps } from "./types";

/** Registers a single path and layers interaction policy over VeeValidate.
 * @param props - Reactive field configuration.
 * @returns Registered state and guarded control actions.
 */
export function useFormFieldBinding(props: QuireKitFormFieldProps) {
  const form = useQuireForm();
  const lifecycle = useFormLifecycle();
  const text = useQuireKitMessages("formField");
  const disabled = computed(() => props.disabled || form.disabled.value);
  const readOnly = computed(() => props.readOnly || form.readOnly.value || form.isSubmitting.value);
  const timing = computed(() => props.validateOn ?? form.validateOn.value);
  let epoch = 0;
  let suppress = false;
  let release: (() => void) | undefined;
  let field!: FieldContext<unknown>;
  watch(() => props.name, name => {
    release?.();
    release = lifecycle.register(name);
    epoch++;
  }, { immediate: true, flush: "sync" });

  const validator = computed<QuireKitFormRule>(() => {
    const skip = disabled.value;
    const required = props.required;
    const requiredMessage = props.requiredMessage ?? text.value.required(props.label);
    const failure = text.value.validationFailed;
    const rules = props.rules ? (Array.isArray(props.rules) ? props.rules : [props.rules]) : [];
    return async (value, context) => {
      const generation = epoch;
      const cancelled = suppress;
      // Cancellation must settle a newer mutating VeeValidate run. Returning current
      // errors also keeps late silent runs from changing the new baseline's validity.
      if (cancelled) { await Promise.resolve(); return [...field.errors.value]; }
      if (skip) return true;
      if (required && (value == null || value === false || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length))) return requiredMessage;
      for (const rule of rules) {
        try {
          const result = await rule(value, context);
          if (generation !== epoch) return [...field.errors.value];
          if (result !== true && !(Array.isArray(result) && result.length === 0)) return result;
        } catch (error) {
          if (generation !== epoch) return [...field.errors.value];
          form.reportError(error);
          return failure;
        }
      }
      return true;
    };
  });
  field = useField(() => props.name, validator, {
    label: () => props.label, validateOnValueUpdate: false,
    keepValueOnUnmount: () => props.keepValueOnUnmount ?? true
  });

  /** Supersedes VeeValidate's mutating queue without evaluating old draft rules. */
  function cancelPending(): void {
    epoch++;
    suppress = true;
    void field.validate();
    suppress = false;
    field.meta.pending = false;
  }

  // Silent and mutating VeeValidate queues have separate latest-result guards.
  // A new value must explicitly supersede a pending mutating run, even in blur mode.
  watch(field.value, () => {
    epoch++;
    if (field.meta.pending) void field.validate();
  }, { deep: true, flush: "sync" });
  watch(validator, () => {
    epoch++;
    if (disabled.value) {
      field.setErrors([]);
      cancelPending();
    } else if (field.meta.touched || field.meta.validated) void field.validate();
  }, { flush: "sync" });
  watch(lifecycle.resetEpoch, () => {
    cancelPending();
    field.meta.validated = false;
  }, { flush: "sync" });
  onBeforeUnmount(() => { epoch++; release?.(); });

  /** Applies control changes without bypassing the form's edit lock.
   * @param value - Next model value from a custom or built-in control.
   */
  function setValue(value: unknown): void {
    if (disabled.value || readOnly.value) return;
    field.setValue(value, timing.value === "change" || field.meta.pending || field.errors.value.length > 0);
  }
  /** Applies blur policy at the whole control boundary. */
  function handleBlur(): void {
    if (disabled.value || form.isSubmitting.value) return;
    field.handleBlur(undefined, timing.value === "blur" || field.errors.value.length > 0);
  }
  // Invalidate dependencies inside the setter, before a same-tick submit can
  // begin its locked validation. A queued watcher would cancel that newer run.
  watch(() => (props.dependsOn ?? []).map(path => readFormPath(form.values, path)), () => {
    epoch++;
    if (!disabled.value && !form.isSubmitting.value && (field.meta.touched || field.meta.validated || field.errors.value.length)) void field.validate();
  }, { deep: true, flush: "sync" });
  return { field, disabled, readOnly, setValue, handleBlur };
}
