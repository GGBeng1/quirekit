<script setup lang="ts">
import { usePasswordInput, type UsePasswordInputProps } from "@ark-ui/vue/password-input";
import { computed, useAttrs } from "vue";
import type { QuireKitInputProps } from "../../components/input";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<Pick<QuireKitInputProps,
  "visibilityToggle" | "visible" | "defaultVisible" | "disabled" | "readOnly" | "required" | "invalid"
>>(), {
  visible: undefined
});
const text = useQuireKitMessages("input");
const emit = defineEmits<{
  /** Requests the next visible state from the owning Input. */
  "update:visible": [visible: boolean];
}>();
const attrs = useAttrs();
const password = usePasswordInput(computed<UsePasswordInputProps>(() => ({
  visible: props.visible,
  defaultVisible: props.defaultVisible,
  disabled: props.disabled,
  readOnly: props.readOnly,
  required: props.required,
  invalid: props.invalid,
  translations: { visibilityTrigger: (visible) => visible ? text.value.hidePassword : text.value.showPassword },
  ...(typeof attrs.id === "string" ? { ids: { input: attrs.id } } : {}),
  onVisibilityChange: ({ visible }) => emit("update:visible", visible)
})));
// Forward Ark's native attributes and handlers through the styled button adapter.
const triggerProps = computed<Record<string, unknown>>(() => ({ ...password.value.getVisibilityTriggerProps() }));
const fieldProps = computed(() => ({
  ...password.value.getInputProps(),
  ...attrs,
  // The host retains native form attributes; Ark owns only the displayed type.
  type: password.value.visible ? "text" : "password"
}));

/**
 * Enables keyboard and assistive activation alongside Ark's pointer trigger.
 * @param event - Button click; pointer clicks already toggled on pointerdown.
 */
function activateWithKeyboard(event: MouseEvent): void {
  if (event.detail === 0 && !props.disabled && !props.readOnly) password.value.toggleVisible();
}
</script>

<template>
  <input v-bind="fieldProps" />
  <QuireIconButton
    v-if="visibilityToggle"
    v-bind="triggerProps"
    :label="password.visible ? text.hidePassword : text.showPassword"
    :disabled="disabled || readOnly"
    :tabindex="0"
    size="xs"
    class="qk-input__action"
    @click="activateWithKeyboard"
  >
    <QuireIcon :name="password.visible ? 'eyeOff' : 'eye'" />
  </QuireIconButton>
</template>
