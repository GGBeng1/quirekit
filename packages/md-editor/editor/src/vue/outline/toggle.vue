<script setup lang="ts">
import { QuireIcon, QuireIconButton, QuirePopoverContent, QuirePopoverRoot, QuirePopoverTrigger } from "@quirekit/ui/vue";
import type { MdOutlineTree } from "../../outline";
import OutlinePanel from "./panel.vue";

/** Collapsed outline control, shown beside the document or inside the fixed toolbar. */
interface Props {
  /** Whether there is room to pin the outline again; otherwise the control opens a popover. */
  readonly pinnable: boolean;
  /** Popover side, following the outline position. */
  readonly placement: "bottom-start" | "bottom-end";
  /** Heading tree. */
  readonly tree: MdOutlineTree;
  /** Heading at the reading line. */
  readonly active: string | undefined;
  /** Localized labels. */
  readonly labels: { readonly outline: string; readonly expand: string; readonly empty: string };
}

defineProps<Props>();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{
  /** Pin the outline beside the document again. */ expand: [];
  /** A heading was chosen in the popover. */ navigate: [id: string];
}>();
</script>

<template>
  <QuireIconButton v-if="pinnable" :label="labels.expand" size="sm" variant="ghost" @click="emit('expand')">
    <QuireIcon name="tableOfContents" :size="16" />
  </QuireIconButton>
  <QuirePopoverRoot v-else v-model:open="open" :placement="placement" :restore-focus="false">
    <QuirePopoverTrigger as-child>
      <QuireIconButton :label="labels.outline" :aria-expanded="open" size="sm" variant="ghost"><QuireIcon name="tableOfContents" :size="16" /></QuireIconButton>
    </QuirePopoverTrigger>
    <QuirePopoverContent v-if="open" width="min(280px, calc(100vw - 32px))" padding="none" :show-arrow="false" :aria-label="labels.outline">
      <OutlinePanel class="md-editor__outline-popover" :tree="tree" :active="active" :label="labels.outline" :empty="labels.empty" @navigate="emit('navigate', $event)" />
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>

<style scoped>
.md-editor__outline-popover { max-height: min(60vh, 480px); padding: 4px; }
</style>
