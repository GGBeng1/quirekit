<script setup lang="ts">
import { QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import type { QuireKitControlSize } from "@quirekit/ui";
/** An explicit details entry remains available when data is read-only. */
interface Props {
  /** Stable record identity. */ readonly recordId: string;
  /** Human-readable record title. */ readonly title: string;
  /** Same control size as the row. */ readonly size?: QuireKitControlSize;
}
withDefaults(defineProps<Props>(), {size: "sm"});
const emit = defineEmits<{open: [id: string, trigger: HTMLElement]}>();
</script>
<template>
  <QuireIconButton :label="`查看记录：${title || '未命名'}`" :data-dv-detail-id="recordId" variant="ghost" :size="size" @click="emit('open', recordId, $event.currentTarget as HTMLElement)"><QuireIcon name="panelRightOpen" /></QuireIconButton>
</template>
