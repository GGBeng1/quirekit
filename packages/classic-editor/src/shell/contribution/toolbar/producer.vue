<script setup lang="ts">
import { computed, onBeforeUnmount, shallowReactive, shallowRef, toValue, watch, watchEffect } from "vue";
import type { ClassicEditorRenderContext, ClassicEditorToolbarContributionFactory } from "../../../types";
import type { ClassicToolbarFeature } from "./types";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorOverlayController } from "../../overlays/registry";
import type { ClassicEditorToolbarContribution } from "../../../types";
import type { ClassicToolbarPopupEntry } from "./ownership/types";
import { classicToolbarPopupKey, collectClassicToolbarPopups, projectClassicToolbarPopupOwners } from "./ownership/entries";
import PopupOwner from "./ownership/owner.vue";
import { retainClassicToolbarEntries } from "./projection/entries";
import { hasExpandedClassicToolbarEntries } from "./projection/open";

const props = defineProps<{
  /** Stable placement in the command-bar composition. */
  featureKey: string;
  /** Factory executed once in this component's Vue lifecycle. */
  factory: ClassicEditorToolbarContributionFactory;
  /** Latest mounted selection, locale and capabilities. */
  context: ClassicEditorRenderContext;
  /** Whether the owning tab currently presents its controls. */
  active: boolean;
  /** An uncontrolled open popup still consumes current entries on a hidden tab. */
  open: boolean;
  /** Active anchored Toolbar owner for nested popup lifetime. */
  parentId?: string | undefined;
  /** Document-overlay host shared by anchored controls and their content. */
  portalTarget?: HTMLElement | undefined;
  /** Rejects delayed field commits after their owning text selection is gone. */
  isTargetCurrent?: (() => boolean) | undefined;
}>();
const emit = defineEmits<{
  /** Replaces one placement's live configuration without recreating its factory. */
  configuration: [feature: ClassicToolbarFeature];
  /** Releases the exact factory instance on omission or replacement. */
  release: [feature: ClassicToolbarFeature];
}>();
const state = shallowReactive({ context: props.context, isTargetCurrent: () => props.isTargetCurrent?.() !== false });
watch(() => props.context, context => { state.context = context; }, { flush: "sync" });
const source = props.factory(state);
const owners = shallowReactive(new Map<string, ClassicEditorOverlayController>());
const sourceItems = computed(() => {
  // Unknown plain getters may read mutable host facts without Vue dependencies.
  // Their existing invalidation boundary is an explicit, active context refresh.
  void props.context;
  return toValue(source.items);
});
const sourceSnapshot = shallowRef<readonly QuireKitToolbarEntry[]>([]);
const popups = computed(() => collectClassicToolbarPopups(sourceSnapshot.value));
const configuration: ClassicEditorToolbarContribution = {
  ...source,
  items: computed(() => projectClassicToolbarPopupOwners(sourceItems.value, owners, props.context, [], props.portalTarget)),
  /** @param event - Public floating-surface request awaiting Classic admission. */
  openChange(event) {
    const owner = owners.get(classicToolbarPopupKey(event.path));
    if (owner) owner.setVisible(event.expanded);
    else source.openChange?.(event);
  }
};
/** @param key - Stable entry path. @param owner - Exact mounted coordinator. */
function registerOwner(key: string, owner: ClassicEditorOverlayController): void { owners.set(key, owner); }
/** @param key - Stable entry path. @param owner - Exact departing coordinator. */
function releaseOwner(key: string, owner: ClassicEditorOverlayController): void {
  if (owners.get(key) === owner) owners.delete(key);
}
/** @param entry - Original feature entry. @param expanded - Admitted surface visibility. */
function publishVisibility(entry: ClassicToolbarPopupEntry, expanded: boolean): void {
  source.openChange?.({ item: entry.item, path: entry.path, expanded });
}
let current: ClassicToolbarFeature = { key: props.featureKey, configuration, items: [] };
emit("configuration", current);
watchEffect(() => {
  // Live context and standalone surfaces stay reactive while hidden getters remain lazy.
  if (!props.active && !props.open && !hasExpandedClassicToolbarEntries(current.items)) return;
  void props.context;
  sourceSnapshot.value = sourceItems.value;
  const items = retainClassicToolbarEntries(current.items, toValue(configuration.items));
  if (items === current.items) return;
  current = { key: props.featureKey, configuration, items };
  emit("configuration", current);
});
onBeforeUnmount(() => emit("release", current));
</script>

<template>
  <PopupOwner v-for="entry in popups" :key="entry.key" :entry="entry" :context="context" :parent-id="parentId"
    @register="registerOwner" @release="releaseOwner" @visible="publishVisibility" />
  <component v-if="configuration.surface" :is="configuration.surface" :context="configuration.context" />
</template>
