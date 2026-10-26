<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireButton, QuireInput, QuireSelect, QuireDateInput, QuireIcon } from "@quirekit/ui/vue";
import type { DataFilter, DataSet, DataView } from "@quirekit/data-view";
import { filterEntries, filterOperators, withFilterEntries } from "./model";
/** Builds one complete typed predicate before publishing to the document. */
interface Props {
  /** Canonical schema. */ readonly data: DataSet;
  /** Current complete view. */ readonly view: DataView;
  /** Permission and busy boundary. */ readonly readOnly: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{change: [view: DataView]}>();
const fieldId = ref(props.data.primaryFieldId), op = ref("contains"), value = ref(""), error = ref("");
const field = computed(() => props.data.fields.find(field => field.id === fieldId.value) ?? props.data.fields[0]!);
const operators = computed(() => filterOperators(field.value));
const fields = computed(() => props.data.fields.map(field => ({value: field.id, label: field.name})));
const choices = computed(() => "options" in field.value ? field.value.options.map(option => ({value: option.id, label: option.label})) : [{value: "true", label: "是"}, {value: "false", label: "否"}]);
watch(() => field.value.id, () => { op.value = operators.value[0]!.value; value.value = ""; error.value = ""; });
/** Validates input without converting blank numeric text into zero. */
function add(): void {
  if (props.readOnly) return;
  error.value = "";
  const operation = op.value as Exclude<DataFilter, {all: unknown} | {any: unknown}>["op"];
  let rule: DataFilter;
  if (operation === "isEmpty" || operation === "isNotEmpty") rule = {fieldId: field.value.id, op: operation};
  else {
    if (!value.value.trim()) { error.value = "请填写筛选值"; return; }
    const typed = field.value.type === "number" ? Number(value.value) : field.value.type === "boolean" ? value.value === "true" : value.value;
    if (typeof typed === "number" && !Number.isFinite(typed)) { error.value = "请输入有效数字"; return; }
    rule = {fieldId: field.value.id, op: operation, value: typed};
  }
  emit("change", {...props.view, query: withFilterEntries(props.view.query, [...filterEntries(props.view.query.filter), rule])});
}
</script>
<template>
  <form class="dv-filter-form" @submit.prevent="add">
    <strong>所有条件均满足</strong>
    <QuireSelect v-model="fieldId" label="筛选字段" :items="fields" :disabled="readOnly" :layer-offset="1" width="100%" />
    <QuireSelect v-model="op" label="筛选条件" :items="operators" :disabled="readOnly" :layer-offset="1" width="100%" />
    <template v-if="op !== 'isEmpty' && op !== 'isNotEmpty'">
      <QuireSelect v-if="'options' in field || field.type === 'boolean'" v-model="value" label="筛选值" :items="choices" :disabled="readOnly" :layer-offset="1" width="100%" />
      <QuireDateInput v-else-if="field.type === 'date'" label="筛选值" :model-value="value || null" :disabled="readOnly" @update:model-value="value = $event ?? ''" />
      <QuireInput v-else v-model="value" aria-label="筛选值" :placeholder="field.type === 'datetime' ? '2026-10-18T09:00:00+08:00' : '输入筛选值'" :disabled="readOnly" width="100%" />
    </template>
    <p v-if="error" class="dv-error" role="alert">{{ error }}</p>
    <QuireButton type="submit" variant="soft" color="primary" :disabled="readOnly"><template #leading><QuireIcon name="plus" /></template>添加条件</QuireButton>
  </form>
</template>
