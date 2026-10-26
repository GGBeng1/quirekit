<script setup lang="ts">
import { ClassicEditorAnchoredOverlay, type ClassicEditorAnchoredOverlayAnchor } from "@classic/ui/anchored-overlay";
import type { ClassicEditorSelectionPopupProps } from "./types";
import { useClassicEditorSelectionPopup } from "./use-selection-popup";
import { resolveClassicEditorSelectionPopupTrigger } from "./query";
import SelectionToolbar from "./toolbar/toolbar.vue";

const props = defineProps<ClassicEditorSelectionPopupProps>();
const { executeSelection, items, trigger, selectionKey, show, updateVisibility } = useClassicEditorSelectionPopup(props);
/** @returns The complete current selection geometry, before any boundary adjustment. */
function resolveAnchor(): ClassicEditorAnchoredOverlayAnchor | null {
  const current = resolveClassicEditorSelectionPopupTrigger(props.model.context);
  if (!current || !trigger.value || current.from !== trigger.value.from || current.to !== trigger.value.to) return null;
  const rect = current.rect;
  // Touch grips extend 30 client pixels beyond each line. Include their hit
  // areas in the anchor so either flipped placement leaves them draggable.
  const gripExtent = props.model.compact ? 30 : 0;
  return { x: rect.left + rect.width / 2, y: rect.top - gripExtent,
    rects: [{ x: rect.left, y: rect.top - gripExtent, width: rect.width, height: rect.height + gripExtent * 2 }] };
}
</script>

<template>
  <ClassicEditorAnchoredOverlay v-if="root !== undefined" :show="show" :anchor="resolveAnchor()"
    :resolve-anchor="resolveAnchor" :editor-root="root" placement="top" overlay-family="selection-popup"
    @update:show="updateVisibility">
    <template #default="{ ownerAttributes, style, portalTarget }">
      <SelectionToolbar v-if="trigger" :key="selectionKey!" v-bind="ownerAttributes"
        :style="style" :model="model" :items="items" :trigger="trigger"
        :parent-id="ownerAttributes['data-qk-classic-overlay']" :portal-target="portalTarget"
        @action="executeSelection" />
    </template>
  </ClassicEditorAnchoredOverlay>
</template>
