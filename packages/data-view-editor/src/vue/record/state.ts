import { ref, watch } from "vue";
import type { DataSet } from "@quirekit/data-view";

/** Keeps details tied to a live dataset and returns focus to an existing public entry.
 * @param data - Current complete canonical snapshot.
 * @param owner - Workspace root surviving record deletion or view replacement.
 * @returns Local record identity, opening callback and final focus resolver.
 */
export function useRecordDetails(data: () => DataSet | null, owner: () => HTMLElement | null) {
  const recordId = ref<string | null>(null);
  let trigger: HTMLElement | null = null;
  watch(() => data()?.id, () => { recordId.value = null; });
  watch(() => data()?.records, records => { if (recordId.value && !records?.some(record => record.id === recordId.value)) recordId.value = null; });
  /** @param id - Existing stable record. @param target - Actual opening control. */
  function open(id: string, target: HTMLElement): void {
    if (!data()?.records.some(record => record.id === id)) return;
    trigger = target; recordId.value = id;
  }
  /** @returns Surviving entry, another details button, or the workspace itself. */
  function returnFocus(): HTMLElement | null {
    if (trigger?.isConnected && !trigger.hasAttribute("disabled")) return trigger;
    return owner()?.querySelector<HTMLElement>("[data-dv-detail-id], [data-dv-add-record]") ?? owner();
  }
  return {recordId, open, returnFocus};
}
