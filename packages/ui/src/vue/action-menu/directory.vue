<script setup lang="ts">
import { computed, ref, useId } from "vue";
import type { QuireKitActionDirectoryProps as Props, QuireKitActionDirectorySlots } from "../../components/action-menu/types";
import QuireInput from "../input/input.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { groupActionMenu } from "./path";
import { filterActionDirectory } from "./search";
const props = withDefaults(defineProps<Props>(), { layout: "list", searchable: false, busy: false, query: undefined });
const emit = defineEmits<{ /** Executes no business work. */ activate: [value: string]; /** Complete query value, including IME input. */ "update:query": [query: string] }>();
defineSlots<QuireKitActionDirectorySlots>();
const text = useQuireKitMessages("actionMenu"), id = useId(), localQuery = ref("");
const query = computed(() => props.query ?? localQuery.value);
const groups = computed(() => groupActionMenu(filterActionDirectory(props.actions, query.value, props.filter)));
/** @param value - Full input value; never a keypress fragment. */
function input(value: string): void { localQuery.value = value; emit("update:query", value); }
/** @param value - Enabled action identity from the current live collection. */
function activate(value: string): void { if (!props.busy && props.actions.some(action => action.value === value && !action.disabled)) emit("activate", value); }
</script>
<template>
  <div class="qk-action-directory" :aria-busy="busy || undefined">
    <div v-if="searchable" class="qk-action-directory__search"><label class="qk-action-directory__search-label" :for="`${id}-search`">{{ text.search }}</label>
      <QuireInput :id="`${id}-search`" type="search" size="md" width="100%" autocomplete="off" :placeholder="searchPlaceholder ?? text.searchPlaceholder" :model-value="query" :read-only="busy" @update:model-value="input"><template #leading><QuireIcon name="search" :size="16" /></template></QuireInput>
    </div>
    <section v-for="(group, index) in groups" :key="index" class="qk-action-sheet__group" :aria-labelledby="group.label ? `${id}-group-${index}` : undefined">
      <h3 v-if="group.label" :id="`${id}-group-${index}`" class="qk-action-sheet__group-label">{{ group.label }}</h3>
      <div :class="['qk-action-directory__actions', layout === 'grid' && 'qk-action-directory__actions--grid']">
        <button v-for="action in group.actions" :key="action.value" type="button" class="qk-action-sheet__action" :data-action-value="action.value"
          :disabled="action.disabled" :data-danger="action.danger || undefined" :aria-disabled="busy || undefined" @click="activate(action.value)">
          <span v-if="action.icon || $slots.icon" class="qk-action-sheet__icon" aria-hidden="true"><slot name="icon" :action="action"><QuireIcon v-if="action.icon" :name="action.icon" :size="20" /></slot></span>
          <span class="qk-action-sheet__copy"><span class="qk-action-sheet__label">{{ action.label }}</span><span v-if="action.description" class="qk-action-sheet__description">{{ action.description }}</span></span>
          <svg v-if="action.kind === 'branch'" class="qk-menu__disclosure" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
    </section>
    <p v-if="!groups.length" class="qk-action-sheet__empty" role="status">{{ text.empty }}</p>
  </div>
</template>
<style scoped>
.qk-action-directory { display: grid; gap: var(--qk-space-surface-compact); }
.qk-action-directory__search { display: grid; }
.qk-action-directory__search-label { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.qk-action-directory__actions--grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-inline); }
.qk-action-directory__actions--grid > button { min-width: 0; min-height: 48px; border-radius: var(--qk-radius-control); background: var(--qk-color-surface-subtle); }
</style>
