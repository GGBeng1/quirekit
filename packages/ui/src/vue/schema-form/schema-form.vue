<script setup lang="ts">
import { computed, ref } from "vue";
import QuireForm from "../form/form.vue";
import SchemaFields from "./tree";
import type { QuireKitFormContext, QuireKitFormSlotProps } from "../form/types";
import type { QuireKitSchemaFormProps, QuireKitSchemaFormSlots } from "./types";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitSchemaFormProps>(), { focusOnError: true });
defineSlots<QuireKitSchemaFormSlots>();
const form = ref<QuireKitFormSlotProps>();
const formProps = computed(() => {
  const { fields: _fields, registry: _registry, ...options } = props;
  return options;
});
/** Submits through the underlying native form's lock and validation lifecycle.
 * @param event - Optional native submission event.
 * @returns Completion after save and feedback.
 */
async function submit(event?: Event): Promise<void> { await form.value?.submit(event); }
/** Resets the underlying form when its submission lock permits it.
 * @param state - Optional replacement baseline.
 * @param options - Reset merge/replace policy.
 * @returns Whether reset was accepted.
 */
function resetForm(...[state, options]: Parameters<QuireKitFormContext["resetForm"]>): boolean {
  return form.value?.resetForm(state, options) ?? false;
}
defineExpose({ form, submit, resetForm });
</script>

<template>
  <QuireForm ref="form" v-bind="{ ...$attrs, ...formProps }">
    <template #default="state">
      <SchemaFields :nodes="fields" :registry="registry ?? {}" :field-slots="$slots" />
      <slot v-bind="state" />
    </template>
    <template v-if="$slots.actions" #actions="state"><slot name="actions" v-bind="state" /></template>
    <template v-if="$slots.error" #error="state"><slot name="error" v-bind="state" /></template>
  </QuireForm>
</template>
