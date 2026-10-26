import { onBeforeUnmount, watch } from 'vue';
import type { Ref } from 'vue';

/** Connect native reset to the same controlled update path as typed input.
 * @param input - Ark's native serialization input, including explicit form ownership.
 * @param reset - Restores the consumer's declared default value.
 */
export function usePinInputFormReset(input: Ref<HTMLInputElement | undefined>, reset: () => void): void {
  let form: HTMLFormElement | null = null;

  /** Defer until native reset completes, respecting a prevented reset.
   * @param event - Native reset request.
   */
  function onReset(event: Event): void {
    queueMicrotask(() => { if (!event.defaultPrevented) reset(); });
  }

  watch(input, (element) => {
    form?.removeEventListener('reset', onReset);
    form = element?.form ?? null;
    form?.addEventListener('reset', onReset);
  }, { flush: 'post' });
  onBeforeUnmount(() => form?.removeEventListener('reset', onReset));
}
