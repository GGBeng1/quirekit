<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { QuireButton, QuireIcon, QuireMenu, QuirePopoverRoot, QuirePopoverTrigger, QuirePopoverContent, QuireSelect } from "@quirekit/ui/vue";
import type { DataSet, DataView } from "@quirekit/data-view";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import Filters from "./filters.vue";
import Visibility from "../fields/visibility.vue";
import Appearance from "../controls/appearance.vue";
/** Compact view configuration shared by inline and modal workspaces. */
interface Props {
  /** Complete source schema. */ readonly data: DataSet;
  /** Current authored projection. */ readonly view: DataView;
  /** Permission and busy boundary. */ readonly readOnly: boolean;
  /** Independent record/schema permission for external snapshots. */ readonly canEditFields?: boolean;
}
const props = withDefaults(defineProps<Props>(), {canEditFields: true});
const emit = defineEmits<{change: [view: DataView]; field: [id: string, trigger: HTMLElement]}>();
const fieldsOpen = ref(false);
const root = shallowRef<HTMLElement | null>(null);
const groups = computed(() => props.data.fields.filter(field => field.type === "singleSelect").map(field => ({value: field.id, label: field.name})));
const sorts = computed<readonly QuireKitMenuEntry[]>(() => [
  ...props.data.fields.filter(field => field.type !== "multiSelect").map(field => ({value: field.id, label: field.name, kind: "submenu" as const, children: [
    {value: `asc:${field.id}`, label: "升序", icon: "arrowUp"}, {value: `desc:${field.id}`, label: "降序", icon: "arrowDown"}
  ]})),
  {value: "clear", label: "恢复默认排序", disabled: !props.view.query.sort.length}
]);
/** @param value - One-column sort or an explicit reset. */
function sort(value: string): void {
  if (props.readOnly) return;
  const direction = value.startsWith("asc:") ? "asc" : "desc";
  emit("change", {...props.view, query: {...props.view.query, sort: value === "clear" ? [] : [{fieldId: value.slice(direction.length + 1), direction, nulls: "last"}]}});
}
/** Opens schema editing after closing its navigation popover. */
function addField(): void {
  if (props.readOnly || !props.canEditFields) return;
  const trigger = root.value?.querySelector<HTMLElement>("[data-dv-fields-trigger]");
  fieldsOpen.value = false;
  if (trigger) emit("field", "", trigger);
}
/** @param id - New grouping field; collapse references belong to the previous field. */
function group(id: string | undefined): void {
  if (id && !props.readOnly && props.view.type === "board") emit("change", {...props.view, groupBy: id, collapsedGroups: []});
}
</script>
<template>
  <div ref="root" class="dv-view-tools">
    <QuirePopoverRoot><QuirePopoverTrigger as-child><QuireButton data-dv-filter-trigger variant="ghost" :color="view.query.filter ? 'primary' : 'neutral'"><template #leading><QuireIcon name="filter" /></template>筛选</QuireButton></QuirePopoverTrigger><QuirePopoverContent class="dv-popover" style="width: 280px"><Filters :data="data" :view="view" :read-only="readOnly" @change="emit('change', $event)" /></QuirePopoverContent></QuirePopoverRoot>
    <QuireMenu :items="sorts" aria-label="排序设置" @select="sort"><template #trigger><QuireButton variant="ghost" :color="view.query.sort.length ? 'primary' : 'neutral'" :disabled="readOnly"><template #leading><QuireIcon name="arrowUpDown" /></template>排序<template v-if="view.query.sort.length" #trailing><span class="dv-count">{{ view.query.sort.length }}</span></template></QuireButton></template></QuireMenu>
    <QuirePopoverRoot v-model:open="fieldsOpen"><QuirePopoverTrigger as-child><QuireButton data-dv-fields-trigger variant="ghost"><template #leading><QuireIcon name="columns" /></template>字段</QuireButton></QuirePopoverTrigger><QuirePopoverContent class="dv-popover" style="width: 320px"><Visibility :data="data" :view="view" :read-only="readOnly" :can-add="canEditFields !== false" @change="emit('change', $event)" @add="addField" /></QuirePopoverContent></QuirePopoverRoot>
    <Appearance :view="view" :read-only="readOnly" @change="emit('change', $event)" />
    <QuirePopoverRoot v-if="view.type === 'board'"><QuirePopoverTrigger as-child><QuireButton variant="ghost">分组</QuireButton></QuirePopoverTrigger><QuirePopoverContent class="dv-popover" style="width: 240px"><QuireSelect label="看板分组字段" :model-value="view.groupBy" :items="groups" :disabled="readOnly" :layer-offset="1" width="100%" @value-change="group" /></QuirePopoverContent></QuirePopoverRoot>
  </div>
</template>
