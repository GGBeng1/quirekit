import { computed, type Ref } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorShellModel } from "../../types";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import { createGenericBlockTypes } from "./type-presets";
import { executeClassicEditorAction } from "@classic/runtime/ui/action-catalog";
import { resolveClassicEditorPresentationActionState } from "@classic/runtime/ui/presentation/actions";

/**
 * Projects feature-owned presets only while a block menu is open.
 * @param model - Live shell context.
 * @param menu - Active captured block menu.
 * @returns Shared insertion content, conversion state, and execution.
 */
export function useBlockTypes(model: Ref<ClassicEditorShellModel>, menu: Ref<"block" | "insert" | null>) {
  const { select, text } = useClassicEditorShellContributions(model);
  const types = computed(() => {
    const context = model.value.context;
    if (!menu.value || !context) return [];
    const declared = select("block-type");
    // A feature's unavailable presets must not become generic node conversions.
    const owned = context.instance.registry.contributions.some(item => item.kind === "block-type");
    return (owned ? declared : createGenericBlockTypes(context.editor)).map(item => ({
      value: item.id, label: text(item.label), icon: item.icon,
      node: item.createContent(context), action: item.action
    }));
  });
  const typeItems = computed<readonly QuireKitToolbarEntry[]>(() => {
    const context = model.value.context;
    if (menu.value !== "block" || !context) return [];
    return types.value.map(item => {
      const state = resolveClassicEditorPresentationActionState(item.action, context, undefined, "menu");
      return { kind: "toggle", value: item.value, label: item.label, tooltip: item.label, icon: item.icon,
        pressed: state.active, disabled: !state.canExecute };
    });
  });
  /** @param value - Feature-owned preset id chosen from the captured menu. */
  async function convert(value: string): Promise<void> {
    const context = model.value.context;
    const item = types.value.find(candidate => candidate.value === value);
    if (!context || !item || menu.value !== "block") return;
    if (await executeClassicEditorAction(item.action, context, undefined, "menu")) {
      menu.value = null;
      context.editor.view.focus();
    }
  }
  return { types, typeItems, convert };
}
