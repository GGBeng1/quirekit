<script setup lang="ts">
import {
  computed,
  nextTick,
  onUpdated,
  toRef,
  watch,
  type ComponentPublicInstance
} from "vue";
import type { ClassicEditorRibbonTabContribution } from "@classic/types";
import type { ResolvedClassicEditorCommandStripGroup } from "../../contribution/command-strip";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../../types";
import ClassicEditorCommandGroup from "./command-group.vue";
import ClassicEditorCommandOverflow from "./overflow-menu.vue";
import {
  moveClassicEditorCommandRovingFocus,
  synchronizeClassicEditorCommandRovingFocus
} from "./roving-focus";
import { useClassicEditorCommandWidthBudget } from "./use-width-budget";

/** Inputs for the target-aware, width-budgeted Command Strip. */
interface ClassicEditorCommandStripProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Current valid task id. */
  readonly activeTab: string | undefined;
  /** Visible ordinary and target-matching task tabs. */
  readonly tabs: readonly ClassicEditorRibbonTabContribution[];
  /** All installed direct-action groups. */
  readonly groups: readonly ResolvedClassicEditorCommandStripGroup[];
}

const props = defineProps<ClassicEditorCommandStripProps>();
const { locale, message } = useClassicEditorShellContributions(toRef(props, "model"));
const activeTab = computed(() => props.tabs.find((tab) => tab.id === props.activeTab));
const activeGroups = computed(() => props.groups.filter(
  (group) => group.tabId === props.activeTab
));
const budget = useClassicEditorCommandWidthBudget({
  groups: activeGroups,
  locale
});
const density = computed<"compact" | "expanded">(() => (
  activeTab.value?.contextualFor !== undefined && budget.availableWidth.value >= 768
    ? "expanded"
    : "compact"
));
const visibleGroups = computed(() => budget.visibleIds.value.flatMap((id) => {
  const group = activeGroups.value.find((candidate) => candidate.id === id);
  return group === undefined ? [] : [group];
}));
const overflowGroups = computed(() => budget.overflowIds.value.flatMap((id) => {
  const group = activeGroups.value.find((candidate) => candidate.id === id);
  return group === undefined ? [] : [group];
}));
const overflowActionIds = computed(() => overflowGroups.value.flatMap(
  (group) => group.items.map((item) => item.action.id)
));

/** Re-establishes one keyboard tab stop after responsive or action-state changes. */
function synchronizeFocus(): void {
  if (budget.root.value !== undefined) {
    synchronizeClassicEditorCommandRovingFocus(budget.root.value);
  }
}

/**
 * Handles left/right/home/end navigation without moving document selection.
 *
 * @param event - Keyboard event received by the toolbar.
 */
function navigate(event: KeyboardEvent): void {
  const root = budget.root.value;
  if (root !== undefined) moveClassicEditorCommandRovingFocus(root, event);
}

/** Remembers the focused control as the current roving tab stop. */
function rememberFocus(event: FocusEvent): void {
  const root = budget.root.value;
  const target = event.target;
  if (root === undefined || !(target instanceof HTMLElement)) return;
  for (const candidate of root.querySelectorAll<HTMLElement>(
    '[data-command-strip-focus="true"]'
  )) {
    candidate.tabIndex = candidate === target ? 0 : -1;
    if (candidate === target) candidate.dataset.rovingCurrent = "true";
    else delete candidate.dataset.rovingCurrent;
  }
}

/**
 * Resolves one component public instance to its measured root element.
 *
 * @param groupId - Stable resolved group id.
 * @param value - Vue element or component ref value.
 */
function captureGroup(
  groupId: string,
  value: Element | ComponentPublicInstance | null
): void {
  const candidate = value !== null && "$el" in value ? value.$el : value;
  budget.captureGroup(groupId, candidate instanceof Element ? candidate : null);
}

/**
 * Captures the native toolbar root for responsive measurement.
 *
 * @param value - Native element or component ref value.
 */
function captureRoot(value: Element | ComponentPublicInstance | null): void {
  const candidate = value !== null && "$el" in value ? value.$el : value;
  budget.captureRoot(candidate instanceof Element ? candidate : null);
}

watch([visibleGroups, overflowGroups], () => void nextTick(synchronizeFocus));
onUpdated(synchronizeFocus);
</script>

<template>
  <section
    :ref="captureRoot"
    class="qk-classic-command-strip"
    :class="`qk-classic-command-strip--${density}`"
    :data-command-density="density"
    :data-active-task="activeTab?.id"
    :data-command-overflow-ids="overflowActionIds.join(' ')"
    role="toolbar"
    :aria-label="message('documentRibbon')"
    @keydown="navigate"
    @focusin="rememberFocus"
  >
    <div class="qk-classic-command-strip__groups">
      <ClassicEditorCommandGroup
        v-for="group in visibleGroups"
        :key="group.id"
        :ref="(element) => captureGroup(group.id, element)"
        :model="model"
        :group="group"
        :density="density"
        @executed="synchronizeFocus"
      />
    </div>
    <ClassicEditorCommandOverflow
      v-if="overflowGroups.length > 0"
      :model="model"
      :groups="overflowGroups"
      @executed="synchronizeFocus"
    />
  </section>
</template>
