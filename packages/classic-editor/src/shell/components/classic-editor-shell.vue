<script setup lang="ts">
import { computed, ref, toRef, useId, watch } from "vue";
import { useClassicEditorCommandBar } from "../composables/use/command-bar";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import ClassicMobileNavigation from "../mobile/navigation.vue";
import { QuireButton } from "@quirekit/ui/vue";
import ClassicEditorProductPopmenu from "./classic-editor-product-popmenu.vue";
import ClassicEditorBehaviorSurfaces from "./classic-editor-behavior-surfaces.vue";
import ClassicEditorDocumentServiceFeedback
  from "./classic-editor-document-service-feedback.vue";
import ClassicEditorRibbon from "./classic-editor-ribbon.vue";
import ClassicEditorCommandStrip from "./command-strip/command-strip.vue";
import ClassicEditorTitleBar from "./classic-editor-title-bar.vue";
import ClassicEditorWorkspaceWidgets from "./classic-editor-workspace-widgets.vue";
import ClassicEditorProductSwitches from "./classic-editor-product-switches.vue";
import ClassicEditorQuickActions from "./title-bar/quick-actions.vue";
import ClassicEditorTaskNavigation from "./title-bar/task-navigation.vue";
import ClassicEditorZoom from "./status-bar/zoom.vue";

/** Root shell component inputs. */
interface ClassicEditorShellProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

const props = defineProps<ClassicEditorShellProps>();
const model = toRef(props, "model");
const rootElement = ref<HTMLElement>();
const commandPanelId = `qk-command-panel-${useId()}`;
const { locale, message } = useClassicEditorShellContributions(model);
const {
  activeTab,
  commandBarGroups,
  commandStripGroups,
  preview,
  ribbonTabs,
  selectTab
} = useClassicEditorCommandBar(model);
const mobileToolsOpen = ref(false);
watch(() => props.model.compact, () => { mobileToolsOpen.value = false; });
/** @param id - Existing task selected from the touch toolbar. */
function selectMobileTask(id: string): void {
  mobileToolsOpen.value = activeTab.value !== id || !mobileToolsOpen.value;
  selectTab(id);
}
/** Closes overlapping compact panels without moving document selection. */
function closeMobilePanels(): void {
  props.model.context?.ui.closeSidebar("left");
  props.model.context?.ui.closeSidebar("right");
}
const mobilePanelOpen = computed(() => props.model.compact && (props.model.context?.ui.state.leftSidebar.visible || props.model.context?.ui.state.rightSidebar.visible));
const backend = computed(() => props.model.context?.backend ?? props.model.backend);
const rulerVisible = computed(() => props.model.context?.ui.state.rulerVisible ?? props.model.options.ruler);
</script>

<template>
  <section
    ref="rootElement"
    class="qk-classic-editor qk-scrollbars"
    data-preset="classic"
    :data-mobile-tools="mobileToolsOpen ? 'open' : 'closed'"
    :data-backend="backend"
    :lang="locale"
  >
      <header class="qk-classic-editor__header">
        <ClassicEditorTaskNavigation
          :active-tab="activeTab"
          :model="model"
          :ribbon-tabs="ribbonTabs"
          :command-panel-id="commandPanelId"
          @update:active-tab="selectTab"
        >
          <template #left>
            <ClassicEditorTitleBar :model="model" />
            <ClassicEditorQuickActions :model="model" />
          </template>
          <template #right>
            <ClassicEditorProductSwitches :model="model" :locale="locale" />
          </template>
        </ClassicEditorTaskNavigation>
        <ClassicEditorRibbon
          v-if="!preview"
          :model="model"
          :active-tab="activeTab"
          :ribbon-tabs="ribbonTabs"
          :command-bar-groups="commandBarGroups"
          :command-panel-id="commandPanelId"
        />
        <section
          v-else
          :id="commandPanelId"
          class="qk-classic-editor__ribbon"
          data-command-renderer="typed-preview"
          role="tabpanel"
        >
          <ClassicEditorCommandStrip
            :model="model"
            :active-tab="activeTab"
            :tabs="ribbonTabs"
            :groups="commandStripGroups"
          />
        </section>
      </header>

      <div class="qk-classic-editor__document-region">
        <QuireButton v-if="mobilePanelOpen" variant="text" class="qk-classic-editor__mobile-panel-dismiss"
          :aria-label="message('close')" @click="closeMobilePanels"><span class="qk-classic-editor__sr-only">{{ message('close') }}</span></QuireButton>
        <aside
          class="qk-classic-editor__sidebar qk-classic-editor__sidebar--left"
          data-qk-classic-sidebar="left"
        />
        <main
          class="qk-classic-editor__center"
          :data-ruler="rulerVisible ? 'visible' : 'hidden'"
        >
          <div class="qk-classic-editor__workspace-header">
            <div class="qk-classic-editor__ruler" :hidden="!rulerVisible" />
            <div class="qk-classic-editor__workspace-toolbar" />
          </div>
          <div
            class="qk-classic-editor__workspace-viewport"
            :aria-label="message('documentPages')"
          >
            <div class="qk-classic-editor__document-scroll-content">
              <div class="qk-classic-editor__canvas-mount" />
              <div
                class="qk-classic-editor__document-overlays"
                data-qk-classic-document-overlays
              />
              <aside
                class="qk-classic-editor__document-sidebar"
                data-qk-classic-sidebar="document-right"
                hidden
              />
            </div>
          </div>
        </main>
        <aside
          class="qk-classic-editor__sidebar qk-classic-editor__sidebar--right"
          data-qk-classic-sidebar="right"
        />
      </div>
      <footer
        class="qk-classic-editor__status-bar"
        :hidden="!model.options.statusBar"
      >
        <div class="qk-classic-editor__status-items" role="status" :aria-label="message('documentStatus')" />
        <ClassicEditorZoom :model="model" />
      </footer>
    <ClassicMobileNavigation v-if="model.compact" :model="model" :tabs="ribbonTabs" :active-tab="activeTab"
      :open="mobileToolsOpen" @select="selectMobileTask" @close="mobileToolsOpen = false" />
    <ClassicEditorProductPopmenu :model="model" :root="rootElement" />
    <ClassicEditorDocumentServiceFeedback :model="model" :root="rootElement" />
    <ClassicEditorBehaviorSurfaces :model="model" :root="rootElement" />
    <ClassicEditorWorkspaceWidgets v-if="model.context" :model="model" />
  </section>
</template>
