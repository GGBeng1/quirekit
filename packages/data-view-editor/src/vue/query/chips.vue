<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from "vue";
import { QuireTag } from "@quirekit/ui/vue";
import type { DataSet, DataView } from "@quirekit/data-view";
import { filterDescription, filterEntries, withFilterEntries } from "./model";
/** Visible predicates remain inspectable while their authoring popover is closed. */
interface Props {
  /** Canonical fields. */ readonly data: DataSet;
  /** Current full filter expression. */ readonly view: DataView;
  /** Permission and busy boundary. */ readonly readOnly: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{change: [view: DataView]}>();
const rules = computed(() => filterEntries(props.view.query.filter));
const root = shallowRef<HTMLElement | null>(null);
let focusTarget: HTMLElement | null = null;
/** Returns keyboard focus after the host accepts or rejects a chip removal. */
function restoreFocus(): void {
  void nextTick(() => {
    if (props.readOnly || !focusTarget) return;
    if (focusTarget.isConnected) focusTarget.focus();
    focusTarget = null;
  });
}
watch(() => props.readOnly, locked => { if (!locked) restoreFocus(); });
/** @param index - Explicitly removed whole top-level condition. */
function remove(index: number): void {
  if (props.readOnly) return;
  focusTarget = root.value?.closest(".dv-workspace")?.querySelector<HTMLElement>("[data-dv-filter-trigger]") ?? null;
  emit("change", {...props.view, query: withFilterEntries(props.view.query, rules.value.filter((_, i) => i !== index))});
  restoreFocus();
}
</script>
<template><div v-if="rules.length" ref="root" class="dv-filter-chips" aria-label="当前筛选条件"><span>筛选</span><QuireTag v-for="(rule, index) in rules" :key="JSON.stringify(rule) + index" color="primary" variant="soft" :closable="!readOnly" :label="filterDescription(rule, data.fields)" @close="remove(index)">{{ filterDescription(rule, data.fields) }}</QuireTag></div></template>
