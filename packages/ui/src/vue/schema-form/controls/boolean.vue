<script setup lang="ts">
import { Checkbox } from "@ark-ui/vue/checkbox";
import { Switch } from "@ark-ui/vue/switch";
import { computed, useAttrs } from "vue";
import QuireIcon from "../../icon/icon.vue";

defineOptions({ inheritAttrs: false });
/** Label-free boolean adapter: the enclosing QuireField owns the only label. */
interface Props {
  /** Boolean control family. */
  readonly kind?: "checkbox" | "switch";
  /** Controlled boolean value. */
  readonly modelValue?: boolean;
  /** Native field path. */
  readonly name?: string;
  /** Editing disablement. */
  readonly disabled?: boolean;
  /** Readable, focusable editing restriction. */
  readonly readOnly?: boolean;
  /** Required true value. */
  readonly required?: boolean;
  /** Field validation failure. */
  readonly invalid?: boolean;
}
const props = withDefaults(defineProps<Props>(), { kind: "checkbox", modelValue: false });
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const attrs = useAttrs();
const inputAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key === "id" || key.startsWith("aria-"))));
const rootProps = computed(() => ({
  ...(props.name === undefined ? {} : { name: props.name }),
  checked: props.modelValue, disabled: props.disabled, readOnly: props.readOnly,
  required: props.required, invalid: props.invalid
}));
</script>

<template>
  <Checkbox.Root v-if="kind === 'checkbox'" v-bind="rootProps"
    class="qk-checkbox qk-checkbox--sm" @update:checked="emit('update:modelValue', $event === true)">
    <Checkbox.HiddenInput v-bind="inputAttrs" />
    <Checkbox.Control class="qk-checkbox__control qk-checkbox__control--sm">
      <Checkbox.Indicator class="qk-checkbox__indicator"><QuireIcon name="check" :size="12" /></Checkbox.Indicator>
    </Checkbox.Control>
  </Checkbox.Root>
  <Switch.Root v-else v-bind="rootProps" class="qk-switch qk-switch--sm"
    @update:checked="emit('update:modelValue', $event)">
    <Switch.HiddenInput v-bind="inputAttrs" role="switch" />
    <Switch.Control class="qk-switch__control qk-switch__control--sm">
      <Switch.Thumb class="qk-switch__thumb qk-switch__thumb--sm" />
    </Switch.Control>
  </Switch.Root>
</template>
