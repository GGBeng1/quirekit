import {
  computed,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type Ref
} from "vue";
import type {
  ClassicEditorCommandTargetKind,
  ClassicEditorRibbonItemContribution,
  ClassicEditorUiSemanticSnapshot
} from "@classic/types";
import {
  resolveClassicEditorActiveCommandTab,
  resolveClassicEditorCommandStripGroups,
  resolveClassicEditorCommandTabs
} from "../../contribution/command-strip";
import { resolveClassicEditorCommandBarGroups } from "../../contribution/command-bar";
import { readClassicEditorStatusTarget } from "../../components/status-bar/parse";
import { classicEditorStatusTargetKey } from "../../components/status-bar/types";
import type { ClassicEditorShellModel } from "../../types";
import { useClassicEditorShellContributions } from "./shell-contributions";

/**
 * Resolves the active ribbon tab and capability-filtered command groups.
 *
 * @param model - Reactive private shell model.
 * @returns Reactive command-bar presentation state.
 */
export function useClassicEditorCommandBar(
  model: Readonly<Ref<ClassicEditorShellModel>>
) {
  const { contributions, select } = useClassicEditorShellContributions(model);
  const activeTab = ref(model.value.options.activeRibbonTab);
  const lastOrdinaryTab = ref(model.value.options.activeRibbonTab);
  const semantic = shallowRef<ClassicEditorUiSemanticSnapshot>();
  let unsubscribeSemantic: (() => void) | undefined;
  const ribbonGroups = computed(() => select("ribbon-group"));
  const ribbonItems = computed(() => selectRibbonItems());
  const ribbonActions = computed(() => select("ribbon-action-control"));
  const commandBarGroups = computed(() => resolveClassicEditorCommandBarGroups(
    ribbonGroups.value,
    ribbonItems.value,
    model.value.options.commandBar
  ));
  const commandStripGroups = computed(() => resolveClassicEditorCommandStripGroups(
    ribbonGroups.value,
    ribbonActions.value,
    model.value.options.commandBar
  ));
  const preview = computed(() => model.value.options.commandBar?.preview === true);
  const targetKind = computed(() => resolveCommandTargetKind(semantic.value));
  const previewTabs = computed(() => resolveClassicEditorCommandTabs(
    select("ribbon-tab"),
    commandStripGroups.value,
    targetKind.value
  ));
  const legacyTabs = computed(() => select("ribbon-tab").filter((tab) => (
    tab.contextualFor === undefined
    && commandBarGroups.value.some((group) => group.tabId === tab.id)
  )));
  const ribbonTabs = computed(() => preview.value ? previewTabs.value : legacyTabs.value);

  watch(() => model.value.context?.ui, (ui) => {
    unsubscribeSemantic?.();
    unsubscribeSemantic = undefined;
    semantic.value = ui?.state.semantic;
    if (ui !== undefined) {
      unsubscribeSemantic = ui.subscribe((state) => {
        semantic.value = state.semantic;
      });
    }
  }, { immediate: true });

  watchEffect(() => {
    activeTab.value = resolveClassicEditorActiveCommandTab(
      ribbonTabs.value,
      activeTab.value,
      lastOrdinaryTab.value
    );
  });

  /**
   * Selects one visible task and remembers ordinary state across object targets.
   *
   * @param tabId - Visible task selected by pointer or keyboard.
   */
  function selectTab(tabId: string): void {
    const tab = ribbonTabs.value.find((candidate) => candidate.id === tabId);
    if (tab === undefined) return;
    activeTab.value = tab.id;
    if (tab.contextualFor === undefined) lastOrdinaryTab.value = tab.id;
  }

  /**
   * Selects every legacy-compatible item only for the default renderer.
   *
   * @returns Registry-ordered legacy controls, direct actions, and widgets.
   */
  function selectRibbonItems(): ClassicEditorRibbonItemContribution[] {
    return contributions.value.filter(
      (item): item is ClassicEditorRibbonItemContribution =>
        item.kind === "ribbon-control"
        || item.kind === "ribbon-action-control"
        || item.kind === "ribbon-widget"
    );
  }

  onBeforeUnmount(() => unsubscribeSemantic?.());

  return {
    activeTab,
    commandBarGroups,
    commandStripGroups,
    preview,
    ribbonTabs,
    selectTab,
    targetKind
  } as const;
}

/**
 * Reads only structured controller facts admitted by the shared status contract.
 *
 * @param semantic - Latest immutable UI semantic snapshot.
 * @returns Matching command target, or null for caret/text/unpublished facts.
 */
function resolveCommandTargetKind(
  semantic: ClassicEditorUiSemanticSnapshot | undefined
): ClassicEditorCommandTargetKind | null {
  const target = readClassicEditorStatusTarget(
    semantic?.values[classicEditorStatusTargetKey]
  );
  if (target === null || target.kind === "caret" || target.kind === "text") return null;
  return target.kind;
}
