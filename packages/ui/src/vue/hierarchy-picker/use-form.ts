import { nextTick, watchEffect, type Ref } from 'vue';

/** Reconciles native resets with a committed array model, including late external forms.
 * @param field - Native select that owns validation and form association.
 * @param value - Current committed ids.
 * @param onReset - Explicit model reset boundary.
 */
export function useHierarchyForm(field: Ref<HTMLSelectElement | undefined>, value: () => readonly string[], onReset: () => void): void {
  watchEffect(onCleanup => {
    const element = field.value;
    if (!element) return;
    const root = element.getRootNode();
    const events = root.nodeType === 11 && 'host' in root ? root : element.ownerDocument;
    let active = true;
    /** @param event - Cancelable native reset from the currently associated form. */
    function reset(event: Event): void {
      if (event.target !== field.value?.form) return;
      queueMicrotask(async () => {
        if (!active || event.target !== field.value?.form) return;
        if (!event.defaultPrevented) onReset();
        await nextTick();
        // Native reset changes selectedIndex even when both models are nonempty.
        if (active && field.value) field.value.value = value().length ? 'selected' : '';
      });
    }
    events.addEventListener('reset', reset, true);
    onCleanup(() => { active = false; events.removeEventListener('reset', reset, true); });
  }, { flush: 'post' });
}
