<script setup lang="ts">
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "../../../components/toolbar/types";
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "./types";
import QuireToolbarGroup from "../toolbar-group.vue";
import QuireToolbarSeparator from "../toolbar-separator.vue";
import ToolbarControl from "./control.vue";
import { computed, inject } from "vue";
import { resolveQuireKitToolbarEntrySpan } from "../../../components/toolbar/span";
import { toolbarMobileKey, toolbarSizingKey } from "../context";
defineOptions({ name: "ToolbarItems" });
withDefaults(defineProps<{
  /** Ordered entries with stable sibling identities. */
  items: readonly QuireKitToolbarEntry[];
  /** Parent group ancestry. */
  path?: readonly string[];
  /** Inherited group availability. */
  disabled?: boolean;
  /** Host state or services. */
  context?: unknown;
  /** Named Vue renderers. */
  renderers: QuireKitToolbarRenderers;
}>(), { path: () => [], disabled: false });
defineSlots<{
  /** Custom entry fallback. */
  item?: (scope: QuireKitToolbarRendererScope) => unknown;
  /** Custom popup body fallback. */
  content?: (scope: QuireKitToolbarRendererScope) => unknown;
}>();
const emit = defineEmits<{
  /** Accepted command request. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** Popup state request. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
}>();
const sizing = inject(toolbarSizingKey, computed(() => "natural" as const));
const mobile = inject(toolbarMobileKey, computed(() => false));
/** @param item - Control entry. @returns Unit span, or null when the control keeps its natural width. */
function spanOf(item: QuireKitToolbarEntry): number | null {
  const span = sizing.value === "units" || item.span !== undefined ? resolveQuireKitToolbarEntrySpan(item) : null;
  // Each split target needs its own touch unit; desktop keeps the compact disclosure.
  return mobile.value && item.kind === "split" && span !== null ? Math.max(2, span) : span;
}
</script>
<template>
  <template v-for="item in items.filter(entry => !entry.hidden)" :key="item.value">
    <QuireToolbarSeparator v-if="item.kind === 'separator'" />
    <QuireToolbarGroup v-else-if="item.kind === 'group'" :label="item.label">
      <ToolbarItems :items="item.children ?? []" :path="[...path, item.value]" :disabled="disabled || !!item.disabled"
        :context="context" :renderers="renderers" @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </ToolbarItems>
    </QuireToolbarGroup>
    <div v-else-if="spanOf(item) !== null" class="qk-toolbar__slot" :style="{ '--qk-toolbar-span': String(spanOf(item)) }">
      <ToolbarControl :item="item" :path="[...path, item.value]" :disabled="disabled" :context="context" :renderers="renderers"
        @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </ToolbarControl>
    </div>
    <ToolbarControl v-else :item="item" :path="[...path, item.value]" :disabled="disabled" :context="context" :renderers="renderers"
      @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
      <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
      <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
    </ToolbarControl>
  </template>
</template>
