import { nextTick, watch } from "vue";
import type { DataOperation } from "@quirekit/data-view";

/** Keeps keyboard focus inside the record task after an acknowledged menu action.
 * @param owner - Surviving table footer or board root.
 * @param busy - Host acknowledgement state.
 * @returns Schedules focus after copying or deleting a record.
 */
export function useRecordActionFocus(owner: () => HTMLElement | null, busy: () => boolean) {
  let pending: string | null | undefined;
  /** Waits for canonical rendering and enabled controls, without stealing deliberate outside focus. */
  function restore(): void {
    void nextTick(() => {
      if (pending === undefined || busy()) return;
      const scope = owner()?.closest(".dv-workspace"), document = scope?.ownerDocument;
      if (!scope || !document) return;
      const active = document.activeElement;
      if (active && active !== document.body && !scope.contains(active) && !active.closest('[role="menu"]')) { pending = undefined; return; }
      const buttons = [...scope.querySelectorAll<HTMLButtonElement>("button[data-dv-record-id]")];
      const target = buttons.find(button => button.dataset.dvRecordId === pending) ?? buttons[0] ?? scope.querySelector<HTMLButtonElement>("[data-dv-add-record]");
      target?.focus(); pending = undefined;
    });
  }
  watch(busy, waiting => { if (!waiting) restore(); });
  /** @param operations - Atomic record menu action. */
  return function request(operations: readonly DataOperation[]): void {
    const action = operations[0];
    if (action?.type !== "insert-record" && action?.type !== "delete-record") return;
    pending = action.type === "insert-record" ? action.record.id : null;
    restore();
  };
}
