<script setup lang="ts">
import ToolbarTooltip from "./tooltip.vue";

/** Composition shell for a single existing public form control in a Toolbar. */
interface Props {
  /** Accessible field name and default Tooltip explanation. */
  readonly label: string;
  /** Override the explanation; false delegates it to another compound owner. */
  readonly tooltip?: string | false | undefined;
  /** Explanation displayed while the field is unavailable. */
  readonly disabledReason?: string;
  /** Current field availability; also bind disabled to the slotted public field. */
  readonly disabled?: boolean;
  /** Optional intrinsic CSS width for the field, preserved during overflow. */
  readonly width?: string;
  /** Whether the field's interactive popup is open. */
  readonly expanded?: boolean;
}
withDefaults(defineProps<Props>(), { tooltip: undefined });
defineOptions({ inheritAttrs: false });
defineSlots<{
  /** Existing Input, Select or Combobox; bind size to keep its public geometry aligned. */
  default: (scope: { readonly size: "sm" }) => unknown;
}>();
</script>

<template>
  <ToolbarTooltip :label="label" :tooltip="tooltip" :disabled-reason="disabledReason"
    :subject-disabled="disabled ?? false" :suppressed="expanded ?? false">
    <div v-bind="$attrs" class="qk-toolbar__field" :style="width === undefined ? undefined : { width }">
      <slot size="sm" />
    </div>
  </ToolbarTooltip>
</template>
