<script setup lang="ts">
import { computed } from "vue";
import { QuireButton, QuireIcon, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import type { SourceBlockControls, SourceBlockRect } from "@quirekit/msfe-core";
import type { MdBlockInsertionRequest } from "./insertion/types";
import type { MdEditorLocale } from "../types";
import { blockBadge, blockLabels } from "./labels";
import Menu from "./menu.vue";
import { projectMdLayerRect, useMdDocumentLayer } from "../overlays/context";
const props = defineProps<{
  /** Current bounded hover/drag projection. */ controls: SourceBlockControls;
  /** Whether this block owns a menu. */ open: boolean;
  /** Product locale. */ locale: MdEditorLocale;
  /** Host contact capability. */ mentions: boolean;
}>();
const emit = defineEmits<{ /** Open or dismiss the captured block's menu. */ "update:open": [open: boolean];
  /** Deferred adjacent insertion. */ insert: [request: MdBlockInsertionRequest];
}>();
const text = computed(() => blockLabels(props.locale)), layer = useMdDocumentLayer();
const badge = computed(() => blockBadge(props.controls.block, props.controls.editor.state.sliceDoc(props.controls.block.from, Math.min(props.controls.block.to, props.controls.block.from + 64))));
const summary = computed(() => props.controls.editor.state.sliceDoc(props.controls.block.from, Math.min(props.controls.block.to, props.controls.block.from + 100)).replace(/\s+/gu, " "));
/** @returns Rail anchor x; blocks inside a highlight body align with the highlight edge instead of covering its icon. */
function railEdge(): number {
  const { rect, firstLine, editor } = props.controls, line = firstLine ?? rect;
  const hit = editor.element.ownerDocument.elementFromPoint(line.left + 1, line.top + line.height / 2);
  const highlight = hit?.closest(".qk-prose-container__body")?.closest("[data-qk-prose-highlight]");
  return highlight ? Math.min(rect.left, highlight.getBoundingClientRect().left) : rect.left;
}
const railStyle = computed(() => {
  const { firstLine, rect } = props.controls;
  const point = projectMdLayerRect(layer.value, { left: Math.max(4, railEdge() - (badge.value.text ? 62 : 44)),
    top: firstLine ? firstLine.top + (firstLine.height - 24) / 2 : rect.top, width: 0, height: 0 });
  return { left: `${point.left}px`, top: `${point.top}px` };
});
/** @param rect - Client-space rectangle measured this frame. @returns Layer-local position that scrolls with the document. */
function rectStyle(rect: SourceBlockRect) {
  const local = projectMdLayerRect(layer.value, rect);
  return { left: `${local.left}px`, top: `${local.top}px`, width: `${local.width}px`, height: `${local.height}px` };
}
/** @param open - Explicit host menu state. */
function menu(open: boolean): void { props.controls.pin(open); emit("update:open", open); if (!open) props.controls.focus(); }
</script>
<template>
  <div data-md-block-controls data-qk-not-prose>
    <div v-if="open || controls.dragging" class="md-block-selection" :style="rectStyle(controls.rect)" />
    <div v-if="!controls.dragging" class="md-block-rail" :data-menu-open="open" :style="railStyle">
      <QuireTooltipRoot :disabled="open" placement="top"><QuireTooltipTrigger as-child>
        <QuireButton size="xs" color="neutral" variant="outline" :aria-label="text.handle" :aria-expanded="open" aria-haspopup="menu" class="md-block-handle"
          data-md-block-handle @pointerdown="controls.press($event)" @contextmenu.prevent="menu(true)" @keydown.enter.prevent="menu(true)" @keydown.space.prevent="menu(true)">
          <span class="md-block-handle__content" aria-hidden="true">
            <span v-if="badge.text" class="qk-type-helper">{{ badge.text }}</span><QuireIcon v-else :name="badge.icon!" :size="16" />
            <QuireIcon name="gripVertical" :size="12" />
          </span>
        </QuireButton>
      </QuireTooltipTrigger><QuireTooltipContent :content="text.hint" /></QuireTooltipRoot>
    </div>
    <Menu v-if="open && !controls.dragging" :controls="controls" :locale="locale" :mentions="mentions" @close="menu(false)"
      @insert="(side, value) => emit('insert', { controls, side, value })" />
    <div v-if="controls.dragging && controls.pointer" class="md-block-ghost" :style="{ left: `clamp(8px, ${controls.pointer.x + 16}px, calc(100vw - 288px))`, top: `clamp(8px, ${controls.pointer.y + 12}px, calc(100vh - 40px))` }" data-md-block-ghost>
      <QuireIcon name="gripVertical" :size="16" /><span>{{ summary }}</span>
    </div>
    <div v-if="controls.drop" class="md-block-drop" :style="rectStyle(controls.drop.rect)" data-md-block-drop />
  </div>
</template>
<style scoped>
.md-block-rail { position: absolute; z-index: 3; padding-inline-end: 2px; pointer-events: auto; }
.md-block-handle { cursor: grab; touch-action: none; width: 36px; padding-inline: 2px; background: var(--qk-color-surface-subtle); }
.md-block-handle__content { display: flex; align-items: center; justify-content: center; gap: 1px; }
.md-block-selection { position: absolute; pointer-events: none; z-index: 2; border-radius: var(--qk-radius-control); background: var(--qk-color-selection-document); }
.md-block-ghost { position: fixed; z-index: var(--qk-layer-overlay); pointer-events: none; display: flex; align-items: center; gap: var(--qk-space-inline); max-width: 280px; padding: var(--qk-space-inline); border-radius: var(--qk-radius-group); background: var(--qk-color-surface-raised); box-shadow: var(--qk-elevation-overlay); }
.md-block-ghost span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: var(--qk-type-helper-font-size); }
.md-block-drop { position: absolute; z-index: 3; pointer-events: none; background: var(--qk-color-action-primary); }
.md-block-drop::before { content: ""; position: absolute; width: 6px; height: 6px; top: -2px; left: -3px; background: inherit; border-radius: 50%; }
@media (max-width: 767px) and (any-pointer: coarse) {
  .md-block-rail[data-menu-open="false"] { display: none; }
}
</style>
