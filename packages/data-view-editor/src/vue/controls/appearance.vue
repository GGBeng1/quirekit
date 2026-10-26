<script setup lang="ts">
import { computed } from "vue";
import { QuireMenu, QuireButton, QuireIcon } from "@quirekit/ui/vue";
import type { DataTableDensity, DataView } from "@quirekit/data-view";
import type { QuireKitMenuEntry } from "@quirekit/ui";
/** Authored view appearance exposed through semantic component options. */
interface Props {
  /** Current view. */ readonly view: DataView;
  /** Current write permission. */ readonly readOnly: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{change: [view: DataView]}>();
const items = computed<readonly QuireKitMenuEntry[]>(() => props.view.type === "table" ? [
  {value: "density", label: "行高", kind: "radio-group", selectedValue: props.view.density ?? "standard", children: [
    {value: "compact", label: "紧凑"}, {value: "standard", label: "标准"}, {value: "comfortable", label: "宽松"}
  ]}
] : [{value: "labels", label: "显示字段名称", checked: props.view.showFieldNames !== false},
  {value: "expand", label: "展开全部分组", disabled: !props.view.collapsedGroups?.length}]);
/** @param value - Density or board appearance action. */
function change(value: string): void {
  if (props.readOnly) return;
  emit("change", props.view.type === "table" ? {...props.view, density: value as DataTableDensity} : value === "labels"
    ? {...props.view, showFieldNames: props.view.showFieldNames === false} : {...props.view, collapsedGroups: []});
}
</script>
<template>
  <QuireMenu :items="items" aria-label="视图外观" @select="change"><template #trigger><QuireButton variant="ghost" :disabled="readOnly"><template #leading><QuireIcon name="slidersHorizontal" /></template>外观</QuireButton></template></QuireMenu>
</template>
