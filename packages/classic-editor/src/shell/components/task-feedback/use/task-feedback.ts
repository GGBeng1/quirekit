import {
  onBeforeUnmount,
  shallowRef,
  watch,
  type Ref
} from "vue";
import type {
  ClassicEditorTaskFeedbackController,
  ClassicEditorTaskFeedbackSnapshot
} from "../../../../types";
import type { ClassicEditorShellModel } from "../../../types";

const emptySnapshot: ClassicEditorTaskFeedbackSnapshot = Object.freeze({
  revision: 0,
  tasks: Object.freeze([])
});

/** Reactive Vue projection of one instance-scoped task controller. */
export interface ClassicEditorTaskFeedbackBinding {
  /** Latest immutable task snapshot. */
  readonly snapshot: Readonly<Ref<ClassicEditorTaskFeedbackSnapshot>>;
  /** Current controller, or undefined before mount. */
  readonly controller: Readonly<Ref<ClassicEditorTaskFeedbackController | undefined>>;
}

/**
 * Subscribes the private shell to the current mounted instance task authority.
 *
 * @param model - Reactive private shell model.
 * @returns Current controller and immutable snapshot refs.
 */
export function useClassicEditorTaskFeedback(
  model: Readonly<Ref<ClassicEditorShellModel>>
): ClassicEditorTaskFeedbackBinding {
  const controller = shallowRef<ClassicEditorTaskFeedbackController>();
  const snapshot = shallowRef<ClassicEditorTaskFeedbackSnapshot>(emptySnapshot);
  let unsubscribe: (() => void) | undefined;

  watch(() => model.value.context?.instance.tasks, (current) => {
    unsubscribe?.();
    controller.value = current;
    snapshot.value = current?.snapshot ?? emptySnapshot;
    unsubscribe = current?.subscribe((next) => {
      snapshot.value = next;
    });
  }, { immediate: true });

  onBeforeUnmount(() => unsubscribe?.());
  return { snapshot, controller };
}
