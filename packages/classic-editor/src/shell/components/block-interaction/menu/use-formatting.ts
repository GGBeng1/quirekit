import { computed, onBeforeUnmount, shallowReactive, type Ref } from "vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import type { ClassicEditorSelectionPopupTrigger } from "@classic/types";
import type { ClassicEditorShellModel } from "../../../types";
import { useClassicEditorShellContributions } from "../../../composables/use/shell-contributions";
import { projectClassicToolbarFeature } from "../../../contribution/toolbar/features";
import { projectClassicToolbarControl } from "../../../contribution/toolbar/control";
import { executeClassicToolbar } from "../../../contribution/toolbar/execution";
import type { ClassicToolbarContext, ClassicToolbarEntryMeta, ClassicToolbarFeature } from "../../../contribution/toolbar/types";

/**
 * Retains feature owners only during the captured block menu session.
 * @param model - Live shell projection.
 * @param trigger - Original complete block range.
 * @returns Native toolbar entries and their existing command owners.
 */
export function useBlockFormatting(model: Ref<ClassicEditorShellModel>, trigger: ClassicEditorSelectionPopupTrigger) {
  const { select } = useClassicEditorShellContributions(model);
  const features = shallowReactive(new Map<string, ClassicToolbarFeature>());
  const adapter: ClassicToolbarContext = { get model() { return model.value; }, features, menus: new Map() };
  const captured = model.value.context!.editor;
  let disposed = false;
  onBeforeUnmount(() => { disposed = true; });
  /** @returns Whether this mounted surface still owns its original complete block selection. */
  function isTargetCurrent(): boolean {
    const editor = model.value.context?.editor, selection = editor?.state.pm.selection;
    return !disposed && editor === captured && selection?.toJSON().type === "quire-block-range"
      && selection.from === trigger.from && selection.to === trigger.to;
  }
  const widgets = computed(() => {
    const selected = select("selection-popup-item");
    const items = ["selection.paragraph-alignment", "selection.text-highlight", "selection.color", "selection.background-color"].flatMap(id => {
      const item = selected.find(item => item.id === id);
      return item && "toolbar" in item ? [{ id: item.id, toolbar: item.toolbar }] : [];
    });
    const numbering = select("ribbon-widget").find(item => item.id === "ribbon.numbering-galleries");
    return numbering?.toolbar ? [{ id: "block.numbering", toolbar: numbering.toolbar }, ...items] : items;
  });
  const entries = computed(() => [...features.values()].flatMap(feature => projectClassicToolbarFeature(feature.key, feature.items)).filter(item => !item.hidden));
  const numbering = computed<readonly QuireKitToolbarEntry[]>(() => entries.value.filter(item => item.kind === "split").map(item => {
    const { contentRenderer: _body, expanded: _expanded, ...direct } = item;
    return { ...direct, kind: "toggle", label: item.actionLabel ?? item.label, disabled: Boolean(item.disabled || item.actionDisabled) };
  }));
  /** @param ids - Exact installed actions, in menu order. @returns Available direct controls with their original metadata. */
  function controls(ids: readonly string[]): readonly QuireKitToolbarEntry[] {
    return ids.flatMap(id => {
      const control = [...select("ribbon-control"), ...select("ribbon-action-control")].find(item => item.id === id);
      return control ? [projectClassicToolbarControl(control, model.value.context, model.value.locale)] : [];
    });
  }
  const direct = computed(() => [...numbering.value, ...controls(["ribbon.task"])]);
  const indents = computed(() => controls(["ribbon.outdent", "ribbon.indent"]));
  const submenus = computed(() => entries.value.filter(item => item.kind !== "split" && (item.items || item.contentRenderer)));
  /** @param feature - Current retained factory projection. */
  function register(feature: ClassicToolbarFeature): void { features.set(feature.key, feature); }
  /** @param feature - Exact departing factory. */
  function release(feature: ClassicToolbarFeature): void { if (features.get(feature.key) === feature) features.delete(feature.key); }
  /** @param event - A real direct action or submenu selection. @returns Completion through the canonical feature adapter. */
  async function execute(event: QuireKitToolbarExecuteEvent): Promise<void> {
    if (!isTargetCurrent() || event.item.disabled) return;
    const meta = event.item.meta as ClassicToolbarEntryMeta | undefined;
    // A compact list icon invokes the existing split primary action. Its gallery
    // remains in the Ribbon; it must not turn into a differently interpreted toggle.
    await executeClassicToolbar(meta?.kind === "feature" && meta.original.kind === "split"
      ? { ...event, source: "action" } : event, adapter);
    captured.view.focus();
  }
  return { adapter, widgets, direct, indents, submenus, register, release, isTargetCurrent, execute };
}
