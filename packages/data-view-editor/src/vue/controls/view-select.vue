<script setup lang="ts">
import { computed } from "vue";
import { QuireSelect } from "@quirekit/ui/vue";
import type { DataView } from "@quirekit/data-view";

const props = defineProps<{
  /** Authored views, including their stable identities and names. */
  readonly views: readonly DataView[];
  /** Currently displayed view identity. */
  readonly modelValue: string;
  /** Prevents switching while a host write is outstanding. */
  readonly busy: boolean;
}>();
const emit = defineEmits<{change: [id: string]}>();
const items = computed(() => props.views.map(view => ({value: view.id, label: view.name})));

/** @param id - Completed selection from the public control. */
function select(id: string | undefined): void {
  if (id && !props.busy && id !== props.modelValue && props.views.some(view => view.id === id)) emit("change", id);
}
</script>
<template>
  <div class="dv-view-select">
    <QuireSelect :model-value="modelValue" :items="items" label="切换视图" variant="outline" width="100%" content-width="220px" :disabled="busy" @value-change="select" />
  </div>
</template>
