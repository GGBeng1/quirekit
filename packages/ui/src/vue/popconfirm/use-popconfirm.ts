import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createTaskRequests } from '../shared/task/session/requests';
import { useModalSurfaceOwner } from '../shared/surface/use-modal-owner';
import type { PopconfirmEvents, PopconfirmInput } from './types';

/**
 * Owns confirmation sessions; Popover remains responsible for all surface interactions.
 * @param props - Live component inputs.
 * @param events - Host notifications.
 * @param id - Stable instance identity.
 * @returns Effective open state and guarded confirmation actions.
 */
export function usePopconfirm(props: PopconfirmInput, events: PopconfirmEvents, id: string) {
  const owner = useModalSurfaceOwner();
  const internalOpen = ref(props.defaultOpen ?? false);
  const open = computed(() => !props.disabled && owner.ready.value && (props.open ?? internalOpen.value));
  const failed = ref(false);
  const requests = createTaskRequests(id);
  // Every visibility transition invalidates previous work before consumers can reopen the surface.
  watch(open, visible => {
    failed.value = false;
    if (visible) requests.begin();
    else requests.end();
  }, { immediate: true, flush: 'sync' });
  onBeforeUnmount(requests.end);

  /** @param value - Requested open state from the user or successful submission. */
  function updateOpen(value: boolean): void {
    internalOpen.value = value;
    events.updateOpen(value);
  }
  /** @param value - Ark interaction's requested state. */
  function interact(value: boolean): void {
    if (props.disabled || !owner.ready.value || requests.submitting.value || value === open.value) return;
    updateOpen(value);
    if (!value) events.cancel();
  }
  /** Executes once per live session, ignoring superseded results. */
  async function confirm(): Promise<void> {
    if (!open.value) return;
    const context = requests.startSubmission();
    if (!context) return;
    failed.value = false;
    let result: void | boolean;
    try {
      result = await props.confirmAction?.(context);
    } catch (error) {
      if (requests.isCurrent(context, 'submission')) {
        failed.value = true;
        requests.finishSubmission(context);
        events.confirmError(error);
      }
      return;
    }
    if (!requests.isCurrent(context, 'submission')) return;
    requests.finishSubmission(context);
    if (result === false) return;
    events.confirm();
    // Success listeners may replace the session (for example deleting a row and reopening another).
    if (requests.sessionId.value === context.sessionId) updateOpen(false);
  }
  return { open, failed, submitting: requests.submitting, interact, confirm };
}
