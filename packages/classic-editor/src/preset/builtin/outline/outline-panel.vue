<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { QuireEmptyState, QuireTreeView } from "@quirekit/ui/vue";
import { resolveBuiltinClassicEditorMessage } from "../../../localization";
import type { ClassicEditorOutlinePanelState } from "./types";
import { useClassicEditorOutline } from "./use-outline";

/** Outline panel inputs. */
interface Props {
  /** Shared state updated without remounting the TreeView. */
  readonly state: ClassicEditorOutlinePanelState;
}

const props = defineProps<Props>();
const outlineLabel = computed(() => resolveBuiltinClassicEditorMessage(
  props.state.context.locale,
  "outline"
));
const emptyLabel = computed(() => resolveBuiltinClassicEditorMessage(
  props.state.context.locale,
  "addHeadingsToOutline"
));
const untitledLabel = computed(() => resolveBuiltinClassicEditorMessage(
  props.state.context.locale,
  "untitledHeading"
));
const context = computed(() => props.state.context);
const { nodes, expandedValue, selectedValue, changeExpanded, selectHeading } = useClassicEditorOutline(context, untitledLabel);
const root = ref<{ $el?: Element } | null>(null);
// Scroll-follow can activate a heading outside the panel's visible range; reveal it without moving the page.
watch(selectedValue, async ([id]) => {
  if (id === undefined) return;
  await nextTick();
  const host = root.value?.$el;
  const row = host instanceof Element ? host.querySelector(`[data-value="${CSS.escape(id)}"]`) : null;
  row?.scrollIntoView({ block: "nearest" });
});

/**
 * Keeps the editor's native input focused until pointer navigation commits.
 *
 * @param event - Pointer press within the outline TreeView.
 */
function preserveEditorFocus(event: PointerEvent): void {
  // WebKit suppresses the touch compatibility events used by TreeView when
  // pointerdown is canceled. Preserve only the desktop pointer's input focus.
  if (event.button === 0 && event.pointerType !== "touch") event.preventDefault();
}
</script>

<template>
  <QuireTreeView
    v-if="nodes.length > 0"
    ref="root"
    :label="outlineLabel"
    :nodes="nodes"
    :expanded-value="expandedValue"
    :selected-value="selectedValue"
    selection-appearance="text"
    class="qk-classic-editor__outline"
    @pointerdown="preserveEditorFocus"
    @expanded-change="changeExpanded"
    @selection-change="selectHeading"
  />
  <QuireEmptyState
    v-else
    :title="emptyLabel"
    :label="outlineLabel"
    :heading-level="3"
    size="sm"
    scene="data"
    class="qk-classic-editor__outline-empty"
  />
</template>
