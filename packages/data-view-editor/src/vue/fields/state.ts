import { onBeforeUnmount, ref, shallowRef, watch } from "vue";
import type { FieldTask, FieldTaskOptions } from "./types";

/** Coordinates menu handoff and invalidation while the public shell owns focus and geometry.
 * @param options - Live host capabilities and source.
 * @returns Task snapshot, visibility and owner-local entry resolvers.
 */
export function useFieldTask(options: FieldTaskOptions) {
  const request = shallowRef<FieldTask | null>(null), visible = ref(false);
  let frame: number | undefined, ownerWindow: Window | null = null, sequence = 0, lastAnchor: HTMLElement | null = null;
  /** Ends a task without changing its retained form until the shell finishes exiting. */
  function close(): void {
    if (frame !== undefined) ownerWindow?.cancelAnimationFrame(frame);
    frame = undefined; visible.value = false;
  }
  /** @param id - Existing field ID, or empty for creation. @param anchor - Surviving actual entry. */
  function open(id: string, anchor: HTMLElement): void {
    close();
    const data = options.data(), viewId = options.view().id;
    if (!data || options.readOnly() || options.busy() || !anchor.isConnected) return;
    const field = data.fields.find(field => field.id === id);
    if (id && !field) return;
    ownerWindow = anchor.ownerDocument.defaultView;
    // Finish the source menu's dismissal before the new shell owns focus and its anchor.
    frame = ownerWindow?.requestAnimationFrame(() => {
      frame = undefined;
      if (options.readOnly() || options.busy() || options.data()?.id !== data.id || options.data()?.revision !== data.revision || options.view().id !== viewId || !anchor.isConnected) return;
      lastAnchor = anchor; request.value = {key: ++sequence, data, field, viewId, anchor}; visible.value = true;
    });
  }
  /** @returns Actual anchor while the task is mounted. */
  function anchor(): HTMLElement | null { return request.value?.anchor ?? lastAnchor; }
  /** Releases the captured dataset after the shell's physical exit, retaining only its focus entry. */
  function release(): void { if (!visible.value && frame === undefined) request.value = null; }
  /** @returns Surviving entry, or another usable control in the owning workspace. */
  function returnFocus(): HTMLElement | null {
    const entry = anchor();
    return entry?.isConnected && !entry.hasAttribute("disabled") ? entry : options.owner()?.querySelector<HTMLElement>('button[data-dv-fields-trigger], button[role="combobox"]') ?? options.owner();
  }
  watch([() => options.data()?.id, () => options.data()?.revision, () => options.view().id, options.readOnly], close);
  onBeforeUnmount(() => { close(); request.value = null; lastAnchor = null; });
  return {request, visible, open, close, release, anchor, returnFocus};
}
