import { computed, nextTick, onScopeDispose, ref, watch } from "vue";
import type { QuireKitTaskCancelReason, QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../../../../components/task";
import type { TaskLifecycle, TaskLifecycleOptions } from "./types";

/**
 * Projects one consumer request into an owner-gated session and two mutually exclusive surfaces.
 * @param options - Reactive inputs, shared requests, presentation lock and single notification owner.
 * @returns Task entries used by triggers, close controls and surface adapters.
 */
export function useTaskLifecycle(options: TaskLifecycleOptions): TaskLifecycle {
  const { props, ownerReady, requests, presentation, events } = options;
  const localOpen = ref(props.defaultOpen ?? false);
  const requestedOpen = computed(() => props.open ?? localOpen.value);
  const open = computed(() => requestedOpen.value && !props.disabled && ownerReady.value && presentation.ready.value);
  let intent: { reason: QuireKitTaskCloseReason; sessionId: string } | undefined;
  let guarding = false;
  let disposed = false;
  let synchronizing = false;
  let resynchronize = false;

  /** Ends private state before notifying consumers, so abort callbacks cannot commit old work. */
  function endSession(): void {
    const sessionId = requests.sessionId.value;
    if (sessionId === null) return;
    const reason: QuireKitTaskCancelReason = !ownerReady.value ? "owner-hidden"
      : props.disabled ? "disabled"
      : intent?.sessionId === sessionId ? intent.reason : "host-close";
    intent = undefined;
    requests.end();
    presentation.close();
    events.end(sessionId);
    if (reason !== "action") events.cancel({ reason, sessionId });
    events.openChange(false);
  }

  /** Serializes synchronous owner or host changes triggered by lifecycle callbacks. */
  function synchronize(): void {
    if (disposed) return;
    if (synchronizing) { resynchronize = true; return; }
    synchronizing = true;
    try {
      do {
        resynchronize = false;
        if (open.value && requests.sessionId.value === null) {
          presentation.open();
          const sessionId = requests.begin();
          if (requests.sessionId.value === sessionId) {
            events.begin(sessionId);
            events.openChange(true);
          }
        } else if (!open.value) endSession();
      } while (resynchronize && !disposed);
    } finally { synchronizing = false; }
  }

  // Disabled local tasks stay closed on re-enable; controlled requests remain host-owned.
  watch(() => props.disabled, disabled => {
    if (disabled && props.open === undefined) localOpen.value = false;
  }, { immediate: true, flush: "sync" });
  watch(open, synchronize, { immediate: true, flush: "sync" });

  /**
   * Applies the shared task and consumer policies to an existing surface request.
   * @param request - Original close intent, including an existing prevented state.
   */
  function guardClose(request: QuireKitTaskCloseRequest): void {
    if (request.defaultPrevented) return;
    if (disposed || guarding || !open.value || requests.submitting.value) {
      request.preventDefault();
      return;
    }
    guarding = true;
    try { props.onCloseRequest?.(request); }
    finally { guarding = false; }
  }

  /**
   * Consumes an already-guarded intent without relaying the second Ark notification.
   * @param reason - Accepted interaction source.
   */
  function acceptClose(reason: QuireKitTaskCloseReason): void {
    const sessionId = requests.sessionId.value;
    if (disposed || !open.value || sessionId === null || intent?.sessionId === sessionId) return;
    const accepted = { reason, sessionId };
    intent = accepted;
    if (props.open === undefined) localOpen.value = false;
    events.updateOpen(false);
    // A vetoed controlled update cannot mislabel an unrelated future host close.
    void nextTick(() => { if (intent === accepted) intent = undefined; });
  }

  /**
   * Routes a visible or imperative close through one synchronous policy.
   * @param reason - User or programmatic close source.
   * @returns Whether the active task accepted the request before host acknowledgement.
   */
  function requestClose(reason: QuireKitTaskCloseReason = "programmatic"): boolean {
    let prevented = false;
    const request: QuireKitTaskCloseRequest = {
      reason,
      get defaultPrevented() { return prevented; },
      /** Refuses this synchronous close intent. */
      preventDefault() { prevented = true; }
    };
    guardClose(request);
    if (prevented) return false;
    acceptClose(reason);
    return true;
  }

  /** @returns Whether the current environment accepts an explicit opening request. */
  function requestOpen(): boolean {
    if (disposed || props.disabled || !ownerReady.value || !presentation.ready.value) return false;
    if (open.value) return true;
    if (props.open === undefined) localOpen.value = true;
    events.updateOpen(true);
    return true;
  }

  onScopeDispose(() => {
    disposed = true;
    intent = undefined;
    requests.end();
  });
  return { requestedOpen, open, requestOpen, requestClose, guardClose, acceptClose };
}
