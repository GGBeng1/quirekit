<script setup lang="ts">
import { computed } from "vue";
import { QuireDrawerContent, QuireDrawerRoot } from "@quirekit/ui/vue";
import type { DataOperation, DataSet } from "@quirekit/data-view";
import Cell from "../cell/surface.vue";
/** All fields of one canonical record, independent of current view visibility. */
interface Props {
  /** Complete authoritative snapshot. */ readonly data: DataSet;
  /** Exact target, absent when closed. */ readonly recordId: string | null;
  /** Record write permission. */ readonly readOnly: boolean;
  /** Pending acknowledgement. */ readonly busy?: boolean;
  /** Validation or host rejection visible within the current modal task. */ readonly error?: string;
  /** @returns Surviving details entry. */ readonly returnFocus: () => HTMLElement | null;
}
const props = defineProps<Props>();
const emit = defineEmits<{close: []; apply: [operations: readonly DataOperation[]]; error: [message: string]; history: [event: KeyboardEvent]}>();
const record = computed(() => props.recordId === null ? undefined : props.data.records.find(record => record.id === props.recordId));
const title = computed(() => String(record.value?.values[props.data.primaryFieldId] ?? "") || "未命名记录");
</script>
<template>
  <QuireDrawerRoot :open="Boolean(record)" side="end" :drag-enabled="false" :close-on-escape="!busy" :close-on-interact-outside="false" :final-focus-el="returnFocus" lazy-mount unmount-on-exit @update:open="!$event && emit('close')">
    <QuireDrawerContent :title="title" :description="`全部 ${data.fields.length} 个字段 · ${readOnly ? '只读' : '修改同步到当前数据'}`" :show-close="!busy" size="medium">
      <div v-if="record" class="dv-workspace dv-record-details" data-qk-not-prose @keydown="emit('history', $event)">
        <p v-if="error" class="dv-error" role="alert">{{ error }}</p>
        <dl class="dv-record-fields"><div v-for="field in data.fields" :key="field.id" class="dv-record-field"><dt>{{ field.name }}</dt><dd><Cell :field="field" :value="record.values[field.id]!" :primary="field.id === data.primaryFieldId" :read-only="readOnly" :disabled="busy" multiline @change="emit('apply', [{type: 'set-cell', recordId: record.id, fieldId: field.id, value: $event}])" @error="emit('error', $event)" /></dd></div></dl>
      </div>
    </QuireDrawerContent>
  </QuireDrawerRoot>
</template>
