import { nextTick, onScopeDispose, watch } from "vue";
import type { Ref } from "vue";
import type { UseMenuReturn } from "@ark-ui/vue/menu";

/**
 * Opens a newly selected desktop Menu even when focus was acquired in bottom mode.
 * @param menu - Resident desktop Menu with its public state and highlighting APIs.
 * @param open - Effective desktop task visibility, including controlled acknowledgement.
 * @param trigger - Persistent button whose focus survives a presentation change.
 * @returns Current original-event keyboard binding for the stable task trigger.
 */
export function useActionMenuKeyboard(
  menu: UseMenuReturn,
  open: Readonly<Ref<boolean>>,
  trigger: Readonly<Ref<HTMLElement | undefined>>
): (event: KeyboardEvent) => void {
  let edge: "first" | "last" | undefined;
  let revision = 0;
  let disposed = false;

  watch(open, visible => {
    const current = ++revision;
    const requestedEdge = edge;
    edge = undefined;
    if (!visible || !requestedEdge) return;
    // Menu's idle state never received focus while Drawer owned the trigger.
    // Accept opening through the public API, then resolve the committed Menu rows.
    void nextTick(() => {
      if (disposed || current !== revision || !open.value) return;
      const contentId = menu.api.value.getContentProps().id;
      const content = typeof contentId === "string" ? trigger.value?.ownerDocument.getElementById(contentId) : null;
      const rows = Array.from(content?.querySelectorAll<HTMLElement>('[role^="menuitem"][data-value]') ?? [])
        .filter(row => !row.hasAttribute("data-disabled") && row.getAttribute("aria-disabled") !== "true"
          && row.closest('[data-scope="menu"][data-part="content"]') === content);
      const row = requestedEdge === "last" ? rows.at(-1) : rows[0];
      if (row?.dataset.value !== undefined) menu.api.value.setHighlightedValue(row.dataset.value);
    });
  }, { flush: "sync" });
  onScopeDispose(() => { disposed = true; revision += 1; edge = undefined; });

  /** @param event - Original native activation or ordinary navigation key. */
  return (event: KeyboardEvent): void => {
    if (disposed || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    const element = trigger.value;
    if (element?.matches(':disabled, [aria-disabled="true"]')) return;
    const openingKey = ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key);
    if (!open.value && openingKey && element && element.ownerDocument.activeElement === element) {
      event.preventDefault();
      edge = event.key === "ArrowUp" ? "last" : "first";
      const request = ++revision;
      menu.api.value.setOpen(true);
      // A refused controlled request must not assign its old keyboard intent to
      // a later, unrelated programmatic opening.
      void nextTick(() => { if (request === revision && !open.value) edge = undefined; });
      return;
    }
    menu.api.value.getTriggerProps().onKeydown?.(event);
  };
}
