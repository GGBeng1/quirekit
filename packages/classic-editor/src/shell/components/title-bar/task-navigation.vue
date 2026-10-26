<script setup lang="ts">
import { computed, nextTick, ref, toRef, type ComponentPublicInstance } from "vue";
import type { ClassicEditorRibbonTabContribution } from "@classic/types";
import { QuireTabs, QuireMenu, QuireMenuItems, QuireButton } from "@quirekit/ui/vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import { useClassicEditorOverlay } from "../../overlays/registry";
import type { ClassicEditorShellModel } from "../../types";
import SvgIcon from "../svg-icon.vue";
import { useClassicEditorTaskTabWidthBudget } from "./task-tabs/use-width-budget";

/** Reactive inputs rendered by the target-aware task navigation. */
interface ClassicEditorTaskNavigationProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Capability- and target-filtered task tabs. */
  readonly ribbonTabs: readonly ClassicEditorRibbonTabContribution[];
  /** Active task id. */
  readonly activeTab: string | undefined;
  /** DOM id of the controlled Command Strip panel. */
  readonly commandPanelId: string;
}

/** Events emitted by task selection. */
interface ClassicEditorTaskNavigationEmits {
  /** Updates the active task tab. */
  "update:activeTab": [tabId: string];
}

defineSlots<{
  /** Product identity and leading actions, composed by the owning shell. */
  left(): unknown;
  /** Product settings or trailing actions, composed by the owning shell. */
  right(): unknown;
}>();

const props = defineProps<ClassicEditorTaskNavigationProps>();
const emit = defineEmits<ClassicEditorTaskNavigationEmits>();
const { locale, message, text } = useClassicEditorShellContributions(
  toRef(props, "model")
);
const tabs = computed(() => props.ribbonTabs);
const activeId = computed(() => props.activeTab);
const theme = computed(() => props.model.context?.theme ?? props.model.theme);
const budget = useClassicEditorTaskTabWidthBudget({ tabs, activeId, locale, theme });
const visibleTabs = computed(() => projectTabs(budget.visibleIds.value));
const overflowTabs = computed(() => projectTabs(budget.overflowIds.value));
const overflowOptions = computed<QuireKitMenuEntry[]>(() => overflowTabs.value.map(
  (tab) => ({ value: tab.id, label: text(tab.label) })
));
const overlay = useClassicEditorOverlay("task-overflow", undefined, undefined, undefined, { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
const overflowOpen = computed({ get: overlay.isVisible, set: overlay.setVisible });
const tabElements = new Map<string, HTMLButtonElement>();
const overflowTrigger = ref<HTMLButtonElement>();

const contentProps = computed(() => ({ ...overlay.ownerAttributes, lang: locale.value }));
const tabItems = computed(() => visibleTabs.value.map(tab => ({ value: tab.id, label: text(tab.label), panelId: props.commandPanelId })));

/**
 * Retains the native overflow trigger for product focus return.
 * @param value - Public Button instance or native root.
 */
function captureOverflow(value: Element | ComponentPublicInstance | null): void {
  const root = value && "$el" in value ? value.$el : value;
  overflowTrigger.value = root instanceof HTMLButtonElement ? root : undefined;
}

/**
 * Projects source tabs from a measured id list.
 *
 * @param ids - Direct or overflow ids in source order.
 * @returns Matching task contributions.
 */
function projectTabs(ids: readonly string[]): readonly ClassicEditorRibbonTabContribution[] {
  return ids.flatMap((id) => {
    const tab = props.ribbonTabs.find((candidate) => candidate.id === id);
    return tab === undefined ? [] : [tab];
  });
}

/**
 * Activates one task and optionally restores focus after overflow closes.
 *
 * @param tab - Visible or overflow task declaration.
 * @param focus - Whether keyboard focus should follow selection.
 */
function selectTab(tab: ClassicEditorRibbonTabContribution, focus = false): void {
  emit("update:activeTab", tab.id);
  if (!focus) return;
  void restoreSelectedTaskFocus(tab.id);
}

/**
 * Restores focus after task projection and measured overflow have both settled.
 *
 * @param tabId - Newly selected task id.
 */
async function restoreSelectedTaskFocus(tabId: string): Promise<void> {
  await nextTick();
  await nextTick();
  const direct = tabElements.get(tabId);
  if (direct?.isConnected === true) direct.focus();
  else overflowTrigger.value?.focus();
}

/**
 * Selects one hidden task from its stable contribution identity.
 *
 * @param key - Stable task identity from the declaration.
 */
function selectOverflow(key: string): void {
  const tab = overflowTabs.value.find(tab => tab.id === key);
  if (!tab) return;
  overlay.close();
  selectTab(tab, true);
}

/**
 * Measures the public tablist and retains product width budgeting outside the UI component.
 * @param value - Public Tabs component or native root.
 */
function captureTabs(value: Element | ComponentPublicInstance | null): void {
  const root = value && "$el" in value ? value.$el : value;
  if (!(root instanceof HTMLElement)) return;
  budget.captureRoot(root.parentElement);
  const previousIds = new Set(tabElements.keys());
  tabElements.clear();
  for (const element of root.querySelectorAll<HTMLButtonElement>("[role=tab][data-value]")) {
    const id = element.dataset.value!;
    previousIds.delete(id);
    tabElements.set(id, element);
    budget.captureTab(id, element);
  }
  for (const id of previousIds) budget.captureTab(id, null);
}
/** @param id - Current public Tabs value. */
function selectVisible(id: string | undefined): void {
  const tab = visibleTabs.value.find(tab => tab.id === id);
  if (tab) selectTab(tab);
}

</script>

<template>
  <nav
    class="qk-classic-editor__task-navigation"
    data-qk-shell-row="tasks"
    :aria-label="message('documentTasks')"
  >
    <div class="qk-classic-editor__task-left"><slot name="left" /></div>
    <div v-show="model.options.ribbon" class="qk-classic-editor__task-center">
      <QuireTabs :ref="captureTabs" :label="message('documentTasks')" :items="tabItems" :model-value="activeTab"
        :render-panels="false" class="qk-classic-editor__ribbon-tabs" :data-task-overflow-ids="budget.overflowIds.value.join(' ')"
        @update:model-value="selectVisible" />
      <QuireMenu
        v-if="overflowTabs.length > 0"
        v-model:open="overflowOpen"
        v-bind="contentProps"
        :aria-label="message('moreTasks')" width="180px"
      >
        <template #trigger><QuireButton
          :ref="captureOverflow" variant="ghost" size="sm"
          v-bind="overlay.ownerAttributes"
          type="button"
          class="qk-classic-editor__task-overflow"
          data-task-overflow="true"
          :aria-label="message('moreTasks')"
          :aria-expanded="overflowOpen"
          aria-haspopup="menu"
          @pointerdown.prevent
        >
          <SvgIcon name="moreHorizontal" />
          <span class="qk-classic-editor__sr-only">{{ message("moreTasks") }}</span>
        </QuireButton></template>
        <QuireMenuItems :items="overflowOptions" :content-props="contentProps" @select="selectOverflow" />
      </QuireMenu>
    </div>
    <div class="qk-classic-editor__task-right"><slot name="right" /></div>
  </nav>
</template>
