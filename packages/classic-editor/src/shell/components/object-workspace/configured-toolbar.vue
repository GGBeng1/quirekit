<script setup lang="ts">
import { computed, onBeforeUnmount, shallowReactive, toValue, watch } from "vue";
import { EditorUIObjectToolbar } from "@quirekit/editor-ui/vue";
import type { QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import type { ClassicEditorObjectToolbarFactory, ClassicEditorObjectToolbarState, ClassicEditorObjectWorkspaceController, ClassicEditorObjectWorkspaceLayout, ClassicEditorObjectWorkspaceSnapshot } from "@classic/types/object-workspace";
import { classicToolbarPopupKey, collectClassicToolbarPopups, projectClassicToolbarPopupOwners } from "../../contribution/toolbar/ownership/entries";
import type { ClassicToolbarPopupEntry } from "../../contribution/toolbar/ownership/types";
import type { ClassicEditorOverlayController } from "../../overlays/registry";
import PopupOwner from "../../contribution/toolbar/ownership/owner.vue";

const props = defineProps<{
  /** Feature factory retained for one exact target identity. */
  factory: ClassicEditorObjectToolbarFactory;
  /** Canonical action and Inspector owner. */
  controller: ClassicEditorObjectWorkspaceController;
  /** Immutable context invalidation boundary, not a document subscription. */
  snapshot: ClassicEditorObjectWorkspaceSnapshot;
  /** Current root-local presentation. */
  layout: ClassicEditorObjectWorkspaceLayout;
  /** Product document host for an anchored Toolbar's child surfaces. */
  portalTarget?: HTMLElement | undefined;
}>();
const captured = props.snapshot.contribution!;
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
const state = shallowReactive<ClassicEditorObjectToolbarState>({
  context: props.controller.context,
  controller: props.controller,
  snapshot: props.snapshot,
  layout: props.layout,
  /** @returns Whether a retained field may still mutate its original selection. */
  isTargetCurrent: () => !disposed
    && props.snapshot.target?.id === captured.target.id
    && props.snapshot.target?.revision === captured.target.revision
    && captured.resolveTarget().freshness.status === "ready"
});
watch(() => [props.snapshot, props.layout] as const, () => {
  Object.assign(state, { context: props.controller.context, snapshot: props.snapshot, layout: props.layout });
}, { flush: "sync" });
const source = props.factory(state);
const owners = shallowReactive(new Map<string, ClassicEditorOverlayController>());
const sourceRows = computed(() => { void state.snapshot; return toValue(source.rows); });
const popups = computed(() => sourceRows.value.flatMap(row => collectClassicToolbarPopups(row.items, [row.value])));
const rows = computed(() => sourceRows.value.map(row => ({ ...row,
  items: projectClassicToolbarPopupOwners(row.items, owners, state.context, [row.value], props.portalTarget)
})));

/** @param key - Stable row/control path. @param owner - Admitted popup coordinator. */
function register(key: string, owner: ClassicEditorOverlayController): void { owners.set(key, owner); }
/** @param key - Stable row/control path. @param owner - Departing coordinator. */
function release(key: string, owner: ClassicEditorOverlayController): void {
  if (owners.get(key) === owner) owners.delete(key);
}
/** @param entry - Original configured popup. @param expanded - Admitted visibility. */
function visibility(entry: ClassicToolbarPopupEntry, expanded: boolean): void {
  source.openChange?.({ item: entry.item, path: entry.path, expanded });
}
/** @param event - Public component request routed through existing Classic ownership. */
function openChange(event: QuireKitToolbarOpenChangeEvent): void {
  const owner = owners.get(classicToolbarPopupKey(event.path));
  if (owner) owner.setVisible(event.expanded);
  else source.openChange?.(event);
}
</script>

<template>
  <EditorUIObjectToolbar class="qk-object-action-bar" :label="toValue(source.label)" :rows="rows"
    :renderers="source.renderers ?? {}" :context="source.context"
    :variant="layout === 'wide' ? 'elevated' : 'plain'" :data-object-layout="layout === 'wide' ? 'floating' : 'bottom'"
    @execute="source.execute" @open-change="openChange" />
  <PopupOwner v-for="entry in popups" :key="entry.key" :entry="entry" :context="state.context"
    @register="register" @release="release" @visible="visibility" />
  <component :is="source.surface" v-if="source.surface" :context="source.context" />
</template>
