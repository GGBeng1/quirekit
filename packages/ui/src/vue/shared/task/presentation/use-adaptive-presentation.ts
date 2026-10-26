import { computed, onMounted, onScopeDispose, shallowRef, watch } from "vue";
import type { Ref } from "vue";
import type { QuireKitResolvedTaskPresentation, QuireKitTaskPresentation } from "../../../../components/task/types";
import { getTaskEventDocument, subscribeTaskPresentationMedia } from "./media";
import type { AdaptivePresentation, TaskPresentationMedia, TaskPresentationPhase } from "./types";

/**
 * Resolves the next shell and retains the active one until its matching physical exit.
 * @param trigger - Stable trigger, which owns the layout viewport and event document.
 * @param requested - Host strategy; an omitted strategy uses layout media.
 * @returns Private presentation state without any task request or business lifecycle.
 */
export function useAdaptivePresentation(
  trigger: Ref<HTMLElement | undefined>,
  requested: () => QuireKitTaskPresentation | undefined
): AdaptivePresentation {
  const strategy = computed(() => requested() ?? "auto");
  const mounted = shallowRef(false);
  const disposed = shallowRef(false);
  const media = shallowRef<TaskPresentationMedia>();
  const locked = shallowRef<QuireKitResolvedTaskPresentation>();
  const surfacePhase = shallowRef<TaskPresentationPhase>("closed");
  const surfaceEpoch = shallowRef(0);
  let subscribedDocument: Document | undefined;

  const candidate = computed(() => {
    if (disposed.value) return undefined;
    if (strategy.value !== "auto") return strategy.value;
    return mounted.value ? media.value?.value.value : undefined;
  });
  const ready = computed(() => candidate.value !== undefined);
  const resolved = computed(() => locked.value ?? candidate.value);

  /** Releases the current document lease, including when the host forces a shell. */
  function releaseMedia() {
    media.value?.release();
    media.value = undefined;
    subscribedDocument = undefined;
  }

  /**
   * Follows the trigger's document after mounting or a document-changing interaction.
   * @param owner - Layout viewport owner, never inferred from a global document.
   */
  function syncMedia(owner: Document | undefined) {
    if (disposed.value) return;
    if (!mounted.value || strategy.value !== "auto" || !owner) {
      releaseMedia();
      return;
    }
    if (subscribedDocument === owner && media.value) return;
    // Replace valid document leases atomically: a temporary undefined snapshot
    // would tell a synchronous session watcher to end a still-available task.
    const next = subscribeTaskPresentationMedia(owner);
    media.value?.release();
    subscribedDocument = owner;
    media.value = next;
  }

  // SSR and the first hydration render share the unresolved auto state. Forced
  // shells are independent of mounting; auto first reads the actual trigger owner.
  onMounted(() => {
    mounted.value = true;
    syncMedia(trigger.value?.ownerDocument);
  });
  watch([() => trigger.value?.ownerDocument, strategy], ([owner]) => syncMedia(owner), { flush: "sync" });

  /**
   * Refreshes media in the original event's realm before a queued resize listener runs.
   * @param event - Original interaction being delegated by the stable trigger.
   * @returns Current locked shell, or the next candidate while closed.
   */
  function resolveForEvent(event: Event) {
    if (disposed.value) return undefined;
    syncMedia(getTaskEventDocument(event) ?? trigger.value?.ownerDocument);
    media.value?.refresh();
    return resolved.value;
  }

  /** @returns The accepted physical shell, or undefined until its environment is ready. */
  function open() {
    if (!ready.value) return undefined;
    if (surfacePhase.value === "open") return resolved.value;
    // A new session may reuse a still-exiting shell, but its old exit callback
    // cannot release the reopened surface. Candidate changes never replace it here.
    locked.value ??= candidate.value;
    surfaceEpoch.value += 1;
    surfacePhase.value = "open";
    return locked.value;
  }

  /** Retains the physical shell after its logical task session has ended. */
  function close() {
    if (surfacePhase.value === "open") surfacePhase.value = "closing";
  }

  /**
   * Releases only the current provider's completed exit, including reduced-motion exits.
   * @param presentation - Shell whose presence layer emitted completion.
   * @param epoch - Opening identity captured for that presence lifetime.
   * @returns Whether this completion released the active shell lock.
   */
  function completeExit(presentation: QuireKitResolvedTaskPresentation, epoch: number) {
    if (disposed.value || surfacePhase.value !== "closing"
      || locked.value !== presentation || surfaceEpoch.value !== epoch) return false;
    surfacePhase.value = "closed";
    locked.value = undefined;
    return true;
  }

  /** Invalidates pending exits and synchronously releases the document subscription. */
  function dispose() {
    if (disposed.value) return;
    disposed.value = true;
    surfaceEpoch.value += 1;
    surfacePhase.value = "closed";
    locked.value = undefined;
    releaseMedia();
  }
  onScopeDispose(dispose);

  return {
    ready,
    candidate,
    resolved,
    phase: computed(() => surfacePhase.value),
    epoch: computed(() => surfaceEpoch.value),
    resolveForEvent,
    open,
    close,
    completeExit,
    dispose
  };
}
