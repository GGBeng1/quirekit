<script setup lang="ts">
import { QuireBadge, QuireTabs, QuireToaster, createQuireKitToaster } from "@quirekit/ui/vue";
import type { QuireKitTabsItem } from "@quirekit/ui";
import { computed, onUnmounted, provide, toRef, watch } from "vue";
import { fontHubToasterKey } from "./notifications";
import type {
  ClassicEditorFontHubMessageKey,
  ClassicEditorFontHubProps,
  ClassicEditorText,
  ClassicEditorWebFontSource
} from "@classic/types";
import {
  resolveBuiltinClassicEditorMessage,
  resolveClassicEditorText
} from "@classic/localization";
import { useClassicEditorOverlay } from "@classic/shell/overlays/registry";
import { ClassicEditorWorkspaceDialog } from "../workspace-dialog";
import CatalogView from "./catalog/view.vue";
import ImportedView from "./imported/view.vue";
import SourcesView from "./sources/view.vue";
import { resolveClassicFontScriptFilterOptions } from "./font-preview";
import { useClassicFontHub, type ClassicFontHubView } from "./use-font-hub";

/** Controlled visibility events emitted by the public Font Hub. */
interface ClassicEditorFontHubEmits {
  /** Requests a controlled visibility change. */
  (event: "update:open", value: boolean): void;
}

const props = defineProps<ClassicEditorFontHubProps>();
const emit = defineEmits<ClassicEditorFontHubEmits>();
const open = toRef(props, "open");
const toaster = createQuireKitToaster({ placement: "bottom-end", duration: 3000, max: 1 });
provide(fontHubToasterKey, toaster);
watch(open, (visible) => { if (!visible) toaster.remove(); });
onUnmounted(() => toaster.remove());
const overlayVisibility = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value)
});
const overlay = useClassicEditorOverlay(
  "font-hub",
  overlayVisibility,
  props.themeRoot?.ownerDocument,
  { resolveRoot: () => props.themeRoot },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false }
);
const popupProps = computed(() => ({
  style: props.themeVariables,
  lang: props.locale,
  ...overlay.ownerAttributes
}));
const dialogPortalTarget = computed(() => props.themeRoot?.ownerDocument.body);
const library = computed(() => props.library);

/**
 * Resolves one built-in or host-overridden Hub message.
 *
 * @param key - Stable public Hub copy slot.
 * @returns Visible copy for the active locale.
 */
function message(key: ClassicEditorFontHubMessageKey): string {
  return props.messages?.[key]
    ?? resolveBuiltinClassicEditorMessage(props.locale, key);
}

/**
 * Resolves source-contributed text in the active product locale.
 *
 * @param value - Language-neutral or bundled bilingual copy.
 * @returns Visible localized text.
 */
function text(value: ClassicEditorText): string {
  return resolveClassicEditorText(value, props.locale);
}

/**
 * Resolves one source label without depending on a provider implementation.
 *
 * @param source - Configured source adapter.
 * @returns Localized visible label.
 */
function sourceLabel(source: ClassicEditorWebFontSource): string {
  return text(source.label);
}

const hub = useClassicFontHub(open, library, message, sourceLabel);
const tabs = computed<readonly QuireKitTabsItem[]>(() => [
  { value: "catalog", label: message("fontCatalog") },
  { value: "imported", label: message("importedFonts") },
  { value: "sources", label: message("fontSources") }
]);
const activeView = computed({
  get: () => hub.activeView.value,
  set: (value: string | undefined) => {
    if (isClassicFontHubView(value)) hub.selectView(value);
  }
});
const scriptFilterOptions = computed(() => [{
  label: message("allLanguages"),
  value: "all"
}, ...resolveClassicFontScriptFilterOptions(props.locale).map((option) => ({
  label: option.label,
  value: option.value
}))]);
watch(() => props.open, overlay.setVisible, { immediate: true });

/**
 * Reports whether a Tabs value belongs to the Font Hub's closed view set.
 *
 * @param value - Candidate Tabs value.
 * @returns Whether the value is a Font Hub view.
 */
function isClassicFontHubView(value: string | undefined): value is ClassicFontHubView {
  return value === "catalog" || value === "imported" || value === "sources";
}

/**
 * Resolves the quiet count shown beside a management tab.
 *
 * @param value - Stable Font Hub view.
 * @returns Count for views that manage retained resources.
 */
function tabCount(value: string): number | undefined {
  if (value === "imported") return hub.importedFamilies.value.length;
  if (value === "sources") return hub.sources.value.length;
  return undefined;
}

/**
 * Mirrors public dialog visibility into controlled product state.
 *
 * @param value - Next modal visibility.
 */
function updateOpen(value: boolean): void {
  overlay.setVisible(value);
}
</script>

<template>
  <ClassicEditorWorkspaceDialog
    :show="open"
    :title="message('fontHub')"
    :theme-root="themeRoot"
    :theme-variables="themeVariables"
    :owner-attributes="overlay.ownerAttributes"
    surface-class="qk-classic-font-hub"
    body-class="qk-font-hub"
    size="wide"
    :mask-closable="true"
    :auto-focus="true"
    @update:show="updateOpen"
  >
    <QuireTabs
      v-model="activeView"
      class="qk-font-hub__tabs"
      :label="message('fontHub')"
      :items="tabs"
      content-padding="none"
      lazy-mount
    >
      <template #trigger="{ item }">
        <span class="qk-font-hub__tab-label">
          {{ item.label }}
          <QuireBadge
            v-if="tabCount(item.value) !== undefined"
            color="neutral"
            variant="soft"
            size="xs"
            :count="tabCount(item.value) ?? 0"
            :show-zero="true"
            :label="`${tabCount(item.value) ?? 0}`"
          />
        </span>
      </template>
      <template #content="{ item }">
        <CatalogView
          v-if="item.value === 'catalog'"
          :hub="hub"
          :locale="locale"
          :message="message"
          :popup-props="popupProps"
          :script-filter-options="scriptFilterOptions"
        />
        <ImportedView
          v-else-if="item.value === 'imported'"
          :popup-props="popupProps"
          :hub="hub"
          :locale="locale"
          :message="message"
        />
        <SourcesView
          v-else
          :hub="hub"
          :library="library"
          :locale="locale"
          :message="message"
          :source-label="sourceLabel"
          :text="text"
          :popup-props="popupProps"
          :dialog-portal-target="dialogPortalTarget"
        />
      </template>
    </QuireTabs>
    <QuireToaster :toaster="toaster" />
  </ClassicEditorWorkspaceDialog>
</template>
