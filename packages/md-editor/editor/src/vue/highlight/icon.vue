<script setup lang="ts">
import { ref } from "vue";
import { QuireButton, QuireEmojiPicker, QuirePopoverContent, QuirePopoverRoot, QuirePopoverTrigger } from "@quirekit/ui/vue";
import type { QuireKitEmojiItem } from "@quirekit/ui";
import type { MdHighlightIconProps } from "../../highlight/types";
import { useMdOverlayTarget } from "../overlays/context";
const props = defineProps<{ /** Current guarded icon action. */ view: MdHighlightIconProps }>();
const portal = useMdOverlayTarget();
const open = ref(false);
/** @param item - Picked emoji; the source command rejects a moved or retyped container. */
function choose(item: QuireKitEmojiItem): void {
  if (props.view.change(item.value)) open.value = false;
}
</script>
<template>
  <span v-if="!view.editable" class="qk-prose-highlight-icon" role="img" :aria-label="view.label">{{ view.emoji }}</span>
  <QuirePopoverRoot v-else v-model:open="open" placement="bottom-start">
    <QuirePopoverTrigger as-child>
      <QuireButton size="xs" variant="ghost" color="neutral" class="qk-prose-highlight-icon" :aria-label="view.label" data-qk-not-prose data-md-highlight-icon>{{ view.emoji }}</QuireButton>
    </QuirePopoverTrigger>
    <QuirePopoverContent v-if="open" :portal-target="portal ?? 'body'" width="auto" padding="none" :show-arrow="false" :aria-label="view.label">
      <QuireEmojiPicker autofocus @select="choose" />
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
