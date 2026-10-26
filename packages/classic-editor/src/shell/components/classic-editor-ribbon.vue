<script setup lang="ts">
import { computed, shallowReactive, toRef } from "vue";
import { QuireIconProvider } from "@quirekit/ui/vue";
import type { QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import type { ClassicEditorRibbonTabContribution, ClassicEditorToolbarContributionFactory } from "@classic/types";
import { classicEditorIconRegistry } from "../../icons";
import type { ResolvedClassicEditorCommandBarGroup } from "../contribution/command-bar";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import type { ClassicEditorOverlayController } from "../overlays/registry";
import {
  ClassicToolbarProducer, ClassicToolbarMenuOwner,
  isClassicToolbarMenu, executeClassicToolbar, changeClassicToolbarPopup,
  type ClassicToolbarFeature
} from "../contribution/toolbar";
import ClassicToolbarTab from "../contribution/toolbar/tab.vue";
import { collectClassicToolbarLocalPaths, hasExpandedClassicToolbarEntries } from "../contribution/toolbar/projection/open";
import type { ClassicToolbarEntryMeta } from "../contribution/toolbar/types";

/** Reactive inputs rendered by the default compatibility ribbon. */
interface ClassicEditorRibbonProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Active ribbon tab id. */
  readonly activeTab: string | undefined;
  /** Capability-filtered ordinary tabs. */
  readonly ribbonTabs: readonly ClassicEditorRibbonTabContribution[];
  /** Resolved product or consumer compatibility groups. */
  readonly commandBarGroups: readonly ResolvedClassicEditorCommandBarGroup[];
  /** DOM id controlled by task tabs. */
  readonly commandPanelId: string;
}

const props = defineProps<ClassicEditorRibbonProps>();
const { message, text } = useClassicEditorShellContributions(toRef(props, "model"));
const features = shallowReactive(new Map<string, ClassicToolbarFeature>());
const menus = shallowReactive(new Map<string, ClassicEditorOverlayController>());
const openEntries = shallowReactive(new Map<string, ReadonlySet<string>>());
const adapter = computed(() => ({ model: props.model, features, menus }));
const factoryIds = new WeakMap<ClassicEditorToolbarContributionFactory, number>();
let nextFactoryId = 0;
const factories = computed(() => props.commandBarGroups.flatMap(group => group.items.flatMap(item => {
  if (item.kind !== "ribbon-widget" || !item.toolbar) return [];
  let identity = factoryIds.get(item.toolbar);
  if (identity === undefined) { identity = ++nextFactoryId; factoryIds.set(item.toolbar, identity); }
  return [{ key: `${group.id}/${item.id}`, tabId: group.tabId, renderKey: `${group.id}/${item.id}:${identity}`, factory: item.toolbar }];
})));
const menuGroups = computed(() => props.commandBarGroups.filter(isClassicToolbarMenu));
const groupsByTab = computed(() => {
  const tabs = new Map<string, ResolvedClassicEditorCommandBarGroup[]>();
  for (const group of props.commandBarGroups) {
    const groups = tabs.get(group.tabId) ?? [];
    groups.push(group);
    tabs.set(group.tabId, groups);
  }
  return tabs;
});

/** @param feature - Latest individual entries produced by a retained feature factory. */
function updateFeature(feature: ClassicToolbarFeature): void {
  const previous = features.get(feature.key);
  const open = openEntries.get(feature.key);
  if (open) {
    const paths = collectClassicToolbarLocalPaths(feature.items);
    const retained = previous?.configuration === feature.configuration ? [...open].filter(path => paths.has(path)) : [];
    if (!retained.length) openEntries.delete(feature.key);
    else if (retained.length !== open.size) openEntries.set(feature.key, new Set(retained));
  }
  features.set(feature.key, feature);
}
/** @param feature - Exact factory instance being removed or replaced. */
function releaseFeature(feature: ClassicToolbarFeature): void {
  if (features.get(feature.key)?.configuration === feature.configuration) {
    features.delete(feature.key);
    openEntries.delete(feature.key);
  }
}
/** @param groupId - Group identity. @param owner - Stable public-menu coordinator. */
function registerMenu(groupId: string, owner: ClassicEditorOverlayController): void { menus.set(groupId, owner); }
/** @param groupId - Group identity. @param owner - Exact coordinator being unmounted. */
function releaseMenu(groupId: string, owner: ClassicEditorOverlayController): void {
  if (menus.get(groupId) === owner) menus.delete(groupId);
}
/** @param event - Accepted public Toolbar command. */
function execute(event: QuireKitToolbarExecuteEvent): void { void executeClassicToolbar(event, adapter.value); }
/** @param event - Public Toolbar popup lifecycle request. */
function openChange(event: QuireKitToolbarOpenChangeEvent): void {
  const meta = event.item.meta as ClassicToolbarEntryMeta | undefined;
  // Controlled entries publish their own state; local public popups report it through this event.
  if (meta?.kind === "feature" && meta.original.expanded === undefined) {
    const entries = new Set(openEntries.get(meta.featureKey));
    const key = JSON.stringify(meta.path);
    if (event.expanded) entries.add(key);
    else entries.delete(key);
    if (entries.size) openEntries.set(meta.featureKey, entries);
    else openEntries.delete(meta.featureKey);
  }
  changeClassicToolbarPopup(event, adapter.value);
}

/**
 * @param key - Stable retained feature placement.
 * @returns Whether a controlled or local popup still consumes presentation.
 */
function featureIsOpen(key: string): boolean {
  return openEntries.has(key) || hasExpandedClassicToolbarEntries(features.get(key)?.items ?? []);
}

/** @param tabId - Stable task identity. @returns Whether a feature popup keeps this tab current. */
function tabIsOpen(tabId: string): boolean { return factories.value.some(feature => feature.tabId === tabId && featureIsOpen(feature.key)); }
</script>

<template>
  <QuireIconProvider :registry="classicEditorIconRegistry">
  <template v-if="model.context">
    <ClassicToolbarProducer v-for="feature in factories" :key="feature.renderKey"
      :feature-key="feature.key" :factory="feature.factory" :context="model.context"
      :active="!!model.options.ribbon && feature.tabId === activeTab" :open="featureIsOpen(feature.key)"
      @configuration="updateFeature" @release="releaseFeature" />
  </template>
  <ClassicToolbarMenuOwner v-for="group in menuGroups" :key="group.id" :group-id="group.id" :model="model"
    @register="registerMenu" @release="releaseMenu" />
  <section
    v-show="model.options.ribbon"
    :id="commandPanelId"
    class="qk-classic-editor__ribbon"
    data-command-renderer="legacy"
    data-toolbar-configuration="public"
    :aria-label="message('documentRibbon')"
  >
    <div class="qk-classic-editor__ribbon-panels">
      <div
        v-for="tab in ribbonTabs"
        v-show="activeTab === tab.id"
        :key="tab.id"
        role="tabpanel"
      >
        <ClassicToolbarTab :label="text(tab.label)" :groups="groupsByTab.get(tab.id) ?? []"
          :active="!!model.options.ribbon && activeTab === tab.id" :open="tabIsOpen(tab.id)" :adapter="adapter"
          :overflow="model.compact ? 'collapse' : model.options.ribbonOverflow" :mobile="model.compact"
          @execute="execute" @open-change="openChange" />
      </div>
    </div>
  </section>
  </QuireIconProvider>
</template>
