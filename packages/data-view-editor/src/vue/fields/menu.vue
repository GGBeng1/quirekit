<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { QuireMenu, QuireButton, QuireIcon } from "@quirekit/ui/vue";
import type { QuireKitControlSize, QuireKitMenuEntry } from "@quirekit/ui";
import type { DataField, DataTableView, DataSummary } from "@quirekit/data-view";
import { fieldIcon } from "../shared/presentation";
/** Header commands operate on the current view or explicitly open schema editing. */
interface Props {
  /** Current schema. */ readonly field: DataField;
  /** Current table settings. */ readonly view: DataTableView;
  /** Authoring permission. */ readonly readOnly: boolean;
  /** Host commit pending. */ readonly busy?: boolean;
  /** Whether the underlying schema is editable. */ readonly canEdit?: boolean;
  /** Shared header and cell control size. */ readonly size?: QuireKitControlSize;
}
const props = withDefaults(defineProps<Props>(), {canEdit: true, size: "sm"});
const emit = defineEmits<{edit: [id: string, trigger: HTMLElement]; change: [view: DataTableView]}>();
const root = shallowRef<HTMLElement | null>(null);
const sort = computed(() => props.view.query.sort.find(item => item.fieldId === props.field.id));
const items = computed<readonly QuireKitMenuEntry[]>(() => [
  {value: "edit", label: "编辑字段", icon: "edit", disabled: props.canEdit === false},
  ...(props.field.type !== "multiSelect" ? [{value: "asc", label: "升序排列", icon: "arrowUp"}, {value: "desc", label: "降序排列", icon: "arrowDown"}] : []),
  ...(sort.value ? [{value: "unsort", label: "取消此列排序"}] : []),
  {value: "hide", label: "隐藏字段", icon: "eyeOff"},
  {value: "summary", label: "列统计", kind: "submenu", children: [{value: "summary-kind", label: "", kind: "radio-group", selectedValue: props.view.summaries?.[props.field.id] ?? "none", children: [
    {value: "none", label: "不显示统计"}, {value: "count", label: "非空计数"},
    ...(props.field.type === "number" ? [{value: "sum", label: "求和"}, {value: "average", label: "平均值"}] : [])
  ]}]}
]);
/** @param value - Header action or compatible summary kind. */
function select(value: string): void {
  if (props.readOnly || props.busy) return;
  if (value === "edit") {
    const trigger = root.value?.querySelector<HTMLElement>("[data-dv-field-entry]");
    if (props.canEdit && trigger) emit("edit", props.field.id, trigger);
    return;
  }
  if (value === "hide") { emit("change", {...props.view, visibleFieldIds: props.view.visibleFieldIds.filter(id => id !== props.field.id)}); return; }
  if (["asc", "desc", "unsort"].includes(value)) {
    const rest = props.view.query.sort.filter(item => item.fieldId !== props.field.id);
    emit("change", {...props.view, query: {...props.view.query, sort: value === "unsort" ? rest : [{fieldId: props.field.id, direction: value as "asc" | "desc", nulls: "last"}, ...rest]}}); return;
  }
  const summaries = {...props.view.summaries};
  if (value === "none") delete summaries[props.field.id]; else summaries[props.field.id] = value as DataSummary;
  emit("change", {...props.view, summaries});
}
</script>
<template>
  <span ref="root" class="dv-field-entry">
  <span v-if="readOnly" class="dv-field-heading dv-field-static"><QuireIcon :name="fieldIcon(field)" :size="16" />{{ field.name }}</span>
  <QuireMenu v-else :items="items" :aria-label="`字段菜单：${field.name}`" @select="select">
    <template #trigger>
      <QuireButton data-dv-field-entry variant="ghost" :size="size" :disabled="busy" class="dv-field-trigger" :aria-label="`字段菜单：${field.name}`">
        <template #leading><QuireIcon :name="fieldIcon(field)" /></template>
        <span class="dv-field-name">{{ field.name }}</span>
        <template #trailing><QuireIcon :name="sort ? sort.direction === 'asc' ? 'arrowUp' : 'arrowDown' : 'chevronDown'" /></template>
      </QuireButton>
    </template>
  </QuireMenu>
  </span>
</template>
