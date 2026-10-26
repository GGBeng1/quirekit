import { type QuireEditorTransactionEvent } from "@quirekit/core";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  toRef,
  watch
} from "vue";
import type { ClassicEditorRenderContext, ClassicEditorSelectionPopupTrigger, ClassicEditorSelectionPopupActionContribution } from "@classic/types";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import {
  resolveClassicEditorSelectionPopupItems,
  resolveClassicEditorSelectionPopupTrigger
} from "./query";
import type { ClassicEditorSelectionPopupProps } from "./types";
import {
  executeClassicEditorSelectionPopupAction
} from "./action";
import { useClassicEditorSelectionPopupPointerGate } from "./pointer-lifecycle";
import { classicEditorSelectionPopupSuppressMeta } from "./suppression";
import { useSelectionPopupTouch } from "./touch/use";

/**
 * Owns the lifecycle and product-action state for the generic selection menu.
 *
 * @param props - Reactive Vue component inputs.
 * @returns Reactive render state and interaction handlers for the surface.
 */
export function useClassicEditorSelectionPopup(
  props: Readonly<ClassicEditorSelectionPopupProps>
) {
  const model = toRef(props, "model");
  const { select } = useClassicEditorShellContributions(model);
  const editorRevision = ref(0);
  const editorIdentity = ref(0);
  const dismissedSelectionKey = ref<string | null>(null);
  const suppressedSelectionKey = ref<string | null>(null);
  const trigger = computed<ClassicEditorSelectionPopupTrigger | null>(() => {
    void editorRevision.value;
    return resolveClassicEditorSelectionPopupTrigger(props.model.context);
  });
  const selectionKey = computed(() => trigger.value === null
    ? null
    : `${editorIdentity.value}:${trigger.value.from}:${trigger.value.to}`);
  const consumeTouchTap = useSelectionPopupTouch(props, () => show.value, (visible) => {
    dismissedSelectionKey.value = visible ? null : selectionKey.value;
    if (visible) suppressedSelectionKey.value = null;
  });
  const pointerSelectionInProgress = useClassicEditorSelectionPopupPointerGate(
    () => props.root,
    (completed) => {
      if (!consumeTouchTap()) {
        dismissedSelectionKey.value = completed ? null : selectionKey.value;
        if (completed) suppressedSelectionKey.value = null;
      }
      refreshSelection();
    }
  );
  const items = computed(() => {
    const contributions = select("selection-popup-item");
    return resolveClassicEditorSelectionPopupItems(
      props.model.context,
      trigger.value,
      props.model.compact ? contributions.filter(item => !("toolbar" in item)
        && (item.compact === "primary" || item.placement === "overflow")) : contributions
    );
  });
  const show = computed(() => (
    props.root !== undefined
    && !pointerSelectionInProgress.value
    && trigger.value !== null
    && items.value.length > 0
    && dismissedSelectionKey.value !== selectionKey.value
    && suppressedSelectionKey.value !== selectionKey.value
  ));
  let subscribedEditor: ClassicEditorRenderContext["editor"] | undefined;

  watch(
    () => props.model.context?.editor,
    (current) => {
      subscribedEditor?.off("selectionUpdate", rearmSelectionPopup);
      subscribedEditor?.off("transaction", refreshTransaction);
      subscribedEditor = current;
      editorIdentity.value += 1;
      subscribedEditor?.on("selectionUpdate", rearmSelectionPopup);
      subscribedEditor?.on("transaction", refreshTransaction);
      refreshSelection();
    },
    { immediate: true }
  );

  watch(selectionKey, (current) => {
    if (current !== dismissedSelectionKey.value) dismissedSelectionKey.value = null;
    if (current !== suppressedSelectionKey.value) suppressedSelectionKey.value = null;
  });

  onBeforeUnmount(() => {
    subscribedEditor?.off("selectionUpdate", rearmSelectionPopup);
    subscribedEditor?.off("transaction", refreshTransaction);
  });

  /** Invalidates selection geometry and action state after editor transactions. */
  function refreshSelection(): void {
    editorRevision.value += 1;
  }

  /**
   * Refreshes derived action state and recognizes an explicit same-range select.
   *
   * @param event - Transaction emitted by the mounted editor.
   */
  function refreshTransaction(event: QuireEditorTransactionEvent): void {
    if (event.transaction.selectionSet) dismissedSelectionKey.value = null;
    refreshSelection();
    // Kept apart from dismissal because the following selectionUpdate rearms dismissal.
    if (event.transaction.getMeta(classicEditorSelectionPopupSuppressMeta) === true) {
      suppressedSelectionKey.value = selectionKey.value;
    }
  }

  /** Rearms a deliberately repeated selection, including the same range. */
  function rearmSelectionPopup(): void {
    dismissedSelectionKey.value = null;
    refreshSelection();
  }

  /**
   * Executes one contribution while preserving its focus-ownership contract.
   *
   * @param item - Selected contribution.
   */
  async function executeSelection(
    item: ClassicEditorSelectionPopupActionContribution
  ): Promise<void> {
    const context = props.model.context;
    const current = trigger.value;
    if (context === undefined || current === null) return;
    const handled = await executeClassicEditorSelectionPopupAction(item, context, current);
    if (!handled) return;
    if (
      item.dismissAfterExecute === true
      || item.restoreEditorFocus === false
    ) {
      dismissedSelectionKey.value = selectionKey.value;
    }
    if (item.restoreEditorFocus === false) {
      return;
    }
    await restoreEditorFocus(context);
  }

  /**
   * Restores editor input ownership after an ordinary selection action.
   *
   * @param context - Context that executed the selected action.
   */
  async function restoreEditorFocus(
    context: ClassicEditorRenderContext
  ): Promise<void> {
    await nextTick();
    const latest = props.model.context;
    if (latest?.editor === context.editor && latest.instance === context.instance) {
      latest.editor.commands.focus(null, { scrollIntoView: false });
    }
  }

  /** @param visible - Controlled surface visibility emitted by Popup Menu. */
  function updateVisibility(visible: boolean): void {
    if (!visible) dismissedSelectionKey.value = selectionKey.value;
  }

  return {
    trigger,
    selectionKey,
    executeSelection,
    items,
    show,
    updateVisibility
  };
}
