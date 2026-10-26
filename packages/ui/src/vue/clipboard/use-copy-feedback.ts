import { onBeforeUnmount, ref, watch } from "vue";
import type { QuireKitClipboardErrorDetails } from "../../components/clipboard/types";

/**
 * Tracks completed system clipboard writes without reporting optimistic success.
 * @param value - Current public text getter.
 * @param timeout - Duration of confirmed success feedback.
 * @param onSuccess - Notifies a completed write of the current text.
 * @param onError - Notifies a failed write of the current text.
 * @param readValue - Optional action-only source; never evaluated by the reactive watcher.
 * @returns Feedback refs and the guarded asynchronous copy action.
 */
export function useCopyFeedback(
  value: () => string,
  timeout: () => number,
  onSuccess: () => void,
  onError: (details: QuireKitClipboardErrorDetails) => void,
  readValue: () => string = value
) {
  const copied = ref(false);
  const copying = ref(false);
  const error = ref(false);
  let mounted = true;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Removes feedback that belongs to an earlier copy attempt. */
  function resetFeedback(): void {
    clearTimeout(resetTimer);
    copied.value = false;
    error.value = false;
  }

  watch(value, resetFeedback, { flush: "sync" });
  onBeforeUnmount(() => {
    mounted = false;
    clearTimeout(resetTimer);
  });

  /**
   * Writes the current text once and keeps stale results away from new content.
   * @returns A promise settled after the browser write and feedback update.
   */
  async function copy(): Promise<void> {
    if (copying.value) return;
    const identity = value();
    let attemptedValue = "";
    resetFeedback();
    copying.value = true;
    try {
      attemptedValue = readValue();
      if (attemptedValue.length === 0) return;
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(attemptedValue);
    } catch (cause) {
      if (!mounted || value() !== identity) return;
      error.value = true;
      onError({ value: attemptedValue, error: cause });
      return;
    } finally {
      if (mounted) copying.value = false;
    }
    if (!mounted || value() !== identity) return;
    copied.value = true;
    resetTimer = setTimeout(() => { copied.value = false; }, timeout());
    onSuccess();
  }

  return { copied, copying, error, copy };
}
