<script setup lang="ts">
import { computed } from "vue";
import { QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import type { ResolvedClassicEditorCommandBarGroup } from "../command-bar";
import { createClassicToolbarConfiguration } from "./configuration";
import { classicToolbarRenderers } from "./renderers";
import { retainClassicToolbarEntries } from "./projection/entries";
import { sameClassicToolbarMetadata } from "./projection/metadata";
import type { ClassicToolbarContext } from "./types";

const props = defineProps<{
  /** Groups in this tab's registry order. */
  groups: readonly ResolvedClassicEditorCommandBarGroup[];
  /** Current tab visibility, independent of retained DOM lifecycle. */
  active: boolean;
  /** An open feature popup continues presenting when its tab is hidden. */
  open: boolean;
  /** Stable instance adapter whose context remains live. */
  adapter: ClassicToolbarContext;
  /** Current accessible task label. */
  label: string;
  /** Narrow-window behavior: horizontal scrolling or collapsing trailing controls into "more". */
  overflow?: "scroll" | "collapse" | undefined;
  /** Touch presentation supplied by the instance-container layout. */
  mobile?: boolean | undefined;
}>();
const emit = defineEmits<{
  /** Current command intent delegated to the canonical runtime. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** Existing controlled or local popup transition. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
}>();
let previous: readonly QuireKitToolbarEntry[] = [];
const items = computed(() => {
  // Retain visited controls and their drafts; an unvisited tab starts with no inline DOM.
  if (!props.active && !props.open && !props.groups.some(group => props.adapter.menus.get(group.id)?.isVisible())) return previous;
  previous = retainClassicToolbarEntries(previous,
    createClassicToolbarConfiguration(props.groups, props.adapter, previous, props.active), sameClassicToolbarMetadata);
  return previous;
});
</script>

<template>
  <QuireToolbar :label="label" :mode="mobile ? 'mobile' : 'desktop'" variant="elevated" preserve-focus align="center" :overflow="overflow ?? 'scroll'"
    :items="items" :renderers="classicToolbarRenderers" :context="adapter"
    class="qk-classic-editor__ribbon-panel" @execute="emit('execute', $event)" @open-change="emit('openChange', $event)" />
</template>
