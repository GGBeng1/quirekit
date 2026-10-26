<script setup lang="ts">
import { computed } from "vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import { useTextPanel } from "../text-panel/use";
import { EditorUIUnderlineGallery as Gallery } from "@quirekit/editor-ui/vue";
const props = defineProps<{
  /** The public Toolbar popup execution and current document context. */
  scope: QuireKitToolbarRendererScope;
}>();
const { context, disabled, value } = useTextPanel(() => (props.scope.context as ClassicEditorToolbarContributionState).context);
const selected = computed(() => {
  const style = value("underline", "underlineType", "none");
  return typeof style === "string" ? [style] : [];
});
</script>
<template>
  <Gallery :locale="context.locale" :model-value="selected" :disabled="disabled" @select="scope.execute" />
</template>

<style>
.qk-classic-underline-popup { width: calc(var(--qk-control-compact) * 12); }
</style>
