import { computed, markRaw, nextTick, onBeforeUnmount, ref } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import type { ClassicEditorColorTarget } from "../../types";
import { resolveClassicColorToolbarTarget } from "./targets";
import ColorControl from "./control.vue";
import ColorMenuBody from "./menu-body.vue";

/**
 * Adapts document color commands to the complete public ColorPicker.
 * @param state - Reactive Classic context.
 * @param target - Document color slot.
 * @returns Document color state and guarded preview, commit and reset operations.
 */
export function useClassicColorToolbar(state: ClassicEditorToolbarContributionState, target: ClassicEditorColorTarget) {
  let mounted = true;
  onBeforeUnmount(() => { mounted = false; });
  const context = computed(() => state.context);
  const slot = resolveClassicColorToolbarTarget(target);
  const label = computed(() => resolveBuiltinClassicEditorMessage(context.value.locale, slot.messageKey));
  const disclosureLabel = computed(() => context.value.locale === "zh-CN" ? `选择${label.value}` : `Choose ${label.value.toLowerCase()}`);
  const labels = computed(() => ({ resetLabel: context.value.locale === "zh-CN" ? "无颜色" : "No color" }));
  // Omit absent rows so the public palette keeps its own default document colors.
  const palette = { showMore: slot.showMore, ...(slot.colors === undefined ? {} : { colors: slot.colors }) };
  const recentColors = ref<string[]>([]);
  const paletteVisible = ref(false);
  const documentColor = computed(() => slot.read(context.value.editor));
  // Only brush-capable slots expose toggle semantics on the split action.
  const actionState = computed(() => slot.pen === undefined ? {} : { pressed: slot.pen.isActive(context.value.editor) });
  const editableColor = ref(documentColor.value ?? slot.fallbackColor);
  // Split actions retain the chosen value across selections so it can be applied
  // to the next text range. Only an explicit color/reset action changes this state.
  const resetActive = ref(documentColor.value === null && !slot.startsWithFallback);
  let pendingRecentColor: string | null = null;

  /**
   * @param value - Opaque document color selected through the public picker.
   * @returns Whether the document accepted the color.
   */
  function previewColor(value: string): boolean {
    const editor = context.value.editor;
    if (!mounted || !editor.isEditable || state.isTargetCurrent?.() === false || !/^#[0-9A-F]{6}$/iu.test(value)) return false;
    const color = value.toUpperCase();
    // A mixed selection may expose the first mark's color through getAttributes.
    // Always run the range command so every selected span receives this value.
    if (!slot.apply(editor, color)) return false;
    editableColor.value = color;
    resetActive.value = false;
    context.value.instance.refreshProductUi();
    pendingRecentColor = color;
    return true;
  }

  /** @param value - Final color to retain in the mounted control's recent list. */
  function rememberColor(value: string): void {
    recentColors.value = [value, ...recentColors.value.filter(color => color !== value)].slice(0, 8);
    pendingRecentColor = null;
  }

  /**
   * Restores editor input only when the public picker closed after a choice.
   * Precise editing stays in the picker; its later Escape returns to the trigger.
   * @param editor - Exact editor that accepted the operation.
   * @returns Completion after the public popup state has settled.
   */
  async function finishSelection(editor: ClassicEditorToolbarContributionState["context"]["editor"]): Promise<void> {
    await nextTick();
    if (mounted && !paletteVisible.value && context.value.editor === editor && editor.isEditable && state.isTargetCurrent?.() !== false) {
      editor.commands.focus(null, { scrollIntoView: false });
    }
  }

  /**
   * Commits a quick choice or the end of one precise edit without forcing closure.
   * @param value - Stable color emitted by the public picker.
   * @returns Completion after any popup closure and input restoration.
   */
  async function commitColor(value: string): Promise<void> {
    const editor = context.value.editor;
    if (!mounted || !editor.isEditable || state.isTargetCurrent?.() === false || !/^#[0-9A-F]{6}$/iu.test(value)) return;
    // Closing a precise input can emit a final blur commit after Escape. Only
    // a choice begun while open may restore editor input after its own closure.
    const beganWhileOpen = paletteVisible.value;
    if (previewColor(value)) rememberColor(value.toUpperCase());
    if (beganWhileOpen) await finishSelection(editor);
  }

  /** @returns Completion after removing only this direct color attribute. */
  async function resetColor(): Promise<void> {
    const editor = context.value.editor;
    if (!mounted || !editor.isEditable || state.isTargetCurrent?.() === false) return;
    resetActive.value = true;
    slot.clear(editor);
    pendingRecentColor = null;
    context.value.instance.refreshProductUi();
    await finishSelection(editor);
  }

  /** @returns Completion after applying the split button's visible color or no-color state. */
  async function applyCurrentColor(): Promise<void> {
    const editor = context.value.editor;
    if (!mounted || !editor.isEditable || state.isTargetCurrent?.() === false) return;
    if (slot.pen?.isActive(editor)) {
      updateOpen(false);
      slot.pen.stop(editor);
      context.value.instance.refreshProductUi();
      await finishSelection(editor);
      return;
    }
    const clear = resetActive.value;
    const color = editableColor.value;
    updateOpen(false);
    if (clear) await resetColor();
    else {
      if (previewColor(color)) rememberColor(color);
      await finishSelection(editor);
    }
  }

  /** @param open - Public ColorPicker state, including its precise editor. */
  function updateOpen(open: boolean): void {
    paletteVisible.value = open;
    // Numeric channels publish live values. Closing retains the final color too,
    // without requiring a second document mutation or stealing Escape focus.
    if (!open && pendingRecentColor !== null) rememberColor(pendingRecentColor);
  }

  return { label, disclosureLabel, labels, palette, actionState, recentColors, paletteVisible, editableColor, resetActive, previewColor, commitColor, resetColor, applyCurrentColor, updateOpen };
}

/**
 * Declares a configured native ColorPicker with its own public floating surface.
 * @param state - Reactive host context.
 * @param target - Text style color slot.
 * @returns Toolbar configuration and the thin document-command adapter.
 */
export function createClassicColorToolbar(state: ClassicEditorToolbarContributionState, target: ClassicEditorColorTarget): ClassicEditorToolbarContribution {
  const controller = useClassicColorToolbar(state, target);
  return {
    items: computed<readonly QuireKitToolbarEntry[]>(() => [{
      value: "palette", kind: "custom", popup: "dialog", renderer: "colorPicker", label: controller.label.value,
      contentRenderer: "colorPalette",
      icon: resolveClassicColorToolbarTarget(target).icon,
      iconAccentColor: controller.editableColor.value, iconEmpty: controller.resetActive.value,
      disabled: !state.context.editor.isEditable, expanded: controller.paletteVisible.value,
      attributes: { "data-color-target": target }
    }]),
    context: controller,
    renderers: { colorPicker: markRaw(ColorControl), colorPalette: markRaw(ColorMenuBody) },
    /** @param event - Inline palette intent routed through its owning toolbar host. @returns Completion of one accepted color command. */
    async execute(event) {
      if (event.source !== "popup") return;
      if (event.payload === null) await controller.resetColor();
      else if (typeof event.payload === "string") await controller.commitColor(event.payload);
    },
    /** @param event - Popup transition owned by the public ColorPicker. */
    openChange(event) { controller.updateOpen(event.expanded); }
  };
}
