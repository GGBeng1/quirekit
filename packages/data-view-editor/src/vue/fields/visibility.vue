<script setup lang="ts">
import { computed } from "vue";
import { QuireButton, QuireIconButton, QuireIcon, QuireCheckbox } from "@quirekit/ui/vue";
import type { DataSet, DataView } from "@quirekit/data-view";
import { fieldIcon } from "../shared/presentation";
/** View-local field order, independent of dataset schema order. */
interface Props {
  /** Complete source schema. */ readonly data: DataSet;
  /** Current visibility and order. */ readonly view: DataView;
  /** Disables mutations while preserving inspection. */ readonly readOnly: boolean;
  /** Source permission, independent from view editing. */ readonly canAdd?: boolean;
}
const props = withDefaults(defineProps<Props>(), {canAdd: true});
const emit = defineEmits<{change: [view: DataView]; add: []}>();
const fields = computed(() => [...props.view.visibleFieldIds.map(id => props.data.fields.find(field => field.id === id)!), ...props.data.fields.filter(field => !props.view.visibleFieldIds.includes(field.id))]);
/** @param id - Field identity. @param visible - Requested visibility. */
function toggle(id: string, visible: boolean): void {
  if (props.readOnly) return;
  emit("change", {...props.view, visibleFieldIds: visible ? [...props.view.visibleFieldIds, id] : props.view.visibleFieldIds.filter(value => value !== id)});
}
/** @param id - Visible field. @param direction - Adjacent display position. */
function move(id: string, direction: number): void {
  if (props.readOnly) return;
  const ids = [...props.view.visibleFieldIds], index = ids.indexOf(id), target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!]; emit("change", {...props.view, visibleFieldIds: ids});
}
</script>
<template>
  <div class="dv-field-list" aria-label="字段显示与顺序">
    <div v-for="field in fields" :key="field.id" class="dv-field-row">
      <QuireCheckbox :label="`显示${field.name}`" :checked="view.visibleFieldIds.includes(field.id)" :disabled="readOnly" @update:checked="toggle(field.id, $event === true)"><span class="dv-field-heading"><QuireIcon :name="fieldIcon(field)" :size="16" />{{ field.name }}</span></QuireCheckbox>
      <span class="dv-spacer" />
      <template v-if="view.visibleFieldIds.includes(field.id)">
        <QuireIconButton :label="`上移${field.name}`" variant="ghost" size="xs" :disabled="readOnly || view.visibleFieldIds.indexOf(field.id) === 0" @click="move(field.id, -1)"><QuireIcon name="arrowUp" /></QuireIconButton>
        <QuireIconButton :label="`下移${field.name}`" variant="ghost" size="xs" :disabled="readOnly || view.visibleFieldIds.indexOf(field.id) === view.visibleFieldIds.length - 1" @click="move(field.id, 1)"><QuireIcon name="arrowDown" /></QuireIconButton>
      </template>
    </div>
    <QuireButton v-if="!readOnly && canAdd !== false" variant="ghost" class="dv-add-field" @click="emit('add')"><template #leading><QuireIcon name="plus" /></template>添加字段</QuireButton>
  </div>
</template>
