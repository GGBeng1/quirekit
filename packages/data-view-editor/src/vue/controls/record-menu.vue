<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { QuireMenu, QuireIconButton, QuireIcon } from "@quirekit/ui/vue";
import type { QuireKitControlSize } from "@quirekit/ui";
import type { DataOperation, DataRecord } from "@quirekit/data-view";
/** One record's reversible actions, independent from its query position. */
interface Props {
  /** Current complete record. */ readonly record: DataRecord;
  /** Human-readable primary value. */ readonly title: string;
  /** Host acknowledgement in progress. */ readonly disabled?: boolean;
  /** Same size as the cells in the owning row. */ readonly size?: QuireKitControlSize;
}
const props = withDefaults(defineProps<Props>(), {size: "xs"});
const emit = defineEmits<{apply: [operations: readonly DataOperation[]]}>();
const items = [{value: "duplicate", label: "复制记录", icon: "copy"}, {value: "delete", label: "删除记录", icon: "trash", tone: "danger" as const}];
/** @param action - Action selected through the accessible menu. */
function select(action: string): void {
  if (props.disabled || action !== "delete" && action !== "duplicate") return;
  emit("apply", action === "delete" ? [{type: "delete-record", recordId: props.record.id}] : [{type: "insert-record", record: {
    id: uuidv4(), values: Object.fromEntries(Object.entries(props.record.values).map(([id, value]) => [id, Array.isArray(value) ? [...value] : value]))
  }}]);
}
</script>
<template>
  <QuireMenu :items="items" :aria-label="`记录操作：${title || '未命名'}`" @select="select"><template #trigger><QuireIconButton :label="`记录操作：${title || '未命名'}`" :data-dv-record-id="record.id" :disabled="disabled" variant="ghost" :size="size"><QuireIcon name="moreHorizontal" /></QuireIconButton></template></QuireMenu>
</template>
