import { onBeforeUnmount, shallowRef, watch } from 'vue';
import type { MathEditor, MathEditorSnapshot } from '@quirekit/math';

/**
 * Adapts the public external store to Vue without creating a parallel state machine.
 * @param editor - Borrowed instance, including explicit host replacement.
 * @returns Vue's projection of the core's stable immutable snapshot.
 */
export function useMathEditorSnapshot(editor: () => MathEditor) {
  const snapshot = shallowRef<MathEditorSnapshot>(editor().getSnapshot());
  let unsubscribe: (() => void) | undefined;
  watch(editor, current => {
    unsubscribe?.();
    snapshot.value = current.getSnapshot();
    unsubscribe = current.subscribe(value => { snapshot.value = value; });
  }, { immediate: true });
  onBeforeUnmount(() => unsubscribe?.());
  return snapshot;
}
