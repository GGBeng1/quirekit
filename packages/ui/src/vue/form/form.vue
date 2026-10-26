<script setup lang="ts">
import { inject, provide, reactive, ref } from "vue";
import { quireFormKey } from "./context";
import { useFormController } from "./use-controller";
import type { QuireKitFormEmits, QuireKitFormProps, QuireKitFormSlotProps } from "./types";

const props = withDefaults(defineProps<QuireKitFormProps>(), { focusOnError: true });
const emit = defineEmits<QuireKitFormEmits>();
defineSlots<{
  /** Fields and custom content with unwrapped form state. */
  default?: (form: QuireKitFormSlotProps) => unknown;
  /** Optional save/reset actions sharing the same native form. */
  actions?: (form: QuireKitFormSlotProps) => unknown;
  /** Replaces the request failure text inside the alert. */
  error?: (form: QuireKitFormSlotProps) => unknown;
}>();
if (inject(quireFormKey, undefined)) throw new Error("QuireForm cannot be nested. Use QuireFieldset for groups.");
const root = ref<HTMLFormElement>();
const form = useFormController(props, root, (event, payload) => {
  if (event === "reset") emit("reset");
  else if (event === "error") emit("error", payload);
  else if (event === "success") emit("success", payload as QuireKitFormSlotProps["values"]);
  else emit("invalidSubmit", payload as Record<string, string | undefined>);
});
provide(quireFormKey, form);
const state = reactive(form);
defineExpose(form);
</script>

<template>
  <form ref="root" class="qk-form" novalidate :aria-busy="state.isSubmitting || undefined"
    @submit="form.submit" @reset.prevent="form.resetForm()">
    <slot v-bind="state" />
    <div v-if="state.submitError" class="qk-form__error" role="alert">
      <slot name="error" v-bind="state">{{ state.submitError }}</slot>
    </div>
    <div v-if="$slots.actions" class="qk-form__actions"><slot name="actions" v-bind="state" /></div>
  </form>
</template>
