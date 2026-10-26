<script setup lang="ts">
import { useQuireOverlayHost } from "../../overlay-provider";
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "../../../components/toolbar/types";
import { quireKitEditorIconData } from "../../../components/icon/catalog";
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "../items/types";
import QuireIcon from "../../icon/icon.vue";
import QuirePopoverRoot from "../../popover/root.vue";
import QuirePopoverTrigger from "../../popover/trigger.vue";
import QuirePopoverContent from "../../popover/content.vue";
import QuireToolbarDisclosure from "../toolbar-disclosure.vue";
import QuireToolbar from "../toolbar.vue";
import QuireTaskPanel from "../../task-panel/root.vue";
import QuireButton from "../../button/button.vue";
import { useQuireKitMessages } from "../../locale-provider/context";
import { hideLineEdgeSeparators } from "./separators";

/** Trailing entries collapsed out of the row, rendered in a panel with the same controls. */
const host = useQuireOverlayHost(() => props.portalTarget);
const props = defineProps<{
  /** Accessible name of the "more" control and its panel. */
  label: string;
  /** Collapsed top-level entries. */
  items: readonly QuireKitToolbarEntry[];
  /** Host state forwarded to custom renderers. */
  context?: unknown;
  /** Named custom controls and popup bodies. */
  renderers: QuireKitToolbarRenderers;
  /** Touch operation surface; an active shell stays locked until physical exit. */
  mobile?: boolean;
  /** Owner-local portal for either operation surface. */
  portalTarget?: string | HTMLElement | undefined;
  /** Focus restoration policy when the host hands off to another task. */
  restoreFocus?: boolean;
}>();
defineSlots<{
  /** Custom control fallback. */
  item?: (scope: QuireKitToolbarRendererScope) => unknown;
  /** Custom popup fallback. */
  content?: (scope: QuireKitToolbarRendererScope) => unknown;
}>();
const emit = defineEmits<{
  /** Intent from a collapsed control, identical to the row's. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** Popup transition from a collapsed control. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
  /** Effective overflow state and the native entry, before modal focus changes. */
  panelOpenChange: [open: boolean, trigger: HTMLElement | null];
  /** Actual operation surface mount/release. */
  surfaceChange: [element: HTMLElement | null];
}>();
const open = ref(false);
const panel = shallowRef<HTMLElement | null>(null);
const unit = shallowRef<HTMLElement | null>(null), mobile = ref(props.mobile ?? false);
const cancelText = useQuireKitMessages("actionSheet");
watch([() => props.mobile, open, panel], () => { if (!open.value && panel.value === null) mobile.value = props.mobile ?? false; });
watch(panel, element => emit("surfaceChange", element?.closest<HTMLElement>('[role="dialog"]') ?? element), { flush: "post" });
onBeforeUnmount(() => { if (panel.value) emit("surfaceChange", null); if (open.value) emit("panelOpenChange", false, null); });

/** @param next - Accepted shell request; reopening an exiting shell retains its identity. */
function changeOpen(next: boolean): void {
  if (open.value === next) return;
  if (next && panel.value === null) mobile.value = props.mobile ?? false;
  open.value = next; emit("panelOpenChange", next, unit.value?.querySelector<HTMLButtonElement>('button') ?? null);
}
/** @returns Native operation entry, including controls composed through Tooltip fragments. */
function overflowTrigger(): HTMLElement | null { return unit.value?.querySelector<HTMLButtonElement>('button') ?? null; }
// Wrapping is only known after the panel lays out, so separators are checked once it has painted.
watch([open, () => props.items], async () => {
  if (!open.value || mobile.value) return;
  await nextTick();
  requestAnimationFrame(() => {
    const content = panel.value?.querySelector<HTMLElement>(".qk-toolbar__content");
    if (content) hideLineEdgeSeparators(content);
  });
}, { flush: "post" });

/** @param event - Intent from the panel; one-shot commands close it, toggles keep it open. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  emit("execute", event);
  if (event.source !== "toggle") changeOpen(false);
}
</script>

<template>
  <div ref="unit" class="qk-toolbar__unit" data-qk-toolbar-more>
    <QuireTaskPanel v-if="mobile" :open="open" :title="label" presentation="bottom" max-height="72dvh" :anchor-el="overflowTrigger" :portal-target="portalTarget ?? 'body'" :restore-focus="restoreFocus ?? true" @update:open="changeOpen" @content-element-change="panel = $event">
      <template #trigger="scope">
        <QuireToolbarDisclosure :label="label" :toggle-on-click="false" popup="dialog" :expanded="scope.open">
          <QuireIcon :data="quireKitEditorIconData.moreHorizontal" />
        </QuireToolbarDisclosure>
      </template>
      <QuireToolbar :label="label" :items="items" :context="context" :renderers="renderers" mode="mobile" orientation="vertical" overflow="visible" align="start" class="qk-toolbar--overflow-sheet"
        @execute="execute" @open-change="emit('openChange', $event)">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </QuireToolbar>
      <template #footer><QuireButton variant="text" class="qk-task__target w-full" @click="changeOpen(false)">{{ cancelText.cancel }}</QuireButton></template>
    </QuireTaskPanel>
    <QuirePopoverRoot v-else :open="open" placement="bottom-end" :restore-focus="restoreFocus ?? true" @update:open="changeOpen">
      <QuirePopoverTrigger as-child>
        <QuireToolbarDisclosure :label="label" :toggle-on-click="false" popup="dialog" :expanded="open" @update:expanded="changeOpen">
          <QuireIcon :data="quireKitEditorIconData.moreHorizontal" />
        </QuireToolbarDisclosure>
      </QuirePopoverTrigger>
      <QuirePopoverContent v-if="open" :aria-label="props.label" :show-arrow="false" :portal-target="host.target.value" style="--qk-popover-padding: var(--qk-space-inline)">
        <div ref="panel">
        <QuireToolbar :label="props.label" :items="items" :context="context" :renderers="renderers" overflow="visible" align="start"
          class="qk-toolbar--overflow-panel" @execute="execute" @open-change="emit('openChange', $event)">
          <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
          <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
        </QuireToolbar>
        </div>
      </QuirePopoverContent>
    </QuirePopoverRoot>
  </div>
</template>
