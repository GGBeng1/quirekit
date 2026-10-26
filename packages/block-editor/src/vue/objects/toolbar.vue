<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed } from "vue";
import { EditorUIAnchoredOverlay, EditorUIObjectToolbar } from "@quirekit/editor-ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import type { RichContentSurface } from "../../rich-content/types";
import { useBlockObjectTools } from "./activity";

const { t, localize } = useBlockLocale();
const props = defineProps<{
  /** Retained object to anchor above. */ surface: RichContentSurface;
  /** Accessible object-specific toolbar name. */ label: string;
  /** Public toolbar actions with their canonical handlers. */ items: readonly QuireKitToolbarEntry[];
  /** Keep controls reachable while an embed owns focus. */ pinned?: boolean;
}>();
const emit = defineEmits<{ execute: [event: QuireKitToolbarExecuteEvent] }>();
const { visible, anchor, measure, hover, focus, popup } = useBlockObjectTools(props.surface, computed(() => props.items.length > 0), computed(() => !!props.pinned));
</script>
<template>
  <EditorUIAnchoredOverlay :show="visible" :anchor="anchor" :resolve-anchor="measure" placement="top" layer="chrome">
    <div data-block-object-tools @pointerenter="hover(true)" @pointerleave="hover(false)" @focusin="focus(true)" @focusout="focus(false)">
      <EditorUIObjectToolbar :label="t(label)" :items="localize(items)" @execute="emit('execute', $event)" @open-change="popup($event.expanded)" />
    </div>
  </EditorUIAnchoredOverlay>
</template>
